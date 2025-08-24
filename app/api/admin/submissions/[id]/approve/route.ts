import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAccessToken } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Check if user has moderator privileges
    if (!['MODERATOR', 'COUNCIL'].includes(payload.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const submissionId = params.id

    // Get the submission
    const submission = await prisma.videoSubmission.findUnique({
      where: { id: submissionId },
      include: { user: true }
    })

    if (!submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      )
    }

    // Check if submission can be approved
    if (submission.status === 'APPROVED') {
      return NextResponse.json(
        { error: 'Submission is already approved' },
        { status: 400 }
      )
    }

    if (submission.status === 'REJECTED') {
      return NextResponse.json(
        { error: 'Cannot approve a rejected submission' },
        { status: 400 }
      )
    }

    // Award points to user (if not already awarded)
    let pointsAwarded = 0
    if (submission.status !== 'AUTO_VERIFIED') {
      // Calculate points based on submission quality
      const basePoints = 100
      const qualityBonus = submission.autoScore ? Math.floor(submission.autoScore * 50) : 0
      pointsAwarded = basePoints + qualityBonus

      // Update user wallet
      await prisma.userWallet.update({
        where: { userId: submission.userId },
        data: {
          pointsBalance: {
            increment: pointsAwarded
          }
        }
      })
    }

    // Update submission status
    await prisma.videoSubmission.update({
      where: { id: submissionId },
      data: {
        status: 'APPROVED'
      }
    })

    // Create approval event
    await prisma.submissionEvent.create({
      data: {
        submissionId: submissionId,
        actorId: payload.userId,
        eventType: 'APPROVED',
        meta: {
          moderatorId: payload.userId,
          moderatorRole: payload.role,
          pointsAwarded,
          previousStatus: submission.status,
          approvedAt: new Date().toISOString()
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Submission approved successfully',
      pointsAwarded,
      submission: {
        id: submissionId,
        status: 'APPROVED'
      }
    })

  } catch (error) {
    console.error('Approve submission error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}