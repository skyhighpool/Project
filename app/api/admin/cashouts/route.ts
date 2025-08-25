import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAccessToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 })
    }
    const token = authHeader.substring(7)
    const payload = verifyAccessToken(token)
    if (!payload || (payload.role !== 'FINANCE' && payload.role !== 'MODERATOR')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'PENDING'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where: any = {}
    if (status !== 'all') where.status = status

    const [items, total] = await Promise.all([
      prisma.cashoutRequest.findMany({
        where,
        include: { user: { select: { id: true, email: true, name: true } }, payoutTransactions: true },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit
      }),
      prisma.cashoutRequest.count({ where })
    ])

    return NextResponse.json({ success: true, data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
  } catch (error) {
    console.error('Admin cashouts list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

