import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');
    
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(body);
    const { payload } = event;

    // Find the payout transaction
    const payoutTransaction = await prisma.payoutTransaction.findFirst({
      where: { gatewayTxnId: payload.payout.id },
      include: { cashoutRequest: true },
    });

    if (!payoutTransaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Update transaction status based on event
    let newStatus = 'PROCESSING';
    let cashoutStatus = 'INITIATED';

    switch (event.event) {
      case 'payout.processed':
        newStatus = 'SUCCEEDED';
        cashoutStatus = 'SUCCEEDED';
        break;
      case 'payout.failed':
        newStatus = 'FAILED';
        cashoutStatus = 'FAILED';
        break;
      case 'payout.reversed':
        newStatus = 'FAILED';
        cashoutStatus = 'FAILED';
        break;
      default:
        return NextResponse.json({ message: 'Event ignored' });
    }

    // Update payout transaction
    await prisma.payoutTransaction.update({
      where: { id: payoutTransaction.id },
      data: {
        status: newStatus as any,
        rawWebhookJson: event,
      },
    });

    // Update cashout request
    await prisma.cashoutRequest.update({
      where: { id: payoutTransaction.cashoutRequest.id },
      data: {
        status: cashoutStatus as any,
        failureReason: newStatus === 'FAILED' ? payload.payout.failure_reason : null,
      },
    });

    // If payout failed, refund points
    if (newStatus === 'FAILED') {
      await prisma.userWallet.update({
        where: { userId: payoutTransaction.cashoutRequest.userId },
        data: {
          pointsBalance: { increment: payoutTransaction.cashoutRequest.pointsUsed },
          lockedAmount: { decrement: payoutTransaction.cashoutRequest.cashAmount },
        },
      });
    }

    // If payout succeeded, unlock the locked amount
    if (newStatus === 'SUCCEEDED') {
      await prisma.userWallet.update({
        where: { userId: payoutTransaction.cashoutRequest.userId },
        data: {
          lockedAmount: { decrement: payoutTransaction.cashoutRequest.cashAmount },
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Razorpay webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}