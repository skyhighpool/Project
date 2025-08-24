'use client'

import { useState, useEffect } from 'react'
import { User } from '@prisma/client'
import { VideoUpload } from '@/components/video/VideoUpload'
import { SubmissionList } from '@/components/submissions/SubmissionList'
import { WalletCard } from '@/components/wallet/WalletCard'
import { CashoutForm } from '@/components/cashout/CashoutForm'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  Upload, 
  Clock, 
  CheckCircle, 
  XCircle, 
  DollarSign,
  BarChart3,
  Settings
} from 'lucide-react'

interface TouristDashboardProps {
  user: User
  onLogout: () => void
}

export function TouristDashboard({ user, onLogout }: TouristDashboardProps) {
  const [activeTab, setActiveTab] = useState('upload')
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState({
    totalSubmissions: 0,
    approvedSubmissions: 0,
    rejectedSubmissions: 0,
    pendingReview: 0,
    totalPoints: 0,
    totalEarnings: 0
  })

  useEffect(() => {
    fetchUserStats()
  }, [])

  const fetchUserStats = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch('/api/user/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmissionSuccess = () => {
    fetchUserStats()
    setActiveTab('submissions')
  }

  const handleCashoutSuccess = () => {
    fetchUserStats()
  }

  const tabs = [
    { id: 'upload', label: 'Upload Video', icon: Upload },
    { id: 'submissions', label: 'My Submissions', icon: Clock },
    { id: 'wallet', label: 'Wallet', icon: DollarSign },
    { id: 'cashout', label: 'Cash Out', icon: BarChart3 },
    { id: 'profile', label: 'Profile', icon: Settings }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'upload':
        return <VideoUpload onSuccess={handleSubmissionSuccess} />
      case 'submissions':
        return <SubmissionList userId={user.id} />
      case 'wallet':
        return <WalletCard userId={user.id} />
      case 'cashout':
        return <CashoutForm onSuccess={handleCashoutSuccess} />
      case 'profile':
        return <div className="p-6">Profile settings coming soon...</div>
      default:
        return <VideoUpload onSuccess={handleSubmissionSuccess} />
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
                  <Upload className="h-6 w-6 text-primary-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Submissions</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {isLoading ? <LoadingSpinner size="sm" /> : stats.totalSubmissions}
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="p-2 bg-success-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-success-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Approved</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {isLoading ? <LoadingSpinner size="sm" /> : stats.approvedSubmissions}
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="p-2 bg-warning-100 rounded-lg">
                  <Clock className="h-6 w-6 text-warning-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending Review</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {isLoading ? <LoadingSpinner size="sm" /> : stats.pendingReview}
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="p-2 bg-danger-100 rounded-lg">
                  <XCircle className="h-6 w-6 text-danger-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Rejected</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {isLoading ? <LoadingSpinner size="sm" /> : stats.rejectedSubmissions}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Points and Earnings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Points Balance</h3>
              <div className="text-center">
                <p className="text-4xl font-bold text-primary-600">
                  {isLoading ? <LoadingSpinner size="lg" /> : stats.totalPoints}
                </p>
                <p className="text-gray-600 mt-2">Available points</p>
                <p className="text-sm text-gray-500 mt-1">
                  ≈ ${((stats.totalPoints * 0.01) || 0).toFixed(2)} USD
                </p>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Total Earnings</h3>
              <div className="text-center">
                <p className="text-4xl font-bold text-success-600">
                  ${isLoading ? <LoadingSpinner size="lg" /> : stats.totalEarnings.toFixed(2)}
                </p>
                <p className="text-gray-600 mt-2">Lifetime earnings</p>
                <p className="text-sm text-gray-500 mt-1">
                  From {stats.approvedSubmissions} approved submissions
                </p>
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