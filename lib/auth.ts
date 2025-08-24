import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { prisma } from './db'
import { User, UserRole } from '@prisma/client'

const JWT_SECRET = process.env.JWT_SECRET!
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!

export interface JWTPayload {
  userId: string
  email: string
  role: UserRole
  iat?: number
  exp?: number
}

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return bcrypt.hash(password, saltRounds)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' })
}

export function generateRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' })
}

export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch (error) {
    return null
  }
}

export function verifyRefreshToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as JWTPayload
  } catch (error) {
    return null
  }
}

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { wallet: true }
    })

    if (!user) {
      return null
    }

    // For now, we'll assume users have a password field
    // In a real implementation, you'd need to add this to the schema
    // const isValidPassword = await verifyPassword(password, user.password)
    // if (!isValidPassword) return null

    return user
  } catch (error) {
    console.error('Authentication error:', error)
    return null
  }
}

export async function createUser(userData: {
  email: string
  name: string
  password: string
  role?: UserRole
}): Promise<User> {
  const hashedPassword = await hashPassword(userData.password)
  
  // Create user and wallet in a transaction
  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: userData.email,
        name: userData.name,
        role: userData.role || 'TOURIST',
        // password: hashedPassword, // Add this field to schema if needed
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
}

export function requireAuth(handler: Function) {
  return async (req: any, res: any) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '')
      
      if (!token) {
        return res.status(401).json({ error: 'No token provided' })
      }

      const payload = verifyAccessToken(token)
      if (!payload) {
        return res.status(401).json({ error: 'Invalid token' })
      }

      req.user = payload
      return handler(req, res)
    } catch (error) {
      return res.status(401).json({ error: 'Authentication failed' })
    }
  }
}

export function requireRole(roles: UserRole[]) {
  return (handler: Function) => {
    return async (req: any, res: any) => {
      try {
        if (!req.user) {
          return res.status(401).json({ error: 'Authentication required' })
        }

        if (!roles.includes(req.user.role)) {
          return res.status(403).json({ error: 'Insufficient permissions' })
        }

        return handler(req, res)
      } catch (error) {
        return res.status(403).json({ error: 'Authorization failed' })
      }
    }
  }
}