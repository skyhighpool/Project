import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Create sample bin locations
  const binLocations = [
    {
      name: 'Central Park Main Entrance',
      lat: 40.7829,
      lng: -73.9654,
      radiusM: 100,
      active: true
    },
    {
      name: 'Times Square',
      lat: 40.7580,
      lng: -73.9855,
      radiusM: 150,
      active: true
    },
    {
      name: 'Brooklyn Bridge Park',
      lat: 40.7021,
      lng: -73.9969,
      radiusM: 120,
      active: true
    },
    {
      name: 'High Line Park',
      lat: 40.7484,
      lng: -74.0047,
      radiusM: 80,
      active: true
    },
    {
      name: 'Washington Square Park',
      lat: 40.7308,
      lng: -73.9973,
      radiusM: 90,
      active: true
    },
    {
      name: 'Bryant Park',
      lat: 40.7536,
      lng: -73.9832,
      radiusM: 70,
      active: true
    },
    {
      name: 'Madison Square Park',
      lat: 40.7411,
      lng: -73.9877,
      radiusM: 60,
      active: true
    },
    {
      name: 'Union Square Park',
      lat: 40.7359,
      lng: -73.9911,
      radiusM: 85,
      active: true
    }
  ]

  console.log('📍 Creating bin locations...')
  for (const binData of binLocations) {
    const bin = await prisma.binLocation.upsert({
      where: { 
        name: binData.name 
      },
      update: binData,
      create: binData
    })
    console.log(`  ✓ Created/Updated: ${bin.name}`)
  }

  // Create sample users with different roles
  const users = [
    {
      email: 'tourist@example.com',
      name: 'John Tourist',
      role: 'TOURIST' as const
    },
    {
      email: 'moderator@example.com',
      name: 'Sarah Moderator',
      role: 'MODERATOR' as const
    },
    {
      email: 'council@example.com',
      name: 'Mike Council',
      role: 'COUNCIL' as const
    },
    {
      email: 'finance@example.com',
      name: 'Lisa Finance',
      role: 'FINANCE' as const
    }
  ]

  console.log('👥 Creating sample users...')
  for (const userData of users) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: userData,
      create: userData
    })

    // Create wallet for each user
    await prisma.userWallet.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        pointsBalance: user.role === 'TOURIST' ? 500 : 0, // Give tourist some points
        cashBalance: 0,
        lockedAmount: 0
      }
    })

    console.log(`  ✓ Created/Updated: ${user.name} (${user.role})`)
  }

  // Create some sample video submissions for the tourist
  const tourist = await prisma.user.findUnique({
    where: { email: 'tourist@example.com' }
  })

  if (tourist) {
    console.log('📹 Creating sample video submissions...')
    
    const sampleSubmissions = [
      {
        s3Key: 'videos/sample/sample-1.mp4',
        thumbKey: 'thumbnails/sample/sample-1-thumb.jpg',
        durationS: 45,
        sizeBytes: BigInt(15 * 1024 * 1024), // 15MB
        deviceHash: 'device_hash_sample_1',
        gpsLat: 40.7829,
        gpsLng: -73.9654,
        recordedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        status: 'APPROVED' as const,
        autoScore: 0.85,
        binIdGuess: (await prisma.binLocation.findFirst({ where: { name: 'Central Park Main Entrance' } }))?.id
      },
      {
        s3Key: 'videos/sample/sample-2.mp4',
        thumbKey: 'thumbnails/sample/sample-2-thumb.jpg',
        durationS: 32,
        sizeBytes: BigInt(12 * 1024 * 1024), // 12MB
        deviceHash: 'device_hash_sample_2',
        gpsLat: 40.7580,
        gpsLng: -73.9855,
        recordedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        status: 'AUTO_VERIFIED' as const,
        autoScore: 0.92,
        binIdGuess: (await prisma.binLocation.findFirst({ where: { name: 'Times Square' } }))?.id
      },
      {
        s3Key: 'videos/sample/sample-3.mp4',
        thumbKey: 'thumbnails/sample/sample-3-thumb.jpg',
        durationS: 28,
        sizeBytes: BigInt(10 * 1024 * 1024), // 10MB
        deviceHash: 'device_hash_sample_3',
        gpsLat: 40.7021,
        gpsLng: -73.9969,
        recordedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        status: 'NEEDS_REVIEW' as const,
        autoScore: 0.65,
        binIdGuess: (await prisma.binLocation.findFirst({ where: { name: 'Brooklyn Bridge Park' } }))?.id
      }
    ]

    for (const submissionData of sampleSubmissions) {
      const submission = await prisma.videoSubmission.create({
        data: {
          userId: tourist.id,
          ...submissionData
        }
      })

      // Create submission events
      await prisma.submissionEvent.create({
        data: {
          submissionId: submission.id,
          actorId: tourist.id,
          eventType: 'CREATED',
          meta: {
            fileSize: Number(submissionData.sizeBytes),
            duration: submissionData.durationS,
            deviceHash: submissionData.deviceHash,
            gpsCoordinates: { lat: submissionData.gpsLat, lng: submissionData.gpsLng }
          }
        }
      })

      if (submissionData.status === 'APPROVED' || submissionData.status === 'AUTO_VERIFIED') {
        await prisma.submissionEvent.create({
          data: {
            submissionId: submission.id,
            actorId: tourist.id,
            eventType: 'APPROVED',
            meta: {
              autoApproved: submissionData.status === 'AUTO_VERIFIED',
              score: submissionData.autoScore
            }
          }
        })
      }

      console.log(`  ✓ Created submission: ${submissionData.status} (${submissionData.durationS}s)`)
    }

    // Update tourist's wallet with points from approved submissions
    const approvedSubmissions = await prisma.videoSubmission.count({
      where: {
        userId: tourist.id,
        status: { in: ['APPROVED', 'AUTO_VERIFIED'] }
      }
    })

    const pointsEarned = approvedSubmissions * 100
    await prisma.userWallet.update({
      where: { userId: tourist.id },
      data: {
        pointsBalance: pointsEarned
      }
    })

    console.log(`  ✓ Updated tourist wallet: ${pointsEarned} points`)
  }

  // Create sample cashout requests
  if (tourist) {
    console.log('💰 Creating sample cashout requests...')
    
    const sampleCashouts = [
      {
        pointsUsed: 300,
        cashAmount: 3.00,
        method: 'BANK_TRANSFER' as const,
        destinationRef: '1234567890',
        status: 'SUCCEEDED' as const
      },
      {
        pointsUsed: 200,
        cashAmount: 2.00,
        method: 'PAYPAL' as const,
        destinationRef: 'tourist@example.com',
        status: 'PENDING' as const
      }
    ]

    for (const cashoutData of sampleCashouts) {
      const cashout = await prisma.cashoutRequest.create({
        data: {
          userId: tourist.id,
          ...cashoutData
        }
      })

      console.log(`  ✓ Created cashout: ${cashoutData.status} (${cashoutData.pointsUsed} points)`)
    }
  }

  console.log('✅ Database seeding completed successfully!')
  console.log('\n📊 Sample Data Created:')
  console.log(`  • ${binLocations.length} bin locations`)
  console.log(`  • ${users.length} users with different roles`)
  console.log(`  • 3 sample video submissions`)
  console.log(`  • 2 sample cashout requests`)
  console.log('\n🔑 Test Accounts:')
  console.log('  • Tourist: tourist@example.com (500 points)')
  console.log('  • Moderator: moderator@example.com')
  console.log('  • Council: council@example.com')
  console.log('  • Finance: finance@example.com')
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })