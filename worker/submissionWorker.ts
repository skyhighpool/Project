import { Worker } from 'bullmq'
import IORedis from 'ioredis'
import { prisma } from '@/lib/db'
import { processVideo } from '@/lib/video-processor'
import { VideoProcessor } from '@/lib/video-processing'
import { getObjectBuffer } from '@/lib/s3'

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379')

export const submissionWorker = new Worker('submission-processing', async (job) => {
  const { submissionId, s3Key, userId, gpsLat, gpsLng, recordedAt, deviceHash } = job.data as any

  const buffer = await getObjectBuffer(s3Key)
  const processing = await processVideo(buffer, userId, submissionId)
  if (!processing.success) throw new Error(processing.error || 'Processing failed')

  await prisma.videoSubmission.update({ where: { id: submissionId }, data: { thumbKey: processing.thumbnailKey, durationS: Math.round(processing.metadata!.duration) } })

  const validation = await VideoProcessor.validateSubmission({
    gpsLat,
    gpsLng,
    recordedAt: new Date(recordedAt),
    deviceHash,
    durationS: Math.round(processing.metadata!.duration),
    s3Key
  }, userId)

  const status = VideoProcessor.determineStatus(validation.score.totalScore)
  await prisma.videoSubmission.update({ where: { id: submissionId }, data: { status, autoScore: validation.score.totalScore } })
}, { connection })

console.log('Submission worker started')

