'use client'

import { useState, useEffect } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  Map,
  Clock,
  TrendingUp,
  Download,
  Filter
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis } from 'recharts'

interface SubmissionAnalyticsData {
  totalSubmissions: number
  approvedRate: number
  averageProcessingTime: number
  submissionsByDay: Array<{
    date: string
    total: number
    approved: number
    rejected: number
    autoVerified: number
  }>
  submissionsByLocation: Array<{
    location: string
    submissions: number
    approvalRate: number
    averageScore: number
  }>
  qualityDistribution: Array<{
    scoreRange: string
    count: number
    percentage: number
  }>
  processingTimeDistribution: Array<{
    timeRange: string
    count: number
    percentage: number
  }>
  geographicHeatmap: Array<{
    lat: number
    lng: number
    submissions: number
    approvalRate: number
  }>
}

export function SubmissionAnalytics() {
  const [data, setData] = useState<SubmissionAnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')
  const [locationFilter, setLocationFilter] = useState<string>('all')

  useEffect(() => {
    fetchSubmissionAnalytics()
  }, [timeRange, locationFilter])

  const fetchSubmissionAnalytics = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      const params = new URLSearchParams({
        range: timeRange,
        location: locationFilter !== 'all' ? locationFilter : ''
      })

      const response = await fetch(`/api/admin/reports/submissions?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const responseData = await response.json()
        setData(responseData)
      }
    } catch (error) {
      console.error('Error fetching submission analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const exportData = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const params = new URLSearchParams({
        range: timeRange,
        location: locationFilter !== 'all' ? locationFilter : '',
        format: 'csv'
      })

      const response = await fetch(`/api/admin/reports/submissions/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `submission-analytics-${timeRange}.csv`
        a.click()
        window.URL.createObjectURL(url)
      }
    } catch (error) {
      console.error('Error exporting data:', error)
    }
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

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
        No submission analytics data available.
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Submission Analytics
            </h2>
            <p className="text-gray-600">
              Analyze submission patterns, quality metrics, and geographic distribution
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
            
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Locations</option>
              {data.submissionsByLocation.map((location) => (
                <option key={location.location} value={location.location}>
                  {location.location}
                </option>
              ))}
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
              <Map className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Submissions</p>
              <p className="text-2xl font-semibold text-gray-900">{data.totalSubmissions.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Approval Rate</p>
              <p className="text-2xl font-semibold text-gray-900">{(data.approvedRate * 100).toFixed(1)}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Processing Time</p>
              <p className="text-2xl font-semibold text-gray-900">{data.averageProcessingTime.toFixed(1)}h</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Filter className="h-6 w-6 text-purple-600" />
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
                formatter={(value, name) => [
                  value, 
                  name === 'total' ? 'Total' :
                  name === 'approved' ? 'Approved' :
                  name === 'rejected' ? 'Rejected' :
                  name === 'autoVerified' ? 'Auto Verified' : name
                ]}
              />
              <Line 
                type="monotone" 
                dataKey="total" 
                stroke="#3B82F6" 
                strokeWidth={2}
                name="total"
              />
              <Line 
                type="monotone" 
                dataKey="approved" 
                stroke="#10B981" 
                strokeWidth={2}
                name="approved"
              />
              <Line 
                type="monotone" 
                dataKey="rejected" 
                stroke="#EF4444" 
                strokeWidth={2}
                name="rejected"
              />
              <Line 
                type="monotone" 
                dataKey="autoVerified" 
                stroke="#F59E0B" 
                strokeWidth={2}
                name="autoVerified"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Quality Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quality Score Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.qualityDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ scoreRange, percentage }) => `${scoreRange}: ${percentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {data.qualityDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Location-based Analytics */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Submissions by Location</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.submissionsByLocation}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="location" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Bar yAxisId="left" dataKey="submissions" fill="#3B82F6" name="Submissions" />
            <Bar yAxisId="right" dataKey="approvalRate" fill="#10B981" name="Approval Rate" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Processing Time Distribution */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Processing Time Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.processingTimeDistribution}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timeRange" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#8B5CF6" name="Count" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performing Locations */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Performing Locations</h3>
          <div className="space-y-3">
            {data.submissionsByLocation
              .sort((a, b) => b.approvalRate - a.approvalRate)
              .slice(0, 10)
              .map((location, index) => (
                <div key={location.location} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-900 w-6">{index + 1}.</span>
                    <span className="text-sm text-gray-700">{location.location}</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {location.submissions} submissions • {(location.approvalRate * 100).toFixed(1)}% approval
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Quality Metrics */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quality Metrics</h3>
          <div className="space-y-3">
            {data.qualityDistribution.map((quality, index) => (
              <div key={quality.scoreRange} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{quality.scoreRange}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">{quality.count}</span>
                  <span className="text-sm text-gray-500">({quality.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}