'use client'
import Link from 'next/link'

export default function Sidebar() {
  return (
    <aside style={{position:'sticky', top:16}}>
      <div className="section-card" style={{ padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, color: '#6b7280', marginBottom: 8 }}>
          OVERVIEW
        </div>
        <Link href="/" className="nav-item active">Dashboard</Link>

        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, color: '#6b7280', margin: '16px 0 8px' }}>
          TRAVEL MANAGEMENT
        </div>
        <Link href="/trips/new" className="nav-item">New Trip</Link>
        <Link href="/trips" className="nav-item">All Trips</Link>
        <Link href="/reports" className="nav-item">Reports</Link>
      </div>
      <style jsx>{`
        .nav-item {
          display:block; padding:10px 12px; border-radius:10px; text-decoration:none;
          font-weight:600; color:#111827; background:transparent;
        }
        .nav-item:hover { background:#f3f4f6; }
        .active { background:#2563eb; color:white; }
      `}</style>
    </aside>
  )
}
