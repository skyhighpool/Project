'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  Search, 
  AlertTriangle, 
  MapPin, 
  Clock,
  Users,
  FileVideo,
  Shield,
  Flag
} from 'lucide-react'

interface FraudCheckResult {
  type: 'duplicate' | 'gps' | 'rate_limit' | 'user_flag'
  severity: 'low' | 'medium' | 'high'
  description: string
  details: any
  submissionId?: string
  userId?: string
}

export function FraudTools() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState<'submission' | 'user' | 'device'>('submission')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<FraudCheckResult[]>([])
  const [selectedResult, setSelectedResult] = useState<FraudCheckResult | null>(null)

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch(`/api/admin/fraud/check?type=${searchType}&query=${encodeURIComponent(searchQuery)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.results || [])
      }
    } catch (error) {
      console.error('Error performing fraud check:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleFlagUser = async (userId: string, reason: string) => {
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch('/api/admin/users/flag', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId, reason })
      })
      
      if (response.ok) {
        alert('User flagged successfully')
      }
    } catch (error) {
      console.error('Error flagging user:', error)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <AlertTriangle className="h-5 w-5 text-red-600" />
      case 'medium': return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case 'low': return <Shield className="h-5 w-5 text-blue-600" />
      default: return <Shield className="h-5 w-5 text-gray-600" />
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Fraud Detection Tools
        </h2>
        <p className="text-gray-600">
          Detect duplicate videos, validate GPS coordinates, check rate limits, and flag suspicious users
        </p>
      </div>

      {/* Search Interface */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Fraud Check</h3>
        
        <div className="flex space-x-4 mb-4">
          <div className="flex-1">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter submission ID, user email, or device hash..."
              className="w-full"
            />
          </div>
          
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="submission">Submission ID</option>
            <option value="user">User Email</option>
            <option value="device">Device Hash</option>
          </select>
          
          <Button
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            className="px-6"
          >
            {isSearching ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Search
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
          <div className="flex items-center">
            <FileVideo className="h-4 w-4 mr-2" />
            Duplicate Detection
          </div>
          <div className="flex items-center">
            <MapPin className="h-4 w-4 mr-2" />
            GPS Validation
          </div>
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            Rate Limiting
          </div>
          <div className="flex items-center">
            <Users className="h-4 w-4 mr-2" />
            User Behavior
          </div>
        </div>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Fraud Check Results ({searchResults.length})
            </h3>
          </div>
          
          <div className="divide-y divide-gray-200">
            {searchResults.map((result, index) => (
              <div
                key={index}
                className={`p-4 hover:bg-gray-50 cursor-pointer ${
                  selectedResult === result ? 'bg-blue-50' : ''
                }`}
                onClick={() => setSelectedResult(result)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    {getSeverityIcon(result.severity)}
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">
                          {result.type.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getSeverityColor(result.severity)}`}>
                          {result.severity}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{result.description}</p>
                    </div>
                  </div>
                  
                  {result.userId && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        const reason = prompt('Enter flag reason:')
                        if (reason) handleFlagUser(result.userId!, reason)
                      }}
                      size="sm"
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <Flag className="h-4 w-4 mr-1" />
                      Flag User
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Result Details */}
      {selectedResult && (
        <div className="mt-6 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Result Details</h3>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Check Information</h4>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-gray-600">Type:</dt>
                    <dd className="font-medium">{selectedResult.type}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-600">Severity:</dt>
                    <dd className="font-medium">{selectedResult.severity}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-600">Description:</dt>
                    <dd className="font-medium">{selectedResult.description}</dd>
                  </div>
                </dl>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Technical Details</h4>
                <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto">
                  {JSON.stringify(selectedResult.details, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            onClick={() => {
              const submissionId = prompt('Enter submission ID to check for duplicates:')
              if (submissionId) {
                setSearchQuery(submissionId)
                setSearchType('submission')
                handleSearch()
              }
            }}
            className="w-full"
          >
            <FileVideo className="h-4 w-4 mr-2" />
            Check Duplicates
          </Button>
          
          <Button
            onClick={() => {
              const email = prompt('Enter user email to check behavior:')
              if (email) {
                setSearchQuery(email)
                setSearchType('user')
                handleSearch()
              }
            }}
            className="w-full"
          >
            <Users className="h-4 w-4 mr-2" />
            Check User
          </Button>
          
          <Button
            onClick={() => {
              const deviceHash = prompt('Enter device hash to check:')
              if (deviceHash) {
                setSearchQuery(deviceHash)
                setSearchType('device')
                handleSearch()
              }
            }}
            className="w-full"
          >
            <Shield className="h-4 w-4 mr-2" />
            Check Device
          </Button>
        </div>
      </div>
    </div>
  )
}