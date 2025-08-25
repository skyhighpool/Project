import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAccessToken } from '@/lib/auth'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 })
    }
    const token = authHeader.substring(7)
    const payload = verifyAccessToken(token)
    if (!payload || payload.role !== 'MODERATOR') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { reason } = await request.json()
    if (!reason) return NextResponse.json({ error: 'Reason required' }, { status: 400 })

    const submission = await prisma.videoSubmission.update({
      where: { id: params.id },
      data: { status: 'REJECTED', rejectionReason: reason }
    })

    await prisma.submissionEvent.create({
      data: {
        submissionId: submission.id,
        actorId: payload.userId,
        eventType: 'REJECTED',
        meta: { moderator: payload.userId, reason }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Reject error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

