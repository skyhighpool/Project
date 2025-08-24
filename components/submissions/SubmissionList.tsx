'use client'

import { useState, useEffect } from 'react'
import { VideoSubmission } from '@/types'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Play,
  MapPin,
  Calendar,
  FileVideo
} from 'lucide-react'

interface SubmissionListProps {
  userId: string
}

export function SubmissionList({ userId }: SubmissionListProps) {
  const [submissions, setSubmissions] = useState<VideoSubmission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchSubmissions()
  }, [statusFilter, currentPage])

  const fetchSubmissions = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem('accessToken')
      
      const params = new URLSearchParams({
        status: statusFilter,
        page: currentPage.toString(),
        limit: '10'
      })

      const response = await fetch(`/api/submissions?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setSubmissions(data.data)
        setTotalPages(data.pagination.totalPages)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to fetch submissions')
      }
    } catch (error) {
      console.error('Error fetching submissions:', error)
      setError('Failed to fetch submissions')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'QUEUED':
        return <Clock className="h-4 w-4 text-gray-500" />
      case 'AUTO_VERIFIED':
        return <CheckCircle className="h-4 w-4 text-success-500" />
      case 'NEEDS_REVIEW':
        return <AlertCircle className="h-4 w-4 text-warning-500" />
      case 'APPROVED':
        return <CheckCircle className="h-4 w-4 text-success-500" />
      case 'REJECTED':
        return <XCircle className="h-4 w-4 text-danger-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium'
    
    switch (status) {
      case 'QUEUED':
        return `${baseClasses} bg-gray-100 text-gray-800`
      case 'AUTO_VERIFIED':
        return `${baseClasses} bg-success-100 text-success-800`
      case 'NEEDS_REVIEW':
        return `${baseClasses} bg-warning-100 text-warning-800`
      case 'APPROVED':
        return `${baseClasses} bg-success-100 text-success-800`
      case 'REJECTED':
        return `${baseClasses} bg-danger-100 text-danger-800`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatFileSize = (bytes: string) => {
    const size = parseInt(bytes)
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading && submissions.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error && submissions.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-danger-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading submissions</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={fetchSubmissions}>Try again</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">My Submissions</h2>
        <div className="flex items-center space-x-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="all">All Status</option>
            <option value="QUEUED">Queued</option>
            <option value="AUTO_VERIFIED">Auto Verified</option>
            <option value="NEEDS_REVIEW">Needs Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {submissions.length === 0 ? (
        <div className="text-center py-12">
          <FileVideo className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No submissions yet</h3>
          <p className="text-gray-600">Start by uploading your first video submission.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((submission) => (
            <div key={submission.id} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-4">
                    {getStatusIcon(submission.status)}
                    <span className={getStatusBadge(submission.status)}>
                      {submission.status.replace('_', ' ')}
                    </span>
                    {submission.autoScore && (
                      <span className="text-sm text-gray-500">
                        Score: {(submission.autoScore * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center space-x-2">
                      <Play className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        Duration: {formatDuration(submission.durationS)}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <FileVideo className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        Size: {formatFileSize(submission.sizeBytes)}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {submission.gpsLat.toFixed(6)}, {submission.gpsLng.toFixed(6)}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {formatDate(submission.recordedAt)}
                      </span>
                    </div>
                  </div>

                  {submission.rejectionReason && (
                    <div className="bg-danger-50 border border-danger-200 rounded-md p-3">
                      <p className="text-sm text-danger-800">
                        <strong>Rejection Reason:</strong> {submission.rejectionReason}
                      </p>
                    </div>
                  )}

                  <div className="text-xs text-gray-500 mt-2">
                    Submitted: {formatDate(submission.createdAt)}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // TODO: Implement video playback
                      console.log('Play video:', submission.s3Key)
                    }}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Play
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}