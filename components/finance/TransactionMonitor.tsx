'use client'

import { CreditCard } from 'lucide-react'

export function TransactionMonitor() {
  return (
    <div className="text-center py-12">
      <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Transaction Monitor</h3>
      <p className="text-gray-600">Monitor payment gateway transactions and status</p>
      <p className="text-sm text-gray-500 mt-2">Coming soon...</p>
    </div>
  )
}