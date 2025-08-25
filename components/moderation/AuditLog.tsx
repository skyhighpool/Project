'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  Filter,
  Download,
  Calendar,
  User,
  Activity,
  Eye
} from 'lucide-react'

interface AuditEvent {
  id: string
  submissionId: string
  actorId: string
  eventType: string
  meta: any
  createdAt: string
  actor: {
    id: string
    name: string
    email: string
    role: string
  }
  submission?: {
    id: string
    s3Key: string
    user: {
      name: string
      email: string
    }
  }
}

export function AuditLog() {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState({
    eventType: '',
    actorId: '',
    dateFrom: '',
    dateTo: '',
    search: ''
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

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

      const response = await fetch(`/api/admin/audit?${params}`, {
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

  const exportAuditLog = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const params = new URLSearchParams(filters)
      
      const response = await fetch(`/api/admin/audit/export?${params}`, {
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

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'APPROVED': return 'bg-success-100 text-success-800'
      case 'REJECTED': return 'bg-danger-100 text-danger-800'
      case 'AUTO_VERIFIED': return 'bg-info-100 text-info-800'
      case 'NEEDS_REVIEW': return 'bg-warning-100 text-warning-800'
      case 'MODERATED': return 'bg-primary-100 text-primary-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case 'APPROVED': return '✓'
      case 'REJECTED': return '✗'
      case 'AUTO_VERIFIED': return '🤖'
      case 'NEEDS_REVIEW': return '👁️'
      case 'MODERATED': return '⚖️'
      default: return '📝'
    }
  }

  const filteredEvents = events.filter(event =>
    !filters.search || 
    event.actor.name.toLowerCase().includes(filters.search.toLowerCase()) ||
    event.eventType.toLowerCase().includes(filters.search.toLowerCase()) ||
    (event.submission?.user.name || '').toLowerCase().includes(filters.search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Audit Log</h2>
        <button
          onClick={exportAuditLog}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
            <select
              value={filters.eventType}
              onChange={(e) => setFilters(prev => ({ ...prev, eventType: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Events</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="AUTO_VERIFIED">Auto Verified</option>
              <option value="NEEDS_REVIEW">Needs Review</option>
              <option value="MODERATED">Moderated</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <Input
              type="text"
              placeholder="Search by name, event type..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setFilters({
                eventType: '',
                actorId: '',
                dateFrom: '',
                dateTo: '',
                search: ''
              })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Audit Events */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="xl" />
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-12">
          <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Audit Events</h3>
          <p className="text-gray-600">No audit events match your current filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEvents.map((event) => (
            <div key={event.id} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEventTypeColor(event.eventType)}`}>
                      {getEventTypeIcon(event.eventType)} {event.eventType}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(event.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Actor</p>
                      <p className="text-sm text-gray-900">{event.actor.name}</p>
                      <p className="text-xs text-gray-500">{event.actor.email} ({event.actor.role})</p>
                    </div>

                    {event.submission && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Submission</p>
                        <p className="text-sm text-gray-900">{event.submission.user.name}</p>
                        <p className="text-xs text-gray-500">{event.submission.user.email}</p>
                      </div>
                    )}
                  </div>

                  {event.meta && Object.keys(event.meta).length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-gray-700 mb-1">Details</p>
                      <div className="bg-gray-50 rounded p-3 text-sm">
                        <pre className="text-gray-600 whitespace-pre-wrap">
                          {JSON.stringify(event.meta, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-success-100 rounded-lg">
              <Activity className="h-6 w-6 text-success-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Events</p>
              <p className="text-2xl font-bold text-gray-900">{events.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-primary-100 rounded-lg">
              <User className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Unique Actors</p>
              <p className="text-2xl font-bold text-gray-900">
                {new Set(events.map(e => e.actorId)).size}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-info-100 rounded-lg">
              <Calendar className="h-6 w-6 text-info-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Today's Events</p>
              <p className="text-2xl font-bold text-gray-900">
                {events.filter(e => {
                  const today = new Date().toDateString()
                  return new Date(e.createdAt).toDateString() === today
                }).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-warning-100 rounded-lg">
              <Eye className="h-6 w-6 text-warning-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Moderated</p>
              <p className="text-2xl font-bold text-gray-900">
                {events.filter(e => e.eventType === 'MODERATED').length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}