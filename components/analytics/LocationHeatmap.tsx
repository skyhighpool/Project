'use client'

import { MapPin } from 'lucide-react'

export function LocationHeatmap() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Location Heatmap</h2>
        <p className="text-gray-600">Visualize participation and submissions by location</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="h-96 flex items-center justify-center bg-gray-50 rounded-lg">
          <div className="text-center">
            <MapPin className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">Interactive map coming soon</p>
            <p className="text-gray-500 text-sm">Will show submission density and bin locations</p>
          </div>
        </div>
      </div>
    </div>
  )
}