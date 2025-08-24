import { prisma } from './db'
import { BinLocation } from '@prisma/client'

export interface LocationValidationResult {
  isValid: boolean
  score: number
  nearestBin: BinLocation | null
  distance: number
  withinRadius: boolean
  message: string
}

export interface GeoPoint {
  lat: number
  lng: number
}

export interface BinLocationWithDistance extends BinLocation {
  distance: number
}

/**
 * Calculate distance between two points using Haversine formula
 */
export function calculateDistance(point1: GeoPoint, point2: GeoPoint): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = point1.lat * Math.PI / 180
  const φ2 = point2.lat * Math.PI / 180
  const Δφ = (point2.lat - point1.lat) * Math.PI / 180
  const Δλ = (point2.lng - point1.lng) * Math.PI / 180

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  
  return R * c
}

/**
 * Find the nearest bin location to given coordinates
 */
export async function findNearestBin(
  lat: number,
  lng: number,
  maxDistance: number = 5000 // 5km max search radius
): Promise<BinLocationWithDistance | null> {
  try {
    const bins = await prisma.binLocation.findMany({
      where: { active: true }
    })

    if (bins.length === 0) {
      return null
    }

    let nearestBin: BinLocationWithDistance | null = null
    let minDistance = Infinity

    for (const bin of bins) {
      const distance = calculateDistance(
        { lat, lng },
        { lat: bin.lat, lng: bin.lng }
      )

      if (distance <= maxDistance && distance < minDistance) {
        minDistance = distance
        nearestBin = { ...bin, distance }
      }
    }

    return nearestBin
  } catch (error) {
    console.error('Error finding nearest bin:', error)
    return null
  }
}

/**
 * Validate GPS coordinates against bin locations
 */
export async function validateLocation(
  lat: number,
  lng: number
): Promise<LocationValidationResult> {
  try {
    // Basic coordinate validation
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return {
        isValid: false,
        score: 0,
        nearestBin: null,
        distance: 0,
        withinRadius: false,
        message: 'Invalid GPS coordinates'
      }
    }

    // Find nearest bin
    const nearestBin = await findNearestBin(lat, lng)
    
    if (!nearestBin) {
      return {
        isValid: false,
        score: 0.1,
        nearestBin: null,
        distance: 0,
        withinRadius: false,
        message: 'No designated waste disposal areas found nearby'
      }
    }

    const { distance } = nearestBin
    const radius = nearestBin.radiusM
    const withinRadius = distance <= radius

    // Calculate score based on distance
    let score = 0
    let message = ''

    if (withinRadius) {
      // Within radius - score based on proximity to center
      const proximityScore = 1 - (distance / radius)
      score = Math.max(0.8, proximityScore) // Minimum 0.8 if within radius
      message = `Location validated. Within ${nearestBin.name} disposal area.`
    } else {
      // Outside radius - score decreases with distance
      const penalty = Math.min(0.5, (distance - radius) / 1000) // Penalty up to 0.5
      score = Math.max(0, 0.5 - penalty)
      message = `Location outside designated area. Nearest: ${nearestBin.name} (${Math.round(distance)}m away)`
    }

    return {
      isValid: withinRadius,
      score,
      nearestBin,
      distance,
      withinRadius,
      message
    }

  } catch (error) {
    console.error('Location validation error:', error)
    return {
      isValid: false,
      score: 0,
      nearestBin: null,
      distance: 0,
      withinRadius: false,
      message: 'Error validating location'
    }
  }
}

/**
 * Get all active bin locations
 */
export async function getAllBinLocations(): Promise<BinLocation[]> {
  try {
    return await prisma.binLocation.findMany({
      where: { active: true },
      orderBy: { name: 'asc' }
    })
  } catch (error) {
    console.error('Error fetching bin locations:', error)
    return []
  }
}

/**
 * Create or update bin location
 */
export async function upsertBinLocation(data: {
  name: string
  lat: number
  lng: number
  radiusM: number
  active?: boolean
}): Promise<BinLocation> {
  try {
    // Check if bin already exists at similar coordinates
    const existingBin = await prisma.binLocation.findFirst({
      where: {
        lat: { gte: data.lat - 0.001, lte: data.lat + 0.001 },
        lng: { gte: data.lng - 0.001, lte: data.lng + 0.001 }
      }
    })

    if (existingBin) {
      // Update existing bin
      return await prisma.binLocation.update({
        where: { id: existingBin.id },
        data: {
          name: data.name,
          lat: data.lat,
          lng: data.lng,
          radiusM: data.radiusM,
          active: data.active ?? true
        }
      })
    } else {
      // Create new bin
      return await prisma.binLocation.create({
        data: {
          name: data.name,
          lat: data.lat,
          lng: data.lng,
          radiusM: data.radiusM,
          active: data.active ?? true
        }
      })
    }
  } catch (error) {
    console.error('Error upserting bin location:', error)
    throw error
  }
}

