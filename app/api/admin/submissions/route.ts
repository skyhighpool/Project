import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAccessToken } from '@/lib/auth'

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

    // Check if user has admin privileges
    if (!['MODERATOR', 'COUNCIL', 'FINANCE'].includes(payload.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Build where clause
    const where: any = {}
    if (status && status !== 'all') {
      where.status = status
    }

    // Get submissions with pagination and user data
    const [submissions, total] = await Promise.all([
      prisma.videoSubmission.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          binLocation: {
            select: {
              name: true,
              lat: true,
              lng: true,
              radiusM: true
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
        updatedAt: submission.updatedAt,
        user: submission.user
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    })

  } catch (error) {
    console.error('Get admin submissions error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}