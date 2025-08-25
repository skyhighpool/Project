import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

// Validation schema for moderation actions
const ModerationActionSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional(),
  pointsAwarded: z.number().min(0).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is moderator or admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || (user.role !== 'MODERATOR' && user.role !== 'COUNCIL')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'NEEDS_REVIEW';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = { status };
    
    // Add filters for different statuses
    if (status === 'NEEDS_REVIEW') {
      where.status = 'NEEDS_REVIEW';
    } else if (status === 'QUEUED') {
      where.status = 'QUEUED';
    } else if (status === 'all') {
      delete where.status;
    }

    const [submissions, total] = await Promise.all([
      prisma.videoSubmission.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          binLocation: true,
          events: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
        orderBy: [
          { status: 'asc' }, // QUEUED first, then NEEDS_REVIEW
          { createdAt: 'asc' }, // Oldest first
        ],
        skip: offset,
        take: limit,
      }),
      prisma.videoSubmission.count({ where }),
    ]);

    // Calculate statistics
    const stats = await prisma.videoSubmission.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
    });

    const statusCounts = stats.reduce((acc, stat) => {
      acc[stat.status] = stat._count.status;
      return acc;
    }, {} as Record<string, number>);

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
      stats: {
        total: total,
        byStatus: statusCounts,
      },
    });
  } catch (error) {
    console.error('Admin get submissions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is moderator or admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || (user.role !== 'MODERATOR' && user.role !== 'COUNCIL')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { submissionId, ...actionData } = body;
    
    if (!submissionId) {
      return NextResponse.json({ error: 'Submission ID is required' }, { status: 400 });
    }

    const validatedAction = ModerationActionSchema.parse(actionData);

    // Get the submission
    const submission = await prisma.videoSubmission.findUnique({
      where: { id: submissionId },
      include: {
        user: true,
        binLocation: true,
      },
    });

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Check if submission can be moderated
    if (submission.status !== 'NEEDS_REVIEW' && submission.status !== 'QUEUED') {
      return NextResponse.json(
        { error: 'Submission cannot be moderated in its current status' },
        { status: 400 }
      );
    }

    let newStatus: string;
    let pointsAwarded = 0;

    if (validatedAction.action === 'approve') {
      newStatus = 'APPROVED';
      pointsAwarded = validatedAction.pointsAwarded || 100; // Default 100 points
      
      // Award points to user
      await prisma.userWallet.update({
        where: { userId: submission.userId },
        data: {
          pointsBalance: { increment: pointsAwarded },
        },
      });
    } else {
      newStatus = 'REJECTED';
    }

    // Update submission status
    await prisma.videoSubmission.update({
      where: { id: submissionId },
      data: {
        status: newStatus as any,
        rejectionReason: validatedAction.action === 'reject' ? validatedAction.reason : null,
      },
    });

    // Create moderation event
    await prisma.submissionEvent.create({
      data: {
        submissionId,
        actorId: session.user.id,
        eventType: validatedAction.action === 'approve' ? 'APPROVED' : 'REJECTED',
        meta: {
          action: validatedAction.action,
          reason: validatedAction.reason,
          pointsAwarded: validatedAction.action === 'approve' ? pointsAwarded : 0,
          moderatorId: session.user.id,
          moderatorRole: user.role,
        },
      },
    });

    // If approved, create approval event
    if (validatedAction.action === 'approve') {
      await prisma.submissionEvent.create({
        data: {
          submissionId,
          actorId: submission.userId,
          eventType: 'APPROVED',
          meta: {
            pointsAwarded,
            approvedBy: session.user.id,
            approvedAt: new Date().toISOString(),
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      submission: {
        id: submissionId,
        status: newStatus,
        pointsAwarded: validatedAction.action === 'approve' ? pointsAwarded : 0,
        moderatedBy: session.user.id,
        moderatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Admin moderate submission error:', error);
    
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