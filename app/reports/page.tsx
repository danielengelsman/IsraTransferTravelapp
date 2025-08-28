'use client'

import Sidebar from '@/components/Sidebar'
import Link from 'next/link'

export default function ReportsPage() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16, alignItems: 'start' }}>
      <Sidebar />

      <main className="space-y-6">
        <div className="trip-cover" style={{ padding: 16, borderRadius: 16 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>Reports</h1>
          <div style={{ opacity: 0.9 }}>
            Summaries of trips, costs, and invoices.
          </div>
        </div>

        <div className="section-card" style={{ padding: 16 }}>
          <p>This page is a placeholder for now. We’ll add filters and exports next.</p>
          <p><Link className="btn" href="/trips">Go to Trips</Link></p>
        </div>
      </main>
    </div>
  )
}
