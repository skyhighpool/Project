import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PaymentGatewayFactory, PayoutRequestSchema, validateUPI, validateBankAccount } from '@/lib/payment-gateways';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = PayoutRequestSchema.parse({
      ...body,
      userId: session.user.id,
    });

    // Get user wallet
    const wallet = await prisma.userWallet.findUnique({
      where: { userId: session.user.id },
    });

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    // Check if user has enough points
    if (wallet.pointsBalance < validatedData.amount) {
      return NextResponse.json({ error: 'Insufficient points balance' }, { status: 400 });
    }

    // Validate destination reference based on payment method
    if (validatedData.method === 'UPI' && !validateUPI(validatedData.destinationRef)) {
      return NextResponse.json({ error: 'Invalid UPI ID format' }, { status: 400 });
    }

    if (validatedData.method === 'BANK_TRANSFER' && !validateBankAccount(validatedData.destinationRef)) {
      return NextResponse.json({ error: 'Invalid bank account number' }, { status: 400 });
    }

    // Calculate cash amount (configurable rate: 1 point = ₹0.10)
    const pointsToCashRate = 0.10;
    const cashAmount = validatedData.amount * pointsToCashRate;

    // Create cashout request
    const cashoutRequest = await prisma.cashoutRequest.create({
      data: {
        userId: session.user.id,
        pointsUsed: validatedData.amount,
        cashAmount,
        method: validatedData.method as any,
        destinationRef: validatedData.destinationRef,
        status: 'PENDING',
      },
    });

    // Lock the points
    await prisma.userWallet.update({
      where: { userId: session.user.id },
      data: {
        pointsBalance: { decrement: validatedData.amount },
        lockedAmount: { increment: cashAmount },
      },
    });

    // Create payout transaction
    const payoutTransaction = await prisma.payoutTransaction.create({
      data: {
        cashoutRequestId: cashoutRequest.id,
        gateway: validatedData.method as any,
        status: 'INITIATED',
      },
    });

    // Process payout through payment gateway
    try {
      const gateway = PaymentGatewayFactory.createGateway(validatedData.method);
      const payoutResult = await gateway.createPayout({
        ...validatedData,
        amount: cashAmount,
      });

      if (payoutResult.success) {
        // Update transaction with gateway response
        await prisma.payoutTransaction.update({
          where: { id: payoutTransaction.id },
          data: {
            gatewayTxnId: payoutResult.gatewayTxnId,
            status: payoutResult.status === 'SUCCESS' ? 'SUCCEEDED' : 'PROCESSING',
            rawWebhookJson: payoutResult.data,
          },
        });

        // Update cashout request status
        await prisma.cashoutRequest.update({
          where: { id: cashoutRequest.id },
          data: {
            status: payoutResult.status === 'SUCCESS' ? 'SUCCEEDED' : 'INITIATED',
          },
        });

        // If successful, unlock and debit the amount
        if (payoutResult.status === 'SUCCESS') {
          await prisma.userWallet.update({
            where: { userId: session.user.id },
            data: {
              lockedAmount: { decrement: cashAmount },
            },
          });
        }

        return NextResponse.json({
          success: true,
          cashoutRequest,
          payoutTransaction: {
            ...payoutTransaction,
            gatewayTxnId: payoutResult.gatewayTxnId,
            status: payoutResult.status === 'SUCCESS' ? 'SUCCEEDED' : 'PROCESSING',
          },
        });
      } else {
        // Payout failed, refund points
        await prisma.userWallet.update({
          where: { userId: session.user.id },
          data: {
            pointsBalance: { increment: validatedData.amount },
            lockedAmount: { decrement: cashAmount },
          },
        });

        await prisma.cashoutRequest.update({
          where: { id: cashoutRequest.id },
          data: {
            status: 'FAILED',
            failureReason: payoutResult.error,
          },
        });

        await prisma.payoutTransaction.update({
          where: { id: payoutTransaction.id },
          data: {
            status: 'FAILED',
            rawWebhookJson: { error: payoutResult.error },
          },
        });

        return NextResponse.json({
          success: false,
          error: payoutResult.error,
        }, { status: 400 });
      }
    } catch (gatewayError) {
      // Gateway error, refund points
      await prisma.userWallet.update({
        where: { userId: session.user.id },
        data: {
          pointsBalance: { increment: validatedData.amount },
          lockedAmount: { decrement: cashAmount },
        },
      });

      await prisma.cashoutRequest.update({
        where: { id: cashoutRequest.id },
        data: {
          status: 'FAILED',
          failureReason: gatewayError instanceof Error ? gatewayError.message : 'Gateway error',
        },
      });

      await prisma.payoutTransaction.update({
        where: { id: payoutTransaction.id },
        data: {
          status: 'FAILED',
          rawWebhookJson: { error: gatewayError instanceof Error ? gatewayError.message : 'Gateway error' },
        },
      });

      return NextResponse.json({
        success: false,
        error: 'Payment gateway error',
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Cashout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    const where: any = { userId: session.user.id };
    if (status) {
      where.status = status;
    }

    const [cashouts, total] = await Promise.all([
      prisma.cashoutRequest.findMany({
        where,
        include: {
          payoutTransactions: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.cashoutRequest.count({ where }),
    ]);

    return NextResponse.json({
      cashouts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get cashouts error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}