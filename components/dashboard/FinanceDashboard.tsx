'use client'

import { useState, useEffect } from 'react'
import { User } from '@prisma/client'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { PayoutQueue } from '@/components/finance/PayoutQueue'
import { TransactionHistory } from '@/components/finance/TransactionHistory'
import { ReconciliationTools } from '@/components/finance/ReconciliationTools'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  CreditCard, 
  History, 
  RefreshCw, 
  BarChart3,
  Settings,
  DollarSign,
  TrendingUp
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
    totalPayoutsToday: 0,
    failedTransactions: 0,
    totalVolume: 0
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

  const tabs = [
    { id: 'payouts', label: 'Payout Queue', icon: CreditCard },
    { id: 'transactions', label: 'Transactions', icon: History },
    { id: 'reconciliation', label: 'Reconciliation', icon: RefreshCw },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'payouts':
        return <PayoutQueue onPayoutUpdate={fetchFinanceStats} />
      case 'transactions':
        return <TransactionHistory />
      case 'reconciliation':
        return <ReconciliationTools />
      case 'analytics':
        return <div className="p-6">Financial analytics coming soon...</div>
      case 'settings':
        return <div className="p-6">Finance settings coming soon...</div>
      default:
        return <PayoutQueue onPayoutUpdate={fetchFinanceStats} />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} onLogout={onLogout} />
      
      <div className="flex">
        <Sidebar 
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={tabs}
          userRole="finance"
        />
        
        <main className="flex-1 p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Finance Dashboard
            </h1>
            <p className="text-gray-600">
              Manage payouts, track transactions, and reconcile payments
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <>
              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <CreditCard className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Pending Payouts</p>
                      <p className="text-2xl font-semibold text-gray-900">{stats.pendingPayouts}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <DollarSign className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Payouts Today</p>
                      <p className="text-2xl font-semibold text-gray-900">${stats.totalPayoutsToday.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-red-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Failed Transactions</p>
                      <p className="text-2xl font-semibold text-gray-900">{stats.failedTransactions}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <BarChart3 className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Volume</p>
                      <p className="text-2xl font-semibold text-gray-900">${stats.totalVolume.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tab Content */}
              <div className="bg-white rounded-lg shadow">
                {renderTabContent()}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}