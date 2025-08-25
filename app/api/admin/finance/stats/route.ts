import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAccessToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
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

    // Check if user is finance or admin
    const user = await prisma.user.findUnique({
      where: { id: payload.userId }
    })

    if (!user || (user.role !== 'FINANCE' && user.role !== 'COUNCIL')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Get today's date range
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)

    // Get this month's date range
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59)

    // Fetch finance statistics
    const [
      pendingPayouts,
      totalPayoutsToday,
      totalAmountToday,
      failedPayouts,
      totalPayoutsThisMonth,
      averageProcessingTime
    ] = await Promise.all([
      // Pending payouts
      prisma.cashoutRequest.count({
        where: { status: 'PENDING' }
      }),
      
      // Payouts processed today
      prisma.cashoutRequest.count({
        where: {
          status: 'SUCCEEDED',
          updatedAt: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      }),
      
      // Total amount processed today
      prisma.cashoutRequest.aggregate({
        where: {
          status: 'SUCCEEDED',
          updatedAt: {
            gte: startOfDay,
            lte: endOfDay
          }
        },
        _sum: {
          cashAmount: true
        }
      }),
      
      // Failed payouts
      prisma.cashoutRequest.count({
        where: { status: 'FAILED' }
      }),
      
      // Total payouts this month
      prisma.cashoutRequest.count({
        where: {
          status: 'SUCCEEDED',
          updatedAt: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        }
      }),
      
      // Average processing time (in hours)
      prisma.$queryRaw`
        SELECT AVG(
          EXTRACT(EPOCH FROM (
            SELECT MIN(pt.updated_at) 
            FROM payout_transactions pt 
            WHERE pt.cashout_request_id = cr.id 
            AND pt.status = 'SUCCEEDED'
          ) - cr.created_at) / 3600
        ) as avg_processing_time
        FROM cashout_requests cr
        WHERE cr.status = 'SUCCEEDED'
      `
    ])

    // Extract values from aggregate results
    const amountToday = totalAmountToday._sum.cashAmount || 0
    const avgTime = (averageProcessingTime as any[])[0]?.avg_processing_time || 0

    return NextResponse.json({
      pendingPayouts,
      totalPayoutsToday,
      totalAmountToday: Number(amountToday),
      failedPayouts,
      totalPayoutsThisMonth,
      averageProcessingTime: Math.round(avgTime * 10) / 10
    })

  } catch (error) {
    console.error('Error fetching finance stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}