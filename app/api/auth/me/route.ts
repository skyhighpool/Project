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

    // Get user with wallet and recent submissions
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        wallet: true,
        submissions: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            createdAt: true,
            autoScore: true,
            rejectionReason: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Calculate some basic stats
    const stats = {
      totalSubmissions: user.submissions.length,
      approvedSubmissions: user.submissions.filter(s => s.status === 'APPROVED').length,
      rejectedSubmissions: user.submissions.filter(s => s.status === 'REJECTED').length,
      pendingReview: user.submissions.filter(s => s.status === 'NEEDS_REVIEW').length,
      totalPoints: user.wallet?.pointsBalance || 0,
      totalEarnings: user.wallet?.cashBalance || 0
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        kycStatus: user.kycStatus,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        wallet: user.wallet,
        recentSubmissions: user.submissions,
        stats
      }
    })

  } catch (error) {
    console.error('Get user profile error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}