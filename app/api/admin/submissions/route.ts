import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication and moderator role
    const authResult = await verifyToken(request)
    if (!authResult.success || !['MODERATOR', 'ADMIN'].includes(authResult.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'NEEDS_REVIEW'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}
    if (status !== 'ALL') {
      where.status = status
    }

    // Fetch submissions with user and bin location details
    const [submissions, total] = await Promise.all([
      prisma.videoSubmission.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          binLocation: {
            select: {
              id: true,
              name: true,
              lat: true,
              lng: true,
              radiusM: true
            }
          }
        },
        orderBy: [
          { autoScore: 'asc' }, // Lower scores first (higher risk)
          { createdAt: 'asc' }  // Older submissions first
        ],
        skip,
        take: limit
      }),
      prisma.videoSubmission.count({ where })
    ])

    return NextResponse.json({
      submissions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching admin submissions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}