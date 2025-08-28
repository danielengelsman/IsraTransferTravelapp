'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type TripStatus = 'draft' | 'awaiting_approval' | 'approved'

export default function ReportsPage() {
  const sb = useMemo(() => createClient(), [])
  const [ready, setReady] = useState(false)
  const [counts, setCounts] = useState<{ total:number; draft:number; awaiting:number; approved:number }>({
    total: 0, draft: 0, awaiting: 0, approved: 0
  })

  useEffect(() => {
    ;(async () => {
      const total = (await sb.from('trips').select('id', { count: 'exact', head: true })).count || 0
      const draft = (await sb.from('trips').select('id', { count: 'exact', head: true }).eq('status','draft')).count || 0
      const awaiting = (await sb.from('trips').select('id', { count: 'exact', head: true }).eq('status','awaiting_approval')).count || 0
      const approved = (await sb.from('trips').select('id', { count: 'exact', head: true }).eq('status','approved')).count || 0
      setCounts({ total, draft, awaiting, approved })
      setReady(true)
    })()
  }, [sb])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 }}>
      {/* Optional: <Sidebar /> */}
      <div />
      <div className="space-y-6">
        <div className="trip-cover" style={{ padding: 16, borderRadius: 16 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>Reports</h1>
          <div className="row-sub">Quick overview of trip statuses.</div>
        </div>

        <div className="section-card" style={{ padding: 16 }}>
          {ready ? (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:12 }}>
              <StatCard label="Total trips" value={counts.total} />
              <StatCard label="Draft" value={counts.draft} />
              <StatCard label="Awaiting approval" value={counts.awaiting} />
              <StatCard label="Approved" value={counts.approved} />
            </div>
          ) : (
            <div className="row-sub">Loading…</div>
          )}
        </div>

        <div className="section-card" style={{ padding: 16 }}>
          <div style={{ display:'flex', gap:8, alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div className="row-title">More reports (coming soon)</div>
              <div className="row-sub">Expense breakdowns, per-trip budgets, per-person activity, etc.</div>
            </div>
            <Link className="btn" href="/trips">Go to Trips</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label:string; value:number }) {
  return (
    <div className="card" style={{ padding: 14 }}>
      <div className="row-sub" style={{ marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800 }}>{value}</div>
    </div>
  )
}
