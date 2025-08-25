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

    // Check if user is council or admin
    const user = await prisma.user.findUnique({
      where: { id: payload.userId }
    })

    if (!user || (user.role !== 'COUNCIL' && user.role !== 'FINANCE')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // For now, return mock analytics data
    // In a real implementation, this would query actual analytics data
    const mockAnalyticsData = {
      submissionsByDay: [
        { date: '2024-01-01', count: 15 },
        { date: '2024-01-02', count: 23 },
        { date: '2024-01-03', count: 18 },
        { date: '2024-01-04', count: 31 },
        { date: '2024-01-05', count: 27 }
      ],
      participationByLocation: [
        { location: 'Downtown', count: 45 },
        { location: 'Suburbs', count: 32 },
        { location: 'Industrial Area', count: 18 },
        { location: 'Residential', count: 28 }
      ],
      pointsDistribution: [
        { range: '0-100', users: 25 },
        { range: '101-500', users: 45 },
        { range: '501-1000', users: 30 },
        { range: '1000+', users: 15 }
      ],
      recentActivity: [
        {
          id: '1',
          type: 'submission_approved',
          user: 'John Doe',
          points: 100,
          timestamp: new Date().toISOString()
        },
        {
          id: '2',
          type: 'cashout_processed',
          user: 'Jane Smith',
          amount: 25.50,
          timestamp: new Date().toISOString()
        }
      ]
    }

    return NextResponse.json(mockAnalyticsData)

  } catch (error) {
    console.error('Error fetching analytics data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}