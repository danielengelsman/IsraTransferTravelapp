'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Sidebar() {
  const pathname = usePathname()

  const isTrips = pathname.startsWith('/trips') && pathname !== '/trips/new'
  const isNew   = pathname === '/trips/new'
  const isReps  = pathname.startsWith('/reports')

  return (
    <aside className="wrap">
      <div className="box">
        <div className="subhead">OVERVIEW</div>
        <Link href="/" className={`item ${pathname === '/' ? 'active' : ''}`}>
          <span className="icon">
            {/* grid icon */}
            <svg viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="2"/>
              <rect x="14" y="3" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="2"/>
              <rect x="3" y="14" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="2"/>
              <rect x="14" y="14" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </span>
          <span>Dashboard</span>
        </Link>

        <div className="subhead" style={{ marginTop: 20 }}>TRAVEL MANAGEMENT</div>

        <Link href="/trips/new" className={`item ${isNew ? 'active' : ''}`}>
          <span className="icon">
            {/* plus icon */}
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </span>
          <span>New Trip</span>
        </Link>

        <Link href="/trips" className={`item ${isTrips ? 'active' : ''}`}>
          <span className="icon">
            {/* calendar icon */}
            <svg viewBox="0 0 24 24" fill="none">
              <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M16 3v4M8 3v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </span>
          <span>All Trips</span>
        </Link>

        <Link href="/reports" className={`item ${isReps ? 'active' : ''}`}>
          <span className="icon">
            {/* report/paper icon */}
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M7 3h7l5 5v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" stroke="currentColor" strokeWidth="2"/>
              <path d="M14 3v6h6" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </span>
          <span>Reports</span>
        </Link>
      </div>

      <style jsx>{`
        .wrap { position: sticky; top: 16px; }
        .box {
          padding: 16px;
          border-radius: 16px;
          background: #ffffff;
          box-shadow: 0 1px 3px rgba(0,0,0,.06);
        }
        .subhead {
          font-size: 13px;
          font-weight: 800;
          letter-spacing: .08em;
          color: #6b7280;
          margin: 0 0 10px;
        }
        .item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 14px;
          text-decoration: none;
          font-weight: 700;
          color: #0f172a; /* prevents default blue link color */
          background: transparent;
          transition: background .15s ease, color .15s ease;
          margin: 6px 0;
        }
        .item:hover { background: #f3f4f6; }
        .active {
          background: #2563eb;
          color: #fff;
          box-shadow: 0 4px 12px rgba(37,99,235,.25);
        }
        .icon {
          display: inline-flex;
          width: 22px; height: 22px;
          color: currentColor;
        }
        .icon :global(svg) { width: 22px; height: 22px; }
        @media (prefers-color-scheme: dark) {
          .box { background: #111827; }
          .subhead { color: #9ca3af; }
          .item { color: #e5e7eb; }
          .item:hover { background: #1f2937; }
          .active { background: #2563eb; color: #fff; }
        }
      `}</style>
    </aside>
  )
}
