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

    if (!reason) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      )
    }

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
        { error: 'Submission cannot be rejected in its current status' },
        { status: 400 }
      )
    }

    // Start transaction
    await prisma.$transaction(async (tx) => {
      // Update submission status
      await tx.videoSubmission.update({
        where: { id: submissionId },
        data: {
          status: 'REJECTED',
          rejectionReason: reason
        }
      })

      // Create audit event
      await tx.submissionEvent.create({
        data: {
          submissionId,
          actorId: payload.userId,
          eventType: 'REJECTED',
          meta: {
            reason,
            fraudFlag,
            userFlag,
            moderatorId: payload.userId,
            moderatorName: user.name
          }
        }
      })

      // Flag user if requested
      if (userFlag) {
        // This could create a user flag record in a separate table
        console.log(`User ${submission.userId} flagged for review`)
      }

      // If fraud is detected, take additional actions
      if (fraudFlag) {
        // This could trigger additional fraud detection measures
        console.log(`Fraud detected for submission ${submissionId}`)
      }
    })

    return NextResponse.json({
      message: 'Submission rejected successfully'
    })

  } catch (error) {
    console.error('Error rejecting submission:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}