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

    // Check if user is moderator or admin
    const user = await prisma.user.findUnique({
      where: { id: payload.userId }
    })

    if (!user || (user.role !== 'MODERATOR' && user.role !== 'COUNCIL' && user.role !== 'FINANCE')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Get today's date range
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)

    // Fetch statistics
    const [
      pendingReview,
      autoVerified,
      approvedToday,
      rejectedToday,
      totalSubmissions,
      averageProcessingTime
    ] = await Promise.all([
      // Submissions pending review
      prisma.videoSubmission.count({
        where: { status: 'NEEDS_REVIEW' }
      }),
      
      // Auto-verified submissions
      prisma.videoSubmission.count({
        where: { status: 'AUTO_VERIFIED' }
      }),
      
      // Approved today
      prisma.videoSubmission.count({
        where: {
          status: 'APPROVED',
          updatedAt: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      }),
      
      // Rejected today
      prisma.videoSubmission.count({
        where: {
          status: 'REJECTED',
          updatedAt: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      }),
      
      // Total submissions
      prisma.videoSubmission.count(),
      
      // Average processing time (in minutes)
      prisma.$queryRaw`
        SELECT AVG(
          EXTRACT(EPOCH FROM (
            SELECT MIN(se.created_at) 
            FROM submission_events se 
            WHERE se.submission_id = vs.id 
            AND se.event_type IN ('APPROVED', 'REJECTED')
          ) - vs.created_at) / 60
        ) as avg_processing_time
        FROM video_submissions vs
        WHERE vs.status IN ('APPROVED', 'REJECTED')
      `
    ])

    // Extract average processing time from raw query result
    const avgTimeResult = averageProcessingTime as any[]
    const avgProcessingTime = avgTimeResult[0]?.avg_processing_time || 0

    return NextResponse.json({
      pendingReview,
      autoVerified,
      approvedToday,
      rejectedToday,
      totalSubmissions,
      averageProcessingTime: Math.round(avgProcessingTime)
    })

  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}