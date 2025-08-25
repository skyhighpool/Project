'use client'

import { useState, useEffect } from 'react'
import { User } from '@prisma/client'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  DollarSign, 
  BarChart3, 
  Settings,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Receipt,
  PiggyBank
} from 'lucide-react'

interface FinanceDashboardProps {
  user: User
  onLogout: () => void
}

export function FinanceDashboard({ user, onLogout }: FinanceDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    pendingPayouts: 0,
    monthlyGrowth: 0,
    averageReward: 0,
    totalTransactions: 0
  })

  useEffect(() => {
    fetchFinanceStats()
  }, [])

  const fetchFinanceStats = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch('/api/finance/stats', {
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
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'revenue', label: 'Revenue', icon: TrendingUp },
    { id: 'expenses', label: 'Expenses', icon: TrendingDown },
    { id: 'payouts', label: 'Payouts', icon: CreditCard },
    { id: 'transactions', label: 'Transactions', icon: Receipt },
    { id: 'profile', label: 'Profile', icon: Settings }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Financial Overview</h2>
            <p className="text-gray-600">Monitor the financial health and performance of the waste management system</p>
            {/* TODO: Add FinancialOverview component */}
          </div>
        )
      case 'revenue':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Revenue Analysis</h2>
            <p className="text-gray-600">Analyze revenue streams and trends</p>
            {/* TODO: Add RevenueAnalysis component */}
          </div>
        )
      case 'expenses':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Expense Management</h2>
            <p className="text-gray-600">Track and manage system expenses</p>
            {/* TODO: Add ExpenseManagement component */}
          </div>
        )
      case 'payouts':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Payout Management</h2>
            <p className="text-gray-600">Manage user payouts and rewards</p>
            {/* TODO: Add PayoutManagement component */}
          </div>
        )
      case 'transactions':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Transaction History</h2>
            <p className="text-gray-600">View and analyze transaction records</p>
            {/* TODO: Add TransactionHistory component */}
          </div>
        )
      case 'profile':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Finance Profile</h2>
            <p className="text-gray-600">Finance team profile settings coming soon...</p>
          </div>
        )
      default:
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Financial Overview</h2>
            <p className="text-gray-600">Monitor the financial health and performance of the waste management system</p>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} onLogout={onLogout} />
      <div className="flex">
        <Sidebar 
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          userRole="FINANCE"
        />
        <main className="flex-1 p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner size="xl" />
            </div>
          ) : (
            <div>
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Finance Dashboard
                </h1>
                <p className="text-gray-600">
                  Monitor and manage financial operations of the waste management system
                </p>
              </div>

              {/* Key Financial Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                      <p className="text-2xl font-bold text-green-600">${stats.totalRevenue}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <TrendingDown className="h-6 w-6 text-red-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                      <p className="text-2xl font-bold text-red-600">${stats.totalExpenses}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <DollarSign className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Net Profit</p>
                      <p className="text-2xl font-bold text-blue-600">${stats.netProfit}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <CreditCard className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Pending Payouts</p>
                      <p className="text-2xl font-bold text-yellow-600">${stats.pendingPayouts}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Financial Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <BarChart3 className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Monthly Growth</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.monthlyGrowth}%</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <PiggyBank className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Average Reward</p>
                      <p className="text-2xl font-bold text-gray-900">${stats.averageReward}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Receipt className="h-6 w-6 text-orange-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalTransactions}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tab Content */}
              {renderTabContent()}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}