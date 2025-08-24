'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  RefreshCw, 
  Download,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Search
} from 'lucide-react'

interface ReconciliationData {
  totalTransactions: number
  reconciledTransactions: number
  pendingReconciliation: number
  failedReconciliations: number
  lastReconciliation: string
  webhookErrors: number
}

interface WebhookEvent {
  id: string
  gateway: string
  eventType: string
  status: string
  rawData: any
  processedAt?: string
  errorMessage?: string
}

export function ReconciliationTools() {
  const [reconciliationData, setReconciliationData] = useState<ReconciliationData | null>(null)
  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isReconciling, setIsReconciling] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<WebhookEvent | null>(null)

  useEffect(() => {
    fetchReconciliationData()
    fetchWebhookEvents()
  }, [])

  const fetchReconciliationData = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch('/api/admin/finance/reconciliation/summary', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setReconciliationData(data)
      }
    } catch (error) {
      console.error('Error fetching reconciliation data:', error)
    }
  }

  const fetchWebhookEvents = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch('/api/admin/finance/webhooks', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setWebhookEvents(data.events || [])
      }
    } catch (error) {
      console.error('Error fetching webhook events:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const runReconciliation = async () => {
    setIsReconciling(true)
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch('/api/admin/finance/reconciliation/run', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        // Refresh data
        await Promise.all([
          fetchReconciliationData(),
          fetchWebhookEvents()
        ])
        alert('Reconciliation completed successfully')
      }
    } catch (error) {
      console.error('Error running reconciliation:', error)
      alert('Reconciliation failed')
    } finally {
      setIsReconciling(false)
    }
  }

  const exportReconciliationReport = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch('/api/admin/finance/reconciliation/export', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `reconciliation-report-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error exporting reconciliation report:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'FAILED':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'PENDING':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Reconciliation Tools
        </h2>
        <p className="text-gray-600">
          Reconcile payments, handle webhooks, and resolve discrepancies
        </p>
      </div>

      {/* Reconciliation Summary */}
      {reconciliationData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                <p className="text-2xl font-semibold text-gray-900">{reconciliationData.totalTransactions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Reconciled</p>
                <p className="text-2xl font-semibold text-gray-900">{reconciliationData.reconciledTransactions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-semibold text-gray-900">{reconciliationData.pendingReconciliation}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Failed</p>
                <p className="text-2xl font-semibold text-gray-900">{reconciliationData.failedReconciliations}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Reconciliation Actions</h3>
            <p className="text-gray-600">
              Last reconciliation: {reconciliationData?.lastReconciliation ? new Date(reconciliationData.lastReconciliation).toLocaleString() : 'Never'}
            </p>
          </div>
          
          <div className="flex space-x-4">
            <Button
              onClick={runReconciliation}
              disabled={isReconciling}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isReconciling ? (
                <LoadingSpinner size="sm" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Run Reconciliation
            </Button>
            
            <Button
              onClick={exportReconciliationReport}
              variant="outline"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>
      </div>

      {/* Webhook Events */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Webhook Events ({webhookEvents.length})
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Monitor payment gateway webhooks and their processing status
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Event ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gateway
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Event Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Processed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {webhookEvents.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {event.id.substring(0, 8)}...
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {event.gateway}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {event.eventType}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(event.status)}`}>
                      {getStatusIcon(event.status)}
                      <span className="ml-1">{event.status}</span>
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {event.processedAt ? new Date(event.processedAt).toLocaleString() : 'Not processed'}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => setSelectedEvent(event)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Search className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Webhook Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-3/4 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Webhook Event Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Event Information</h4>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="text-gray-600">Event ID:</dt>
                      <dd className="font-medium font-mono">{selectedEvent.id}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-600">Gateway:</dt>
                      <dd className="font-medium">{selectedEvent.gateway}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-600">Event Type:</dt>
                      <dd className="font-medium">{selectedEvent.eventType}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-600">Status:</dt>
                      <dd className="font-medium">{selectedEvent.status}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-600">Processed At:</dt>
                      <dd className="font-medium">
                        {selectedEvent.processedAt ? new Date(selectedEvent.processedAt).toLocaleString() : 'Not processed'}
                      </dd>
                    </div>
                  </dl>
                </div>
                
                {selectedEvent.errorMessage && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Error Details</h4>
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                      <p className="text-sm text-red-800">{selectedEvent.errorMessage}</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Raw Webhook Data</h4>
                <pre className="bg-gray-50 p-4 rounded text-xs overflow-auto max-h-64">
                  {JSON.stringify(selectedEvent.rawData, null, 2)}
                </pre>
              </div>
              
              <div className="mt-6 flex justify-end">
                <Button
                  onClick={() => setSelectedEvent(null)}
                  variant="outline"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}