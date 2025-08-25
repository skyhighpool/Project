import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication and moderator role
    const authResult = await verifyToken(request)
    if (!authResult.success || !['MODERATOR', 'ADMIN'].includes(authResult.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const submissionId = params.id

    // Get the submission with user details
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

    if (submission.status === 'APPROVED') {
      return NextResponse.json(
        { error: 'Submission already approved' },
        { status: 400 }
      )
    }

    if (submission.status === 'REJECTED') {
      return NextResponse.json(
        { error: 'Cannot approve a rejected submission' },
        { status: 400 }
      )
    }

    // Calculate points to award (configurable)
    const pointsToAward = 100 // Base points for approved submission

    // Use a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Update submission status
      const updatedSubmission = await tx.videoSubmission.update({
        where: { id: submissionId },
        data: {
          status: 'APPROVED',
          updatedAt: new Date()
        }
      })

      // Create or update user wallet
      if (submission.user.wallet) {
        await tx.userWallet.update({
          where: { userId: submission.userId },
          data: {
            pointsBalance: {
              increment: pointsToAward
            }
          }
        })
      } else {
        await tx.userWallet.create({
          data: {
            userId: submission.userId,
            pointsBalance: pointsToAward
          }
        })
      }

      // Create audit event
      await tx.submissionEvent.create({
        data: {
          submissionId,
          actorId: authResult.user.userId,
          eventType: 'APPROVED',
          meta: {
            pointsAwarded: pointsToAward,
            moderatorId: authResult.user.userId,
            moderatorName: authResult.user.name || 'Unknown'
          }
        }
      })

      return updatedSubmission
    })

    return NextResponse.json({
      success: true,
      message: 'Submission approved successfully',
      submission: result,
      pointsAwarded: pointsToAward
    })

  } catch (error) {
    console.error('Error approving submission:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}