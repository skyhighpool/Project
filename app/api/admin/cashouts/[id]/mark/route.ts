import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAccessToken } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({ status: z.enum(['SUCCEEDED', 'FAILED', 'NEEDS_INFO']), failureReason: z.string().optional() })

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 })
    }
    const token = authHeader.substring(7)
    const payload = verifyAccessToken(token)
    if (!payload || payload.role !== 'FINANCE') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input', details: parsed.error.errors }, { status: 400 })

    const { status, failureReason } = parsed.data

    const cashout = await prisma.cashoutRequest.update({ where: { id: params.id }, data: { status, failureReason: failureReason || null } })

    await prisma.payoutTransaction.updateMany({ where: { cashoutRequestId: cashout.id }, data: { status: status === 'SUCCEEDED' ? 'SUCCEEDED' : status === 'FAILED' ? 'FAILED' : 'NEEDS_INFO' } })

    if (status === 'SUCCEEDED') {
      await prisma.userWallet.update({ where: { userId: cashout.userId }, data: { lockedAmount: { decrement: Number(cashout.cashAmount) } } })
    } else if (status === 'FAILED') {
      await prisma.userWallet.update({ where: { userId: cashout.userId }, data: { lockedAmount: { decrement: Number(cashout.cashAmount) }, pointsBalance: { increment: cashout.pointsUsed } } })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Mark cashout error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

