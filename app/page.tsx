'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { User } from '@prisma/client'
import { LoginForm } from '@/components/auth/LoginForm'
import { SignupForm } from '@/components/auth/SignupForm'
import { TouristDashboard } from '@/components/dashboard/TouristDashboard'
import { ModeratorDashboard } from '@/components/dashboard/ModeratorDashboard'
import { CouncilDashboard } from '@/components/dashboard/CouncilDashboard'
import { FinanceDashboard } from '@/components/dashboard/FinanceDashboard'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showSignup, setShowSignup] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check for existing auth token safely
    const checkAuth = async () => {
      try {
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('accessToken')
          if (token) {
            await fetchUserProfile(token)
          } else {
            setIsLoading(false)
          }
        } else {
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Auth check error:', error)
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const fetchUserProfile = async (token: string) => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      } else {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleLoginSuccess = (userData: User, tokens: { accessToken: string; refreshToken: string }) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', tokens.accessToken)
      localStorage.setItem('refreshToken', tokens.refreshToken)
    }
    setUser(userData)
  }

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
    }
    setUser(null)
    router.push('/')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="xl" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-md w-full mx-4">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-blue-900 mb-2">
              🌱 Waste Management
            </h1>
            <p className="text-gray-600">
              Submit videos and earn rewards for proper waste disposal
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            {showSignup ? (
              <SignupForm 
                onSuccess={handleLoginSuccess}
                onSwitchToLogin={() => setShowSignup(false)}
              />
            ) : (
              <LoginForm 
                onSuccess={handleLoginSuccess}
                onSwitchToSignup={() => setShowSignup(true)}
              />
            )}
          </div>

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>By continuing, you agree to our Terms of Service and Privacy Policy</p>
          </div>
        </div>
      </div>
    )
  }

  // Render role-based dashboard
  const renderDashboard = () => {
    switch (user.role) {
      case 'TOURIST':
        return <TouristDashboard user={user} onLogout={handleLogout} />
      case 'MODERATOR':
        return <ModeratorDashboard user={user} onLogout={handleLogout} />
      case 'COUNCIL':
        return <CouncilDashboard user={user} onLogout={handleLogout} />
      case 'FINANCE':
        return <FinanceDashboard user={user} onLogout={handleLogout} />
      default:
        return <TouristDashboard user={user} onLogout={handleLogout} />
    }
  }

  return renderDashboard()
}
