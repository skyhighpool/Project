import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/lib/auth'
import { generatePresignedUploadUrl } from '@/lib/s3'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = verifyAccessToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    const { fileName, contentType } = await request.json()
    if (!fileName || !contentType) {
      return NextResponse.json({ error: 'fileName and contentType are required' }, { status: 400 })
    }

    const sanitized = String(fileName).replace(/[^a-zA-Z0-9._-]/g, '_')
    const key = `videos/${payload.userId}/${Date.now()}-${sanitized}`
    const url = await generatePresignedUploadUrl(key, contentType, 60 * 5)

    return NextResponse.json({ key, url })
  } catch (error) {
    console.error('Presign error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

