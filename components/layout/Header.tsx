'use client'

import { User } from '@prisma/client'
import { 
  Bell, 
  Settings, 
  LogOut,
  User as UserIcon,
  Shield,
  Building,
  CreditCard
} from 'lucide-react'

interface HeaderProps {
  user: User
  onLogout: () => void
}

export function Header({ user, onLogout }: HeaderProps) {
  const getRoleIcon = () => {
    switch (user.role) {
      case 'TOURIST':
        return <UserIcon className="h-5 w-5 text-blue-600" />
      case 'MODERATOR':
        return <Shield className="h-5 w-5 text-purple-600" />
      case 'COUNCIL':
        return <Building className="h-5 w-5 text-green-600" />
      case 'FINANCE':
        return <CreditCard className="h-5 w-5 text-yellow-600" />
      default:
        return <UserIcon className="h-5 w-5 text-gray-600" />
    }
  }

  const getRoleColor = () => {
    switch (user.role) {
      case 'TOURIST':
        return 'bg-blue-100 text-blue-800'
      case 'MODERATOR':
        return 'bg-purple-100 text-purple-800'
      case 'COUNCIL':
        return 'bg-green-100 text-green-800'
      case 'FINANCE':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleLabel = () => {
    switch (user.role) {
      case 'TOURIST':
        return 'Tourist'
      case 'MODERATOR':
        return 'Moderator'
      case 'COUNCIL':
        return 'Council'
      case 'FINANCE':
        return 'Finance'
      default:
        return 'User'
    }
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-green-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">WM</span>
              </div>
            </div>
            <div className="ml-3">
              <h1 className="text-xl font-semibold text-gray-900">
                Waste Management System
              </h1>
            </div>
          </div>

          {/* Right side - User info and actions */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <button className="p-2 text-gray-400 hover:text-gray-500 relative">
              <Bell className="h-6 w-6" />
              <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white"></span>
            </button>

            {/* Settings */}
            <button className="p-2 text-gray-400 hover:text-gray-500">
              <Settings className="h-6 w-6" />
            </button>

            {/* User Menu */}
            <div className="relative">
              <div className="flex items-center space-x-3">
                {/* User Avatar */}
                <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
                  {getRoleIcon()}
                </div>

                {/* User Info */}
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor()}`}>
                      {getRoleLabel()}
                    </span>
                    <span className="text-xs text-gray-500">{user.email}</span>
                  </div>
                </div>

                {/* Logout Button */}
                <button
                  onClick={onLogout}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-2 py-2">
            <span className="text-sm text-gray-500">Dashboard</span>
            <span className="text-gray-400">/</span>
            <span className="text-sm font-medium text-gray-900 capitalize">
              {getRoleLabel().toLowerCase()}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}