import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/lib/auth'
import { generatePresignedDownloadUrl } from '@/lib/s3'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 })
    }
    const token = authHeader.substring(7)
    const payload = verifyAccessToken(token)
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const { key } = await request.json()
    if (!key) return NextResponse.json({ error: 'key is required' }, { status: 400 })

    const url = await generatePresignedDownloadUrl(key, 60 * 10)
    return NextResponse.json({ url })
  } catch (error) {
    console.error('sign-download error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

