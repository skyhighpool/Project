import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAccessToken } from '@/lib/auth'

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

    // Get user with wallet
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { wallet: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get submission statistics
    const [submissions, cashouts] = await Promise.all([
      prisma.videoSubmission.findMany({
        where: { userId: payload.userId },
        select: {
          status: true,
          createdAt: true,
          autoScore: true,
          points: true
        }
      }),
      prisma.cashoutRequest.findMany({
        where: { userId: payload.userId },
        select: {
          status: true,
          cashAmount: true,
          pointsUsed: true,
          createdAt: true
        }
      })
    ])

    // Calculate statistics
    const totalSubmissions = submissions.length
    const approvedSubmissions = submissions.filter(s => s.status === 'APPROVED').length
    const rejectedSubmissions = submissions.filter(s => s.status === 'REJECTED').length
    const pendingReview = submissions.filter(s => s.status === 'NEEDS_REVIEW').length
    const autoVerified = submissions.filter(s => s.status === 'AUTO_VERIFIED').length

    // Calculate total points from approved submissions
    const totalPointsAwarded = submissions
      .filter(s => s.status === 'APPROVED')
      .reduce((sum, s) => sum + (s.points || 100), 0) // Default 100 points per approved submission

    // Calculate total cashouts
    const totalPayouts = cashouts
      .filter(c => c.status === 'SUCCEEDED')
      .reduce((sum, c) => sum + Number(c.cashAmount), 0)

    // Calculate average processing time (for approved submissions)
    const approvedSubmissionTimes = submissions
      .filter(s => s.status === 'APPROVED')
      .map(s => s.createdAt)
      .sort((a, b) => a.getTime() - b.getTime())

    let averageProcessingTime = 0
    if (approvedSubmissionTimes.length > 1) {
      const processingTimes = []
      for (let i = 1; i < approvedSubmissionTimes.length; i++) {
        const timeDiff = approvedSubmissionTimes[i].getTime() - approvedSubmissionTimes[i-1].getTime()
        processingTimes.push(timeDiff / (1000 * 60 * 60)) // Convert to hours
      }
      averageProcessingTime = processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
    }

    // Get recent activity
    const recentActivity = await prisma.submissionEvent.findMany({
      where: { 
        submission: { userId: payload.userId }
      },
      include: {
        submission: {
          select: {
            id: true,
            status: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    const stats = {
      totalSubmissions,
      approvedSubmissions,
      rejectedSubmissions,
      pendingReview,
      autoVerified,
      totalPointsAwarded,
      totalPayouts,
      averageProcessingTime: Math.round(averageProcessingTime * 100) / 100, // Round to 2 decimal places
      currentPointsBalance: user.wallet?.pointsBalance || 0,
      currentCashBalance: Number(user.wallet?.cashBalance || 0),
      lockedAmount: Number(user.wallet?.lockedAmount || 0),
      recentActivity: recentActivity.map(activity => ({
        id: activity.id,
        type: activity.eventType,
        submissionId: activity.submission.id,
        submissionStatus: activity.submission.status,
        createdAt: activity.createdAt,
        meta: activity.meta
      }))
    }

    return NextResponse.json({
      success: true,
      stats
    })

  } catch (error) {
    console.error('Get user stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}