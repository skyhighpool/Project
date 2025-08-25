'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  DollarSign,
  User,
  AlertTriangle
} from 'lucide-react'

interface PayoutRequest {
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
}

interface PayoutQueueProps {
  onAction: () => void
}

export function PayoutQueue({ onAction }: PayoutQueueProps) {
  const [payouts, setPayouts] = useState<PayoutRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchPayoutQueue()
  }, [])

  const fetchPayoutQueue = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch('/api/admin/finance/payouts?status=pending', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setPayouts(data)
      }
    } catch (error) {
      console.error('Error fetching payout queue:', error)
      setError('Failed to load payout queue')
    } finally {
      setIsLoading(false)
    }
  }

  const handleProcessPayout = async (payoutId: string) => {
    setIsProcessing(true)
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch(`/api/admin/finance/payouts/${payoutId}/process`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        await fetchPayoutQueue()
        onAction()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to process payout')
      }
    } catch (error) {
      console.error('Error processing payout:', error)
      setError('An unexpected error occurred')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRejectPayout = async (payoutId: string, reason: string) => {
    setIsProcessing(true)
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch(`/api/admin/finance/payouts/${payoutId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      })

      if (response.ok) {
        await fetchPayoutQueue()
        onAction()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to reject payout')
      }
    } catch (error) {
      console.error('Error rejecting payout:', error)
      setError('An unexpected error occurred')
    } finally {
      setIsProcessing(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-warning-100 text-warning-800'
      case 'INITIATED': return 'bg-info-100 text-info-800'
      case 'SUCCEEDED': return 'bg-success-100 text-success-800'
      case 'FAILED': return 'bg-danger-100 text-danger-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'BANK_TRANSFER': return '🏦'
      case 'PAYPAL': return '💳'
      case 'STRIPE': return '💳'
      case 'CASH': return '💵'
      default: return '💰'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="xl" />
      </div>
    )
  }

  if (payouts.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="h-12 w-12 text-success-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Payouts</h3>
        <p className="text-gray-600">All payout requests have been processed.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Payout Queue</h2>
        <div className="text-sm text-gray-600">
          {payouts.length} payout{payouts.length !== 1 ? 's' : ''} pending
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

      <div className="space-y-4">
        {payouts.map((payout) => (
          <div key={payout.id} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <User className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{payout.user.name}</p>
                      <p className="text-sm text-gray-500">{payout.user.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">${payout.cashAmount.toFixed(2)}</p>
                      <p className="text-sm text-gray-500">{payout.pointsUsed} points</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{getMethodIcon(payout.method)}</span>
                    <div>
                      <p className="font-medium text-gray-900">{payout.method.replace('_', ' ')}</p>
                      <p className="text-sm text-gray-500">{payout.destinationRef}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(payout.status)}`}>
                    <Clock className="h-3 w-3 mr-1" />
                    {payout.status}
                  </span>
                  <span className="text-sm text-gray-500">
                    Requested {new Date(payout.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {payout.failureReason && (
                  <div className="mt-3 p-3 bg-danger-50 rounded-lg">
                    <p className="text-sm text-danger-700">
                      <strong>Failure Reason:</strong> {payout.failureReason}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex space-x-2 ml-6">
                <Button
                  onClick={() => handleProcessPayout(payout.id)}
                  disabled={isProcessing}
                  className="bg-success-600 hover:bg-success-700"
                >
                  {isProcessing ? <LoadingSpinner size="sm" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  Process
                </Button>
                <Button
                  onClick={() => handleRejectPayout(payout.id, 'Manual rejection')}
                  disabled={isProcessing}
                  className="bg-danger-600 hover:bg-danger-700"
                >
                  {isProcessing ? <LoadingSpinner size="sm" /> : <XCircle className="h-4 w-4 mr-2" />}
                  Reject
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Amount</p>
            <p className="text-2xl font-bold text-gray-900">
              ${payouts.reduce((sum, p) => sum + p.cashAmount, 0).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Total Points</p>
            <p className="text-2xl font-bold text-gray-900">
              {payouts.reduce((sum, p) => sum + p.pointsUsed, 0).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Average Amount</p>
            <p className="text-2xl font-bold text-gray-900">
              ${(payouts.reduce((sum, p) => sum + p.cashAmount, 0) / payouts.length).toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}