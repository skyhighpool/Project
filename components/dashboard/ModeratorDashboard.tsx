'use client'

import { useState, useEffect } from 'react'
import { User } from '@prisma/client'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { ReviewQueue } from '@/components/moderation/ReviewQueue'
import { FraudTools } from '@/components/moderation/FraudTools'
import { AuditLog } from '@/components/moderation/AuditLog'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  Eye, 
  Shield, 
  FileText, 
  BarChart3,
  Settings,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react'

interface ModeratorDashboardProps {
  user: User
  onLogout: () => void
}

export function ModeratorDashboard({ user, onLogout }: ModeratorDashboardProps) {
  const [activeTab, setActiveTab] = useState('review')
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState({
    pendingReview: 0,
    autoVerified: 0,
    approvedToday: 0,
    rejectedToday: 0,
    averageProcessingTime: 0,
    fraudAlerts: 0
  })

  useEffect(() => {
    fetchModeratorStats()
  }, [])

  const fetchModeratorStats = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch('/api/admin/stats', {
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

  const handleReviewAction = () => {
    fetchModeratorStats()
  }

  const tabs = [
    { id: 'review', label: 'Review Queue', icon: Eye },
    { id: 'fraud', label: 'Fraud Tools', icon: Shield },
    { id: 'audit', label: 'Audit Log', icon: FileText },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'review':
        return <ReviewQueue onAction={handleReviewAction} />
      case 'fraud':
        return <FraudTools />
      case 'audit':
        return <AuditLog />
      case 'analytics':
        return <div className="p-6">Analytics dashboard coming soon...</div>
      case 'settings':
        return <div className="p-6">Moderator settings coming soon...</div>
      default:
        return <ReviewQueue onAction={handleReviewAction} />
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
                  <p className="text-sm font-medium text-gray-600">Pending Review</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {isLoading ? <LoadingSpinner size="sm" /> : stats.pendingReview}
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
                  <p className="text-sm font-medium text-gray-600">Approved Today</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {isLoading ? <LoadingSpinner size="sm" /> : stats.approvedToday}
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
                  <p className="text-sm font-medium text-gray-600">Rejected Today</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {isLoading ? <LoadingSpinner size="sm" /> : stats.rejectedToday}
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <Shield className="h-6 w-6 text-primary-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Fraud Alerts</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {isLoading ? <LoadingSpinner size="sm" /> : stats.fraudAlerts}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Processing Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Auto-Verified</h3>
              <div className="text-center">
                <p className="text-4xl font-bold text-primary-600">
                  {isLoading ? <LoadingSpinner size="lg" /> : stats.autoVerified}
                </p>
                <p className="text-gray-600 mt-2">Submissions auto-verified today</p>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Avg Processing Time</h3>
              <div className="text-center">
                <p className="text-4xl font-bold text-success-600">
                  {isLoading ? <LoadingSpinner size="lg" /> : `${stats.averageProcessingTime}m`}
                </p>
                <p className="text-gray-600 mt-2">Average review time</p>
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