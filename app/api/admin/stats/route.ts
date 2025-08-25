import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication and moderator role
    const authResult = await verifyToken(request)
    if (!authResult.success || !['MODERATOR', 'ADMIN'].includes(authResult.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get today's date range
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)

    // Fetch statistics
    const [
      pendingReview,
      autoVerified,
      approvedToday,
      rejectedToday,
      averageProcessingTime,
      fraudAlerts
    ] = await Promise.all([
      // Pending review count
      prisma.videoSubmission.count({
        where: { status: 'NEEDS_REVIEW' }
      }),

      // Auto-verified today
      prisma.videoSubmission.count({
        where: {
          status: 'AUTO_VERIFIED',
          createdAt: {
            gte: startOfDay,
            lt: endOfDay
          }
        }
      }),

      // Approved today
      prisma.videoSubmission.count({
        where: {
          status: 'APPROVED',
          updatedAt: {
            gte: startOfDay,
            lt: endOfDay
          }
        }
      }),

      // Rejected today
      prisma.videoSubmission.count({
        where: {
          status: 'REJECTED',
          updatedAt: {
            gte: startOfDay,
            lt: endOfDay
          }
        }
      }),

      // Average processing time (in minutes)
      prisma.$queryRaw`
        SELECT AVG(
          EXTRACT(EPOCH FROM (vs.updated_at - vs.created_at)) / 60
        ) as avg_processing_time
        FROM video_submissions vs
        WHERE vs.status IN ('APPROVED', 'REJECTED')
        AND vs.updated_at >= ${startOfDay}
        AND vs.updated_at < ${endOfDay}
      `,

      // Fraud alerts count (placeholder - would come from fraud detection system)
      Promise.resolve(0)
    ])

    // Extract average processing time from raw query result
    const avgProcessingTime = Array.isArray(averageProcessingTime) && averageProcessingTime[0] 
      ? Number(averageProcessingTime[0].avg_processing_time) || 0
      : 0

    return NextResponse.json({
      pendingReview,
      autoVerified,
      approvedToday,
      rejectedToday,
      averageProcessingTime: Math.round(avgProcessingTime),
      fraudAlerts
    })

  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}