'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Badge } from '@/components/ui/Badge'
import { 
  Shield, 
  AlertTriangle, 
  MapPin, 
  Clock, 
  User,
  Video,
  Search,
  Filter
} from 'lucide-react'

interface FraudAlert {
  id: string
  type: 'DUPLICATE_VIDEO' | 'GPS_MISMATCH' | 'RATE_LIMIT' | 'USER_FLAG'
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  description: string
  submissionId: string
  userId: string
  userName: string
  createdAt: string
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE'
}

interface DuplicateCheck {
  submissionId: string
  similarityScore: number
  matchedSubmissionId: string
  matchedUserId: string
  matchedUserName: string
  createdAt: string
}

interface GpsViolation {
  submissionId: string
  userId: string
  userName: string
  recordedLat: number
  recordedLng: number
  nearestBinLat: number
  nearestBinLng: number
  distance: number
  binRadius: number
  createdAt: string
}

export function FraudTools() {
  const [activeTab, setActiveTab] = useState('alerts')
  const [isLoading, setIsLoading] = useState(false)
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>([])
  const [duplicateChecks, setDuplicateChecks] = useState<DuplicateCheck[]>([])
  const [gpsViolations, setGpsViolations] = useState<GpsViolation[]>([])
  const [selectedAlert, setSelectedAlert] = useState<FraudAlert | null>(null)

  useEffect(() => {
    fetchFraudData()
  }, [])

  const fetchFraudData = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      
      // Fetch fraud alerts
      const alertsResponse = await fetch('/api/admin/fraud/alerts', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (alertsResponse.ok) {
        const alerts = await alertsResponse.json()
        setFraudAlerts(alerts)
      }

      // Fetch duplicate checks
      const duplicatesResponse = await fetch('/api/admin/fraud/duplicates', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (duplicatesResponse.ok) {
        const duplicates = await duplicatesResponse.json()
        setDuplicateChecks(duplicates)
      }

      // Fetch GPS violations
      const gpsResponse = await fetch('/api/admin/fraud/gps-violations', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (gpsResponse.ok) {
        const violations = await gpsResponse.json()
        setGpsViolations(violations)
      }
    } catch (error) {
      console.error('Error fetching fraud data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAlertAction = async (alertId: string, action: string) => {
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch(`/api/admin/fraud/alerts/${alertId}/${action}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        fetchFraudData()
      }
    } catch (error) {
      console.error('Error updating alert:', error)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH': return 'danger'
      case 'MEDIUM': return 'warning'
      case 'LOW': return 'info'
      default: return 'default'
    }
  }

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case 'DUPLICATE_VIDEO': return <Video className="h-4 w-4" />
      case 'GPS_MISMATCH': return <MapPin className="h-4 w-4" />
      case 'RATE_LIMIT': return <Clock className="h-4 w-4" />
      case 'USER_FLAG': return <User className="h-4 w-4" />
      default: return <AlertTriangle className="h-4 w-4" />
    }
  }

  const tabs = [
    { id: 'alerts', label: 'Fraud Alerts', icon: Shield },
    { id: 'duplicates', label: 'Duplicate Detection', icon: Video },
    { id: 'gps', label: 'GPS Violations', icon: MapPin },
    { id: 'settings', label: 'Settings', icon: Filter }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'alerts':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Fraud Alerts ({fraudAlerts.length})
              </h3>
              <Button onClick={fetchFraudData} disabled={isLoading}>
                <Search className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
            
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <LoadingSpinner size="lg" />
              </div>
            ) : fraudAlerts.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-gray-900 mb-2">No fraud alerts</h4>
                <p className="text-gray-600">All submissions appear to be legitimate</p>
              </div>
            ) : (
              <div className="space-y-3">
                {fraudAlerts.map((alert) => (
                  <div key={alert.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getAlertTypeIcon(alert.type)}
                        <span className="font-medium text-gray-900">{alert.userName}</span>
                        <Badge variant={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="default">{alert.status}</Badge>
                        <span className="text-sm text-gray-500">
                          {new Date(alert.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-700 mb-3">{alert.description}</p>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleAlertAction(alert.id, 'investigate')}
                      >
                        Investigate
                      </Button>
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => handleAlertAction(alert.id, 'resolve')}
                      >
                        Resolve
                      </Button>
                      <Button
                        size="sm"
                        variant="warning"
                        onClick={() => handleAlertAction(alert.id, 'false-positive')}
                      >
                        False Positive
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )

      case 'duplicates':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Duplicate Video Detection ({duplicateChecks.length})
            </h3>
            
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <LoadingSpinner size="lg" />
              </div>
            ) : duplicateChecks.length === 0 ? (
              <div className="text-center py-8">
                <Video className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-gray-900 mb-2">No duplicates found</h4>
                <p className="text-gray-600">All videos appear to be unique</p>
              </div>
            ) : (
              <div className="space-y-3">
                {duplicateChecks.map((check) => (
                  <div key={check.submissionId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">
                        Similarity: {(check.similarityScore * 100).toFixed(1)}%
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(check.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <label className="font-medium text-gray-700">Original Submission</label>
                        <p className="text-gray-900">ID: {check.submissionId}</p>
                      </div>
                      <div>
                        <label className="font-medium text-gray-700">Matched Submission</label>
                        <p className="text-gray-900">ID: {check.matchedSubmissionId}</p>
                        <p className="text-gray-600">User: {check.matchedUserName}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex space-x-2">
                      <Button size="sm" variant="primary">
                        Review Both
                      </Button>
                      <Button size="sm" variant="danger">
                        Flag as Duplicate
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )

      case 'gps':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              GPS Violations ({gpsViolations.length})
            </h3>
            
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <LoadingSpinner size="lg" />
              </div>
            ) : gpsViolations.length === 0 ? (
              <div className="text-center py-8">
                <MapPin className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-gray-900 mb-2">No GPS violations</h4>
                <p className="text-gray-600">All submissions are within valid bin locations</p>
              </div>
            ) : (
              <div className="space-y-3">
                {gpsViolations.map((violation) => (
                  <div key={violation.submissionId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{violation.userName}</span>
                      <span className="text-sm text-gray-500">
                        {new Date(violation.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <label className="font-medium text-gray-700">Distance to Bin</label>
                        <p className="text-gray-900">{violation.distance.toFixed(1)}m</p>
                        <p className="text-gray-600">Bin radius: {violation.binRadius}m</p>
                      </div>
                      <div>
                        <label className="font-medium text-gray-700">Coordinates</label>
                        <p className="text-gray-900">
                          {violation.recordedLat.toFixed(6)}, {violation.recordedLng.toFixed(6)}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="primary">
                        View on Map
                      </Button>
                      <Button size="sm" variant="warning">
                        Investigate
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )

      case 'settings':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Fraud Detection Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Duplicate Detection</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Similarity Threshold
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.1"
                    defaultValue="0.8"
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">0.8 (80% similarity)</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">GPS Validation</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Maximum Distance (meters)
                  </label>
                  <input
                    type="number"
                    defaultValue="50"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Rate Limiting</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Submissions per Day
                  </label>
                  <input
                    type="number"
                    defaultValue="10"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Auto-Flagging</h4>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input type="checkbox" defaultChecked className="mr-2" />
                    <span className="text-sm">Auto-flag high-risk submissions</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" defaultChecked className="mr-2" />
                    <span className="text-sm">Send alerts for GPS violations</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" />
                    <span className="text-sm">Require manual review for new users</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="primary">
                Save Settings
              </Button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  )
}