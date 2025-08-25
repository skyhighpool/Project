'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  CheckCircle, 
  XCircle, 
  MapPin, 
  Clock, 
  Smartphone,
  AlertTriangle,
  Eye,
  Flag
} from 'lucide-react'

const reviewSchema = z.object({
  reason: z.string().optional(),
  fraudFlag: z.boolean().default(false),
  userFlag: z.boolean().default(false)
})

type ReviewFormData = z.infer<typeof reviewSchema>

interface VideoSubmission {
  id: string
  userId: string
  s3Key: string
  thumbKey?: string
  durationS: number
  sizeBytes: bigint
  deviceHash: string
  gpsLat: number
  gpsLng: number
  recordedAt: string
  binIdGuess?: string
  autoScore?: number
  status: string
  rejectionReason?: string
  createdAt: string
  user: {
    id: string
    name: string
    email: string
  }
  binLocation?: {
    name: string
    radiusM: number
  }
}

interface ReviewQueueProps {
  onAction: () => void
}

export function ReviewQueue({ onAction }: ReviewQueueProps) {
  const [submissions, setSubmissions] = useState<VideoSubmission[]>([])
  const [currentSubmission, setCurrentSubmission] = useState<VideoSubmission | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema)
  })

  useEffect(() => {
    fetchReviewQueue()
  }, [])

  const fetchReviewQueue = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch('/api/admin/submissions?status=needs_review', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setSubmissions(data)
        if (data.length > 0 && !currentSubmission) {
          setCurrentSubmission(data[0])
        }
      }
    } catch (error) {
      console.error('Error fetching review queue:', error)
      setError('Failed to load review queue')
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async (data: ReviewFormData) => {
    if (!currentSubmission) return

    setIsProcessing(true)
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch(`/api/admin/submissions/${currentSubmission.id}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: data.reason,
          fraudFlag: data.fraudFlag,
          userFlag: data.userFlag
        })
      })

      if (response.ok) {
        // Remove from queue and move to next
        setSubmissions(prev => prev.filter(s => s.id !== currentSubmission.id))
        if (submissions.length > 1) {
          const nextIndex = submissions.findIndex(s => s.id === currentSubmission.id) + 1
          setCurrentSubmission(submissions[nextIndex] || submissions[0])
        } else {
          setCurrentSubmission(null)
        }
        reset()
        onAction()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to approve submission')
      }
    } catch (error) {
      console.error('Error approving submission:', error)
      setError('An unexpected error occurred')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async (data: ReviewFormData) => {
    if (!currentSubmission || !data.reason) {
      setError('Rejection reason is required')
      return
    }

    setIsProcessing(true)
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch(`/api/admin/submissions/${currentSubmission.id}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: data.reason,
          fraudFlag: data.fraudFlag,
          userFlag: data.userFlag
        })
      })

      if (response.ok) {
        // Remove from queue and move to next
        setSubmissions(prev => prev.filter(s => s.id !== currentSubmission.id))
        if (submissions.length > 1) {
          const nextIndex = submissions.findIndex(s => s.id === currentSubmission.id) + 1
          setCurrentSubmission(submissions[nextIndex] || submissions[0])
        } else {
          setCurrentSubmission(null)
        }
        reset()
        onAction()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to reject submission')
      }
    } catch (error) {
      console.error('Error rejecting submission:', error)
      setError('An unexpected error occurred')
    } finally {
      setIsProcessing(false)
    }
  }

  const selectSubmission = (submission: VideoSubmission) => {
    setCurrentSubmission(submission)
    reset()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="xl" />
      </div>
    )
  }

  if (submissions.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="h-12 w-12 text-success-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Review Queue Empty</h3>
        <p className="text-gray-600">No submissions need review at the moment.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Review Queue</h2>
        <div className="text-sm text-gray-600">
          {submissions.length} submission{submissions.length !== 1 ? 's' : ''} pending review
        </div>
      </div>

      {error && (
        <div className="bg-danger-50 border border-danger-200 rounded-lg p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-danger-400" />
            <p className="ml-3 text-sm text-danger-700">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Submission List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Submissions</h3>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {submissions.map((submission) => (
                <div
                  key={submission.id}
                  onClick={() => selectSubmission(submission)}
                  className={`
                    p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors
                    ${currentSubmission?.id === submission.id ? 'bg-primary-50 border-primary-200' : ''}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{submission.user.name}</p>
                      <p className="text-sm text-gray-600">{submission.user.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        {new Date(submission.createdAt).toLocaleDateString()}
                      </p>
                      <div className="flex items-center mt-1">
                        <div className={`w-2 h-2 rounded-full ${
                          submission.autoScore && submission.autoScore > 0.7 ? 'bg-success-500' :
                          submission.autoScore && submission.autoScore > 0.3 ? 'bg-warning-500' :
                          'bg-danger-500'
                        }`} />
                        <span className="text-xs text-gray-500 ml-1">
                          {submission.autoScore ? `${(submission.autoScore * 100).toFixed(0)}%` : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Video Player and Review */}
        <div className="lg:col-span-2">
          {currentSubmission ? (
            <div className="space-y-6">
              {/* Video Player */}
              <div className="bg-black rounded-lg aspect-video flex items-center justify-center">
                <div className="text-white text-center">
                  <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Video Player</p>
                  <p className="text-sm opacity-75">S3 Key: {currentSubmission.s3Key}</p>
                </div>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600">
                      {currentSubmission.gpsLat.toFixed(6)}, {currentSubmission.gpsLng.toFixed(6)}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600">
                      {new Date(currentSubmission.recordedAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Smartphone className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600">
                      Device: {currentSubmission.deviceHash.slice(0, 8)}...
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Duration</p>
                    <p className="text-sm text-gray-600">{currentSubmission.durationS}s</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">File Size</p>
                    <p className="text-sm text-gray-600">
                      {(Number(currentSubmission.sizeBytes) / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Auto Score</p>
                    <p className="text-sm text-gray-600">
                      {currentSubmission.autoScore ? `${(currentSubmission.autoScore * 100).toFixed(1)}%` : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Review Form */}
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Review Notes (required for rejection)
                  </label>
                  <textarea
                    {...register('reason')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Add notes about your decision..."
                  />
                </div>

                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      {...register('fraudFlag')}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Flag as potential fraud</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      {...register('userFlag')}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Flag user for review</span>
                  </label>
                </div>

                <div className="flex space-x-4">
                  <Button
                    type="button"
                    onClick={handleSubmit(handleApprove)}
                    disabled={isProcessing}
                    className="flex-1 bg-success-600 hover:bg-success-700"
                  >
                    {isProcessing ? <LoadingSpinner size="sm" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                    Approve
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSubmit(handleReject)}
                    disabled={isProcessing}
                    className="flex-1 bg-danger-600 hover:bg-danger-700"
                  >
                    {isProcessing ? <LoadingSpinner size="sm" /> : <XCircle className="h-4 w-4 mr-2" />}
                    Reject
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600">Select a submission to review</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}