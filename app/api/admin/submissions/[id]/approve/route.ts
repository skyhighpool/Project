import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAccessToken } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const submissionId = params.id
    const body = await request.json()
    const { reason, fraudFlag, userFlag } = body

    // Get the submission
    const submission = await prisma.videoSubmission.findUnique({
      where: { id: submissionId },
      include: {
        user: {
          include: {
            wallet: true
          }
        }
      }
    })

    if (!submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      )
    }

    if (submission.status !== 'NEEDS_REVIEW' && submission.status !== 'QUEUED') {
      return NextResponse.json(
        { error: 'Submission cannot be approved in its current status' },
        { status: 400 }
      )
    }

    // Start transaction
    await prisma.$transaction(async (tx) => {
      // Update submission status
      await tx.videoSubmission.update({
        where: { id: submissionId },
        data: {
          status: 'APPROVED',
          rejectionReason: null
        }
      })

      // Create audit event
      await tx.submissionEvent.create({
        data: {
          submissionId,
          actorId: payload.userId,
          eventType: 'APPROVED',
          meta: {
            reason,
            fraudFlag,
            userFlag,
            moderatorId: payload.userId,
            moderatorName: user.name
          }
        }
      })

      // Award points to user (configurable points per approved submission)
      const pointsAwarded = 100 // This could be configurable
      await tx.userWallet.update({
        where: { userId: submission.userId },
        data: {
          pointsBalance: {
            increment: pointsAwarded
          }
        }
      })

      // Create audit event for points awarded
      await tx.submissionEvent.create({
        data: {
          submissionId,
          actorId: payload.userId,
          eventType: 'MODERATED',
          meta: {
            action: 'points_awarded',
            pointsAwarded,
            reason: 'Submission approved'
          }
        }
      })

      // Flag user if requested
      if (userFlag) {
        // This could create a user flag record in a separate table
        console.log(`User ${submission.userId} flagged for review`)
      }
    })

    return NextResponse.json({
      message: 'Submission approved successfully',
      pointsAwarded: 100
    })

  } catch (error) {
    console.error('Error approving submission:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}