'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  Search, 
  Filter,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  FileVideo
} from 'lucide-react'

interface AuditEvent {
  id: string
  submissionId: string
  actorId: string
  eventType: string
  meta: any
  createdAt: string
  actor: {
    name: string
    email: string
    role: string
  }
  submission?: {
    s3Key: string
    gpsLat: number
    gpsLng: number
  }
}

export function AuditLog() {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchAuditLog()
  }, [currentPage, eventTypeFilter, dateRange])

  const fetchAuditLog = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        eventType: eventTypeFilter !== 'all' ? eventTypeFilter : '',
        from: dateRange.from,
        to: dateRange.to,
        search: searchQuery
      })

      const response = await fetch(`/api/admin/audit/log?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setEvents(data.events || [])
        setTotalPages(data.totalPages || 1)
      }
    } catch (error) {
      console.error('Error fetching audit log:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = () => {
    setCurrentPage(1)
    fetchAuditLog()
  }

  const exportAuditLog = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const params = new URLSearchParams({
        eventType: eventTypeFilter !== 'all' ? eventTypeFilter : '',
        from: dateRange.from,
        to: dateRange.to,
        search: searchQuery,
        format: 'csv'
      })

      const response = await fetch(`/api/admin/audit/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `audit-log-${dateRange.from}-to-${dateRange.to}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error exporting audit log:', error)
    }
  }

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'APPROVED':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'REJECTED':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'NEEDS_REVIEW':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'AUTO_VERIFIED':
        return <CheckCircle className="h-4 w-4 text-blue-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'APPROVED':
        return 'bg-green-50 border-green-200'
      case 'REJECTED':
        return 'bg-red-50 border-red-200'
      case 'NEEDS_REVIEW':
        return 'bg-yellow-50 border-yellow-200'
      case 'AUTO_VERIFIED':
        return 'bg-blue-50 border-blue-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const formatEventDescription = (event: AuditEvent) => {
    switch (event.eventType) {
      case 'APPROVED':
        return `Approved submission by ${event.actor.name}`
      case 'REJECTED':
        return `Rejected submission by ${event.actor.name} - ${event.meta?.rejectionReason || 'No reason provided'}`
      case 'NEEDS_REVIEW':
        return `Submission flagged for review by ${event.actor.name}`
      case 'AUTO_VERIFIED':
        return `Submission auto-verified by system`
      case 'CREATED':
        return `New submission created by ${event.actor.name}`
      default:
        return `${event.eventType} action by ${event.actor.name}`
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Audit Log
        </h2>
        <p className="text-gray-600">
          Track all moderation actions, decisions, and system events
        </p>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by submission ID, actor, or details..."
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
            <select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Events</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="NEEDS_REVIEW">Needs Review</option>
              <option value="AUTO_VERIFIED">Auto Verified</option>
              <option value="CREATED">Created</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <Input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <Input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              className="w-full"
            />
          </div>
        </div>
        
        <div className="flex space-x-4">
          <Button onClick={handleSearch} className="flex-1">
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
          
          <Button onClick={exportAuditLog} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Audit Events */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Audit Events ({events.length})
          </h3>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="lg" />
          </div>
        ) : events.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No audit events found for the selected criteria.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {events.map((event) => (
              <div key={event.id} className="p-6">
                <div className="flex items-start space-x-4">
                  <div className={`p-2 rounded-lg border ${getEventColor(event.eventType)}`}>
                    {getEventIcon(event.eventType)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-900">
                        {event.eventType.replace('_', ' ')}
                      </h4>
                      <span className="text-sm text-gray-500">
                        {new Date(event.createdAt).toLocaleString()}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">
                      {formatEventDescription(event)}
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center">
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-600">Actor:</span>
                        <span className="ml-2 font-medium">{event.actor.name}</span>
                        <span className="ml-2 text-gray-500">({event.actor.role})</span>
                      </div>
                      
                      {event.submission && (
                        <div className="flex items-center">
                          <FileVideo className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-gray-600">Location:</span>
                          <span className="ml-2 font-medium">
                            {event.submission.gpsLat.toFixed(4)}, {event.submission.gpsLng.toFixed(4)}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-600">Submission ID:</span>
                        <span className="ml-2 font-mono text-xs font-medium">
                          {event.submissionId.substring(0, 8)}...
                        </span>
                      </div>
                    </div>
                    
                    {event.meta && Object.keys(event.meta).length > 0 && (
                      <details className="mt-3">
                        <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-900">
                          View Details
                        </summary>
                        <pre className="mt-2 bg-gray-50 p-3 rounded text-xs overflow-auto">
                          {JSON.stringify(event.meta, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </div>
              
              <div className="flex space-x-2">
                <Button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  size="sm"
                  variant="outline"
                >
                  Previous
                </Button>
                
                <Button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  size="sm"
                  variant="outline"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}