'use client'

import { useState, useEffect } from 'react'
import { User } from '@prisma/client'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { AnalyticsOverview } from '@/components/analytics/AnalyticsOverview'
import { LocationHeatmap } from '@/components/analytics/LocationHeatmap'
import { ParticipationMetrics } from '@/components/analytics/ParticipationMetrics'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  BarChart3, 
  MapPin, 
  Users, 
  TrendingUp,
  Download,
  Calendar
} from 'lucide-react'

interface CouncilDashboardProps {
  user: User
  onLogout: () => void
}

export function CouncilDashboard({ user, onLogout }: CouncilDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState({
    totalParticipants: 0,
    totalSubmissions: 0,
    totalApproved: 0,
    totalPointsAwarded: 0,
    totalPayouts: 0,
    averageParticipationRate: 0
  })

  useEffect(() => {
    fetchCouncilStats()
  }, [])

  const fetchCouncilStats = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch('/api/admin/council/stats', {
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
    { id: 'participation', label: 'Participation', icon: Users },
    { id: 'locations', label: 'Locations', icon: MapPin },
    { id: 'trends', label: 'Trends', icon: TrendingUp },
    { id: 'reports', label: 'Reports', icon: Download }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <AnalyticsOverview />
      case 'participation':
        return <ParticipationMetrics />
      case 'locations':
        return <LocationHeatmap />
      case 'trends':
        return <div className="p-6">Trends analysis coming soon...</div>
      case 'reports':
        return <div className="p-6">Report generation coming soon...</div>
      default:
        return <AnalyticsOverview />
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
                <div className="p-2 bg-primary-100 rounded-lg">
                  <Users className="h-6 w-6 text-primary-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Participants</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {isLoading ? <LoadingSpinner size="sm" /> : stats.totalParticipants}
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="p-2 bg-success-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-success-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Approved Submissions</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {isLoading ? <LoadingSpinner size="sm" /> : stats.totalApproved}
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="p-2 bg-warning-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-warning-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Participation Rate</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {isLoading ? <LoadingSpinner size="sm" /> : `${stats.averageParticipationRate}%`}
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="p-2 bg-info-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-info-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Submissions</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {isLoading ? <LoadingSpinner size="sm" /> : stats.totalSubmissions}
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Points Awarded</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {isLoading ? <LoadingSpinner size="sm" /> : stats.totalPointsAwarded.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Download className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Payouts</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${isLoading ? <LoadingSpinner size="sm" /> : stats.totalPayouts.toFixed(2)}
                  </p>
                </div>
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