'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { VideoPlayer } from '@/components/video/VideoPlayer'
import { MapView } from '@/components/ui/MapView'
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  MapPin,
  Clock,
  Smartphone,
  FileVideo,
  Info
} from 'lucide-react'

interface VideoSubmission {
  id: string
  s3Key: string
  thumbKey?: string
  durationS: number
  sizeBytes: string
  deviceHash: string
  gpsLat: number
  gpsLng: number
  recordedAt: string
  autoScore?: number
  user: {
    id: string
    name: string
    email: string
  }
  binLocation?: {
    name: string
    lat: number
    lng: number
    radiusM: number
  }
}

interface ModerationQueueProps {
  onDecision: () => void
}

export function ModerationQueue({ onDecision }: ModerationQueueProps) {
  const [submissions, setSubmissions] = useState<VideoSubmission[]>([])
  const [currentSubmission, setCurrentSubmission] = useState<VideoSubmission | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  useEffect(() => {
    fetchModerationQueue()
  }, [])

  const fetchModerationQueue = async () => {
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
        setSubmissions(data.data || [])
        if (data.data && data.data.length > 0) {
          setCurrentSubmission(data.data[0])
        }
      }
    } catch (error) {
      console.error('Error fetching moderation queue:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async (submissionId: string) => {
    setIsProcessing(true)
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch(`/api/admin/submissions/${submissionId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        // Remove from queue and move to next
        setSubmissions(prev => prev.filter(s => s.id !== submissionId))
        if (submissions.length > 1) {
          const currentIndex = submissions.findIndex(s => s.id === submissionId)
          const nextSubmission = submissions[currentIndex + 1] || submissions[currentIndex - 1]
          setCurrentSubmission(nextSubmission)
        } else {
          setCurrentSubmission(null)
        }
        onDecision()
      }
    } catch (error) {
      console.error('Error approving submission:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async (submissionId: string, reason: string) => {
    if (!reason.trim()) {
      alert('Please provide a rejection reason')
      return
    }

    setIsProcessing(true)
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch(`/api/admin/submissions/${submissionId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      })
      
      if (response.ok) {
        // Remove from queue and move to next
        setSubmissions(prev => prev.filter(s => s.id !== submissionId))
        if (submissions.length > 1) {
          const currentIndex = submissions.findIndex(s => s.id === submissionId)
          const nextSubmission = submissions[currentIndex + 1] || submissions[currentIndex - 1]
          setCurrentSubmission(nextSubmission)
        } else {
          setCurrentSubmission(null)
        }
        setRejectionReason('')
        onDecision()
      }
    } catch (error) {
      console.error('Error rejecting submission:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600'
    if (score >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!currentSubmission) {
    return (
      <div className="p-6 text-center">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No submissions to review</h3>
        <p className="text-gray-600">All pending submissions have been processed.</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Review Submission
        </h2>
        <p className="text-gray-600">
          {submissions.length} submission{submissions.length !== 1 ? 's' : ''} remaining in queue
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Video and Actions */}
        <div className="space-y-6">
          {/* Video Player */}
          <div className="bg-black rounded-lg overflow-hidden">
            <VideoPlayer 
              videoKey={currentSubmission.s3Key}
              thumbnailKey={currentSubmission.thumbKey}
              duration={currentSubmission.durationS}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <Button
              onClick={() => handleApprove(currentSubmission.id)}
              disabled={isProcessing}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              Approve
            </Button>
            <Button
              onClick={() => handleReject(currentSubmission.id, rejectionReason)}
              disabled={isProcessing || !rejectionReason.trim()}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              <XCircle className="h-5 w-5 mr-2" />
              Reject
            </Button>
          </div>

          {/* Rejection Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rejection Reason (required for rejection)
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter reason for rejection..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>
        </div>

        {/* Right Column - Metadata and Map */}
        <div className="space-y-6">
          {/* Submission Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">Submission Details</h3>
            <div className="space-y-3">
              <div className="flex items-center text-sm">
                <FileVideo className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-gray-600">Duration:</span>
                <span className="ml-auto font-medium">{currentSubmission.durationS}s</span>
              </div>
              <div className="flex items-center text-sm">
                <Info className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-gray-600">Size:</span>
                <span className="ml-auto font-medium">
                  {(parseInt(currentSubmission.sizeBytes) / (1024 * 1024)).toFixed(2)} MB
                </span>
              </div>
              <div className="flex items-center text-sm">
                <Smartphone className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-gray-600">Device:</span>
                <span className="ml-auto font-medium font-mono text-xs">
                  {currentSubmission.deviceHash.substring(0, 8)}...
                </span>
              </div>
              <div className="flex items-center text-sm">
                <Clock className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-gray-600">Recorded:</span>
                <span className="ml-auto font-medium">
                  {new Date(currentSubmission.recordedAt).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Auto Score */}
          {currentSubmission.autoScore !== null && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">Auto-Validation Score</h3>
              <div className="flex items-center">
                <div className={`text-2xl font-bold ${getScoreColor(currentSubmission.autoScore)}`}>
                  {(currentSubmission.autoScore * 100).toFixed(1)}%
                </div>
                <div className="ml-3">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        currentSubmission.autoScore >= 0.8 ? 'bg-green-500' :
                        currentSubmission.autoScore >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${currentSubmission.autoScore * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* User Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">User Information</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600">Name:</span>
                <span className="ml-2 font-medium">{currentSubmission.user.name}</span>
              </div>
              <div>
                <span className="text-gray-600">Email:</span>
                <span className="ml-2 font-medium">{currentSubmission.user.email}</span>
              </div>
            </div>
          </div>

          {/* Location Map */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">Location</h3>
            <div className="h-48 rounded-lg overflow-hidden">
              <MapView
                center={[currentSubmission.gpsLat, currentSubmission.gpsLng]}
                zoom={15}
                markers={[
                  {
                    position: [currentSubmission.gpsLat, currentSubmission.gpsLng],
                    title: 'Submission Location'
                  },
                  ...(currentSubmission.binLocation ? [{
                    position: [currentSubmission.binLocation.lat, currentSubmission.binLocation.lng],
                    title: currentSubmission.binLocation.name,
                    color: 'green'
                  }] : [])
                ]}
              />
            </div>
            <div className="mt-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4 inline mr-1" />
              {currentSubmission.gpsLat.toFixed(6)}, {currentSubmission.gpsLng.toFixed(6)}
              {currentSubmission.binLocation && (
                <span className="ml-2 text-green-600">
                  • Near {currentSubmission.binLocation.name}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}