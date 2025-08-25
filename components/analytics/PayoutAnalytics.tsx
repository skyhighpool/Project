'use client'

import { DollarSign } from 'lucide-react'

export function PayoutAnalytics() {
  return (
    <div className="text-center py-12">
      <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Payout Analytics</h3>
      <p className="text-gray-600">Comprehensive payout analysis and financial reporting</p>
      <p className="text-sm text-gray-500 mt-2">Coming soon...</p>
    </div>
  )
}