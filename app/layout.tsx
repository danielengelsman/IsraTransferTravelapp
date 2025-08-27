import type { Metadata } from "next"
import "./globals.css"
import Link from "next/link"
import Image from "next/image"

export const metadata: Metadata = {
  title: "IsraTransfer Travel Manager",
  description: "Manage overseas trips, flights, accommodation, transport, and invoices.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Top brand bar */}
        <div className="gradient-bar" />

        {/* Header */}
        <header className="navbar">
          <div className="navbar-inner">
            <Link href="/trips" className="brand no-underline">
              <Image
                src="/isratransfer-logo.png"
                alt="IsraTransfer"
                width={130}
                height={28}
                priority
              />
              <span className="brand-pill">internal</span>
            </Link>

            <nav className="flex items-center gap-2">
              <Link className="btn-ghost" href="/trips">Trips</Link>
              <Link className="btn" href="/trips/new">New trip</Link>
              <Link className="btn" href="/login">Login</Link>
            </nav>
          </div>
        </header>

        {/* Main content container */}
        <main className="container-page py-6">
          {children}
        </main>
      </body>
    </html>
  )
}
