import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is council member
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || user.role !== 'COUNCIL') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || 'summary';
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');
    const binId = searchParams.get('binId');

    // Build date filter
    const dateFilter: any = {};
    if (fromDate) {
      dateFilter.gte = new Date(fromDate);
    }
    if (toDate) {
      dateFilter.lte = new Date(toDate);
    }

    // Build bin filter
    const binFilter: any = {};
    if (binId) {
      binFilter.binIdGuess = binId;
    }

    switch (reportType) {
      case 'summary':
        return await generateSummaryReport(dateFilter, binFilter);
      case 'participation':
        return await generateParticipationReport(dateFilter, binFilter);
      case 'financial':
        return await generateFinancialReport(dateFilter, binFilter);
      case 'geographic':
        return await generateGeographicReport(dateFilter, binFilter);
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Admin reports error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generateSummaryReport(dateFilter: any, binFilter: any) {
  const whereClause = {
    ...dateFilter,
    ...binFilter,
  };

  const [
    totalSubmissions,
    approvedSubmissions,
    rejectedSubmissions,
    pendingSubmissions,
    totalPointsAwarded,
    totalCashPaid,
    activeUsers,
    totalBins,
  ] = await Promise.all([
    prisma.videoSubmission.count({ where: whereClause }),
    prisma.videoSubmission.count({ 
      where: { ...whereClause, status: 'APPROVED' } 
    }),
    prisma.videoSubmission.count({ 
      where: { ...whereClause, status: 'REJECTED' } 
    }),
    prisma.videoSubmission.count({ 
      where: { ...whereClause, status: { in: ['QUEUED', 'NEEDS_REVIEW'] } } 
    }),
    prisma.userWallet.aggregate({
      _sum: { pointsBalance: true },
    }),
    prisma.cashoutRequest.aggregate({
      where: { status: 'SUCCEEDED' },
      _sum: { cashAmount: true },
    }),
    prisma.user.count({ where: { role: 'TOURIST' } }),
    prisma.binLocation.count({ where: { active: true } }),
  ]);

  const approvalRate = totalSubmissions > 0 ? (approvedSubmissions / totalSubmissions) * 100 : 0;

  return NextResponse.json({
    summary: {
      totalSubmissions,
      approvedSubmissions,
      rejectedSubmissions,
      pendingSubmissions,
      approvalRate: Math.round(approvalRate * 100) / 100,
      totalPointsAwarded: totalPointsAwarded._sum.pointsBalance || 0,
      totalCashPaid: Number(totalCashPaid._sum.cashAmount || 0),
      activeUsers,
      totalBins,
    },
  });
}

async function generateParticipationReport(dateFilter: any, binFilter: any) {
  const whereClause = {
    ...dateFilter,
    ...binFilter,
  };

  // Daily participation for the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const dailySubmissions = await prisma.videoSubmission.groupBy({
    by: ['createdAt'],
    where: {
      ...whereClause,
      createdAt: { gte: thirtyDaysAgo },
    },
    _count: {
      id: true,
    },
  });

  // Top participating users
  const topUsers = await prisma.videoSubmission.groupBy({
    by: ['userId'],
    where: whereClause,
    _count: {
      id: true,
    },
    orderBy: {
      _count: {
        id: 'desc',
      },
    },
    take: 10,
  });

  // Get user details for top users
  const topUserDetails = await Promise.all(
    topUsers.map(async (user) => {
      const userDetails = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { name: true, email: true },
      });
      return {
        userId: user.userId,
        name: userDetails?.name || 'Unknown',
        email: userDetails?.email || 'Unknown',
        submissions: user._count.id,
      };
    })
  );

  // Bin-wise participation
  const binParticipation = await prisma.videoSubmission.groupBy({
    by: ['binIdGuess'],
    where: {
      ...whereClause,
      binIdGuess: { not: null },
    },
    _count: {
      id: true,
    },
  });

  const binDetails = await Promise.all(
    binParticipation.map(async (bin) => {
      const binInfo = await prisma.binLocation.findUnique({
        where: { id: bin.binIdGuess! },
        select: { name: true, lat: true, lng: true },
      });
      return {
        binId: bin.binIdGuess,
        binName: binInfo?.name || 'Unknown',
        location: binInfo ? { lat: binInfo.lat, lng: binInfo.lng } : null,
        submissions: bin._count.id,
      };
    })
  );

  return NextResponse.json({
    participation: {
      dailySubmissions: dailySubmissions.map(day => ({
        date: day.createdAt.toISOString().split('T')[0],
        count: day._count.id,
      })),
      topUsers: topUserDetails,
      binParticipation: binDetails,
    },
  });
}

