'use client'

import { useState, useEffect } from 'react'
import { User } from '@prisma/client'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  BarChart3,
  Settings,
  Eye,
  Shield
} from 'lucide-react'

interface ModeratorDashboardProps {
  user: User
  onLogout: () => void
}

export function ModeratorDashboard({ user, onLogout }: ModeratorDashboardProps) {
  const [activeTab, setActiveTab] = useState('pending')
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState({
    totalSubmissions: 0,
    approvedSubmissions: 0,
    rejectedSubmissions: 0,
    pendingReview: 0,
    totalModerated: 0
  })

  useEffect(() => {
    fetchModeratorStats()
  }, [])

  const fetchModeratorStats = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch('/api/moderator/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching moderator stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const tabs = [
    { id: 'pending', label: 'Pending Review', icon: Clock },
    { id: 'approved', label: 'Approved', icon: CheckCircle },
    { id: 'rejected', label: 'Rejected', icon: XCircle },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'profile', label: 'Profile', icon: Settings }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'pending':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Pending Submissions</h2>
            <p className="text-gray-600">Review and moderate pending video submissions</p>
            {/* TODO: Add SubmissionReview component */}
          </div>
        )
      case 'approved':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Approved Submissions</h2>
            <p className="text-gray-600">View approved submissions</p>
            {/* TODO: Add ApprovedSubmissions component */}
          </div>
        )
      case 'rejected':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Rejected Submissions</h2>
            <p className="text-gray-600">View rejected submissions</p>
            {/* TODO: Add RejectedSubmissions component */}
          </div>
        )
      case 'analytics':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Moderation Analytics</h2>
            <p className="text-gray-600">View moderation statistics and trends</p>
            {/* TODO: Add ModerationAnalytics component */}
          </div>
        )
      case 'profile':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Profile Settings</h2>
            <p className="text-gray-600">Moderator profile settings coming soon...</p>
          </div>
        )
      default:
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Pending Submissions</h2>
            <p className="text-gray-600">Review and moderate pending video submissions</p>
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
          userRole="MODERATOR"
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
                  Moderator Dashboard
                </h1>
                <p className="text-gray-600">
                  Review and moderate video submissions from users
                </p>
              </div>

              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Clock className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Pending</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.pendingReview}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Approved</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.approvedSubmissions}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <XCircle className="h-6 w-6 text-red-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Rejected</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.rejectedSubmissions}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Shield className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Moderated</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalModerated}</p>
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