'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Sidebar() {
  const pathname = usePathname()

  function Item({ href, label }: { href: string; label: string }) {
    const active = pathname === href || pathname?.startsWith(href + '/')
    return (
      <Link
        href={href}
        className="side-link"
        style={{
          display: 'block',
          padding: '10px 12px',
          borderRadius: 10,
          fontWeight: 700,
          textDecoration: 'none',
          color: active ? '#0f172a' : '#0b1324',
          background: active
            ? 'linear-gradient(180deg, #ffffff 0%, #f3f4f6 100%)'
            : 'transparent',
          border: active ? '1px solid #e5e7eb' : '1px solid transparent',
        }}
      >
        {label}
      </Link>
    )
  }

  return (
    <aside
      style={{
        position: 'sticky',
        top: 16,
        alignSelf: 'start',
        display: 'grid',
        gap: 8,
        padding: 12,
        borderRadius: 16,
        background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        border: '1px solid #e5e7eb',
        minWidth: 0,
      }}
    >
      <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 4 }}>
        IsraTransfer
      </div>

      <Item href="/trips" label="All Trips" />
      <Item href="/trips/new" label="New Trip" />
      <Item href="/reports" label="Reports" />

      <div style={{ height: 8 }} />

      {/* Logout goes to the /logout page we just created */}
      <Link
        href="/logout"
        className="btn"
        style={{
          textAlign: 'center',
          fontWeight: 800,
          border: '1px solid #e5e7eb',
          padding: '10px 12px',
          borderRadius: 10,
          textDecoration: 'none',
        }}
      >
        Log out
      </Link>
    </aside>
  )
}
