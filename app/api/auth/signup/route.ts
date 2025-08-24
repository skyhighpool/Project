import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword, generateAccessToken, generateRefreshToken } from '@/lib/auth'
import { z } from 'zod'

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password } = signupSchema.parse(body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user and wallet in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          role: 'TOURIST', // Default role
          // password: hashedPassword, // Add this when you add password field to schema
        }
      })

      await tx.userWallet.create({
        data: {
          userId: user.id,
          pointsBalance: 0,
          cashBalance: 0,
          lockedAmount: 0
        }
      })

      return user
    })

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: result.id,
      email: result.email,
      role: result.role,
    })

    const refreshToken = generateRefreshToken({
      userId: result.id,
      email: result.email,
      role: result.role,
    })

    // Get user with wallet
    const userWithWallet = await prisma.user.findUnique({
      where: { id: result.id },
      include: { wallet: true }
    })

    return NextResponse.json({
      success: true,
      user: userWithWallet,
      accessToken,
      refreshToken,
      message: 'User created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Signup error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}