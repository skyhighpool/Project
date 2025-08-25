'use client'

import { useState, useEffect } from 'react'
import { VideoSubmission } from '@prisma/client'
import { VideoPlayer } from '@/components/video/VideoPlayer'
import { MapView } from '@/components/ui/MapView'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Badge } from '@/components/ui/Badge'
import { 
  CheckCircle, 
  XCircle, 
  Eye, 
  MapPin, 
  Clock,
  AlertTriangle,
  Info
} from 'lucide-react'

interface ReviewQueueProps {
  onAction: () => void
}

interface SubmissionWithDetails extends VideoSubmission {
  user: {
    id: string
    name: string
    email: string
  }
  binLocation?: {
    id: string
    name: string
    lat: number
    lng: number
    radiusM: number
  }
}

export function ReviewQueue({ onAction }: ReviewQueueProps) {
  const [submissions, setSubmissions] = useState<SubmissionWithDetails[]>([])
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionWithDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

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
        if (data.length > 0 && !selectedSubmission) {
          setSelectedSubmission(data[0])
        }
      }
    } catch (error) {
      console.error('Error fetching review queue:', error)
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
        setSubmissions(prev => prev.filter(s => s.id !== submissionId))
        if (selectedSubmission?.id === submissionId) {
          setSelectedSubmission(submissions[1] || null)
        }
        onAction()
      }
    } catch (error) {
      console.error('Error approving submission:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async (submissionId: string) => {
    if (!rejectionReason.trim()) {
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
        body: JSON.stringify({ reason: rejectionReason })
      })
      
      if (response.ok) {
        setSubmissions(prev => prev.filter(s => s.id !== submissionId))
        if (selectedSubmission?.id === submissionId) {
          setSelectedSubmission(submissions[1] || null)
        }
        setRejectionReason('')
        onAction()
      }
    } catch (error) {
      console.error('Error rejecting submission:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NEEDS_REVIEW':
        return <Badge variant="warning">Needs Review</Badge>
      case 'AUTO_VERIFIED':
        return <Badge variant="success">Auto Verified</Badge>
      case 'QUEUED':
        return <Badge variant="info">Queued</Badge>
      default:
        return <Badge variant="default">{status}</Badge>
    }
  }

  const getRiskLevel = (score: number | null) => {
    if (!score) return 'Unknown'
    if (score >= 0.8) return 'Low'
    if (score >= 0.5) return 'Medium'
    return 'High'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (submissions.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No submissions to review</h3>
        <p className="text-gray-600">All submissions have been processed!</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Submission List */}
      <div className="lg:col-span-1">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Review Queue ({submissions.length})
        </h3>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {submissions.map((submission) => (
            <div
              key={submission.id}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedSubmission?.id === submission.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedSubmission(submission)}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">
                  {submission.user.name}
                </span>
                {getStatusBadge(submission.status)}
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {new Date(submission.createdAt).toLocaleDateString()}
                </div>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {submission.gpsLat.toFixed(4)}, {submission.gpsLng.toFixed(4)}
                </div>
                {submission.autoScore && (
                  <div className="flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Risk: {getRiskLevel(submission.autoScore)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Review Panel */}
      <div className="lg:col-span-2">
        {selectedSubmission ? (
          <div className="space-y-6">
            {/* Video Player */}
            <div className="bg-black rounded-lg overflow-hidden">
              <VideoPlayer 
                s3Key={selectedSubmission.s3Key}
                thumbnail={selectedSubmission.thumbKey}
              />
            </div>

            {/* Submission Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900">Submission Details</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">User</label>
                    <p className="text-sm text-gray-900">{selectedSubmission.user.name}</p>
                    <p className="text-xs text-gray-500">{selectedSubmission.user.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Duration</label>
                    <p className="text-sm text-gray-900">{selectedSubmission.durationS}s</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">File Size</label>
                    <p className="text-sm text-gray-900">
                      {(selectedSubmission.sizeBytes / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Device Hash</label>
                    <p className="text-sm text-gray-900 font-mono text-xs">
                      {selectedSubmission.deviceHash}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Auto Score</label>
                    <p className="text-sm text-gray-900">
                      {selectedSubmission.autoScore ? selectedSubmission.autoScore.toFixed(2) : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900">Location & Timing</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">GPS Coordinates</label>
                    <p className="text-sm text-gray-900">
                      {selectedSubmission.gpsLat}, {selectedSubmission.gpsLng}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Recorded At</label>
                    <p className="text-sm text-gray-900">
                      {new Date(selectedSubmission.recordedAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Nearest Bin</label>
                    <p className="text-sm text-gray-900">
                      {selectedSubmission.binLocation?.name || 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Distance to Bin</label>
                    <p className="text-sm text-gray-900">
                      {selectedSubmission.binLocation 
                        ? `${calculateDistance(
                            selectedSubmission.gpsLat,
                            selectedSubmission.gpsLng,
                            selectedSubmission.binLocation.lat,
                            selectedSubmission.binLocation.lng
                          ).toFixed(1)}m`
                        : 'Unknown'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Map View */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Location Map</h4>
              <div className="h-64 rounded-lg overflow-hidden border">
                <MapView
                  center={[selectedSubmission.gpsLat, selectedSubmission.gpsLng]}
                  submissions={[selectedSubmission]}
                  binLocations={selectedSubmission.binLocation ? [selectedSubmission.binLocation] : []}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-6 border-t">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason (if rejecting)
                </label>
                <input
                  type="text"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex space-x-3 ml-4">
                <Button
                  variant="success"
                  onClick={() => handleApprove(selectedSubmission.id)}
                  disabled={isProcessing}
                  className="flex items-center"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="danger"
                  onClick={() => handleReject(selectedSubmission.id)}
                  disabled={isProcessing}
                  className="flex items-center"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a submission</h3>
            <p className="text-gray-600">Choose a submission from the queue to review</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Helper function to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lon2 - lon1) * Math.PI / 180

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}