import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create sample users with different roles
  const hashedPassword = await bcrypt.hash('password123', 12);

  const users = await Promise.all([
    // Tourist users
    prisma.user.upsert({
      where: { email: 'tourist1@example.com' },
      update: {},
      create: {
        email: 'tourist1@example.com',
        name: 'Rahul Sharma',
        role: 'TOURIST',
        kycStatus: 'VERIFIED',
        wallet: {
          create: {
            pointsBalance: 500,
            cashBalance: 50.00,
            lockedAmount: 0,
          },
        },
      },
    }),
    prisma.user.upsert({
      where: { email: 'tourist2@example.com' },
      update: {},
      create: {
        email: 'tourist2@example.com',
        name: 'Priya Patel',
        role: 'TOURIST',
        kycStatus: 'VERIFIED',
        wallet: {
          create: {
            pointsBalance: 250,
            cashBalance: 25.00,
            lockedAmount: 0,
          },
        },
      },
    }),
    prisma.user.upsert({
      where: { email: 'tourist3@example.com' },
      update: {},
      create: {
        email: 'tourist3@example.com',
        name: 'Amit Kumar',
        role: 'TOURIST',
        kycStatus: 'PENDING',
        wallet: {
          create: {
            pointsBalance: 100,
            cashBalance: 10.00,
            lockedAmount: 0,
          },
        },
      },
    }),

    // Moderator
    prisma.user.upsert({
      where: { email: 'moderator@example.com' },
      update: {},
      create: {
        email: 'moderator@example.com',
        name: 'Sneha Verma',
        role: 'MODERATOR',
        kycStatus: 'VERIFIED',
        wallet: {
          create: {
            pointsBalance: 0,
            cashBalance: 0,
            lockedAmount: 0,
          },
        },
      },
    }),

    // Finance admin
    prisma.user.upsert({
      where: { email: 'finance@example.com' },
      update: {},
      create: {
        email: 'finance@example.com',
        name: 'Rajesh Gupta',
        role: 'FINANCE',
        kycStatus: 'VERIFIED',
        wallet: {
          create: {
            pointsBalance: 0,
            cashBalance: 0,
            lockedAmount: 0,
          },
        },
      },
    }),

    // Council member
    prisma.user.upsert({
      where: { email: 'council@example.com' },
      update: {},
      create: {
        email: 'council@example.com',
        name: 'Dr. Meera Singh',
        role: 'COUNCIL',
        kycStatus: 'VERIFIED',
        wallet: {
          create: {
            pointsBalance: 0,
            cashBalance: 0,
            lockedAmount: 0,
          },
        },
      },
    }),
  ]);

  console.log('✅ Created users:', users.length);

  // Create sample bin locations (Mumbai coordinates)
  const binLocations = await Promise.all([
    prisma.binLocation.upsert({
      where: { id: 'bin-mumbai-central' },
      update: {},
      create: {
        id: 'bin-mumbai-central',
        name: 'Mumbai Central Station',
        lat: 19.0588,
        lng: 72.8615,
        radiusM: 100,
        active: true,
      },
    }),
    prisma.binLocation.upsert({
      where: { id: 'bin-bandra-west' },
      update: {},
      create: {
        id: 'bin-bandra-west',
        name: 'Bandra West Market',
        lat: 19.0596,
        lng: 72.8295,
        radiusM: 150,
        active: true,
      },
    }),
    prisma.binLocation.upsert({
      where: { id: 'bin-andheri-east' },
      update: {},
      create: {
        id: 'bin-andheri-east',
        name: 'Andheri East Metro',
        lat: 19.1197,
        lng: 72.8464,
        radiusM: 120,
        active: true,
      },
    }),
    prisma.binLocation.upsert({
      where: { id: 'bin-juhu-beach' },
      update: {},
      create: {
        id: 'bin-juhu-beach',
        name: 'Juhu Beach',
        lat: 19.0998,
        lng: 72.8347,
        radiusM: 200,
        active: true,
      },
    }),
    prisma.binLocation.upsert({
      where: { id: 'bin-dadar-station' },
      update: {},
      create: {
        id: 'bin-dadar-station',
        name: 'Dadar Railway Station',
        lat: 19.0170,
        lng: 72.8478,
        radiusM: 80,
        active: true,
      },
    }),
    prisma.binLocation.upsert({
      where: { id: 'bin-borivali-west' },
      update: {},
      create: {
        id: 'bin-borivali-west',
        name: 'Borivali West Market',
        lat: 19.2320,
        lng: 72.8567,
        radiusM: 100,
        active: true,
      },
    }),
  ]);

  console.log('✅ Created bin locations:', binLocations.length);

  // Create sample video submissions
  const sampleSubmissions = [
    {
      userId: users[0].id, // Rahul Sharma
      s3Key: 'videos/sample1.mp4',
      durationS: 45,
      sizeBytes: BigInt(15 * 1024 * 1024), // 15MB
      deviceHash: 'device_hash_001',
      gpsLat: 19.0588,
      gpsLng: 72.8615,
      recordedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      binIdGuess: binLocations[0].id,
      autoScore: 85,
      status: 'APPROVED',
    },
    {
      userId: users[1].id, // Priya Patel
      s3Key: 'videos/sample2.mp4',
      durationS: 30,
      sizeBytes: BigInt(12 * 1024 * 1024), // 12MB
      deviceHash: 'device_hash_002',
      gpsLat: 19.0596,
      gpsLng: 72.8295,
      recordedAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      binIdGuess: binLocations[1].id,
      autoScore: 92,
      status: 'APPROVED',
    },
    {
      userId: users[2].id, // Amit Kumar
      s3Key: 'videos/sample3.mp4',
      durationS: 60,
      sizeBytes: BigInt(20 * 1024 * 1024), // 20MB
      deviceHash: 'device_hash_003',
      gpsLat: 19.1197,
      gpsLng: 72.8464,
      recordedAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      binIdGuess: binLocations[2].id,
      autoScore: 65,
      status: 'NEEDS_REVIEW',
    },
    {
      userId: users[0].id, // Rahul Sharma
      s3Key: 'videos/sample4.mp4',
      durationS: 25,
      sizeBytes: BigInt(8 * 1024 * 1024), // 8MB
      deviceHash: 'device_hash_004',
      gpsLat: 19.0998,
      gpsLng: 72.8347,
      recordedAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      binIdGuess: binLocations[3].id,
      autoScore: 78,
      status: 'APPROVED',
    },
    {
      userId: users[1].id, // Priya Patel
      s3Key: 'videos/sample5.mp4',
      durationS: 15,
      sizeBytes: BigInt(5 * 1024 * 1024), // 5MB
      deviceHash: 'device_hash_005',
      gpsLat: 19.0170,
      gpsLng: 72.8478,
      recordedAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
      binIdGuess: binLocations[4].id,
      autoScore: 45,
      status: 'REJECTED',
      rejectionReason: 'Video too short and poor quality',
    },
  ];

  const submissions = await Promise.all(
    sampleSubmissions.map((submission, index) =>
      prisma.videoSubmission.upsert({
        where: { id: `sample-submission-${index + 1}` },
        update: {},
        create: {
          id: `sample-submission-${index + 1}`,
          ...submission,
        },
      })
    )
  );

  console.log('✅ Created video submissions:', submissions.length);

  // Create sample events for submissions
  const events = [];
  for (const submission of submissions) {
    // Create event for submission creation
    events.push(
      prisma.submissionEvent.create({
        data: {
          submissionId: submission.id,
          actorId: submission.userId,
          eventType: 'CREATED',
          meta: {
            autoScore: submission.autoScore,
            gpsDistance: 25,
            nearestBin: binLocations.find(bin => bin.id === submission.binIdGuess)?.name,
            isWithinBinRadius: true,
            isDuplicate: false,
            timeDiff: 7200000, // 2 hours
          },
        },
      })
    );

    // Create approval/rejection events
    if (submission.status === 'APPROVED') {
      events.push(
        prisma.submissionEvent.create({
          data: {
            submissionId: submission.id,
            actorId: submission.userId,
            eventType: 'APPROVED',
            meta: {
              pointsAwarded: 100,
              autoApproved: submission.autoScore >= 80,
            },
          },
        })
      );
    } else if (submission.status === 'REJECTED') {
      events.push(
        prisma.submissionEvent.create({
          data: {
            submissionId: submission.id,
            actorId: submission.userId,
            eventType: 'REJECTED',
            meta: {
              reason: submission.rejectionReason,
              autoRejected: submission.autoScore < 50,
            },
          },
        })
      );
    }
  }

  await Promise.all(events);
  console.log('✅ Created submission events:', events.length);

  // Create sample cashout requests
  const cashoutRequests = await Promise.all([
    prisma.cashoutRequest.create({
      data: {
        userId: users[0].id, // Rahul Sharma
        pointsUsed: 300,
        cashAmount: 30.00,
        method: 'UPI',
        destinationRef: 'rahul.sharma@okicici',
        status: 'SUCCEEDED',
      },
    }),
    prisma.cashoutRequest.create({
      data: {
        userId: users[1].id, // Priya Patel
        pointsUsed: 200,
        cashAmount: 20.00,
        method: 'RAZORPAY',
        destinationRef: 'priya.patel@paytm',
        status: 'PENDING',
      },
    }),
    prisma.cashoutRequest.create({
      data: {
        userId: users[0].id, // Rahul Sharma
        pointsUsed: 150,
        cashAmount: 15.00,
        method: 'BANK_TRANSFER',
        destinationRef: '1234567890',
        status: 'INITIATED',
      },
    }),
  ]);

  console.log('✅ Created cashout requests:', cashoutRequests.length);

  // Create sample payout transactions
  const payoutTransactions = await Promise.all([
    prisma.payoutTransaction.create({
      data: {
        cashoutRequestId: cashoutRequests[0].id,
        gateway: 'UPI',
        gatewayTxnId: 'upi_txn_001',
        status: 'SUCCEEDED',
        rawWebhookJson: {
          upiId: 'rahul.sharma@okicici',
          amount: 30.00,
          status: 'SUCCESS',
          timestamp: new Date().toISOString(),
        },
      },
    }),
    prisma.payoutTransaction.create({
      data: {
        cashoutRequestId: cashoutRequests[2].id,
        gateway: 'BANK',
        gatewayTxnId: 'bank_txn_001',
        status: 'PROCESSING',
        rawWebhookJson: {
          accountNumber: '1234567890',
          amount: 15.00,
          status: 'PROCESSING',
          timestamp: new Date().toISOString(),
        },
      },
    }),
  ]);

  console.log('✅ Created payout transactions:', payoutTransactions.length);

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📋 Sample Data Created:');
  console.log(`- ${users.length} users (Tourist, Moderator, Finance, Council)`);
  console.log(`- ${binLocations.length} bin locations in Mumbai`);
  console.log(`- ${submissions.length} video submissions`);
  console.log(`- ${events.length} submission events`);
  console.log(`- ${cashoutRequests.length} cashout requests`);
  console.log(`- ${payoutTransactions.length} payout transactions`);

  console.log('\n🔑 Sample Login Credentials:');
  console.log('Tourist: tourist1@example.com / password123');
  console.log('Moderator: moderator@example.com / password123');
  console.log('Finance: finance@example.com / password123');
  console.log('Council: council@example.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });