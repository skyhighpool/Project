'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface Submission {
  id: string
  gpsLat: number
  gpsLng: number
  status: string
  user?: {
    name: string
  }
}

interface BinLocation {
  id: string
  name: string
  lat: number
  lng: number
  radiusM: number
}

interface MapViewProps {
  center: [number, number]
  submissions?: Submission[]
  binLocations?: BinLocation[]
  zoom?: number
}

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

export function MapView({ center, submissions = [], binLocations = [], zoom = 13 }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // Initialize map
    const map = L.map(mapRef.current).setView(center, zoom)
    mapInstanceRef.current = map

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map)

    // Add bin locations
    binLocations.forEach(bin => {
      const circle = L.circle([bin.lat, bin.lng], {
        color: 'green',
        fillColor: '#3b82f6',
        fillOpacity: 0.2,
        radius: bin.radiusM
      }).addTo(map)

      circle.bindPopup(`
        <div class="p-2">
          <h3 class="font-semibold text-gray-900">${bin.name}</h3>
          <p class="text-sm text-gray-600">Radius: ${bin.radiusM}m</p>
        </div>
      `)
    })

    // Add submission markers
    submissions.forEach(submission => {
      const getMarkerColor = (status: string) => {
        switch (status) {
          case 'APPROVED':
            return '#10b981' // green
          case 'REJECTED':
            return '#ef4444' // red
          case 'NEEDS_REVIEW':
            return '#f59e0b' // yellow
          case 'AUTO_VERIFIED':
            return '#3b82f6' // blue
          default:
            return '#6b7280' // gray
        }
      }

      const getMarkerIcon = (status: string) => {
        return L.divIcon({
          className: 'custom-marker',
          html: `
            <div style="
              width: 20px;
              height: 20px;
              background-color: ${getMarkerColor(status)};
              border: 2px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            "></div>
          `,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        })
      }

      const marker = L.marker([submission.gpsLat, submission.gpsLng], {
        icon: getMarkerIcon(submission.status)
      }).addTo(map)

      const popupContent = `
        <div class="p-3 min-w-[200px]">
          <h3 class="font-semibold text-gray-900 mb-2">Submission ${submission.id.slice(-8)}</h3>
          <div class="space-y-1 text-sm">
            <p><span class="font-medium">Status:</span> 
              <span class="inline-block px-2 py-1 rounded text-xs ml-1" style="background-color: ${getMarkerColor(submission.status)}20; color: ${getMarkerColor(submission.status)}">
                ${submission.status.replace('_', ' ')}
              </span>
            </p>
            ${submission.user ? `<p><span class="font-medium">User:</span> ${submission.user.name}</p>` : ''}
            <p><span class="font-medium">Coordinates:</span> ${submission.gpsLat.toFixed(6)}, ${submission.gpsLng.toFixed(6)}</p>
          </div>
        </div>
      `

      marker.bindPopup(popupContent)
    })

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [center, zoom, submissions, binLocations])

  // Update map when props change
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(center, zoom)
    }
  }, [center, zoom])

  return (
    <div className="relative">
      <div 
        ref={mapRef} 
        className="w-full h-full min-h-[400px] rounded-lg"
        style={{ zIndex: 1 }}
      />
      
      {/* Legend */}
      <div className="absolute top-4 right-4 bg-white p-3 rounded-lg shadow-lg z-10">
        <h4 className="font-semibold text-gray-900 mb-2 text-sm">Legend</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
            <span>Approved</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
            <span>Rejected</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
            <span>Needs Review</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
            <span>Auto Verified</span>
          </div>
          <div className="flex items-center mt-2 pt-2 border-t">
            <div className="w-3 h-3 rounded-full bg-blue-500 mr-2 opacity-20"></div>
            <span>Bin Location</span>
          </div>
        </div>
      </div>
    </div>
  )
}