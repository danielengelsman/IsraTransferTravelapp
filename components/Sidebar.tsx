'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/* tiny inline icons so they never blow up */
function IcPlus(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function IcCalendar(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
    </svg>
  )
}
function IcDoc(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M14 3v6h6" />
    </svg>
  )
}

function NavItem({
  href,
  label,
  icon,
}: {
  href: string
  label: string
  icon: React.ReactNode
}) {
  const pathname = usePathname()
  const active = pathname === href || pathname?.startsWith(href + '/')
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`sidebar-link${active ? ' active' : ''}`}
    >
      <span className="sidebar-icon">{icon}</span>
      <span>{label}</span>
    </Link>
  )
}

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">IsraTransfer</div>

      <div className="sidebar-section">OVERVIEW</div>
      {/* If you add a dashboard page later, put it here */}

      <div className="sidebar-section" style={{ marginTop: 8 }}>TRAVEL MANAGEMENT</div>
      <NavItem href="/trips/new" label="New Trip" icon={<IcPlus />} />
      <NavItem href="/trips" label="All Trips" icon={<IcCalendar />} />
      <NavItem href="/reports" label="Reports" icon={<IcDoc />} />
<NavItem href="/ai" label="Trip AI" icon={<IcDoc />} />

      <Link href="/logout" className="sidebar-logout">Log out</Link>
    </aside>
  )
}
