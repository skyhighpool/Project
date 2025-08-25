'use client'

import { useState, useEffect } from 'react'
import { User } from '@prisma/client'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { PayoutQueue } from '@/components/finance/PayoutQueue'
import { PayoutHistory } from '@/components/finance/PayoutHistory'
import { FinancialReports } from '@/components/finance/FinancialReports'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  DollarSign, 
  Clock, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  Download,
  AlertTriangle
} from 'lucide-react'

interface FinanceDashboardProps {
  user: User
  onLogout: () => void
}

export function FinanceDashboard({ user, onLogout }: FinanceDashboardProps) {
  const [activeTab, setActiveTab] = useState('queue')
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState({
    pendingPayouts: 0,
    totalPayoutsToday: 0,
    totalAmountToday: 0,
    failedPayouts: 0,
    averageProcessingTime: 0,
    totalPayoutsThisMonth: 0
  })

  useEffect(() => {
    fetchFinanceStats()
  }, [])

  const fetchFinanceStats = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch('/api/admin/finance/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching finance stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePayoutAction = () => {
    fetchFinanceStats()
  }

  const tabs = [
    { id: 'queue', label: 'Payout Queue', icon: Clock },
    { id: 'history', label: 'Payout History', icon: CheckCircle },
    { id: 'reports', label: 'Financial Reports', icon: TrendingUp },
    { id: 'settings', label: 'Settings', icon: Download }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'queue':
        return <PayoutQueue onAction={handlePayoutAction} />
      case 'history':
        return <PayoutHistory />
      case 'reports':
        return <FinancialReports />
      case 'settings':
        return <div className="p-6">Finance settings coming soon...</div>
      default:
        return <PayoutQueue onAction={handlePayoutAction} />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} onLogout={onLogout} />
      
      <div className="flex">
        <Sidebar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        
        <main className="flex-1 p-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="card">
              <div className="flex items-center">
                <div className="p-2 bg-warning-100 rounded-lg">
                  <Clock className="h-6 w-6 text-warning-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending Payouts</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {isLoading ? <LoadingSpinner size="sm" /> : stats.pendingPayouts}
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="p-2 bg-success-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-success-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Payouts Today</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {isLoading ? <LoadingSpinner size="sm" /> : stats.totalPayoutsToday}
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-primary-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Amount Today</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${isLoading ? <LoadingSpinner size="sm" /> : stats.totalAmountToday.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="p-2 bg-danger-100 rounded-lg">
                  <XCircle className="h-6 w-6 text-danger-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Failed Payouts</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {isLoading ? <LoadingSpinner size="sm" /> : stats.failedPayouts}
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="p-2 bg-info-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-info-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg Processing</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {isLoading ? <LoadingSpinner size="sm" /> : `${stats.averageProcessingTime}h`}
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Download className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">This Month</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {isLoading ? <LoadingSpinner size="sm" /> : stats.totalPayoutsThisMonth}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {stats.failedPayouts > 0 && (
            <div className="mb-6 bg-danger-50 border border-danger-200 rounded-lg p-4">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-danger-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-danger-800">
                    Failed Payouts Require Attention
                  </h3>
                  <p className="text-sm text-danger-700 mt-1">
                    {stats.failedPayouts} payout{stats.failedPayouts !== 1 ? 's' : ''} failed and need manual review.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content */}
          <div className="card">
            {renderTabContent()}
          </div>
        </main>
      </div>
    </div>
  )
}