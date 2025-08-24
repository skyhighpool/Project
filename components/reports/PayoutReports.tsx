'use client'

import { useState, useEffect } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  DollarSign, 
  TrendingUp,
  Users,
  Download,
  Calendar,
  BarChart3
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'

interface PayoutReportData {
  totalPayouts: number
  totalVolume: number
  averagePayout: number
  successRate: number
  payoutsByDay: Array<{
    date: string
    count: number
    volume: number
    successCount: number
    failedCount: number
  }>
  payoutsByMethod: Array<{
    method: string
    count: number
    volume: number
    percentage: number
  }>
  payoutsByAmount: Array<{
    range: string
    count: number
    volume: number
    percentage: number
  }>
  userPayoutStats: Array<{
    userId: string
    userName: string
    totalPayouts: number
    totalVolume: number
    averagePayout: number
    lastPayout: string
  }>
  monthlyTrends: Array<{
    month: string
    payouts: number
    volume: number
    users: number
  }>
}

export function PayoutReports() {
  const [data, setData] = useState<PayoutReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d')
  const [methodFilter, setMethodFilter] = useState<string>('all')

  useEffect(() => {
    fetchPayoutReports()
  }, [timeRange, methodFilter])

  const fetchPayoutReports = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      const params = new URLSearchParams({
        range: timeRange,
        method: methodFilter !== 'all' ? methodFilter : ''
      })

      const response = await fetch(`/api/admin/reports/payouts?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const responseData = await response.json()
        setData(responseData)
      }
    } catch (error) {
      console.error('Error fetching payout reports:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const exportData = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const params = new URLSearchParams({
        range: timeRange,
        method: methodFilter !== 'all' ? methodFilter : '',
        format: 'csv'
      })

      const response = await fetch(`/api/admin/reports/payouts/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `payout-reports-${timeRange}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error exporting data:', error)
    }
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

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
        No payout report data available.
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Payout Reports
            </h2>
            <p className="text-gray-600">
              Track payout performance, volume trends, and user payment patterns
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
              <option value="1y">Last year</option>
            </select>
            
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Methods</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="PAYPAL">PayPal</option>
              <option value="STRIPE">Stripe</option>
              <option value="CASH">Cash</option>
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
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Payouts</p>
              <p className="text-2xl font-semibold text-gray-900">{data.totalPayouts.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Volume</p>
              <p className="text-2xl font-semibold text-gray-900">{formatCurrency(data.totalVolume)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Average Payout</p>
              <p className="text-2xl font-semibold text-gray-900">{formatCurrency(data.averagePayout)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-2xl font-semibold text-gray-900">{(data.successRate * 100).toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Payouts Over Time */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Payouts Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.payoutsByDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                formatter={(value, name) => [
                  name === 'volume' ? formatCurrency(value as number) : value,
                  name === 'count' ? 'Count' : name === 'volume' ? 'Volume' : name
                ]}
              />
              <Area 
                yAxisId="left"
                type="monotone" 
                dataKey="count" 
                stroke="#3B82F6" 
                fill="#3B82F6" 
                fillOpacity={0.3}
                name="count"
              />
              <Area 
                yAxisId="right"
                type="monotone" 
                dataKey="volume" 
                stroke="#10B981" 
                fill="#10B981" 
                fillOpacity={0.3}
                name="volume"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Payout Methods Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Payout Methods Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.payoutsByMethod}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ method, percentage }) => `${method}: ${percentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="volume"
              >
                {data.payoutsByMethod.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [formatCurrency(value as number), 'Volume']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Payout Amount Distribution */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Payout Amount Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.payoutsByAmount}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="range" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip 
              formatter={(value, name) => [
                name === 'volume' ? formatCurrency(value as number) : value,
                name === 'count' ? 'Count' : 'Volume'
              ]}
            />
            <Bar yAxisId="left" dataKey="count" fill="#3B82F6" name="count" />
            <Bar yAxisId="right" dataKey="volume" fill="#10B981" name="volume" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly Trends */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Trends</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.monthlyTrends}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip 
              formatter={(value, name) => [
                name === 'volume' ? formatCurrency(value as number) : value,
                name === 'payouts' ? 'Payouts' : name === 'volume' ? 'Volume' : 'Users'
              ]}
            />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="payouts" 
              stroke="#3B82F6" 
              strokeWidth={2}
              name="payouts"
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="volume" 
              stroke="#10B981" 
              strokeWidth={2}
              name="volume"
            />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="users" 
              stroke="#F59E0B" 
              strokeWidth={2}
              name="users"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Users by Payout Volume */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Users by Payout Volume</h3>
          <div className="space-y-3">
            {data.userPayoutStats
              .sort((a, b) => b.totalVolume - a.totalVolume)
              .slice(0, 10)
              .map((user, index) => (
                <div key={user.userId} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-900 w-6">{index + 1}.</span>
                    <span className="text-sm text-gray-700">{user.userName}</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {user.totalPayouts} payouts • {formatCurrency(user.totalVolume)}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Payout Method Breakdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Payout Method Breakdown</h3>
          <div className="space-y-3">
            {data.payoutsByMethod.map((method, index) => (
              <div key={method.method} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{method.method.replace('_', ' ')}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">{method.count}</span>
                  <span className="text-sm text-gray-500">({method.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Success vs Failed Payouts */}
      <div className="bg-white rounded-lg shadow p-6 mt-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Success vs Failed Payouts</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.payoutsByDay}>
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
                name === 'successCount' ? 'Successful' : 'Failed'
              ]}
            />
            <Bar dataKey="successCount" fill="#10B981" name="successCount" />
            <Bar dataKey="failedCount" fill="#EF4444" name="failedCount" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}