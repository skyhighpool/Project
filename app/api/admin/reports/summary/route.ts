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
    if (!payload || (payload.role !== 'COUNCIL' && payload.role !== 'MODERATOR' && payload.role !== 'FINANCE')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 3600 * 1000)
    const toDate = to ? new Date(to) : new Date()

    const submissionsByDay = await prisma.$queryRawUnsafe<any[]>(
      `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, count(*)::int AS count
       FROM video_submissions WHERE created_at BETWEEN $1 AND $2 AND status IN ('AUTO_VERIFIED','APPROVED')
       GROUP BY 1 ORDER BY 1`, fromDate, toDate
    )

    const totalApproved = await prisma.videoSubmission.count({ where: { status: { in: ['AUTO_VERIFIED','APPROVED'] }, createdAt: { gte: fromDate, lte: toDate } } })
    const totalRejected = await prisma.videoSubmission.count({ where: { status: 'REJECTED', createdAt: { gte: fromDate, lte: toDate } } })
    const approvalRate = totalApproved + totalRejected > 0 ? totalApproved / (totalApproved + totalRejected) : 0

    const payouts = await prisma.cashoutRequest.findMany({ where: { createdAt: { gte: fromDate, lte: toDate } }, select: { cashAmount: true, status: true } })
    const payoutsIssued = payouts.filter(p => p.status === 'SUCCEEDED').reduce((s, p) => s + Number(p.cashAmount), 0)

    return NextResponse.json({
      success: true,
      data: {
        submissionsByDay,
        approvalRate,
        totals: { approved: totalApproved, rejected: totalRejected },
        payoutsIssued
      }
    })
  } catch (error) {
    console.error('Reports summary error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

