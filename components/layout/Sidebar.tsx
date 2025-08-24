'use client'

import { LucideIcon } from 'lucide-react'

interface Tab {
  id: string
  label: string
  icon: LucideIcon
}

interface SidebarProps {
  activeTab: string
  onTabChange: (tabId: string) => void
  tabs: Tab[]
  userRole: 'tourist' | 'moderator' | 'council' | 'finance'
}

export function Sidebar({ activeTab, onTabChange, tabs, userRole }: SidebarProps) {
  const getRoleColor = () => {
    switch (userRole) {
      case 'tourist':
        return 'border-blue-500 bg-blue-50'
      case 'moderator':
        return 'border-purple-500 bg-purple-50'
      case 'council':
        return 'border-green-500 bg-green-50'
      case 'finance':
        return 'border-yellow-500 bg-yellow-50'
      default:
        return 'border-gray-500 bg-gray-50'
    }
  }

  const getRoleLabel = () => {
    switch (userRole) {
      case 'tourist':
        return 'Tourist'
      case 'moderator':
        return 'Moderator'
      case 'council':
        return 'Council'
      case 'finance':
        return 'Finance'
      default:
        return 'User'
    }
  }

  return (
    <div className="w-64 bg-white shadow-lg min-h-screen">
      {/* Role Header */}
      <div className={`p-6 border-l-4 ${getRoleColor()}`}>
        <h2 className="text-lg font-semibold text-gray-900 capitalize">
          {getRoleLabel()} Dashboard
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Welcome to your {getRoleLabel().toLowerCase()} workspace
        </p>
      </div>

      {/* Navigation Tabs */}
      <nav className="mt-6">
        <ul className="space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            
            return (
              <li key={tab.id}>
                <button
                  onClick={() => onTabChange(tab.id)}
                  className={`w-full flex items-center px-6 py-3 text-left transition-colors duration-200 ${
                    isActive
                      ? 'bg-blue-50 border-r-2 border-blue-500 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon 
                    className={`h-5 w-5 mr-3 ${
                      isActive ? 'text-blue-600' : 'text-gray-400'
                    }`} 
                  />
                  <span className="font-medium">{tab.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Role-specific Info */}
      <div className="mt-8 px-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            {getRoleLabel()} Permissions
          </h3>
          <div className="text-xs text-gray-600 space-y-1">
            {userRole === 'tourist' && (
              <>
                <p>• Upload video submissions</p>
                <p>• View submission status</p>
                <p>• Manage wallet & cashouts</p>
                <p>• View personal analytics</p>
              </>
            )}
            {userRole === 'moderator' && (
              <>
                <p>• Review video submissions</p>
                <p>• Approve/reject content</p>
                <p>• Access fraud detection tools</p>
                <p>• View audit logs</p>
              </>
            )}
            {userRole === 'council' && (
              <>
                <p>• View participation metrics</p>
                <p>• Access submission analytics</p>
                <p>• Export reports & data</p>
                <p>• Monitor program effectiveness</p>
              </>
            )}
            {userRole === 'finance' && (
              <>
                <p>• Manage payout queue</p>
                <p>• Process cashout requests</p>
                <p>• View transaction history</p>
                <p>• Run reconciliation tools</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 px-6">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Actions</h3>
        <div className="space-y-2">
          {userRole === 'tourist' && (
            <>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors">
                Upload New Video
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors">
                Request Cashout
              </button>
            </>
          )}
          {userRole === 'moderator' && (
            <>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors">
                Review Next Submission
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors">
                Run Fraud Check
              </button>
            </>
          )}
          {userRole === 'council' && (
            <>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors">
                Export Monthly Report
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors">
                View Participation Map
              </button>
            </>
          )}
          {userRole === 'finance' && (
            <>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors">
                Process Pending Payouts
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors">
                Run Reconciliation
              </button>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto px-6 py-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          <p>Waste Management System</p>
          <p className="mt-1">v1.0.0</p>
        </div>
      </div>
    </div>
  )
}