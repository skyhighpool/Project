import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAccessToken } from '@/lib/auth'
import { VideoProcessor } from '@/lib/video-processing'
import { z } from 'zod'

const submissionSchema = z.object({
  gpsLat: z.number().min(-90).max(90),
  gpsLng: z.number().min(-180).max(180),
  recordedAt: z.string().min(1, 'Recording time is required'),
  deviceHash: z.string().min(1, 'Device hash is required'),
  durationS: z.number().min(1, 'Duration must be at least 1 second'),
  sizeBytes: z.number().min(1, 'File size must be greater than 0'),
})

export async function POST(request: NextRequest) {
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

    // Parse form data
    const formData = await request.formData()
    const video = formData.get('video') as File
    const gpsLat = parseFloat(formData.get('gpsLat') as string)
    const gpsLng = parseFloat(formData.get('gpsLng') as string)
    const recordedAt = formData.get('recordedAt') as string
    const deviceHash = formData.get('deviceHash') as string
    const durationS = parseInt(formData.get('durationS') as string) || 0
    const sizeBytes = parseInt(formData.get('sizeBytes') as string) || 0

    // Validate input
    const validationResult = submissionSchema.safeParse({
      gpsLat,
      gpsLng,
      recordedAt,
      deviceHash,
      durationS,
      sizeBytes
    })

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input data', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    if (!video) {
      return NextResponse.json(
        { error: 'Video file is required' },
        { status: 400 }
      )
    }

    // Validate video file
    if (!video.type.startsWith('video/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only video files are allowed.' },
        { status: 400 }
      )
    }

    const maxSize = 100 * 1024 * 1024 // 100MB
    if (video.size > maxSize) {
      return NextResponse.json(
        { error: 'File size too large. Maximum size is 100MB.' },
        { status: 400 }
      )
    }

    // For now, we'll use a placeholder S3 key
    // In a real implementation, you'd upload to S3 here
    const s3Key = `videos/${payload.userId}/${Date.now()}-${video.name}`
    const thumbKey = `thumbnails/${payload.userId}/${Date.now()}-thumb.jpg`

    // Create submission with initial status
    const submission = await prisma.videoSubmission.create({
      data: {
        userId: payload.userId,
        s3Key,
        thumbKey,
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

    // Create submission event
    await prisma.submissionEvent.create({
      data: {
        submissionId: submission.id,
        actorId: payload.userId,
        eventType: 'CREATED',
        meta: {
          fileSize: sizeBytes,
          duration: durationS,
          deviceHash,
          gpsCoordinates: { lat: gpsLat, lng: gpsLng }
        }
      }
    })

    // TODO: Add video to processing queue
    // This would trigger the video processing pipeline
    // For now, we'll simulate immediate processing

    // Simulate video processing and scoring
    setTimeout(async () => {
      try {
        const validationResult = await VideoProcessor.validateSubmission({
          gpsLat,
          gpsLng,
          recordedAt: new Date(recordedAt),
          deviceHash,
          durationS,
          s3Key
        }, payload.userId)

        const status = VideoProcessor.determineStatus(validationResult.score.totalScore)

        await prisma.videoSubmission.update({
          where: { id: submission.id },
          data: {
            status,
            autoScore: validationResult.score.totalScore,
            binIdGuess: null // TODO: Implement bin location matching
          }
        })

        // Create status event
        await prisma.submissionEvent.create({
          data: {
            submissionId: submission.id,
            actorId: payload.userId,
            eventType: status === 'AUTO_VERIFIED' ? 'AUTO_VERIFIED' : 'NEEDS_REVIEW',
            meta: {
              score: validationResult.score,
              status,
              validationResult
            }
          }
        })

        // If auto-approved, award points
        if (status === 'AUTO_VERIFIED') {
          const pointsToAward = VideoProcessor.getPointsForApproval()
          
          await prisma.userWallet.update({
            where: { userId: payload.userId },
            data: {
              pointsBalance: {
                increment: pointsToAward
              }
            }
          })

          await prisma.submissionEvent.create({
            data: {
              submissionId: submission.id,
              actorId: payload.userId,
              eventType: 'APPROVED',
              meta: {
                pointsAwarded: pointsToAward,
                autoApproved: true
              }
            }
          })
        }

      } catch (error) {
        console.error('Error processing submission:', error)
        
        // Update submission to failed status
        await prisma.videoSubmission.update({
          where: { id: submission.id },
          data: {
            status: 'REJECTED',
            rejectionReason: 'Processing failed'
          }
        })
      }
    }, 2000) // Simulate 2 second processing time

    return NextResponse.json({
      success: true,
      submission: {
        id: submission.id,
        status: submission.status,
        message: 'Video submitted successfully and queued for processing'
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Create submission error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    // Build where clause
    const where: any = { userId: payload.userId }
    if (status && status !== 'all') {
      where.status = status
    }

    // Get submissions with pagination
    const [submissions, total] = await Promise.all([
      prisma.videoSubmission.findMany({
        where,
        include: {
          binLocation: {
            select: {
              name: true,
              lat: true,
              lng: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.videoSubmission.count({ where })
    ])

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      success: true,
      data: submissions.map(submission => ({
        id: submission.id,
        status: submission.status,
        s3Key: submission.s3Key,
        thumbKey: submission.thumbKey,
        durationS: submission.durationS,
        sizeBytes: submission.sizeBytes.toString(),
        deviceHash: submission.deviceHash,
        gpsLat: submission.gpsLat,
        gpsLng: submission.gpsLng,
        recordedAt: submission.recordedAt,
        binLocation: submission.binLocation,
        autoScore: submission.autoScore,
        rejectionReason: submission.rejectionReason,
        createdAt: submission.createdAt,
        updatedAt: submission.updatedAt
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    })

  } catch (error) {
    console.error('Get submissions error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}