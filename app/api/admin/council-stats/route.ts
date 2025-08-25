import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication and council role
    const authResult = await verifyToken(request)
    if (!authResult.success || !['COUNCIL', 'ADMIN'].includes(authResult.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get date ranges
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    // Fetch statistics
    const [
      totalParticipants,
      activeThisMonth,
      totalSubmissions,
      verifiedSubmissions,
      totalPayouts,
      averageParticipation,
      costPerKg,
      participationGrowth
    ] = await Promise.all([
      // Total participants
      prisma.user.count({
        where: { role: 'TOURIST' }
      }),

      // Active this month
      prisma.user.count({
        where: {
          role: 'TOURIST',
          submissions: {
            some: {
              createdAt: {
                gte: startOfMonth
              }
            }
          }
        }
      }),

      // Total submissions
      prisma.videoSubmission.count(),

      // Verified submissions
      prisma.videoSubmission.count({
        where: { status: 'APPROVED' }
      }),

      // Total payouts
      prisma.cashoutRequest.aggregate({
        where: { status: 'SUCCEEDED' },
        _sum: { cashAmount: true }
      }),

      // Average participation (submissions per user)
      prisma.$queryRaw`
        SELECT AVG(submission_count) as avg_participation
        FROM (
          SELECT COUNT(*) as submission_count
          FROM video_submissions vs
          JOIN users u ON vs.user_id = u.id
          WHERE u.role = 'TOURIST'
          GROUP BY u.id
        ) user_submissions
      `,

      // Cost per kg (placeholder - would be calculated based on actual waste data)
      Promise.resolve(0.25),

      // Participation growth (this month vs last month)
      Promise.all([
        prisma.user.count({
          where: {
            role: 'TOURIST',
            submissions: {
              some: {
                createdAt: {
                  gte: startOfMonth
                }
              }
            }
          }
        }),
        prisma.user.count({
          where: {
            role: 'TOURIST',
            submissions: {
              some: {
                createdAt: {
                  gte: startOfLastMonth,
                  lt: startOfMonth
                }
              }
            }
          }
        })
      ])
    ])

    // Calculate participation growth
    const [currentMonth, lastMonth] = participationGrowth
    const growthPercentage = lastMonth > 0 
      ? ((currentMonth - lastMonth) / lastMonth) * 100 
      : 0

    // Extract average participation from raw query
    const avgParticipation = Array.isArray(averageParticipation) && averageParticipation[0]
      ? Number(averageParticipation[0].avg_participation) || 0
      : 0

    return NextResponse.json({
      totalParticipants,
      activeThisMonth,
      totalSubmissions,
      verifiedSubmissions,
      totalPayouts: totalPayouts._sum.cashAmount || 0,
      averageParticipation: Math.round(avgParticipation),
      costPerKg,
      participationGrowth: Math.round(growthPercentage)
    })

  } catch (error) {
    console.error('Error fetching council stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}