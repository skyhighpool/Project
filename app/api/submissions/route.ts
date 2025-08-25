import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { Queue } from 'bullmq';
import { redis } from '@/lib/redis';

// Redis connection for job queue
const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

// Create job queue for video processing
const videoProcessingQueue = new Queue('video-processing', {
  connection: redisConnection,
});

// Validation schema for video submission
const VideoSubmissionSchema = z.object({
  s3Key: z.string(),
  gpsLat: z.number().min(-90).max(90),
  gpsLng: z.number().min(-180).max(180),
  recordedAt: z.string().datetime(),
  deviceHash: z.string(),
  duration: z.number().positive(),
  sizeBytes: z.number().positive(),
});

// Calculate distance between two GPS coordinates (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c * 1000; // Convert to meters
}

// Auto-verification scoring system
function calculateAutoScore(
  gpsDistance: number,
  duration: number,
  sizeBytes: number,
  isDuplicate: boolean,
  timeDiff: number
): number {
  let score = 0;
  
  // GPS validation (40% weight)
  if (gpsDistance <= 50) score += 40; // Within 50m of bin
  else if (gpsDistance <= 100) score += 30;
  else if (gpsDistance <= 200) score += 20;
  else if (gpsDistance <= 500) score += 10;
  
  // Duration validation (20% weight)
  if (duration >= 10 && duration <= 300) score += 20; // 10s to 5min
  else if (duration >= 5 && duration <= 600) score += 15;
  else if (duration >= 3 && duration <= 900) score += 10;
  
  // File size validation (15% weight)
  const sizeMB = sizeBytes / (1024 * 1024);
  if (sizeMB >= 1 && sizeMB <= 100) score += 15; // 1MB to 100MB
  else if (sizeMB >= 0.5 && sizeMB <= 200) score += 10;
  
  // Duplicate check (15% weight)
  if (!isDuplicate) score += 15;
  
  // Time validation (10% weight)
  const timeDiffHours = Math.abs(timeDiff) / (1000 * 60 * 60);
  if (timeDiffHours <= 24) score += 10; // Within 24 hours
  else if (timeDiffHours <= 48) score += 5;
  
  return Math.min(score, 100);
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = VideoSubmissionSchema.parse(body);

    // Check if user has reached daily submission limit (10 submissions per day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaySubmissions = await prisma.videoSubmission.count({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    if (todaySubmissions >= 10) {
      return NextResponse.json(
        { error: 'Daily submission limit reached (10 submissions per day)' },
        { status: 429 }
      );
    }

    // Find nearest bin location
    const binLocations = await prisma.binLocation.findMany({
      where: { active: true },
    });

    let nearestBin = null;
    let minDistance = Infinity;

    for (const bin of binLocations) {
      const distance = calculateDistance(
        validatedData.gpsLat,
        validatedData.gpsLng,
        bin.lat,
        bin.lng
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestBin = bin;
      }
    }

    // Check if within any bin's radius
    const isWithinBinRadius = nearestBin && minDistance <= nearestBin.radiusM;

    // Check for duplicate videos (basic hash check)
    const recentSubmissions = await prisma.videoSubmission.findMany({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const isDuplicate = recentSubmissions.some(
      submission => submission.deviceHash === validatedData.deviceHash
    );

    // Calculate time difference
    const recordedTime = new Date(validatedData.recordedAt);
    const timeDiff = Date.now() - recordedTime.getTime();

    // Calculate auto-verification score
    const autoScore = calculateAutoScore(
      minDistance,
      validatedData.duration,
      validatedData.sizeBytes,
      isDuplicate,
      timeDiff
    );

    // Determine submission status based on score
    let status = 'QUEUED';
    if (autoScore >= 80) {
      status = 'AUTO_VERIFIED';
    } else if (autoScore >= 50) {
      status = 'NEEDS_REVIEW';
    } else {
      status = 'REJECTED';
    }

    // Create video submission
    const submission = await prisma.videoSubmission.create({
      data: {
        userId: session.user.id,
        s3Key: validatedData.s3Key,
        durationS: validatedData.duration,
        sizeBytes: BigInt(validatedData.sizeBytes),
        deviceHash: validatedData.deviceHash,
        gpsLat: validatedData.gpsLat,
        gpsLng: validatedData.gpsLng,
        recordedAt: recordedTime,
        binIdGuess: nearestBin?.id,
        autoScore,
        status: status as any,
        rejectionReason: status === 'REJECTED' ? 'Auto-rejected due to low score' : null,
      },
    });

    // Create submission event
    await prisma.submissionEvent.create({
      data: {
        submissionId: submission.id,
        actorId: session.user.id,
        eventType: 'CREATED',
        meta: {
          autoScore,
          gpsDistance: minDistance,
          nearestBin: nearestBin?.name,
          isWithinBinRadius,
          isDuplicate,
          timeDiff,
        },
      },
    });

    // If auto-verified, credit points immediately
    if (status === 'AUTO_VERIFIED') {
      const pointsEarned = 100; // Base points for auto-verified submission
      
      await prisma.userWallet.update({
        where: { userId: session.user.id },
        data: {
          pointsBalance: { increment: pointsEarned },
        },
      });

      await prisma.submissionEvent.create({
        data: {
          submissionId: submission.id,
          actorId: session.user.id,
          eventType: 'AUTO_VERIFIED',
          meta: {
            pointsEarned,
            autoScore,
          },
        },
      });
    }

    // Add job to processing queue for thumbnail generation and further analysis
    await videoProcessingQueue.add('process-video', {
      submissionId: submission.id,
      s3Key: validatedData.s3Key,
      userId: session.user.id,
    }, {
      delay: 1000, // 1 second delay
    });

    return NextResponse.json({
      success: true,
      submission: {
        id: submission.id,
        status: submission.status,
        autoScore: submission.autoScore,
        pointsEarned: status === 'AUTO_VERIFIED' ? 100 : 0,
        estimatedReviewTime: status === 'NEEDS_REVIEW' ? '24-48 hours' : null,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Video submission error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    const where: any = { userId: session.user.id };
    if (status) {
      where.status = status;
    }

    const [submissions, total] = await Promise.all([
      prisma.videoSubmission.findMany({
        where,
        include: {
          binLocation: true,
          events: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.videoSubmission.count({ where }),
    ]);

    return NextResponse.json({
      submissions: submissions.map(submission => ({
        ...submission,
        sizeBytes: Number(submission.sizeBytes),
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get submissions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}