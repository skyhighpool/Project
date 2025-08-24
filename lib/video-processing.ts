import { prisma } from './db'
import { SubmissionScore, ValidationResult, VideoSubmission } from '@/types'
import { BinLocation } from '@prisma/client'

// Configuration constants
const CONFIG = {
  MAX_VIDEO_SIZE_MB: parseInt(process.env.MAX_VIDEO_SIZE_MB || '100'),
  MAX_VIDEO_DURATION_SECONDS: parseInt(process.env.MAX_VIDEO_DURATION_SECONDS || '300'),
  MIN_VIDEO_DURATION_SECONDS: parseInt(process.env.MIN_VIDEO_DURATION_SECONDS || '10'),
  MAX_SUBMISSIONS_PER_DAY: parseInt(process.env.MAX_SUBMISSIONS_PER_DAY || '5'),
  AUTO_APPROVE_THRESHOLD: parseFloat(process.env.AUTO_APPROVE_THRESHOLD || '0.8'),
  AUTO_REJECT_THRESHOLD: parseFloat(process.env.AUTO_REJECT_THRESHOLD || '0.3'),
  POINTS_PER_APPROVED_SUBMISSION: parseInt(process.env.POINTS_PER_APPROVED_SUBMISSION || '100'),
  POINTS_TO_CASH_RATE: parseFloat(process.env.POINTS_TO_CASH_RATE || '0.01'),
  MIN_CASHOUT_AMOUNT: parseFloat(process.env.MIN_CASHOUT_AMOUNT || '5.00')
}

export class VideoProcessor {
  /**
   * Validate video submission and calculate score
   */
  static async validateSubmission(
    submission: Partial<VideoSubmission>,
    userId: string
  ): Promise<ValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []
    
    // Basic validation
    if (!submission.file && !submission.s3Key) {
      errors.push('Video file is required')
    }
    
    if (!submission.gpsLat || !submission.gpsLng) {
      errors.push('GPS coordinates are required')
    }
    
    if (!submission.recordedAt) {
      errors.push('Recording timestamp is required')
    }
    
    if (!submission.deviceHash) {
      errors.push('Device hash is required')
    }

    if (errors.length > 0) {
      return {
        isValid: false,
        errors,
        warnings,
        score: { geoScore: 0, timeScore: 0, durationScore: 0, duplicateScore: 0, totalScore: 0 }
      }
    }

    // Calculate scores
    const geoScore = await this.calculateGeoScore(submission.gpsLat!, submission.gpsLng!)
    const timeScore = this.calculateTimeScore(submission.recordedAt!)
    const durationScore = this.calculateDurationScore(submission.durationS || 0)
    const duplicateScore = await this.calculateDuplicateScore(userId, submission.deviceHash!)
    
    const totalScore = (geoScore + timeScore + durationScore + duplicateScore) / 4

