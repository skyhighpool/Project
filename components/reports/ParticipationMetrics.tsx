'use client'

import { useState, useEffect } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  Users, 
  MapPin, 
  TrendingUp,
  Calendar,
  Download
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'

interface ParticipationData {
  totalUsers: number
  activeUsers: number
  newUsers: number
  submissionsByDay: Array<{
    date: string
    submissions: number
    users: number
  }>
  submissionsByLocation: Array<{
    location: string
    submissions: number
    users: number
  }>
  userEngagement: Array<{
    category: string
    count: number
    percentage: number
  }>
}

export function ParticipationMetrics() {
  const [data, setData] = useState<ParticipationData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')

  useEffect(() => {
    fetchParticipationData()
  }, [timeRange])

  const fetchParticipationData = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch(`/api/admin/reports/participation?range=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const responseData = await response.json()
        setData(responseData)
      }
    } catch (error) {
      console.error('Error fetching participation data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const exportData = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch(`/api/admin/reports/participation/export?range=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `participation-metrics-${timeRange}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error exporting data:', error)
    }
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-gray-500">
        No participation data available.
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Participation Metrics
            </h2>
            <p className="text-gray-600">
              Track user engagement, geographic distribution, and participation trends
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
            
            <button
              onClick={exportData}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-semibold text-gray-900">{data.totalUsers.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-2xl font-semibold text-gray-900">{data.activeUsers.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Calendar className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">New Users</p>
              <p className="text-2xl font-semibold text-gray-900">{data.newUsers.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <MapPin className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Locations</p>
              <p className="text-2xl font-semibold text-gray-900">{data.submissionsByLocation.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Submissions Over Time */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Submissions Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.submissionsByDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                formatter={(value, name) => [value, name === 'submissions' ? 'Submissions' : 'Users']}
              />
              <Line 
                type="monotone" 
                dataKey="submissions" 
                stroke="#3B82F6" 
                strokeWidth={2}
                name="submissions"
              />
              <Line 
                type="monotone" 
                dataKey="users" 
                stroke="#10B981" 
                strokeWidth={2}
                name="users"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* User Engagement Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">User Engagement Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.userEngagement}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ category, percentage }) => `${category}: ${percentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {data.userEngagement.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Location-based Participation */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Participation by Location</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.submissionsByLocation}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="location" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="submissions" fill="#3B82F6" name="Submissions" />
            <Bar dataKey="users" fill="#10B981" name="Users" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Top Locations */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Participating Locations</h3>
          <div className="space-y-3">
            {data.submissionsByLocation
              .sort((a, b) => b.submissions - a.submissions)
              .slice(0, 10)
              .map((location, index) => (
                <div key={location.location} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-900 w-6">{index + 1}.</span>
                    <span className="text-sm text-gray-700">{location.location}</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {location.submissions} submissions • {location.users} users
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* User Engagement Categories */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">User Engagement Categories</h3>
          <div className="space-y-3">
            {data.userEngagement.map((category, index) => (
              <div key={category.category} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{category.category}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">{category.count}</span>
                  <span className="text-sm text-gray-500">({category.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}