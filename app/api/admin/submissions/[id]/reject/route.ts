import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { z } from 'zod'

const rejectSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required')
})

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
    const body = await request.json()
    const { reason } = rejectSchema.parse(body)

    // Get the submission
    const submission = await prisma.videoSubmission.findUnique({
      where: { id: submissionId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
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

    if (submission.status === 'REJECTED') {
      return NextResponse.json(
        { error: 'Submission already rejected' },
        { status: 400 }
      )
    }

    if (submission.status === 'APPROVED') {
      return NextResponse.json(
        { error: 'Cannot reject an approved submission' },
        { status: 400 }
      )
    }

    // Use a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Update submission status
      const updatedSubmission = await tx.videoSubmission.update({
        where: { id: submissionId },
        data: {
          status: 'REJECTED',
          rejectionReason: reason,
          updatedAt: new Date()
        }
      })

      // Create audit event
      await tx.submissionEvent.create({
        data: {
          submissionId,
          actorId: authResult.user.userId,
          eventType: 'REJECTED',
          meta: {
            reason,
            moderatorId: authResult.user.userId,
            moderatorName: authResult.user.name || 'Unknown'
          }
        }
      })

      return updatedSubmission
    })

    return NextResponse.json({
      success: true,
      message: 'Submission rejected successfully',
      submission: result
    })

  } catch (error) {
    console.error('Error rejecting submission:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}