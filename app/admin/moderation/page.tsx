'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/Button'

const ReactPlayer = dynamic(() => import('react-player/lazy'), { ssr: false })

interface SubmissionItem {
  id: string
  s3Key: string
  thumbKey: string | null
  autoScore: number | null
  gpsLat: number
  gpsLng: number
  createdAt: string
  user: { id: string; email: string; name: string | null }
}

export default function ModerationPage() {
  const [items, setItems] = useState<SubmissionItem[]>([])
  const [loading, setLoading] = useState(false)
  const [videoUrlMap, setVideoUrlMap] = useState<Record<string, string>>({})
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null

  const fetchQueue = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/submissions?status=NEEDS_REVIEW&limit=20', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setItems(data.data || [])
    } finally {
      setLoading(false)
    }
  }

  const loadVideoUrl = async (s3Key: string) => {
    if (videoUrlMap[s3Key]) return
    const res = await fetch('/api/uploads/sign-download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ key: s3Key })
    })
    if (res.ok) {
      const { url } = await res.json()
      setVideoUrlMap(prev => ({ ...prev, [s3Key]: url }))
    }
  }

  const approve = async (id: string) => {
    await fetch(`/api/admin/submissions/${id}/approve`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    fetchQueue()
  }

  const reject = async (id: string) => {
    const reason = prompt('Reason for rejection?') || 'Rejected by moderator'
    await fetch(`/api/admin/submissions/${id}/reject`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ reason }) })
    fetchQueue()
  }

  useEffect(() => {
    fetchQueue()
  }, [])

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Moderation Queue</h1>
      {loading && <p>Loading…</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {items.map(item => (
          <div key={item.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{item.user?.email}</p>
                <p className="text-xs text-gray-500">Score: {item.autoScore ?? '—'}</p>
              </div>
              <div className="space-x-2">
                <Button size="sm" onClick={() => approve(item.id)}>Approve</Button>
                <Button size="sm" variant="outline" onClick={() => reject(item.id)}>Reject</Button>
              </div>
            </div>
            <div className="aspect-video bg-black/5 rounded overflow-hidden">
              {item.s3Key && (
                <div onMouseEnter={() => loadVideoUrl(item.s3Key)}>
                  {videoUrlMap[item.s3Key] ? (
                    <ReactPlayer url={videoUrlMap[item.s3Key]} controls width="100%" height="100%" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-sm text-gray-500">Hover to load video…</div>
                  )}
                </div>
              )}
            </div>
            <div className="text-xs text-gray-600">
              <p>GPS: {item.gpsLat.toFixed(5)}, {item.gpsLng.toFixed(5)}</p>
              <p>Submitted: {new Date(item.createdAt).toLocaleString()}</p>
              <p>Key: {item.s3Key}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

