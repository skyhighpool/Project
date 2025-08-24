import ffmpeg from 'fluent-ffmpeg'
import { Readable } from 'stream'
import { uploadThumbnail } from './s3'

// Set FFmpeg path
if (process.env.FFMPEG_PATH) {
  ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH)
}

export interface VideoMetadata {
  duration: number
  width: number
  height: number
  fps: number
  bitrate: number
  codec: string
  size: number
}

export interface ProcessingResult {
  success: boolean
  metadata: VideoMetadata | null
  thumbnailKey: string | null
  error?: string
}

export interface ThumbnailOptions {
  width: number
  height: number
  quality: number
  time: string // e.g., "00:00:05" for 5 seconds into video
}

/**
 * Extract video metadata using FFmpeg
 */
export async function extractVideoMetadata(videoBuffer: Buffer): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const stream = new Readable()
    stream.push(videoBuffer)
    stream.push(null)

    ffmpeg(stream)
      .ffprobe((err, metadata) => {
        if (err) {
          reject(new Error(`Failed to extract metadata: ${err.message}`))
          return
        }

        const videoStream = metadata.streams.find(s => s.codec_type === 'video')
        if (!videoStream) {
          reject(new Error('No video stream found'))
          return
        }

        const result: VideoMetadata = {
          duration: metadata.format.duration || 0,
          width: videoStream.width || 0,
          height: videoStream.height || 0,
          fps: parseFloat(videoStream.r_frame_rate?.split('/')[0] || '0') / 
               parseFloat(videoStream.r_frame_rate?.split('/')[1] || '1'),
          bitrate: metadata.format.bit_rate ? parseInt(metadata.format.bit_rate) : 0,
          codec: videoStream.codec_name || 'unknown',
          size: videoBuffer.length
        }

        resolve(result)
      })
  })
}

/**
 * Generate thumbnail from video
 */
export async function generateThumbnail(
  videoBuffer: Buffer,
  options: ThumbnailOptions = {
    width: 320,
    height: 240,
    quality: 80,
    time: '00:00:05'
  }
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const stream = new Readable()
    stream.push(videoBuffer)
    stream.push(null)

    const chunks: Buffer[] = []
    
    ffmpeg(stream)
      .seekInput(options.time)
      .frames(1)
      .size(`${options.width}x${options.height}`)
      .outputFormat('image2')
      .videoCodec('mjpeg')
      .quality(options.quality)
      .on('end', () => {
        const thumbnailBuffer = Buffer.concat(chunks)
        resolve(thumbnailBuffer)
      })
      .on('error', (err) => {
        reject(new Error(`Failed to generate thumbnail: ${err.message}`))
      })
      .on('data', (chunk) => {
        chunks.push(chunk)
      })
      .pipe()
  })
}

/**
 * Process video file: extract metadata and generate thumbnail
 */
export async function processVideo(
  videoBuffer: Buffer,
  userId: string,
  submissionId: string
): Promise<ProcessingResult> {
  try {
    // Extract metadata
    const metadata = await extractVideoMetadata(videoBuffer)
    
    // Generate thumbnail
    const thumbnailBuffer = await generateThumbnail(videoBuffer, {
      width: 320,
      height: 240,
      quality: 80,
      time: '00:00:05'
    })

    // Upload thumbnail to S3
    const thumbnailResult = await uploadThumbnail(thumbnailBuffer, userId, submissionId)

    return {
      success: true,
      metadata,
      thumbnailKey: thumbnailResult.key
    }

  } catch (error) {
    console.error('Video processing error:', error)
    return {
      success: false,
      metadata: null,
      thumbnailKey: null,
      error: error instanceof Error ? error.message : 'Unknown processing error'
    }
  }
}

/**
 * Validate video file format and size
 */
export function validateVideoFile(
  file: File,
  maxSizeMB: number = 100,
  maxDurationSeconds: number = 300
): { isValid: boolean; error?: string } {
  // Check file type
  if (!file.type.startsWith('video/')) {
    return { isValid: false, error: 'Invalid file type. Only video files are allowed.' }
  }

  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  if (file.size > maxSizeBytes) {
    return { 
      isValid: false, 
      error: `File size too large. Maximum size is ${maxSizeMB}MB.` 
    }
  }

  // Check file extension
  const allowedExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm']
  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
  
  if (!allowedExtensions.includes(fileExtension)) {
    return { 
      isValid: false, 
      error: `Unsupported file format. Allowed formats: ${allowedExtensions.join(', ')}` 
    }
  }

  return { isValid: true }
}

/**
 * Get video duration from file (quick check without full processing)
 */
export function getVideoDurationFromFile(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    
    video.onloadedmetadata = () => {
      resolve(video.duration)
      URL.revokeObjectURL(video.src)
    }
    
    video.onerror = () => {
      reject(new Error('Failed to load video metadata'))
      URL.revokeObjectURL(video.src)
    }
    
    video.src = URL.createObjectURL(file)
  })
}

/**
 * Compress video for web delivery
 */
export async function compressVideo(
  videoBuffer: Buffer,
  targetBitrate: string = '1000k',
  targetResolution: string = '1280x720'
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const stream = new Readable()
    stream.push(videoBuffer)
    stream.push(null)

    const chunks: Buffer[] = []
    
    ffmpeg(stream)
      .videoCodec('libx264')
      .audioCodec('aac')
      .size(targetResolution)
      .videoBitrate(targetBitrate)
      .audioBitrate('128k')
      .fps(30)
      .outputFormat('mp4')
      .on('end', () => {
        const compressedBuffer = Buffer.concat(chunks)
        resolve(compressedBuffer)
      })
      .on('error', (err) => {
        reject(new Error(`Failed to compress video: ${err.message}`))
      })
      .on('data', (chunk) => {
        chunks.push(chunk)
      })
      .pipe()
  })
}

/**
 * Extract audio from video
 */
export async function extractAudio(
  videoBuffer: Buffer,
  format: 'mp3' | 'wav' | 'aac' = 'mp3'
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const stream = new Readable()
    stream.push(videoBuffer)
    stream.push(null)

    const chunks: Buffer[] = []
    
    ffmpeg(stream)
      .audioCodec(format === 'mp3' ? 'libmp3lame' : format === 'wav' ? 'pcm_s16le' : 'aac')
      .audioBitrate('128k')
      .outputFormat(format)
      .on('end', () => {
        const audioBuffer = Buffer.concat(chunks)
        resolve(audioBuffer)
      })
      .on('error', (err) => {
        reject(new Error(`Failed to extract audio: ${err.message}`))
      })
      .on('data', (chunk) => {
        chunks.push(chunk)
      })
      .pipe()
  })
}