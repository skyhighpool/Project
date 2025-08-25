import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PaymentGatewayFactory } from '@/lib/payment-gateways';
import { z } from 'zod';

// Validation schema for cashout processing
const ProcessCashoutSchema = z.object({
  cashoutId: z.string(),
  action: z.enum(['approve', 'reject', 'initiate']),
  reason: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is finance admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || user.role !== 'FINANCE') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'PENDING';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (status !== 'all') {
      where.status = status;
    }

    const [cashouts, total] = await Promise.all([
      prisma.cashoutRequest.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          payoutTransactions: {
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: [
          { status: 'asc' }, // PENDING first
          { createdAt: 'asc' }, // Oldest first
        ],
        skip: offset,
        take: limit,
      }),
      prisma.cashoutRequest.count({ where }),
    ]);

    // Calculate statistics
    const stats = await prisma.cashoutRequest.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
      _sum: {
        cashAmount: true,
        pointsUsed: true,
      },
    });

    const statusStats = stats.reduce((acc, stat) => {
      acc[stat.status] = {
        count: stat._count.status,
        totalAmount: Number(stat._sum.cashAmount || 0),
        totalPoints: stat._sum.pointsUsed || 0,
      };
      return acc;
    }, {} as Record<string, any>);

    return NextResponse.json({
      cashouts: cashouts.map(cashout => ({
        ...cashout,
        cashAmount: Number(cashout.cashAmount),
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      stats: {
        total: total,
        byStatus: statusStats,
      },
    });
  } catch (error) {
    console.error('Admin get cashouts error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is finance admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || user.role !== 'FINANCE') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = ProcessCashoutSchema.parse(body);

    // Get the cashout request
    const cashout = await prisma.cashoutRequest.findUnique({
      where: { id: validatedData.cashoutId },
      include: {
        user: true,
        payoutTransactions: true,
      },
    });

    if (!cashout) {
      return NextResponse.json({ error: 'Cashout request not found' }, { status: 404 });
    }

    // Check if cashout can be processed
    if (cashout.status !== 'PENDING' && cashout.status !== 'INITIATED') {
      return NextResponse.json(
        { error: 'Cashout request cannot be processed in its current status' },
        { status: 400 }
      );
    }

    let newStatus: string;
    let transactionStatus: string;

    if (validatedData.action === 'approve') {
      // Process the payout through payment gateway
      try {
        const gateway = PaymentGatewayFactory.createGateway(cashout.method as any);
        const payoutResult = await gateway.createPayout({
          amount: Number(cashout.cashAmount),
          currency: 'INR',
          method: cashout.method as any,
          destinationRef: cashout.destinationRef,
          description: 'Waste Management Reward Payout',
          userId: cashout.userId,
        });

        if (payoutResult.success) {
          newStatus = 'INITIATED';
          transactionStatus = payoutResult.status === 'SUCCESS' ? 'SUCCEEDED' : 'PROCESSING';

          // Update or create payout transaction
          if (cashout.payoutTransactions.length > 0) {
            await prisma.payoutTransaction.update({
              where: { id: cashout.payoutTransactions[0].id },
              data: {
                gatewayTxnId: payoutResult.gatewayTxnId,
                status: transactionStatus as any,
                rawWebhookJson: payoutResult.data,
              },
            });
          } else {
            await prisma.payoutTransaction.create({
              data: {
                cashoutRequestId: cashout.id,
                gateway: cashout.method as any,
                gatewayTxnId: payoutResult.gatewayTxnId,
                status: transactionStatus as any,
                rawWebhookJson: payoutResult.data,
              },
            });
          }

          // If successful, unlock and debit the amount
          if (payoutResult.status === 'SUCCESS') {
            await prisma.userWallet.update({
              where: { userId: cashout.userId },
              data: {
                lockedAmount: { decrement: cashout.cashAmount },
              },
            });
            newStatus = 'SUCCEEDED';
          }
        } else {
          // Payout failed, refund points
          await prisma.userWallet.update({
            where: { userId: cashout.userId },
            data: {
              pointsBalance: { increment: cashout.pointsUsed },
              lockedAmount: { decrement: cashout.cashAmount },
            },
          });

          newStatus = 'FAILED';
          transactionStatus = 'FAILED';

          // Create failed transaction record
          await prisma.payoutTransaction.create({
            data: {
              cashoutRequestId: cashout.id,
              gateway: cashout.method as any,
              status: 'FAILED',
              rawWebhookJson: { error: payoutResult.error },
            },
          });
        }
      } catch (gatewayError) {
        // Gateway error, refund points
        await prisma.userWallet.update({
          where: { userId: cashout.userId },
          data: {
            pointsBalance: { increment: cashout.pointsUsed },
            lockedAmount: { decrement: cashout.cashAmount },
          },
        });

        newStatus = 'FAILED';
        transactionStatus = 'FAILED';

        await prisma.payoutTransaction.create({
          data: {
            cashoutRequestId: cashout.id,
            gateway: cashout.method as any,
            status: 'FAILED',
            rawWebhookJson: { error: gatewayError instanceof Error ? gatewayError.message : 'Gateway error' },
          },
        });
      }
    } else if (validatedData.action === 'reject') {
      // Reject the cashout and refund points
      newStatus = 'CANCELED';
      transactionStatus = 'FAILED';

      await prisma.userWallet.update({
        where: { userId: cashout.userId },
        data: {
          pointsBalance: { increment: cashout.pointsUsed },
          lockedAmount: { decrement: cashout.cashAmount },
        },
      });

      await prisma.payoutTransaction.create({
        data: {
          cashoutRequestId: cashout.id,
          gateway: cashout.method as any,
          status: 'FAILED',
          rawWebhookJson: { 
            error: 'Rejected by finance admin',
            reason: validatedData.reason,
          },
        },
      });
    } else {
      // Initiate manual processing
      newStatus = 'INITIATED';
      transactionStatus = 'INITIATED';
    }

    // Update cashout request status
    await prisma.cashoutRequest.update({
      where: { id: validatedData.cashoutId },
      data: {
        status: newStatus as any,
        failureReason: validatedData.action === 'reject' ? validatedData.reason : null,
      },
    });

    // Create audit event
    await prisma.submissionEvent.create({
      data: {
        submissionId: '', // Not tied to a specific submission
        actorId: session.user.id,
        eventType: 'MODERATED',
        meta: {
          action: 'CASHOUT_PROCESSED',
          cashoutId: cashout.id,
          action: validatedData.action,
          reason: validatedData.reason,
          newStatus,
          processedBy: session.user.id,
          processedAt: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      cashout: {
        id: validatedData.cashoutId,
        status: newStatus,
        action: validatedData.action,
        processedBy: session.user.id,
        processedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Admin process cashout error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}