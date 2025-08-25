import AWS from 'aws-sdk'
import { Readable } from 'stream'

// Support AWS S3 or MinIO via env
const s3 = new AWS.S3({
  endpoint: process.env.S3_ENDPOINT || undefined,
  region: process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.S3_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY,
  s3ForcePathStyle: (process.env.S3_FORCE_PATH_STYLE || 'false') === 'true'
})

// Default to new var names but keep backward compatibility
const BUCKET_NAME = process.env.S3_BUCKET_VIDEOS || process.env.AWS_S3_BUCKET!

export interface S3UploadResult {
  key: string
  url: string
  size: number
  mimeType: string
}

export interface S3DeleteResult {
  success: boolean
  message: string
}

/**
 * Upload a file to S3
 */
export async function uploadToS3(
  file: Buffer | Readable,
  key: string,
  mimeType: string,
  metadata?: Record<string, string>
): Promise<S3UploadResult> {
  try {
    const params: AWS.S3.PutObjectRequest = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: mimeType,
      ACL: 'private', // Private by default for security
      Metadata: metadata,
    }

    const result = await s3.upload(params).promise()

    return {
      key: result.Key,
      url: result.Location,
      size: result.ContentLength || 0,
      mimeType: result.ContentType || mimeType,
    }
  } catch (error) {
    console.error('S3 upload error:', error)
    throw new Error(`Failed to upload file to S3: ${error.message}`)
  }
}

/**
 * Upload video file to S3
 */
export async function uploadVideo(
  file: Buffer,
  userId: string,
  originalName: string,
  metadata?: Record<string, string>
): Promise<S3UploadResult> {
  const timestamp = Date.now()
  const key = `videos/${userId}/${timestamp}-${originalName.replace(/[^a-zA-Z0-9.-]/g, '_')}`
  
  return uploadToS3(file, key, 'video/mp4', {
    ...metadata,
    userId,
    originalName,
    uploadTimestamp: timestamp.toString(),
    fileType: 'video'
  })
}

/**
 * Upload thumbnail to S3
 */
export async function uploadThumbnail(
  imageBuffer: Buffer,
  userId: string,
  submissionId: string
): Promise<S3UploadResult> {
  const key = `thumbnails/${userId}/${submissionId}-thumb.jpg`
  
  return uploadToS3(imageBuffer, key, 'image/jpeg', {
    userId,
    submissionId,
    fileType: 'thumbnail'
  })
}

/**
 * Generate pre-signed URL for secure upload
 */
export async function generatePresignedUploadUrl(
  key: string,
  mimeType: string,
  expiresIn: number = 3600
): Promise<string> {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: mimeType,
      Expires: expiresIn,
    }

    const url = await s3.getSignedUrlPromise('putObject', params)
    return url
  } catch (error) {
    console.error('Error generating presigned URL:', error)
    throw new Error(`Failed to generate presigned URL: ${error.message}`)
  }
}

/**
 * Generate pre-signed URL for secure download/viewing
 */
export async function generatePresignedDownloadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      Expires: expiresIn,
    }

    const url = await s3.getSignedUrlPromise('getObject', params)
    return url
  } catch (error) {
    console.error('Error generating presigned download URL:', error)
    throw new Error(`Failed to generate presigned download URL: ${error.message}`)
  }
}

/**
 * Delete a file from S3
 */
export async function deleteFromS3(key: string): Promise<S3DeleteResult> {
  try {
    await s3.deleteObject({
      Bucket: BUCKET_NAME,
      Key: key,
    }).promise()

    return {
      success: true,
      message: `File ${key} deleted successfully`,
    }
  } catch (error) {
    console.error('S3 delete error:', error)
    return {
      success: false,
      message: `Failed to delete file ${key}: ${error.message}`,
    }
  }
}

/**
 * Get file metadata from S3
 */
export async function getFileMetadata(key: string): Promise<AWS.S3.HeadObjectOutput | null> {
  try {
    const result = await s3.headObject({
      Bucket: BUCKET_NAME,
      Key: key,
    }).promise()

    return result
  } catch (error) {
    console.error('Error getting file metadata:', error)
    return null
  }
}

/**
 * List files in a directory
 */
export async function listFiles(prefix: string, maxKeys: number = 1000): Promise<string[]> {
  try {
    const result = await s3.listObjectsV2({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
      MaxKeys: maxKeys,
    }).promise()

    return result.Contents?.map(obj => obj.Key!) || []
  } catch (error) {
    console.error('Error listing files:', error)
    return []
  }
}

/**
 * Check if file exists in S3
 */
export async function fileExists(key: string): Promise<boolean> {
  try {
    await s3.headObject({
      Bucket: BUCKET_NAME,
      Key: key,
    }).promise()
    return true
  } catch (error) {
    return false
  }
}

/**
 * Get file size from S3
 */
export async function getFileSize(key: string): Promise<number> {
  try {
    const metadata = await getFileMetadata(key)
    return metadata?.ContentLength || 0
  } catch (error) {
    return 0
  }
}