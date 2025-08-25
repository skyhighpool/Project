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

    // Check if user is council or admin
    const user = await prisma.user.findUnique({
      where: { id: payload.userId }
    })

    if (!user || (user.role !== 'COUNCIL' && user.role !== 'FINANCE')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Fetch council statistics
    const [
      totalParticipants,
      totalSubmissions,
      totalApproved,
      totalPointsAwarded,
      totalPayouts,
      averageParticipationRate
    ] = await Promise.all([
      // Total unique participants
      prisma.user.count({
        where: { role: 'TOURIST' }
      }),
      
      // Total submissions
      prisma.videoSubmission.count(),
      
      // Total approved submissions
      prisma.videoSubmission.count({
        where: { status: 'APPROVED' }
      }),
      
      // Total points awarded (sum of all wallet points)
      prisma.userWallet.aggregate({
        _sum: {
          pointsBalance: true
        }
      }),
      
      // Total payouts (sum of all cashout amounts)
      prisma.cashoutRequest.aggregate({
        where: { status: 'SUCCEEDED' },
        _sum: {
          cashAmount: true
        }
      }),
      
      // Average participation rate (submissions per user)
      prisma.$queryRaw`
        SELECT AVG(submission_count) as avg_participation
        FROM (
          SELECT COUNT(*) as submission_count
          FROM video_submissions
          GROUP BY user_id
        ) as user_submissions
      `
    ])

    // Extract values from aggregate results
    const pointsAwarded = totalPointsAwarded._sum.pointsBalance || 0
    const payouts = totalPayouts._sum.cashAmount || 0
    const avgParticipation = (averageParticipationRate as any[])[0]?.avg_participation || 0

    return NextResponse.json({
      totalParticipants,
      totalSubmissions,
      totalApproved,
      totalPointsAwarded: pointsAwarded,
      totalPayouts: Number(payouts),
      averageParticipationRate: Math.round(avgParticipation * 100) / 100
    })

  } catch (error) {
    console.error('Error fetching council stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}