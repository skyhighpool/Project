'use client'

import { useState, useEffect } from 'react'
import { User } from '@prisma/client'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { PayoutQueue } from '@/components/finance/PayoutQueue'
import { TransactionMonitor } from '@/components/finance/TransactionMonitor'
import { ReconciliationTools } from '@/components/finance/ReconciliationTools'
import { FinancialReports } from '@/components/finance/FinancialReports'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  DollarSign, 
  CreditCard, 
  TrendingUp, 
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  BarChart3
} from 'lucide-react'

interface FinanceDashboardProps {
  user: User
  onLogout: () => void
}

export function FinanceDashboard({ user, onLogout }: FinanceDashboardProps) {
  const [activeTab, setActiveTab] = useState('payouts')
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState({
    pendingPayouts: 0,
    initiatedPayouts: 0,
    successfulPayouts: 0,
    failedPayouts: 0,
    totalAmountPending: 0,
    totalAmountProcessed: 0,
    averageProcessingTime: 0,
    successRate: 0
  })

  useEffect(() => {
    fetchFinanceStats()
  }, [])

  const fetchFinanceStats = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch('/api/admin/finance-stats', {
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
    { id: 'payouts', label: 'Payout Queue', icon: DollarSign },
    { id: 'transactions', label: 'Transaction Monitor', icon: CreditCard },
    { id: 'reconciliation', label: 'Reconciliation', icon: TrendingUp },
    { id: 'reports', label: 'Financial Reports', icon: FileText }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'payouts':
        return <PayoutQueue onAction={handlePayoutAction} />
      case 'transactions':
        return <TransactionMonitor />
      case 'reconciliation':
        return <ReconciliationTools />
      case 'reports':
        return <FinancialReports />
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
                <div className="p-2 bg-primary-100 rounded-lg">
                  <CreditCard className="h-6 w-6 text-primary-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Initiated</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {isLoading ? <LoadingSpinner size="sm" /> : stats.initiatedPayouts}
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
                  <p className="text-sm font-medium text-gray-600">Successful</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {isLoading ? <LoadingSpinner size="sm" /> : stats.successfulPayouts}
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="p-2 bg-danger-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-danger-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Failed</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {isLoading ? <LoadingSpinner size="sm" /> : stats.failedPayouts}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Financial Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Amount Pending</h3>
              <div className="text-center">
                <p className="text-4xl font-bold text-warning-600">
                  ${isLoading ? <LoadingSpinner size="lg" /> : stats.totalAmountPending.toFixed(2)}
                </p>
                <p className="text-gray-600 mt-2">Total pending payout amount</p>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Amount Processed</h3>
              <div className="text-center">
                <p className="text-4xl font-bold text-success-600">
                  ${isLoading ? <LoadingSpinner size="lg" /> : stats.totalAmountProcessed.toFixed(2)}
                </p>
                <p className="text-gray-600 mt-2">Total processed this month</p>
              </div>
            </div>
          </div>

          {/* Processing Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Success Rate</h3>
              <div className="text-center">
                <p className="text-4xl font-bold text-primary-600">
                  {isLoading ? <LoadingSpinner size="lg" /> : `${stats.successRate}%`}
                </p>
                <p className="text-gray-600 mt-2">Payout success rate</p>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Avg Processing Time</h3>
              <div className="text-center">
                <p className="text-4xl font-bold text-info-600">
                  {isLoading ? <LoadingSpinner size="lg" /> : `${stats.averageProcessingTime}h`}
                </p>
                <p className="text-gray-600 mt-2">Average payout processing time</p>
              </div>
            </div>
          </div>

          {/* Tab Content */}
          <div className="card">
            {renderTabContent()}
          </div>
        </main>
      </div>
    </div>
  )
}