'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside style={{ position: 'sticky', top: 16 }}>
      <div className="box">
        <div className="subhead">OVERVIEW</div>
        <ul className="list">
          <li>
            <Link href="/" className={`nav ${pathname === '/' ? 'active' : ''}`}>
              Dashboard
            </Link>
          </li>
        </ul>

        <div className="subhead" style={{ marginTop: 16 }}>TRAVEL MANAGEMENT</div>
        <ul className="list">
          <li>
            <Link href="/trips/new" className="nav">New Trip</Link>
          </li>
          <li>
            <Link
              href="/trips"
              className={`nav ${pathname.startsWith('/trips') ? 'active' : ''}`}
            >
              All Trips
            </Link>
          </li>
          <li>
            <Link
              href="/reports"
              className={`nav ${pathname.startsWith('/reports') ? 'active' : ''}`}
            >
              Reports
            </Link>
          </li>
        </ul>
      </div>

      <style jsx>{`
        .box {
          padding: 16px;
          border-radius: 16px;
          background: #ffffff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }
        .subhead {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.06em;
          color: #6b7280;
          margin-bottom: 8px;
        }
        .list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          gap: 8px;
        }
        .nav {
          display: block;
          padding: 10px 12px;
          border-radius: 10px;
          text-decoration: none;
          font-weight: 600;
          color: #111827;
          background: transparent;
        }
        .nav:hover { background: #f3f4f6; }
        .active { background: #2563eb; color: #fff; }

        @media (prefers-color-scheme: dark) {
          .box { background: #111827; }
          .subhead { color: #9ca3af; }
          .nav { color: #e5e7eb; }
          .nav:hover { background: #1f2937; }
          .active { background: #2563eb; color: #fff; }
        }
      `}</style>
    </aside>
  )
}
