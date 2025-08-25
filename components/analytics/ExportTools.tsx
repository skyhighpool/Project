'use client'

import { Download } from 'lucide-react'

export function ExportTools() {
  return (
    <div className="text-center py-12">
      <Download className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Export Tools</h3>
      <p className="text-gray-600">Export data in various formats for external analysis</p>
      <p className="text-sm text-gray-500 mt-2">Coming soon...</p>
    </div>
  )
}