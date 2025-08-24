import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAccessToken } from '@/lib/auth'
import { z } from 'zod'

const cashoutSchema = z.object({
  points: z.number().min(500, 'Minimum 500 points required ($5.00)'),
  method: z.enum(['BANK_TRANSFER', 'PAYPAL', 'STRIPE', 'CASH']),
  destinationRef: z.string().min(1, 'Payment destination is required'),
})

export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const payload = verifyAccessToken(token)

    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { points, method, destinationRef } = cashoutSchema.parse(body)

    // Get user wallet
    const wallet = await prisma.userWallet.findUnique({
      where: { userId: payload.userId }
    })

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      )
    }

    // Check if user has enough points
    if (wallet.pointsBalance < points) {
      return NextResponse.json(
        { error: 'Insufficient points balance' },
        { status: 400 }
      )
    }

    // Check if user has pending cashouts that would exceed limit
    const pendingCashouts = await prisma.cashoutRequest.findMany({
      where: {
        userId: payload.userId,
        status: { in: ['PENDING', 'INITIATED'] }
      }
    })

    const totalPendingPoints = pendingCashouts.reduce((sum, cashout) => sum + cashout.pointsUsed, 0)
    if (wallet.pointsBalance - totalPendingPoints < points) {
      return NextResponse.json(
        { error: 'Insufficient available points (some are locked in pending cashouts)' },
        { status: 400 }
      )
    }

    // Calculate cash amount (1 point = $0.01)
    const cashAmount = points * 0.01

    // Check minimum cashout amount
    if (cashAmount < 5.00) {
      return NextResponse.json(
        { error: 'Minimum cashout amount is $5.00 (500 points)' },
        { status: 400 }
      )
    }

    // Create cashout request
    const cashoutRequest = await prisma.cashoutRequest.create({
      data: {
        userId: payload.userId,
        pointsUsed: points,
        cashAmount,
        method,
        destinationRef,
        status: 'PENDING'
      }
    })

    // Lock points in wallet
    await prisma.userWallet.update({
      where: { userId: payload.userId },
      data: {
        pointsBalance: {
          decrement: points
        },
        lockedAmount: {
          increment: cashAmount
        }
      }
    })

    // Create audit event
    await prisma.submissionEvent.create({
      data: {
        submissionId: '', // Not tied to a specific submission
        actorId: payload.userId,
        eventType: 'MODERATED',
        meta: {
          action: 'CASHOUT_REQUEST_CREATED',
          cashoutId: cashoutRequest.id,
          pointsUsed: points,
          cashAmount,
          method,
          destinationRef
        }
      }
    })

    // TODO: Process payment based on method
    // For now, we'll simulate payment processing
    setTimeout(async () => {
      try {
        // Simulate payment processing
        const paymentResult = await processPayment(cashoutRequest.id, method, destinationRef, cashAmount)
        
        if (paymentResult.success) {
          // Update cashout status to succeeded
          await prisma.cashoutRequest.update({
            where: { id: cashoutRequest.id },
            data: { status: 'SUCCEEDED' }
          })

          // Unlock and transfer funds
          await prisma.userWallet.update({
            where: { userId: payload.userId },
            data: {
              lockedAmount: {
                decrement: cashAmount
              }
            }
          })

          // Create success event
          await prisma.submissionEvent.create({
            data: {
              submissionId: '',
              actorId: payload.userId,
              eventType: 'MODERATED',
              meta: {
                action: 'CASHOUT_SUCCEEDED',
                cashoutId: cashoutRequest.id,
                paymentResult
              }
            }
          })
        } else {
          // Payment failed, refund points
          await prisma.cashoutRequest.update({
            where: { id: cashoutRequest.id },
            data: { 
              status: 'FAILED',
              failureReason: paymentResult.error
            }
          })

          await prisma.userWallet.update({
            where: { userId: payload.userId },
            data: {
              pointsBalance: {
                increment: points
              },
              lockedAmount: {
                decrement: cashAmount
              }
            }
          })

          // Create failure event
          await prisma.submissionEvent.create({
            data: {
              submissionId: '',
              actorId: payload.userId,
              eventType: 'MODERATED',
              meta: {
                action: 'CASHOUT_FAILED',
                cashoutId: cashoutRequest.id,
                paymentResult,
                pointsRefunded: points
              }
            }
          })
        }
      } catch (error) {
        console.error('Payment processing error:', error)
        
        // Mark as failed and refund points
        await prisma.cashoutRequest.update({
          where: { id: cashoutRequest.id },
          data: { 
            status: 'FAILED',
            failureReason: 'Payment processing error'
          }
        })

        await prisma.userWallet.update({
          where: { userId: payload.userId },
          data: {
            pointsBalance: {
              increment: points
            },
            lockedAmount: {
              decrement: cashAmount
            }
          }
        })
      }
    }, 5000) // Simulate 5 second processing time

    return NextResponse.json({
      success: true,
      cashout: {
        id: cashoutRequest.id,
        status: cashoutRequest.status,
        pointsUsed: cashoutRequest.pointsUsed,
        cashAmount: cashoutRequest.cashAmount,
        method: cashoutRequest.method,
        message: 'Cashout request submitted successfully. Points locked and payment processing started.'
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Create cashout error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const payload = verifyAccessToken(token)

    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    // Build where clause
    const where: any = { userId: payload.userId }
    if (status && status !== 'all') {
      where.status = status
    }

    // Get cashouts with pagination
    const [cashouts, total] = await Promise.all([
      prisma.cashoutRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.cashoutRequest.count({ where })
    ])

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      success: true,
      data: cashouts.map(cashout => ({
        id: cashout.id,
        pointsUsed: cashout.pointsUsed,
        cashAmount: Number(cashout.cashAmount),
        method: cashout.method,
        destinationRef: cashout.destinationRef,
        status: cashout.status,
        failureReason: cashout.failureReason,
        createdAt: cashout.createdAt,
        updatedAt: cashout.updatedAt
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    })

  } catch (error) {
    console.error('Get cashouts error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Simulate payment processing
 * In a real implementation, this would integrate with Stripe, PayPal, etc.
 */
async function processPayment(
  cashoutId: string,
  method: string,
  destinationRef: string,
  amount: number
): Promise<{ success: boolean; error?: string; transactionId?: string }> {
  // Simulate payment processing with 90% success rate
  const success = Math.random() > 0.1
  
  if (success) {
    // Simulate successful payment
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Create payout transaction record
    await prisma.payoutTransaction.create({
      data: {
        cashoutRequestId: cashoutId,
        gateway: method === 'STRIPE' ? 'STRIPE' : method === 'PAYPAL' ? 'PAYPAL' : 'BANK',
        gatewayTxnId: transactionId,
        status: 'SUCCEEDED',
        rawWebhookJson: {
          amount,
          method,
          destinationRef,
          timestamp: new Date().toISOString()
        }
      }
    })

    return { success: true, transactionId }
  } else {
    // Simulate failed payment
    const errors = [
      'Insufficient funds',
      'Invalid payment method',
      'Payment declined',
      'Network error',
      'Account verification required'
    ]
    
    const randomError = errors[Math.floor(Math.random() * errors.length)]
    
    // Create failed payout transaction record
    await prisma.payoutTransaction.create({
      data: {
        cashoutRequestId: cashoutId,
        gateway: method === 'STRIPE' ? 'STRIPE' : method === 'PAYPAL' ? 'PAYPAL' : 'BANK',
        status: 'FAILED',
        rawWebhookJson: {
          amount,
          method,
          destinationRef,
          error: randomError,
          timestamp: new Date().toISOString()
        }
      }
    })

    return { success: false, error: randomError }
  }
}