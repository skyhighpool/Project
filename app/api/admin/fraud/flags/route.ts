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

    // For now, return mock user flag data
    // In a real implementation, this would query actual user flags from a separate table
    const mockUserFlags = [
      {
        id: '1',
        userId: 'user_123',
        userName: 'John Doe',
        userEmail: 'john@example.com',
        flagType: 'fraud',
        reason: 'Multiple duplicate submissions detected',
        submissionCount: 15,
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        userId: 'user_456',
        userName: 'Jane Smith',
        userEmail: 'jane@example.com',
        flagType: 'suspicious',
        reason: 'Unusual submission patterns',
        submissionCount: 8,
        createdAt: new Date().toISOString()
      }
    ]

    return NextResponse.json(mockUserFlags)

  } catch (error) {
    console.error('Error fetching user flags:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}