    // Check for auto-approval/rejection
    if (totalScore >= CONFIG.AUTO_APPROVE_THRESHOLD) {
      warnings.push('Submission qualifies for auto-approval')
    } else if (totalScore < CONFIG.AUTO_REJECT_THRESHOLD) {
      errors.push('Submission score too low for approval')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: { geoScore, timeScore, durationScore, duplicateScore, totalScore }
    }
  }

  /**
   * Calculate geographic score based on proximity to bin locations
   */
  private static async calculateGeoScore(lat: number, lng: number): Promise<number> {
    try {
      const nearbyBins = await prisma.binLocation.findMany({
        where: {
          active: true,
          // Using a simple distance calculation (can be optimized with PostGIS)
          // For now, we'll check if coordinates are within reasonable bounds
        }
      })

      if (nearbyBins.length === 0) {
        return 0.5 // Neutral score if no bins configured
      }

      // Find the closest bin
      let minDistance = Infinity
      let closestBin: BinLocation | null = null

      for (const bin of nearbyBins) {
        const distance = this.calculateDistance(lat, lng, bin.lat, bin.lng)
        if (distance < minDistance) {
          minDistance = distance
          closestBin = bin
        }
      }

      if (!closestBin) return 0

      // Score based on distance to closest bin
      const maxRadius = closestBin.radiusM
      if (minDistance <= maxRadius) {
        // Within radius - score based on how close to center
        const proximityScore = 1 - (minDistance / maxRadius)
        return Math.max(0.8, proximityScore) // Minimum 0.8 if within radius
      } else {
        // Outside radius - score decreases with distance
        const penalty = Math.min(0.5, (minDistance - maxRadius) / 1000) // Penalty up to 0.5
        return Math.max(0, 0.5 - penalty)
      }
    } catch (error) {
      console.error('Error calculating geo score:', error)
      return 0.5
    }
  }

  /**
   * Calculate time score based on recording timestamp
   */
  private static calculateTimeScore(recordedAt: Date): number {
    const now = new Date()
    const timeDiff = now.getTime() - recordedAt.getTime()
    const hoursDiff = timeDiff / (1000 * 60 * 60)

    // Future timestamps are invalid
    if (hoursDiff < 0) {
      return 0
    }

    // Recent recordings (within 24 hours) get higher scores
    if (hoursDiff <= 24) {
      return 1.0
    } else if (hoursDiff <= 48) {
      return 0.8
    } else if (hoursDiff <= 72) {
      return 0.6
    } else {
      return 0.3
    }
  }

  /**
   * Calculate duration score
   */
  private static calculateDurationScore(durationSeconds: number): number {
    if (durationSeconds < CONFIG.MIN_VIDEO_DURATION_SECONDS) {
      return 0
    }

    if (durationSeconds > CONFIG.MAX_VIDEO_DURATION_SECONDS) {
      return 0.5
    }

    // Optimal duration range gets full score
    const optimalMin = CONFIG.MIN_VIDEO_DURATION_SECONDS
    const optimalMax = 60 // 1 minute is optimal
    
    if (durationSeconds >= optimalMin && durationSeconds <= optimalMax) {
      return 1.0
    }

    // Score decreases for very long videos
    if (durationSeconds > optimalMax) {
      const penalty = Math.min(0.3, (durationSeconds - optimalMax) / 60)
      return 1.0 - penalty
    }

    return 1.0
  }

  /**
   * Calculate duplicate score based on device hash and recent submissions
   */
  private static async calculateDuplicateScore(userId: string, deviceHash: string): Promise<number> {
    try {
      // Check for recent submissions from same device
      const recentSubmissions = await prisma.videoSubmission.findMany({
        where: {
          userId,
          deviceHash,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      })

      if (recentSubmissions.length === 0) {
        return 1.0 // No duplicates
      }

      // Check for exact duplicates (same device hash within short time)
      const veryRecent = recentSubmissions.filter(sub => {
        const timeDiff = Date.now() - sub.createdAt.getTime()
        return timeDiff < 5 * 60 * 1000 // Within 5 minutes
      })

      if (veryRecent.length > 1) {
        return 0.1 // High duplicate probability
      }

      // Check daily submission limit
      const todaySubmissions = recentSubmissions.filter(sub => {
        const today = new Date()
        const submissionDate = new Date(sub.createdAt)
        return today.toDateString() === submissionDate.toDateString()
      })

      if (todaySubmissions.length >= CONFIG.MAX_SUBMISSIONS_PER_DAY) {
        return 0.3 // Daily limit exceeded
      }

      // Score based on submission frequency
      const frequencyPenalty = Math.min(0.4, recentSubmissions.length * 0.1)
      return Math.max(0.6, 1.0 - frequencyPenalty)
    } catch (error) {
      console.error('Error calculating duplicate score:', error)
      return 0.5
    }
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private static calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371e3 // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180
    const φ2 = lat2 * Math.PI / 180
    const Δφ = (lat2 - lat1) * Math.PI / 180
    const Δλ = (lng2 - lng1) * Math.PI / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    
    return R * c
  }

  /**
   * Determine submission status based on score
   */
  static determineStatus(score: number): 'AUTO_VERIFIED' | 'NEEDS_REVIEW' | 'REJECTED' {
    if (score >= CONFIG.AUTO_APPROVE_THRESHOLD) {
      return 'AUTO_VERIFIED'
    } else if (score >= CONFIG.AUTO_REJECT_THRESHOLD) {
      return 'NEEDS_REVIEW'
    } else {
      return 'REJECTED'
    }
  }

  /**
   * Award points for approved submission
   */
  static getPointsForApproval(): number {
    return CONFIG.POINTS_PER_APPROVED_SUBMISSION
  }

  /**
   * Convert points to cash amount
   */
  static pointsToCash(points: number): number {
    return points * CONFIG.POINTS_TO_CASH_RATE
  }

  /**
   * Get configuration
   */
  static getConfig() {
    return { ...CONFIG }
  }
}