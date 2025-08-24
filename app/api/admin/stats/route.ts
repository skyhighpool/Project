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

    // Check if user has admin privileges
    if (!['MODERATOR', 'COUNCIL', 'FINANCE'].includes(payload.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Get today's date range
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)

    // Get stats based on user role
    let stats: any = {}

    if (payload.role === 'MODERATOR') {
      // Moderator stats
      const [
        pendingReview,
        reviewedToday,
        autoApproved,
        flaggedSubmissions
      ] = await Promise.all([
        prisma.videoSubmission.count({
          where: { status: 'NEEDS_REVIEW' }
        }),
        prisma.submissionEvent.count({
          where: {
            eventType: { in: ['APPROVED', 'REJECTED'] },
            createdAt: { gte: startOfDay, lt: endOfDay }
          }
        }),
        prisma.videoSubmission.count({
          where: { 
            status: 'AUTO_VERIFIED',
            createdAt: { gte: startOfDay, lt: endOfDay }
          }
        }),
        prisma.videoSubmission.count({
          where: { 
            status: 'NEEDS_REVIEW',
            autoScore: { lt: 0.5 }
          }
        })
      ])

      stats = {
        pendingReview,
        reviewedToday,
        autoApproved,
        flaggedSubmissions
      }
    } else if (payload.role === 'COUNCIL') {
      // Council stats
      const [
        totalParticipants,
        totalSubmissions,
        totalPayouts,
        averageParticipation
      ] = await Promise.all([
        prisma.user.count({
          where: { role: 'TOURIST' }
        }),
        prisma.videoSubmission.count(),
        prisma.cashoutRequest.aggregate({
          _sum: { cashAmount: true }
        }),
        prisma.videoSubmission.groupBy({
          by: ['userId'],
          _count: { id: true }
        })
      ])

      const avgSubmissions = averageParticipation.length > 0 
        ? averageParticipation.reduce((acc, curr) => acc + curr._count.id, 0) / averageParticipation.length
        : 0

      stats = {
        totalParticipants,
        totalSubmissions,
        totalPayouts: totalPayouts._sum.cashAmount || 0,
        averageParticipation: Math.round(avgSubmissions * 10) / 10
      }
    } else if (payload.role === 'FINANCE') {
      // Finance stats
      const [
        pendingPayouts,
        totalPayoutsToday,
        failedTransactions,
        totalVolume
      ] = await Promise.all([
        prisma.cashoutRequest.count({
          where: { status: 'PENDING' }
        }),
        prisma.cashoutRequest.aggregate({
          where: { 
            status: 'SUCCEEDED',
            createdAt: { gte: startOfDay, lt: endOfDay }
          },
          _sum: { cashAmount: true }
        }),
        prisma.payoutTransaction.count({
          where: { status: 'FAILED' }
        }),
        prisma.cashoutRequest.aggregate({
          where: { status: 'SUCCEEDED' },
          _sum: { cashAmount: true }
        })
      ])

      stats = {
        pendingPayouts,
        totalPayoutsToday: totalPayoutsToday._sum.cashAmount || 0,
        failedTransactions,
        totalVolume: totalVolume._sum.cashAmount || 0
      }
    }

    return NextResponse.json({
      success: true,
      ...stats
    })

  } catch (error) {
    console.error('Get admin stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}