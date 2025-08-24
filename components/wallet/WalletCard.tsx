'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  DollarSign, 
  Gift, 
  TrendingUp, 
  History,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'

interface WalletCardProps {
  userId: string
}

interface WalletData {
  pointsBalance: number
  cashBalance: number
  lockedAmount: number
  recentTransactions: Array<{
    id: string
    type: 'POINTS_EARNED' | 'POINTS_SPENT' | 'CASHOUT' | 'REFUND'
    amount: number
    description: string
    createdAt: Date
  }>
}

export function WalletCard({ userId }: WalletCardProps) {
  const [walletData, setWalletData] = useState<WalletData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchWalletData()
  }, [])

  const fetchWalletData = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem('accessToken')
      
      const response = await fetch('/api/user/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        // Mock recent transactions for now
        const mockTransactions = [
          {
            id: '1',
            type: 'POINTS_EARNED' as const,
            amount: 100,
            description: 'Video submission approved',
            createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
          },
          {
            id: '2',
            type: 'POINTS_EARNED' as const,
            amount: 100,
            description: 'Video submission approved',
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
          },
          {
            id: '3',
            type: 'CASHOUT' as const,
            amount: -500,
            description: 'Cash out request processed',
            createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
          }
        ]

        setWalletData({
          pointsBalance: data.stats.currentPointsBalance,
          cashBalance: data.stats.currentCashBalance,
          lockedAmount: data.stats.lockedAmount,
          recentTransactions: mockTransactions
        })
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to fetch wallet data')
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error)
      setError('Failed to fetch wallet data')
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'POINTS_EARNED':
        return <ArrowUpRight className="h-4 w-4 text-success-500" />
      case 'POINTS_SPENT':
        return <ArrowDownRight className="h-4 w-4 text-danger-500" />
      case 'CASHOUT':
        return <ArrowDownRight className="h-4 w-4 text-warning-500" />
      case 'REFUND':
        return <ArrowUpRight className="h-4 w-4 text-primary-500" />
      default:
        return <ArrowUpRight className="h-4 w-4 text-gray-500" />
    }
  }

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'POINTS_EARNED':
        return 'text-success-600'
      case 'POINTS_SPENT':
        return 'text-danger-600'
      case 'CASHOUT':
        return 'text-warning-600'
      case 'REFUND':
        return 'text-primary-600'
      default:
        return 'text-gray-600'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-danger-500 mb-4">
          <DollarSign className="h-12 w-12 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading wallet</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={fetchWalletData}>Try again</Button>
      </div>
    )
  }

  if (!walletData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No wallet data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Wallet</h2>
        <p className="text-gray-600">Manage your points and cash balance</p>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Points Balance */}
        <div className="bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary-600">Points Balance</p>
              <p className="text-3xl font-bold text-primary-900">{walletData.pointsBalance}</p>
              <p className="text-sm text-primary-600 mt-1">
                ≈ {formatCurrency(walletData.pointsBalance * 0.01)}
              </p>
            </div>
            <div className="p-3 bg-primary-200 rounded-full">
              <Gift className="h-6 w-6 text-primary-600" />
            </div>
          </div>
        </div>

        {/* Cash Balance */}
        <div className="bg-gradient-to-br from-success-50 to-success-100 border border-success-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-success-600">Cash Balance</p>
              <p className="text-3xl font-bold text-success-900">
                {formatCurrency(walletData.cashBalance)}
              </p>
              <p className="text-sm text-success-600 mt-1">Available for withdrawal</p>
            </div>
            <div className="p-3 bg-success-200 rounded-full">
              <DollarSign className="h-6 w-6 text-success-600" />
            </div>
          </div>
        </div>

        {/* Locked Amount */}
        <div className="bg-gradient-to-br from-warning-50 to-warning-100 border border-warning-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-warning-600">Locked Amount</p>
              <p className="text-3xl font-bold text-warning-900">
                {formatCurrency(walletData.lockedAmount)}
              </p>
              <p className="text-sm text-warning-600 mt-1">Pending cashouts</p>
            </div>
            <div className="p-3 bg-warning-200 rounded-full">
              <TrendingUp className="h-6 w-6 text-warning-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="primary"
            onClick={() => {
              // TODO: Navigate to cashout form
              console.log('Navigate to cashout')
            }}
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Cash Out Points
          </Button>
          
          <Button
            variant="outline"
            onClick={() => {
              // TODO: Navigate to submission form
              console.log('Navigate to submission')
            }}
          >
            <Gift className="h-4 w-4 mr-2" />
            Submit New Video
          </Button>
          
          <Button
            variant="outline"
            onClick={() => {
              // TODO: Show transaction history
              console.log('Show history')
            }}
          >
            <History className="h-4 w-4 mr-2" />
            View History
          </Button>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h3>
        
        {walletData.recentTransactions.length === 0 ? (
          <div className="text-center py-8">
            <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No transactions yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {walletData.recentTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {getTransactionIcon(transaction.type)}
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {transaction.description}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(transaction.createdAt)}
                    </p>
                  </div>
                </div>
                
                <div className={`text-sm font-semibold ${getTransactionColor(transaction.type)}`}>
                  {transaction.type === 'POINTS_EARNED' || transaction.type === 'REFUND' ? '+' : ''}
                  {transaction.type === 'CASHOUT' ? formatCurrency(Math.abs(transaction.amount)) : `${transaction.amount} points`}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {walletData.recentTransactions.length > 0 && (
          <div className="mt-4 text-center">
            <Button variant="ghost" size="sm">
              View All Transactions
            </Button>
          </div>
        )}
      </div>

      {/* Points Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">How Points Work</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div>
            <p className="font-medium mb-2">Earning Points:</p>
            <ul className="space-y-1">
              <li>• 100 points per approved video submission</li>
              <li>• Bonus points for high-quality submissions</li>
              <li>• Referral bonuses available</li>
            </ul>
          </div>
          <div>
            <p className="font-medium mb-2">Using Points:</p>
            <ul className="space-y-1">
              <li>• 1 point = $0.01 USD</li>
              <li>• Minimum cashout: $5.00 (500 points)</li>
              <li>• Points never expire</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}