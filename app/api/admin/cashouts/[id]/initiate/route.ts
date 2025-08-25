import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAccessToken } from '@/lib/auth'

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = _request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 })
    }
    const token = authHeader.substring(7)
    const payload = verifyAccessToken(token)
    if (!payload || payload.role !== 'FINANCE') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const cashout = await prisma.cashoutRequest.update({
      where: { id: params.id },
      data: { status: 'INITIATED' }
    })

    await prisma.payoutTransaction.create({
      data: {
        cashoutRequestId: cashout.id,
        gateway: cashout.method === 'STRIPE' ? 'STRIPE' : cashout.method === 'PAYPAL' ? 'PAYPAL' : 'BANK',
        status: 'PROCESSING'
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Initiate cashout error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

