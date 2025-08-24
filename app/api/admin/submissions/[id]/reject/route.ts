import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAccessToken } from '@/lib/auth'
import { z } from 'zod'

const rejectSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required')
})

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

    // Parse request body
    const body = await request.json()
    const { reason } = rejectSchema.parse(body)

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

    // Check if submission can be rejected
    if (submission.status === 'REJECTED') {
      return NextResponse.json(
        { error: 'Submission is already rejected' },
        { status: 400 }
      )
    }

    if (submission.status === 'APPROVED') {
      return NextResponse.json(
        { error: 'Cannot reject an approved submission' },
        { status: 400 }
      )
    }

    // Update submission status
    await prisma.videoSubmission.update({
      where: { id: submissionId },
      data: {
        status: 'REJECTED',
        rejectionReason: reason
      }
    })

    // Create rejection event
    await prisma.submissionEvent.create({
      data: {
        submissionId: submissionId,
        actorId: payload.userId,
        eventType: 'REJECTED',
        meta: {
          moderatorId: payload.userId,
          moderatorRole: payload.role,
          rejectionReason: reason,
          previousStatus: submission.status,
          rejectedAt: new Date().toISOString()
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Submission rejected successfully',
      submission: {
        id: submissionId,
        status: 'REJECTED',
        rejectionReason: reason
      }
    })

  } catch (error) {
    console.error('Reject submission error:', error)
    
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