'use client'

import { useState, useEffect } from 'react'
import { User } from '@prisma/client'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { ParticipationMetrics } from '@/components/analytics/ParticipationMetrics'
import { LocationHeatmap } from '@/components/analytics/LocationHeatmap'
import { PayoutAnalytics } from '@/components/analytics/PayoutAnalytics'
import { ExportTools } from '@/components/analytics/ExportTools'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  BarChart3, 
  Map, 
  DollarSign, 
  Download,
  Users,
  TrendingUp,
  Calendar,
  Target
} from 'lucide-react'

interface CouncilDashboardProps {
  user: User
  onLogout: () => void
}

export function CouncilDashboard({ user, onLogout }: CouncilDashboardProps) {
  const [activeTab, setActiveTab] = useState('participation')
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState({
    totalParticipants: 0,
    activeThisMonth: 0,
    totalSubmissions: 0,
    verifiedSubmissions: 0,
    totalPayouts: 0,
    averageParticipation: 0,
    costPerKg: 0,
    participationGrowth: 0
  })

  useEffect(() => {
    fetchCouncilStats()
  }, [])

  const fetchCouncilStats = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch('/api/admin/council-stats', {
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
    { id: 'participation', label: 'Participation', icon: Users },
    { id: 'locations', label: 'Location Heatmap', icon: Map },
    { id: 'payouts', label: 'Payout Analytics', icon: DollarSign },
    { id: 'exports', label: 'Export Data', icon: Download }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'participation':
        return <ParticipationMetrics />
      case 'locations':
        return <LocationHeatmap />
      case 'payouts':
        return <PayoutAnalytics />
      case 'exports':
        return <ExportTools />
      default:
        return <ParticipationMetrics />
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
                  <TrendingUp className="h-6 w-6 text-success-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active This Month</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {isLoading ? <LoadingSpinner size="sm" /> : stats.activeThisMonth}
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="p-2 bg-warning-100 rounded-lg">
                  <Target className="h-6 w-6 text-warning-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Verified Submissions</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {isLoading ? <LoadingSpinner size="sm" /> : stats.verifiedSubmissions}
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="p-2 bg-danger-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-danger-600" />
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

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Participation Growth</h3>
              <div className="text-center">
                <p className="text-4xl font-bold text-success-600">
                  {isLoading ? <LoadingSpinner size="lg" /> : `${stats.participationGrowth}%`}
                </p>
                <p className="text-gray-600 mt-2">Month over month</p>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Avg Participation</h3>
              <div className="text-center">
                <p className="text-4xl font-bold text-primary-600">
                  {isLoading ? <LoadingSpinner size="lg" /> : stats.averageParticipation}
                </p>
                <p className="text-gray-600 mt-2">Submissions per user</p>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost per KG</h3>
              <div className="text-center">
                <p className="text-4xl font-bold text-warning-600">
                  ${isLoading ? <LoadingSpinner size="lg" /> : stats.costPerKg.toFixed(2)}
                </p>
                <p className="text-gray-600 mt-2">Average cost per kg collected</p>
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