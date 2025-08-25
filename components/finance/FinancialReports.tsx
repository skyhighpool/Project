'use client'

import { TrendingUp } from 'lucide-react'

export function FinancialReports() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Financial Reports</h2>
        <p className="text-gray-600">Comprehensive financial analysis and reporting</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="h-96 flex items-center justify-center bg-gray-50 rounded-lg">
          <div className="text-center">
            <TrendingUp className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">Financial reports coming soon</p>
            <p className="text-gray-500 text-sm">Will show detailed financial analytics and insights</p>
          </div>
        </div>
      </div>
    </div>
  )
}