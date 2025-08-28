'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'

function NavItem({
  href,
  active,
  icon,
  children,
}: {
  href: string
  active: boolean
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        borderRadius: 14,
        fontWeight: 800,
        textDecoration: 'none',
        background: active ? '#2563eb' : 'transparent',
        color: active ? '#ffffff' : '#0f172a',
        boxShadow: active ? '0 4px 12px rgba(37,99,235,.25)' : 'none',
        margin: '6px 0',
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          display: 'inline-flex',
          color: active ? '#ffffff' : '#0f172a',
        }}
      >
        {icon}
      </span>
      <span>{children}</span>
    </Link>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const isTrips = pathname.startsWith('/trips') && pathname !== '/trips/new'
  const isNew = pathname === '/trips/new'
  const isReports = pathname.startsWith('/reports')

  return (
    <aside style={{ position: 'sticky', top: 16 }}>
      <div
        style={{
          padding: 16,
          borderRadius: 16,
          background: '#ffffff',
          boxShadow: '0 1px 3px rgba(0,0,0,.06)',
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: '.08em',
            color: '#6b7280',
            margin: '0 0 10px',
          }}
        >
          OVERVIEW
        </div>

        <NavItem
          href="/"
          active={pathname === '/'}
          icon={
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="2" />
              <rect x="14" y="3" width="7" height="7" rx="2" />
              <rect x="3" y="14" width="7" height="7" rx="2" />
              <rect x="14" y="14" width="7" height="7" rx="2" />
            </svg>
          }
        >
          Dashboard
        </NavItem>

        <div
          style={{
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: '.08em',
            color: '#6b7280',
            margin: '20px 0 10px',
          }}
        >
          TRAVEL MANAGEMENT
        </div>

        <NavItem
          href="/trips/new"
          active={isNew}
          icon={
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          }
        >
          New Trip
        </NavItem>

        <NavItem
          href="/trips"
          active={isTrips}
          icon={
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M16 3v4M8 3v4M3 10h18" strokeLinecap="round" />
            </svg>
          }
        >
          All Trips
        </NavItem>

        <NavItem
          href="/reports"
          active={isReports}
          icon={
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 3h7l5 5v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
              <path d="M14 3v6h6" />
            </svg>
          }
        >
          Reports
        </NavItem>
      </div>
    </aside>
  )
}
