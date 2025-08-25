import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAccessToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
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

    // Check if user is moderator or admin
    const user = await prisma.user.findUnique({
      where: { id: payload.userId }
    })

    if (!user || (user.role !== 'MODERATOR' && user.role !== 'COUNCIL' && user.role !== 'FINANCE')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // For now, return mock fraud check data
    // In a real implementation, this would query actual fraud detection results
    const mockFraudChecks = [
      {
        id: '1',
        type: 'duplicate',
        severity: 'high',
        description: 'Potential duplicate video detected',
        details: {
          submissionId: 'sub_123',
          similarityScore: 0.95,
          originalSubmissionId: 'sub_456'
        },
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        type: 'gps',
        severity: 'medium',
        description: 'GPS coordinates outside expected range',
        details: {
          submissionId: 'sub_789',
          expectedRadius: 100,
          actualDistance: 150
        },
        createdAt: new Date().toISOString()
      }
    ]

    return NextResponse.json(mockFraudChecks)

  } catch (error) {
    console.error('Error fetching fraud checks:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}