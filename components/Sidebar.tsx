'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, Plus, CalendarDays, FileBarChart2 } from 'lucide-react'

function NavItem({
  href, label, icon: Icon,
}: { href: string; label: string; icon: any }) {
  const pathname = usePathname()
  const active =
    (href === '/' && pathname === '/') ||
    (href !== '/' && pathname.startsWith(href))

  return (
    <Link
      href={href}
      className="nav-item"
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 12px', borderRadius: 12,
        textDecoration: 'none', color: 'inherit',
        background: active ? 'var(--card)' : 'transparent',
        boxShadow: active ? '0 1px 0 rgba(0,0,0,.04) inset' : 'none',
        fontWeight: active ? 700 : 600,
      }}
    >
      <Icon size={18} />
      <span>{label}</span>
    </Link>
  )
}

export default function Sidebar() {
  return (
    <aside
      className="section-card"
      style={{ padding: 16, borderRadius: 16, position: 'sticky', top: 16, height: 'fit-content' }}
    >
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, opacity: .7, marginBottom: 8 }}>
        OVERVIEW
      </div>
      <div style={{ display: 'grid', gap: 6, marginBottom: 16 }}>
        <NavItem href="/dashboard" label="Dashboard" icon={LayoutGrid} />
      </div>

      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, opacity: .7, margin: '8px 0' }}>
        TRAVEL MANAGEMENT
      </div>
      <div style={{ display: 'grid', gap: 6 }}>
        <NavItem href="/trips?new=1" label="New Trip" icon={Plus} />
        <NavItem href="/trips" label="All Trips" icon={CalendarDays} />
        <NavItem href="/reports" label="Reports" icon={FileBarChart2} />
      </div>
    </aside>
  )
}
