import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAccessToken } from '@/lib/auth'
import { VideoProcessor } from '@/lib/video-processing'
import { uploadVideo, processVideo } from '@/lib/video-processor'
import { validateLocation } from '@/lib/location-validator'
import { z } from 'zod'

const enhancedSubmissionSchema = z.object({
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
    const validationResult = enhancedSubmissionSchema.safeParse({
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

    // Convert File to Buffer for processing
    const videoBuffer = Buffer.from(await video.arrayBuffer())

    // Create initial submission record
    const submission = await prisma.videoSubmission.create({
      data: {
        userId: payload.userId,
        s3Key: '', // Will be updated after S3 upload
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

    // Process video asynchronously
    processVideoSubmission(submission.id, videoBuffer, {
      userId: payload.userId,
      gpsLat,
      gpsLng,
      recordedAt,
      deviceHash,
      durationS,
      sizeBytes
    })

    return NextResponse.json({
      success: true,
      submission: {
        id: submission.id,
        status: submission.status,
        message: 'Video submitted successfully and queued for processing'
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Enhanced submission error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Process video submission asynchronously
 */
async function processVideoSubmission(
  submissionId: string,
  videoBuffer: Buffer,
  metadata: {
    userId: string
    gpsLat: number
    gpsLng: number
    recordedAt: string
    deviceHash: string
    durationS: number
    sizeBytes: number
  }
) {
  try {
    console.log(`Starting video processing for submission ${submissionId}`)

    // Step 1: Upload video to S3
    const s3Result = await uploadVideo(
      videoBuffer,
      metadata.userId,
      `submission-${submissionId}.mp4`,
      {
        submissionId,
        deviceHash: metadata.deviceHash,
        recordedAt: metadata.recordedAt
      }
    )

    // Update submission with S3 key
    await prisma.videoSubmission.update({
      where: { id: submissionId },
      data: { s3Key: s3Result.key }
    })

    // Step 2: Process video (extract metadata, generate thumbnail)
    const processingResult = await processVideo(
      videoBuffer,
      metadata.userId,
      submissionId
    )

    if (!processingResult.success) {
      throw new Error(processingResult.error || 'Video processing failed')
    }

    // Update submission with thumbnail and metadata
    await prisma.videoSubmission.update({
      where: { id: submissionId },
      data: {
        thumbKey: processingResult.thumbnailKey,
        durationS: Math.round(processingResult.metadata!.duration)
      }
    })

    // Step 3: Validate GPS location
    const locationValidation = await validateLocation(metadata.gpsLat, metadata.gpsLng)
    
    let binIdGuess = null
    if (locationValidation.nearestBin) {
      binIdGuess = locationValidation.nearestBin.id
    }

    // Step 4: Run comprehensive validation and scoring
    const validationResult = await VideoProcessor.validateSubmission({
      gpsLat: metadata.gpsLat,
      gpsLng: metadata.gpsLng,
      recordedAt: new Date(metadata.recordedAt),
      deviceHash: metadata.deviceHash,
      durationS: Math.round(processingResult.metadata!.duration),
      s3Key: s3Result.key
    }, metadata.userId)

    // Combine location score with other scores
    const finalScore = (validationResult.score.totalScore + locationValidation.score) / 2

    // Determine final status
    const status = VideoProcessor.determineStatus(finalScore)

    // Update submission with final results
    await prisma.videoSubmission.update({
      where: { id: submissionId },
      data: {
        status,
        autoScore: finalScore,
        binIdGuess,
        rejectionReason: status === 'REJECTED' ? 'Failed validation checks' : null
      }
    })

    // Create status event
    await prisma.submissionEvent.create({
      data: {
        submissionId,
        actorId: metadata.userId,
        eventType: status === 'AUTO_VERIFIED' ? 'AUTO_VERIFIED' : 'NEEDS_REVIEW',
        meta: {
          score: validationResult.score,
          locationScore: locationValidation.score,
          finalScore,
          status,
          s3Key: s3Result.key,
          thumbnailKey: processingResult.thumbnailKey,
          processingResult,
          locationValidation
        }
      }
    })

    // If auto-approved, award points
    if (status === 'AUTO_VERIFIED') {
      const pointsToAward = VideoProcessor.getPointsForApproval()
      
      await prisma.userWallet.update({
        where: { userId: metadata.userId },
        data: {
          pointsBalance: {
            increment: pointsToAward
          }
        }
      })

      await prisma.submissionEvent.create({
        data: {
          submissionId,
          actorId: metadata.userId,
          eventType: 'APPROVED',
          meta: {
            pointsAwarded: pointsToAward,
            autoApproved: true,
            finalScore
          }
        }
      })

      console.log(`Submission ${submissionId} auto-approved. ${pointsToAward} points awarded.`)
    } else if (status === 'REJECTED') {
      console.log(`Submission ${submissionId} rejected. Score: ${finalScore}`)
    } else {
      console.log(`Submission ${submissionId} needs review. Score: ${finalScore}`)
    }

  } catch (error) {
    console.error(`Error processing submission ${submissionId}:`, error)
    
    // Update submission to failed status
    await prisma.videoSubmission.update({
      where: { id: submissionId },
      data: {
        status: 'REJECTED',
        rejectionReason: `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    })

    // Create failure event
    await prisma.submissionEvent.create({
      data: {
        submissionId,
        actorId: metadata.userId,
        eventType: 'REJECTED',
        meta: {
          error: error instanceof Error ? error.message : 'Unknown error',
          processingFailed: true
        }
      }
    })
  }
}