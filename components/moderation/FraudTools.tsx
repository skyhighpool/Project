'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  Search, 
  MapPin, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Users,
  Flag
} from 'lucide-react'

interface FraudCheck {
  id: string
  type: 'duplicate' | 'gps' | 'rate_limit' | 'device'
  severity: 'low' | 'medium' | 'high'
  description: string
  details: any
  createdAt: string
}

interface UserFlag {
  id: string
  userId: string
  userName: string
  userEmail: string
  flagType: 'fraud' | 'suspicious' | 'banned'
  reason: string
  submissionCount: number
  createdAt: string
}

export function FraudTools() {
  const [activeTab, setActiveTab] = useState('checks')
  const [isLoading, setIsLoading] = useState(false)
  const [fraudChecks, setFraudChecks] = useState<FraudCheck[]>([])
  const [userFlags, setUserFlags] = useState<UserFlag[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchFraudData()
  }, [])

  const fetchFraudData = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      const [checksResponse, flagsResponse] = await Promise.all([
        fetch('/api/admin/fraud/checks', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/admin/fraud/flags', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      if (checksResponse.ok) {
        const checksData = await checksResponse.json()
        setFraudChecks(checksData)
      }

      if (flagsResponse.ok) {
        const flagsData = await flagsResponse.json()
        setUserFlags(flagsData)
      }
    } catch (error) {
      console.error('Error fetching fraud data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const runFraudScan = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch('/api/admin/fraud/scan', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        await fetchFraudData()
      }
    } catch (error) {
      console.error('Error running fraud scan:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-danger-600 bg-danger-100'
      case 'medium': return 'text-warning-600 bg-warning-100'
      case 'low': return 'text-info-600 bg-info-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <XCircle className="h-4 w-4" />
      case 'medium': return <AlertTriangle className="h-4 w-4" />
      case 'low': return <CheckCircle className="h-4 w-4" />
      default: return <Flag className="h-4 w-4" />
    }
  }

  const filteredChecks = fraudChecks.filter(check =>
    check.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    check.type.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredFlags = userFlags.filter(flag =>
    flag.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    flag.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
    flag.flagType.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Fraud Detection Tools</h2>
        <Button
          onClick={runFraudScan}
          disabled={isLoading}
          className="bg-primary-600 hover:bg-primary-700"
        >
          {isLoading ? <LoadingSpinner size="sm" /> : <Search className="h-4 w-4 mr-2" />}
          Run Fraud Scan
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('checks')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'checks'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Fraud Checks ({fraudChecks.length})
          </button>
          <button
            onClick={() => setActiveTab('flags')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'flags'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            User Flags ({userFlags.length})
          </button>
        </nav>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <Input
          type="text"
          placeholder="Search fraud checks or user flags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Content */}
      {activeTab === 'checks' ? (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Fraud Checks</h3>
          
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <LoadingSpinner size="xl" />
            </div>
          ) : filteredChecks.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-success-500 mx-auto mb-4" />
              <p className="text-gray-600">No fraud checks found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredChecks.map((check) => (
                <div key={check.id} className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(check.severity)}`}>
                          {getSeverityIcon(check.severity)}
                          <span className="ml-1 capitalize">{check.severity}</span>
                        </span>
                        <span className="text-sm font-medium text-gray-900 capitalize">{check.type}</span>
                        <span className="text-sm text-gray-500">
                          {new Date(check.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-gray-700 mb-2">{check.description}</p>
                      {check.details && (
                        <div className="bg-gray-50 rounded p-3 text-sm">
                          <pre className="text-gray-600 whitespace-pre-wrap">
                            {JSON.stringify(check.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Flagged Users</h3>
          
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <LoadingSpinner size="xl" />
            </div>
          ) : filteredFlags.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No flagged users found</p>
            </div>
          ) : (
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Flag Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submissions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Flagged Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reason
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredFlags.map((flag) => (
                    <tr key={flag.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{flag.userName}</div>
                          <div className="text-sm text-gray-500">{flag.userEmail}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          flag.flagType === 'banned' ? 'bg-danger-100 text-danger-800' :
                          flag.flagType === 'fraud' ? 'bg-warning-100 text-warning-800' :
                          'bg-info-100 text-info-800'
                        }`}>
                          {flag.flagType}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {flag.submissionCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(flag.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {flag.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Fraud Detection Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-danger-100 rounded-lg">
              <XCircle className="h-6 w-6 text-danger-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">High Risk</p>
              <p className="text-2xl font-bold text-gray-900">
                {fraudChecks.filter(c => c.severity === 'high').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-warning-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-warning-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Medium Risk</p>
              <p className="text-2xl font-bold text-gray-900">
                {fraudChecks.filter(c => c.severity === 'medium').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-info-100 rounded-lg">
              <Flag className="h-6 w-6 text-info-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Flagged Users</p>
              <p className="text-2xl font-bold text-gray-900">{userFlags.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-success-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-success-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Clean</p>
              <p className="text-2xl font-bold text-gray-900">
                {fraudChecks.filter(c => c.severity === 'low').length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}