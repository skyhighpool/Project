'use client'

import { CheckCircle } from 'lucide-react'

export function PayoutHistory() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Payout History</h2>
        <p className="text-gray-600">Complete history of all processed payouts</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="h-96 flex items-center justify-center bg-gray-50 rounded-lg">
          <div className="text-center">
            <CheckCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">Payout history coming soon</p>
            <p className="text-gray-500 text-sm">Will show all processed and completed payouts</p>
          </div>
        </div>
      </div>
    </div>
  )
}