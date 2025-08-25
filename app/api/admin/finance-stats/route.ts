import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication and finance role
    const authResult = await verifyToken(request)
    if (!authResult.success || !['FINANCE', 'ADMIN'].includes(authResult.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get date ranges
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Fetch statistics
    const [
      pendingPayouts,
      initiatedPayouts,
      successfulPayouts,
      failedPayouts,
      totalAmountPending,
      totalAmountProcessed,
      averageProcessingTime,
      successRate
    ] = await Promise.all([
      // Pending payouts
      prisma.cashoutRequest.count({
        where: { status: 'PENDING' }
      }),

      // Initiated payouts
      prisma.cashoutRequest.count({
        where: { status: 'INITIATED' }
      }),

      // Successful payouts
      prisma.cashoutRequest.count({
        where: { 
          status: 'SUCCEEDED',
          updatedAt: {
            gte: startOfMonth
          }
        }
      }),

      // Failed payouts
      prisma.cashoutRequest.count({
        where: { 
          status: 'FAILED',
          updatedAt: {
            gte: startOfMonth
          }
        }
      }),

      // Total amount pending
      prisma.cashoutRequest.aggregate({
        where: { status: 'PENDING' },
        _sum: { cashAmount: true }
      }),

      // Total amount processed this month
      prisma.cashoutRequest.aggregate({
        where: {
          status: 'SUCCEEDED',
          updatedAt: {
            gte: startOfMonth
          }
        },
        _sum: { cashAmount: true }
      }),

      // Average processing time (in hours)
      prisma.$queryRaw`
        SELECT AVG(
          EXTRACT(EPOCH FROM (cr.updated_at - cr.created_at)) / 3600
        ) as avg_processing_time
        FROM cashout_requests cr
        WHERE cr.status IN ('SUCCEEDED', 'FAILED')
        AND cr.updated_at >= ${startOfMonth}
      `,

      // Success rate
      Promise.all([
        prisma.cashoutRequest.count({
          where: {
            status: 'SUCCEEDED',
            updatedAt: {
              gte: startOfMonth
            }
          }
        }),
        prisma.cashoutRequest.count({
          where: {
            status: { in: ['SUCCEEDED', 'FAILED'] },
            updatedAt: {
              gte: startOfMonth
            }
          }
        })
      ])
    ])

    // Calculate success rate
    const [successful, total] = successRate
    const successRatePercentage = total > 0 ? (successful / total) * 100 : 0

    // Extract average processing time from raw query
    const avgProcessingTime = Array.isArray(averageProcessingTime) && averageProcessingTime[0]
      ? Number(averageProcessingTime[0].avg_processing_time) || 0
      : 0

    return NextResponse.json({
      pendingPayouts,
      initiatedPayouts,
      successfulPayouts,
      failedPayouts,
      totalAmountPending: totalAmountPending._sum.cashAmount || 0,
      totalAmountProcessed: totalAmountProcessed._sum.cashAmount || 0,
      averageProcessingTime: Math.round(avgProcessingTime),
      successRate: Math.round(successRatePercentage)
    })

  } catch (error) {
    console.error('Error fetching finance stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}