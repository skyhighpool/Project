import { UserRole, SubmissionStatus, CashoutStatus, PayoutStatus } from '@prisma/client'

// User types
export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  kycStatus: string
  createdAt: Date
  updatedAt: Date
}

export interface UserWallet {
  id: string
  userId: string
  pointsBalance: number
  cashBalance: number
  lockedAmount: number
  createdAt: Date
  updatedAt: Date
}

// Video submission types
export interface VideoSubmission {
  id: string
  userId: string
  s3Key: string
  thumbKey?: string
  durationS: number
  sizeBytes: bigint
  deviceHash: string
  gpsLat: number
  gpsLng: number
  recordedAt: Date
  binIdGuess?: string
  autoScore?: number
  status: SubmissionStatus
  rejectionReason?: string
  createdAt: Date
  updatedAt: Date
  user?: User
  binLocation?: BinLocation
}

export interface BinLocation {
  id: string
  name: string
  lat: number
  lng: number
  radiusM: number
  active: boolean
  createdAt: Date
  updatedAt: Date
}

// Cashout types
export interface CashoutRequest {
  id: string
  userId: string
  pointsUsed: number
  cashAmount: number
  method: string
  destinationRef: string
  status: CashoutStatus
  failureReason?: string
  createdAt: Date
  updatedAt: Date
  user?: User
}

export interface PayoutTransaction {
  id: string
  cashoutRequestId: string
  gateway: string
  gatewayTxnId?: string
  status: PayoutStatus
  rawWebhookJson?: any
  createdAt: Date
  updatedAt: Date
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Form types
export interface LoginForm {
  email: string
  password: string
}

export interface SignupForm {
  name: string
  email: string
  password: string
  confirmPassword: string
}

export interface VideoUploadForm {
  file: File
  gpsLat: number
  gpsLng: number
  recordedAt: Date
  deviceHash: string
}

export interface CashoutForm {
  points: number
  method: string
  destinationRef: string
}

// Scoring and validation types
export interface SubmissionScore {
  geoScore: number
  timeScore: number
  durationScore: number
  duplicateScore: number
  totalScore: number
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  score: SubmissionScore
}

// Notification types
export interface Notification {
  id: string
  userId: string
  type: 'EMAIL' | 'SMS' | 'PUSH'
  title: string
  message: string
  data?: any
  read: boolean
  createdAt: Date
}

// Dashboard and reporting types
export interface DashboardStats {
  totalSubmissions: number
  approvedSubmissions: number
  rejectedSubmissions: number
  pendingReview: number
  totalPointsAwarded: number
  totalPayouts: number
  averageProcessingTime: number
}

export interface LocationStats {
  location: string
  submissions: number
  approved: number
  rejected: number
  pointsAwarded: number
}

export interface TimeSeriesData {
  date: string
  submissions: number
  approved: number
  rejected: number
  points: number
}

// Queue and job types
export interface VideoProcessingJob {
  id: string
  submissionId: string
  s3Key: string
  priority: 'high' | 'normal' | 'low'
  attempts: number
  maxAttempts: number
  createdAt: Date
}

// Payment types
export interface PaymentIntent {
  id: string
  amount: number
  currency: string
  status: string
  clientSecret: string
}

export interface PayoutRequest {
  amount: number
  currency: string
  destination: string
  method: string
  metadata?: any
}

// Map and location types
export interface MapBounds {
  north: number
  south: number
  east: number
  west: number
}

export interface GeoPoint {
  lat: number
  lng: number
}

// Error types
export interface AppError {
  code: string
  message: string
  details?: any
  statusCode?: number
}

// Auth types
export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface AuthUser {
  id: string
  email: string
  name: string
  role: UserRole
  kycStatus: string
}

// Webhook types
export interface WebhookPayload {
  type: string
  data: any
  signature: string
  timestamp: number
}

// Configuration types
export interface AppConfig {
  maxVideoSizeMB: number
  maxVideoDurationSeconds: number
  autoApproveThreshold: number
  autoRejectThreshold: number
  minVideoDurationSeconds: number
  maxSubmissionsPerDay: number
  pointsPerApprovedSubmission: number
  pointsToCashRate: number
  minCashoutAmount: number
}