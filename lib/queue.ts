import { Queue, Worker, QueueScheduler, JobsOptions } from 'bullmq'
import IORedis from 'ioredis'

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379')

export const submissionQueue = new Queue('submission-processing', { connection })
export const submissionScheduler = new QueueScheduler('submission-processing', { connection })

export type SubmissionJobData = {
  submissionId: string
  s3Key: string
  userId: string
  gpsLat: number
  gpsLng: number
  recordedAt: string
  deviceHash: string
}

export async function enqueueSubmissionJob(data: SubmissionJobData, opts?: JobsOptions) {
  return submissionQueue.add('process-submission', data, { attempts: 3, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 1000, removeOnFail: 5000, ...(opts || {}) })
}

