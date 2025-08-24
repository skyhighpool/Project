'use client'

import { useState, useEffect } from 'react'
import { User } from '@prisma/client'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { ModerationQueue } from '@/components/moderation/ModerationQueue'
import { FraudTools } from '@/components/moderation/FraudTools'
import { AuditLog } from '@/components/moderation/AuditLog'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  Eye, 
  Shield, 
  History, 
  BarChart3,
  Settings,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

interface ModeratorDashboardProps {
  user: User
  onLogout: () => void
}

export function ModeratorDashboard({ user, onLogout }: ModeratorDashboardProps) {
  const [activeTab, setActiveTab] = useState('queue')
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState({
    pendingReview: 0,
    reviewedToday: 0,
    autoApproved: 0,
    flaggedSubmissions: 0
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

  const tabs = [
    { id: 'queue', label: 'Review Queue', icon: Eye },
    { id: 'fraud', label: 'Fraud Tools', icon: Shield },
    { id: 'audit', label: 'Audit Log', icon: History },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'queue':
        return <ModerationQueue onDecision={fetchModeratorStats} />
      case 'fraud':
        return <FraudTools />
      case 'audit':
        return <AuditLog />
      case 'analytics':
        return <div className="p-6">Moderation analytics coming soon...</div>
      case 'settings':
        return <div className="p-6">Moderator settings coming soon...</div>
      default:
        return <ModerationQueue onDecision={fetchModeratorStats} />
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
          userRole="moderator"
        />
        
        <main className="flex-1 p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Moderator Dashboard
            </h1>
            <p className="text-gray-600">
              Review video submissions and maintain quality standards
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
                      <Eye className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Pending Review</p>
                      <p className="text-2xl font-semibold text-gray-900">{stats.pendingReview}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Reviewed Today</p>
                      <p className="text-2xl font-semibold text-gray-900">{stats.reviewedToday}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Shield className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Auto Approved</p>
                      <p className="text-2xl font-semibold text-gray-900">{stats.autoApproved}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <AlertCircle className="h-6 w-6 text-red-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Flagged</p>
                      <p className="text-2xl font-semibold text-gray-900">{stats.flaggedSubmissions}</p>
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