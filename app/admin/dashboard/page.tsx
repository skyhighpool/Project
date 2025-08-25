'use client'

import { useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export default function DashboardPage() {
  const [data, setData] = useState<any>(null)
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/admin/reports/summary', { headers: { Authorization: `Bearer ${token}` } })
      const json = await res.json()
      setData(json.data)
    })()
  }, [])

  if (!data) return <div className="p-6">Loading…</div>

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">City Council Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Approved Submissions" value={data.totals.approved} />
        <StatCard title="Rejected Submissions" value={data.totals.rejected} />
        <StatCard title="Approval Rate" value={`${Math.round(data.approvalRate * 100)}%`} />
        <StatCard title="Payouts Issued" value={`$${data.payoutsIssued.toFixed(2)}`} />
      </div>
      <div className="bg-white border rounded-lg p-4">
        <h2 className="font-medium mb-2">Verified Submissions by Day</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.submissionsByDay} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="count" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCount)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-white border rounded-lg p-4">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  )
}