async function generateFinancialReport(dateFilter: any, binFilter: any) {
  const whereClause = {
    ...dateFilter,
    ...binFilter,
  };

  // Points awarded by day
  const pointsByDay = await prisma.submissionEvent.groupBy({
    by: ['createdAt'],
    where: {
      ...whereClause,
      eventType: 'APPROVED',
    },
    _sum: {
      meta: true, // This will need to be parsed to get points
    },
  });

  // Cashout statistics
  const cashoutStats = await prisma.cashoutRequest.groupBy({
    by: ['status'],
    _count: {
      id: true,
    },
    _sum: {
      cashAmount: true,
      pointsUsed: true,
    },
  });

  // Payment method distribution
  const paymentMethodStats = await prisma.cashoutRequest.groupBy({
    by: ['method'],
    where: { status: 'SUCCEEDED' },
    _count: {
      id: true,
    },
    _sum: {
      cashAmount: true,
    },
  });

  // Average payout amount
  const avgPayout = await prisma.cashoutRequest.aggregate({
    where: { status: 'SUCCEEDED' },
    _avg: {
      cashAmount: true,
    },
  });

  return NextResponse.json({
    financial: {
      pointsByDay: pointsByDay.map(day => ({
        date: day.createdAt.toISOString().split('T')[0],
        points: 0, // Would need to parse meta field for actual points
      })),
      cashoutStats: cashoutStats.map(stat => ({
        status: stat.status,
        count: stat._count.id,
        totalAmount: Number(stat._sum.cashAmount || 0),
        totalPoints: stat._sum.pointsUsed || 0,
      })),
      paymentMethods: paymentMethodStats.map(method => ({
        method: method.method,
        count: method._count.id,
        totalAmount: Number(method._sum.cashAmount || 0),
      })),
      averagePayout: Number(avgPayout._avg.cashAmount || 0),
    },
  });
}

async function generateGeographicReport(dateFilter: any, binFilter: any) {
  const whereClause = {
    ...dateFilter,
    ...binFilter,
  };

  // Get all bin locations with submission counts
  const bins = await prisma.binLocation.findMany({
    where: { active: true },
    include: {
      _count: {
        select: {
          submissions: {
            where: whereClause,
          },
        },
      },
    },
  });

  // Geographic heatmap data
  const heatmapData = bins.map(bin => ({
    lat: bin.lat,
    lng: bin.lng,
    name: bin.name,
    submissions: bin._count.submissions,
    weight: bin._count.submissions, // For heatmap intensity
  }));

  // Zone-wise statistics (group bins by approximate zones)
  const zones = bins.reduce((acc, bin) => {
    const zone = getZoneFromCoordinates(bin.lat, bin.lng);
    if (!acc[zone]) {
      acc[zone] = {
        name: zone,
        submissions: 0,
        bins: 0,
        totalRadius: 0,
      };
    }
    acc[zone].submissions += bin._count.submissions;
    acc[zone].bins += 1;
    acc[zone].totalRadius += bin.radiusM;
    return acc;
  }, {} as Record<string, any>);

  const zoneStats = Object.values(zones).map((zone: any) => ({
    ...zone,
    averageRadius: zone.bins > 0 ? Math.round(zone.totalRadius / zone.bins) : 0,
  }));

  return NextResponse.json({
    geographic: {
      heatmapData,
      zoneStats,
      totalBins: bins.length,
      totalSubmissions: bins.reduce((sum, bin) => sum + bin._count.submissions, 0),
    },
  });
}

// Helper function to determine zone from coordinates
function getZoneFromCoordinates(lat: number, lng: number): string {
  // This is a simplified zone calculation
  // In a real implementation, you'd use proper geographic boundaries
  if (lat > 20 && lat < 30 && lng > 70 && lng < 80) {
    return 'North Zone';
  } else if (lat > 10 && lat < 20 && lng > 70 && lng < 80) {
    return 'South Zone';
  } else if (lat > 15 && lat < 25 && lng > 80 && lng < 90) {
    return 'East Zone';
  } else if (lat > 15 && lat < 25 && lng > 60 && lng < 70) {
    return 'West Zone';
  } else {
    return 'Central Zone';
  }
}