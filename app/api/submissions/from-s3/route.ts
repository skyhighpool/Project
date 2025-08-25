import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAccessToken } from '@/lib/auth'
import { VideoProcessor } from '@/lib/video-processing'
import { processVideo } from '@/lib/video-processor'
import { enqueueSubmissionJob } from '@/lib/queue'
import { z } from 'zod'

const schema = z.object({
  s3Key: z.string().min(1),
  gpsLat: z.number().min(-90).max(90),
  gpsLng: z.number().min(-180).max(180),
  recordedAt: z.string().min(1),
  deviceHash: z.string().min(1),
  durationS: z.number().min(1),
  sizeBytes: z.number().min(1)
})

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 })
    }
    const token = authHeader.substring(7)
    const payload = verifyAccessToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.errors }, { status: 400 })
    }
    const { s3Key, gpsLat, gpsLng, recordedAt, deviceHash, durationS, sizeBytes } = parsed.data

    const submission = await prisma.videoSubmission.create({
      data: {
        userId: payload.userId,
        s3Key,
        thumbKey: null,
        durationS,
        sizeBytes: BigInt(sizeBytes),
        deviceHash,
        gpsLat,
        gpsLng,
        recordedAt: new Date(recordedAt),
        status: 'QUEUED',
        autoScore: null,
        binIdGuess: null,
        rejectionReason: null
      }
    })

    await prisma.submissionEvent.create({
      data: {
        submissionId: submission.id,
        actorId: payload.userId,
        eventType: 'CREATED',
        meta: { s3Key, fileSize: sizeBytes, duration: durationS, deviceHash, gpsCoordinates: { lat: gpsLat, lng: gpsLng } }
      }
    })

    // Enqueue background job
    await enqueueSubmissionJob({
      submissionId: submission.id,
      s3Key,
      userId: payload.userId,
      gpsLat,
      gpsLng,
      recordedAt,
      deviceHash
    })

    return NextResponse.json({ success: true, submission: { id: submission.id, status: submission.status } }, { status: 201 })
  } catch (error) {
    console.error('from-s3 submission error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

