'use client'

import { useState, useEffect } from 'react'
import { User } from '@prisma/client'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  Users, 
  BarChart3, 
  Settings,
  Building,
  FileText,
  Award,
  TrendingUp
} from 'lucide-react'

interface CouncilDashboardProps {
  user: User
  onLogout: () => void
}

export function CouncilDashboard({ user, onLogout }: CouncilDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSubmissions: 0,
    totalEarnings: 0,
    activeModerators: 0,
    monthlyGrowth: 0,
    complianceRate: 0
  })

  useEffect(() => {
    fetchCouncilStats()
  }, [])

  const fetchCouncilStats = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch('/api/council/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching council stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'moderators', label: 'Moderators', icon: Building },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'rewards', label: 'Rewards', icon: Award },
    { id: 'profile', label: 'Profile', icon: Settings }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">System Overview</h2>
            <p className="text-gray-600">Monitor the overall health and performance of the waste management system</p>
            {/* TODO: Add SystemOverview component */}
          </div>
        )
      case 'users':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">User Management</h2>
            <p className="text-gray-600">Manage user accounts, roles, and permissions</p>
            {/* TODO: Add UserManagement component */}
          </div>
        )
      case 'moderators':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Moderator Management</h2>
            <p className="text-gray-600">Manage moderator accounts and performance</p>
            {/* TODO: Add ModeratorManagement component */}
          </div>
        )
      case 'reports':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">System Reports</h2>
            <p className="text-gray-600">Generate and view system reports and analytics</p>
            {/* TODO: Add SystemReports component */}
          </div>
        )
      case 'rewards':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Rewards Management</h2>
            <p className="text-gray-600">Configure reward systems and point values</p>
            {/* TODO: Add RewardsManagement component */}
          </div>
        )
      case 'profile':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Council Profile</h2>
            <p className="text-gray-600">Council member profile settings coming soon...</p>
          </div>
        )
      default:
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">System Overview</h2>
            <p className="text-gray-600">Monitor the overall health and performance of the waste management system</p>
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
          userRole="COUNCIL"
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
                  Council Dashboard
                </h1>
                <p className="text-gray-600">
                  Manage and oversee the waste management system
                </p>
              </div>

              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Users</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Monthly Growth</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.monthlyGrowth}%</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Award className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Compliance Rate</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.complianceRate}%</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <FileText className="h-6 w-6 text-orange-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Submissions</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalSubmissions}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Building className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Active Moderators</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.activeModerators}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Award className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                      <p className="text-2xl font-bold text-gray-900">${stats.totalEarnings}</p>
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