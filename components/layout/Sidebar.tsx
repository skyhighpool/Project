'use client'

import { LucideIcon } from 'lucide-react'

interface Tab {
  id: string
  label: string
  icon: LucideIcon
}

interface SidebarProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (tabId: string) => void
}

export function Sidebar({ tabs, activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
      <nav className="mt-8">
        <div className="px-4 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                  ${isActive
                    ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-primary-600' : 'text-gray-400'}`} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </nav>
    </aside>
  )
}