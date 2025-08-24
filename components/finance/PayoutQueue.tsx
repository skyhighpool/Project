'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  CreditCard, 
  DollarSign, 
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Play
} from 'lucide-react'

interface CashoutRequest {
  id: string
  userId: string
  pointsUsed: number
  cashAmount: number
  method: string
  destinationRef: string
  status: string
  failureReason?: string
  createdAt: string
  user: {
    name: string
    email: string
  }
  submission?: {
    id: string
    s3Key: string
  }
}

export function PayoutQueue({ onPayoutUpdate }: { onPayoutUpdate: () => void }) {
  const [cashouts, setCashouts] = useState<CashoutRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedCashout, setSelectedCashout] = useState<CashoutRequest | null>(null)

  useEffect(() => {
    fetchPayoutQueue()
  }, [])

  const fetchPayoutQueue = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch('/api/admin/cashouts?status=pending', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setCashouts(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching payout queue:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInitiatePayout = async (cashoutId: string) => {
    setIsProcessing(true)
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch(`/api/admin/cashouts/${cashoutId}/initiate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        // Update local state
        setCashouts(prev => prev.map(c => 
          c.id === cashoutId 
            ? { ...c, status: 'INITIATED' }
            : c
        ))
        onPayoutUpdate()
      }
    } catch (error) {
      console.error('Error initiating payout:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'INITIATED':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'SUCCEEDED':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'FAILED':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'INITIATED':
        return <Play className="h-4 w-4 text-blue-600" />
      case 'SUCCEEDED':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />
    }
  }

  const formatMethod = (method: string) => {
    switch (method) {
      case 'BANK_TRANSFER':
        return 'Bank Transfer'
      case 'PAYPAL':
        return 'PayPal'
      case 'STRIPE':
        return 'Stripe'
      case 'CASH':
        return 'Cash'
      default:
        return method.replace('_', ' ')
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
          Payout Queue
        </h2>
        <p className="text-gray-600">
          {cashouts.length} pending cashout request{cashouts.length !== 1 ? 's' : ''} awaiting processing
        </p>
      </div>

      {cashouts.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No pending payouts</h3>
          <p className="text-gray-600">All cashout requests have been processed.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Destination
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cashouts.map((cashout) => (
                  <tr key={cashout.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {cashout.user.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {cashout.user.email}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="font-medium">${cashout.cashAmount.toFixed(2)}</div>
                        <div className="text-gray-500">
                          {cashout.pointsUsed.toLocaleString()} points
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatMethod(cashout.method)}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-mono">
                        {cashout.destinationRef}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(cashout.status)}`}>
                        {getStatusIcon(cashout.status)}
                        <span className="ml-1">{cashout.status}</span>
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(cashout.createdAt).toLocaleDateString()}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => setSelectedCashout(cashout)}
                          size="sm"
                          variant="outline"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        
                        {cashout.status === 'PENDING' && (
                          <Button
                            onClick={() => handleInitiatePayout(cashout.id)}
                            disabled={isProcessing}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Initiate
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cashout Details Modal */}
      {selectedCashout && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Cashout Details
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">User</label>
                  <p className="text-sm text-gray-900">{selectedCashout.user.name}</p>
                  <p className="text-sm text-gray-500">{selectedCashout.user.email}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Amount</label>
                  <p className="text-2xl font-bold text-gray-900">
                    ${selectedCashout.cashAmount.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {selectedCashout.pointsUsed.toLocaleString()} points used
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                  <p className="text-sm text-gray-900">{formatMethod(selectedCashout.method)}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Destination</label>
                  <p className="text-sm text-gray-900 font-mono break-all">
                    {selectedCashout.destinationRef}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(selectedCashout.status)}`}>
                    {getStatusIcon(selectedCashout.status)}
                    <span className="ml-1">{selectedCashout.status}</span>
                  </span>
                </div>
                
                {selectedCashout.failureReason && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Failure Reason</label>
                    <p className="text-sm text-red-600">{selectedCashout.failureReason}</p>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Requested</label>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedCashout.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              
              <div className="mt-6 flex space-x-3">
                <Button
                  onClick={() => setSelectedCashout(null)}
                  variant="outline"
                  className="flex-1"
                >
                  Close
                </Button>
                
                {selectedCashout.status === 'PENDING' && (
                  <Button
                    onClick={() => {
                      handleInitiatePayout(selectedCashout.id)
                      setSelectedCashout(null)
                    }}
                    disabled={isProcessing}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Initiate Payout
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}