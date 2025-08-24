'use client'

import { useState, useEffect } from 'react'
import { User } from '@prisma/client'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { ParticipationMetrics } from '@/components/reports/ParticipationMetrics'
import { SubmissionAnalytics } from '@/components/reports/SubmissionAnalytics'
import { PayoutReports } from '@/components/reports/PayoutReports'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  Users, 
  Map, 
  DollarSign, 
  Download,
  BarChart3,
  Settings
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
    totalSubmissions: 0,
    totalPayouts: 0,
    averageParticipation: 0
  })

  useEffect(() => {
    fetchCouncilStats()
  }, [])

  const fetchCouncilStats = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch('/api/admin/reports/summary', {
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
    { id: 'submissions', label: 'Submissions', icon: Map },
    { id: 'payouts', label: 'Payouts', icon: DollarSign },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'exports', label: 'Exports', icon: Download }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'participation':
        return <ParticipationMetrics />
      case 'submissions':
        return <SubmissionAnalytics />
      case 'payouts':
        return <PayoutReports />
      case 'analytics':
        return <div className="p-6">Advanced analytics coming soon...</div>
      case 'exports':
        return <div className="p-6">Data export tools coming soon...</div>
      default:
        return <ParticipationMetrics />
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
          userRole="council"
        />
        
        <main className="flex-1 p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Council Dashboard
            </h1>
            <p className="text-gray-600">
              Monitor participation, submissions, and program effectiveness
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
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Participants</p>
                      <p className="text-2xl font-semibold text-gray-900">{stats.totalParticipants}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Map className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Submissions</p>
                      <p className="text-2xl font-semibold text-gray-900">{stats.totalSubmissions}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <DollarSign className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Payouts</p>
                      <p className="text-2xl font-semibold text-gray-900">${stats.totalPayouts.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <BarChart3 className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Avg Participation</p>
                      <p className="text-2xl font-semibold text-gray-900">{stats.averageParticipation}</p>
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