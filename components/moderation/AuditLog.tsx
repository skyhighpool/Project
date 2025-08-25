'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Badge } from '@/components/ui/Badge'
import { 
  FileText, 
  Search, 
  Filter, 
  Download,
  User,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock
} from 'lucide-react'

interface AuditEvent {
  id: string
  submissionId: string
  actorId: string
  actorName: string
  actorRole: string
  eventType: string
  description: string
  meta: any
  createdAt: string
  ipAddress?: string
  userAgent?: string
}

export function AuditLog() {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState({
    eventType: '',
    actorRole: '',
    dateFrom: '',
    dateTo: '',
    submissionId: ''
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null)

  useEffect(() => {
    fetchAuditLog()
  }, [currentPage, filters])

  const fetchAuditLog = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      const params = new URLSearchParams({
        page: currentPage.toString(),
        ...filters
      })
      
      const response = await fetch(`/api/admin/audit-log?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setEvents(data.events)
        setTotalPages(data.totalPages)
      }
    } catch (error) {
      console.error('Error fetching audit log:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const params = new URLSearchParams(filters)
      
      const response = await fetch(`/api/admin/audit-log/export?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error exporting audit log:', error)
    }
  }

  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case 'APPROVED':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'REJECTED':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'VIEWED':
        return <Eye className="h-4 w-4 text-blue-500" />
      case 'FLAGGED':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default:
        return <FileText className="h-4 w-4 text-gray-500" />
    }
  }

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'APPROVED':
        return 'success'
      case 'REJECTED':
        return 'danger'
      case 'VIEWED':
        return 'info'
      case 'FLAGGED':
        return 'warning'
      default:
        return 'default'
    }
  }

  const formatEventDescription = (event: AuditEvent) => {
    switch (event.eventType) {
      case 'APPROVED':
        return `Approved submission ${event.submissionId}`
      case 'REJECTED':
        return `Rejected submission ${event.submissionId} - ${event.meta?.reason || 'No reason provided'}`
      case 'VIEWED':
        return `Viewed submission ${event.submissionId}`
      case 'FLAGGED':
        return `Flagged submission ${event.submissionId} for review`
      case 'SETTINGS_CHANGED':
        return `Changed fraud detection settings`
      case 'USER_SUSPENDED':
        return `Suspended user ${event.meta?.targetUserId}`
      default:
        return event.description
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Audit Log</h3>
        <Button onClick={handleExport} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Type
            </label>
            <select
              value={filters.eventType}
              onChange={(e) => handleFilterChange('eventType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Events</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="VIEWED">Viewed</option>
              <option value="FLAGGED">Flagged</option>
              <option value="SETTINGS_CHANGED">Settings Changed</option>
              <option value="USER_SUSPENDED">User Suspended</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Actor Role
            </label>
            <select
              value={filters.actorRole}
              onChange={(e) => handleFilterChange('actorRole', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Roles</option>
              <option value="MODERATOR">Moderator</option>
              <option value="ADMIN">Admin</option>
              <option value="SYSTEM">System</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Submission ID
            </label>
            <input
              type="text"
              value={filters.submissionId}
              onChange={(e) => handleFilterChange('submissionId', e.target.value)}
              placeholder="Enter submission ID..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-gray-900 mb-2">No audit events found</h4>
          <p className="text-gray-600">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <div
              key={event.id}
              className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
              onClick={() => setSelectedEvent(event)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  {getEventTypeIcon(event.eventType)}
                  <div>
                    <span className="font-medium text-gray-900">{event.actorName}</span>
                    <span className="text-gray-500 ml-2">({event.actorRole})</span>
                  </div>
                  <Badge variant={getEventTypeColor(event.eventType)}>
                    {event.eventType}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Clock className="h-4 w-4" />
                  {new Date(event.createdAt).toLocaleString()}
                </div>
              </div>
              
              <p className="text-gray-700 mb-2">
                {formatEventDescription(event)}
              </p>
              
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Submission: {event.submissionId}</span>
                {event.ipAddress && (
                  <span>IP: {event.ipAddress}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="px-4 py-2 text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Event Details</h3>
              <Button
                variant="outline"
                onClick={() => setSelectedEvent(null)}
              >
                Close
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Event ID</label>
                <p className="text-sm text-gray-900 font-mono">{selectedEvent.id}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Actor</label>
                <p className="text-sm text-gray-900">{selectedEvent.actorName} ({selectedEvent.actorRole})</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Event Type</label>
                <p className="text-sm text-gray-900">{selectedEvent.eventType}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <p className="text-sm text-gray-900">{formatEventDescription(selectedEvent)}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Timestamp</label>
                <p className="text-sm text-gray-900">{new Date(selectedEvent.createdAt).toLocaleString()}</p>
              </div>
              
              {selectedEvent.ipAddress && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">IP Address</label>
                  <p className="text-sm text-gray-900">{selectedEvent.ipAddress}</p>
                </div>
              )}
              
              {selectedEvent.userAgent && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">User Agent</label>
                  <p className="text-sm text-gray-900">{selectedEvent.userAgent}</p>
                </div>
              )}
              
              {selectedEvent.meta && Object.keys(selectedEvent.meta).length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Additional Data</label>
                  <pre className="text-sm text-gray-900 bg-gray-50 p-2 rounded overflow-x-auto">
                    {JSON.stringify(selectedEvent.meta, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}