/**
 * Get bin locations within a bounding box
 */
export async function getBinsInBounds(
  bounds: {
    north: number
    south: number
    east: number
    west: number
  }
): Promise<BinLocation[]> {
  try {
    return await prisma.binLocation.findMany({
      where: {
        active: true,
        lat: { gte: bounds.south, lte: bounds.north },
        lng: { gte: bounds.west, lte: bounds.east }
      }
    })
  } catch (error) {
    console.error('Error fetching bins in bounds:', error)
    return []
  }
}

/**
 * Calculate coverage statistics for bin locations
 */
export async function getBinCoverageStats(): Promise<{
  totalBins: number
  activeBins: number
  totalCoverageArea: number
  averageRadius: number
}> {
  try {
    const bins = await prisma.binLocation.findMany({
      where: { active: true }
    })

    const totalBins = bins.length
    const activeBins = bins.filter(bin => bin.active).length
    const totalCoverageArea = bins.reduce((sum, bin) => sum + Math.PI * Math.pow(bin.radiusM, 2), 0)
    const averageRadius = bins.reduce((sum, bin) => sum + bin.radiusM, 0) / totalBins

    return {
      totalBins,
      activeBins,
      totalCoverageArea: Math.round(totalCoverageArea),
      averageRadius: Math.round(averageRadius)
    }
  } catch (error) {
    console.error('Error calculating coverage stats:', error)
    return {
      totalBins: 0,
      activeBins: 0,
      totalCoverageArea: 0,
      averageRadius: 0
    }
  }
}

/**
 * Validate if coordinates are within any bin radius
 */
export async function isWithinAnyBinRadius(
  lat: number,
  lng: number
): Promise<boolean> {
  try {
    const nearestBin = await findNearestBin(lat, lng)
    return nearestBin ? nearestBin.distance <= nearestBin.radiusM : false
  } catch (error) {
    console.error('Error checking bin radius:', error)
    return false
  }
}

/**
 * Get recommended bin locations based on submission patterns
 */
export async function getRecommendedBinLocations(): Promise<{
  highTrafficAreas: Array<{ lat: number; lng: number; submissionCount: number }>
  underservedAreas: Array<{ lat: number; lng: number; distance: number }>
}> {
  try {
    // Get areas with high submission counts
    const highTrafficAreas = await prisma.$queryRaw`
      SELECT 
        ROUND(lat::numeric, 3) as lat,
        ROUND(lng::numeric, 3) as lng,
        COUNT(*) as submission_count
      FROM video_submissions 
      WHERE status = 'APPROVED'
      GROUP BY ROUND(lat::numeric, 3), ROUND(lng::numeric, 3)
      HAVING COUNT(*) > 5
      ORDER BY submission_count DESC
      LIMIT 10
    `

    // Get areas far from existing bins
    const underservedAreas = await prisma.$queryRaw`
      SELECT 
        ROUND(lat::numeric, 3) as lat,
        ROUND(lng::numeric, 3) as lng,
        MIN(
          SQRT(
            POW((lat - bl.lat) * 111000, 2) + 
            POW((lng - bl.lng) * 111000 * COS(RADIANS(lat)), 2)
          )
        ) as distance
      FROM video_submissions vs
      CROSS JOIN bin_locations bl
      WHERE bl.active = true
      GROUP BY ROUND(vs.lat::numeric, 3), ROUND(vs.lng::numeric, 3)
      HAVING MIN(
        SQRT(
          POW((lat - bl.lat) * 111000, 2) + 
          POW((lng - bl.lng) * 111000 * COS(RADIANS(lat)), 2)
        )
      ) > 1000
      ORDER BY distance DESC
      LIMIT 10
    `

    return {
      highTrafficAreas: highTrafficAreas as Array<{ lat: number; lng: number; submissionCount: number }>,
      underservedAreas: underservedAreas as Array<{ lat: number; lng: number; distance: number }>
    }
  } catch (error) {
    console.error('Error getting recommended bin locations:', error)
    return {
      highTrafficAreas: [],
      underservedAreas: []
    }
  }
}