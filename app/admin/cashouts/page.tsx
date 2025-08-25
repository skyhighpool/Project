'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'

interface CashoutItem {
  id: string
  userId: string
  pointsUsed: number
  cashAmount: number
  method: string
  destinationRef: string
  status: string
  createdAt: string
  user?: { email: string }
}

export default function CashoutsPage() {
  const [items, setItems] = useState<CashoutItem[]>([])
  const [status, setStatus] = useState('PENDING')
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null

  const load = async () => {
    const res = await fetch(`/api/admin/cashouts?status=${status}`, { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    setItems(data.data || [])
  }

  useEffect(() => { load() }, [status])

  const initiate = async (id: string) => { await fetch(`/api/admin/cashouts/${id}/initiate`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }); load() }
  const mark = async (id: string, s: string) => { await fetch(`/api/admin/cashouts/${id}/mark`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ status: s }) }); load() }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Cashout Requests</h1>
      <div className="flex gap-2">
        {['PENDING','INITIATED','SUCCEEDED','FAILED','NEEDS_INFO','all'].map(s => (
          <Button key={s} variant={s===status?undefined:'outline'} size="sm" onClick={() => setStatus(s)}>{s}</Button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="p-2">User</th>
              <th className="p-2">Points</th>
              <th className="p-2">Amount</th>
              <th className="p-2">Method</th>
              <th className="p-2">Status</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(i => (
              <tr key={i.id} className="border-b">
                <td className="p-2">{i.user?.email || i.userId}</td>
                <td className="p-2">{i.pointsUsed}</td>
                <td className="p-2">${Number(i.cashAmount).toFixed(2)}</td>
                <td className="p-2">{i.method}</td>
                <td className="p-2">{i.status}</td>
                <td className="p-2 space-x-2">
                  {i.status==='PENDING' && <Button size="sm" onClick={() => initiate(i.id)}>Initiate</Button>}
                  {['INITIATED','NEEDS_INFO'].includes(i.status) && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => mark(i.id, 'SUCCEEDED')}>Mark Succeeded</Button>
                      <Button size="sm" variant="outline" onClick={() => mark(i.id, 'FAILED')}>Mark Failed</Button>
                      <Button size="sm" variant="outline" onClick={() => mark(i.id, 'NEEDS_INFO')}>Needs Info</Button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

