'use client'

import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  Users, 
  TrendingUp, 
  Calendar, 
  MapPin,
  Download
} from 'lucide-react'

interface ParticipationData {
  dailySubmissions: Array<{
    date: string
    submissions: number
    approved: number
    rejected: number
  }>
  userActivity: Array<{
    userId: string
    userName: string
    submissions: number
    approved: number
    totalPoints: number
  }>
  locationStats: Array<{
    location: string
    submissions: number
    approvalRate: number
  }>
  participationTrends: Array<{
    month: string
    newUsers: number
    activeUsers: number
    totalSubmissions: number
  }>
}

export function ParticipationMetrics() {
  const [data, setData] = useState<ParticipationData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30d')

  useEffect(() => {
    fetchParticipationData()
  }, [timeRange])

  const fetchParticipationData = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch(`/api/admin/analytics/participation?range=${timeRange}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const analyticsData = await response.json()
        setData(analyticsData)
      }
    } catch (error) {
      console.error('Error fetching participation data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch(`/api/admin/analytics/participation/export?range=${timeRange}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `participation-metrics-${timeRange}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error exporting data:', error)
    }
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No data available</h3>
        <p className="text-gray-600">Participation metrics will appear here once data is available</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Participation Metrics</h3>
        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <button
            onClick={handleExport}
            className="flex items-center px-3 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Daily Submissions Chart */}
      <div className="card">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Daily Submissions</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.dailySubmissions}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="submissions" fill="#3b82f6" name="Total Submissions" />
            <Bar dataKey="approved" fill="#10b981" name="Approved" />
            <Bar dataKey="rejected" fill="#ef4444" name="Rejected" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* User Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Top Contributors</h4>
          <div className="space-y-3">
            {data.userActivity.slice(0, 10).map((user, index) => (
              <div key={user.userId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div className="ml-3">
                    <p className="font-medium text-gray-900">{user.userName}</p>
                    <p className="text-sm text-gray-600">{user.submissions} submissions</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{user.totalPoints} pts</p>
                  <p className="text-sm text-gray-600">{user.approved} approved</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Location Performance</h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.locationStats}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ location, submissions }) => `${location}: ${submissions}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="submissions"
              >
                {data.locationStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Participation Trends */}
      <div className="card">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Participation Trends</h4>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.participationTrends}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="newUsers" stroke="#3b82f6" name="New Users" />
            <Line type="monotone" dataKey="activeUsers" stroke="#10b981" name="Active Users" />
            <Line type="monotone" dataKey="totalSubmissions" stroke="#f59e0b" name="Total Submissions" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card text-center">
          <Users className="h-8 w-8 text-primary-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">
            {data.participationTrends.reduce((sum, item) => sum + item.newUsers, 0)}
          </p>
          <p className="text-gray-600">New Users</p>
        </div>
        <div className="card text-center">
          <TrendingUp className="h-8 w-8 text-success-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">
            {data.participationTrends.reduce((sum, item) => sum + item.activeUsers, 0)}
          </p>
          <p className="text-gray-600">Active Users</p>
        </div>
        <div className="card text-center">
          <Calendar className="h-8 w-8 text-warning-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">
            {data.dailySubmissions.reduce((sum, item) => sum + item.submissions, 0)}
          </p>
          <p className="text-gray-600">Total Submissions</p>
        </div>
        <div className="card text-center">
          <MapPin className="h-8 w-8 text-danger-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">
            {data.locationStats.length}
          </p>
          <p className="text-gray-600">Active Locations</p>
        </div>
      </div>
    </div>
  )
}