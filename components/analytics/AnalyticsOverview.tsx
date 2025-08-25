'use client'

import { useState, useEffect } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  MapPin,
  Calendar,
  DollarSign,
  Download
} from 'lucide-react'

export function AnalyticsOverview() {
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState({
    submissionsByDay: [],
    participationByLocation: [],
    pointsDistribution: [],
    recentActivity: []
  })

  useEffect(() => {
    fetchAnalyticsData()
  }, [])

  const fetchAnalyticsData = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch('/api/admin/analytics/overview', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const analyticsData = await response.json()
        setData(analyticsData)
      }
    } catch (error) {
      console.error('Error fetching analytics data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Analytics Overview</h2>
        <p className="text-gray-600">Key metrics and insights from the waste management program</p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Submissions</p>
              <p className="text-3xl font-bold">1,234</p>
              <p className="text-blue-100 text-sm">+12% from last week</p>
            </div>
            <BarChart3 className="h-8 w-8 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Active Participants</p>
              <p className="text-3xl font-bold">567</p>
              <p className="text-green-100 text-sm">+8% from last week</p>
            </div>
            <Users className="h-8 w-8 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Points Awarded</p>
              <p className="text-3xl font-bold">89.2K</p>
              <p className="text-purple-100 text-sm">+15% from last week</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Total Payouts</p>
              <p className="text-3xl font-bold">$12.4K</p>
              <p className="text-orange-100 text-sm">+22% from last week</p>
            </div>
            <DollarSign className="h-8 w-8 text-orange-200" />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Submissions Trend */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Submissions Trend</h3>
            <Calendar className="h-5 w-5 text-gray-400" />
          </div>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">Chart coming soon</p>
            </div>
          </div>
        </div>

        {/* Participation by Location */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Participation by Location</h3>
            <MapPin className="h-5 w-5 text-gray-400" />
          </div>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">Map coming soon</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  New submission approved from John Doe
                </p>
                <p className="text-xs text-gray-500">2 minutes ago</p>
              </div>
              <span className="text-sm text-green-600 font-medium">+100 points</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button className="p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          <div className="flex items-center space-x-3">
            <Download className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-900">Export Report</span>
          </div>
        </button>
        <button className="p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          <div className="flex items-center space-x-3">
            <Users className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-900">View Participants</span>
          </div>
        </button>
        <button className="p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          <div className="flex items-center space-x-3">
            <BarChart3 className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-900">Detailed Analytics</span>
          </div>
        </button>
      </div>
    </div>
  )
}