import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAccessToken } from '@/lib/auth'
import { VideoProcessor } from '@/lib/video-processing'

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = _request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 })
    }
    const token = authHeader.substring(7)
    const payload = verifyAccessToken(token)
    if (!payload || payload.role !== 'MODERATOR') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const submission = await prisma.videoSubmission.update({
      where: { id: params.id },
      data: { status: 'APPROVED', rejectionReason: null }
    })

    const points = VideoProcessor.getPointsForApproval()
    await prisma.userWallet.update({
      where: { userId: submission.userId },
      data: { pointsBalance: { increment: points } }
    })

    await prisma.submissionEvent.create({
      data: {
        submissionId: submission.id,
        actorId: payload.userId,
        eventType: 'APPROVED',
        meta: { moderator: payload.userId, pointsAwarded: points }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Approve error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

