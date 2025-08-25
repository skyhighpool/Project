'use client'

import { MapPin } from 'lucide-react'

export function LocationHeatmap() {
  return (
    <div className="text-center py-12">
      <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Location Heatmap</h3>
      <p className="text-gray-600">Interactive location heatmap showing submission density and activity patterns</p>
      <p className="text-sm text-gray-500 mt-2">Coming soon...</p>
    </div>
  )
}