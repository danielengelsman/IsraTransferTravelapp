import './globals.css'
import Link from 'next/link'

export const metadata = {
  title: 'IsraTransfer Trip Manager',
  description: 'Manage overseas trade show trips with synced invoices.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b bg-white">
          <nav className="container nav">
            <div className="flex items-center gap-4">
              <Link href="/" className="font-semibold">IsraTransfer Trip Manager</Link>
              <Link href="/trips" className="text-sm">Trips</Link>
            </div>
            <div className="text-sm">
              <Link href="/login" className="underline">Login</Link>
            </div>
          </nav>
        </header>
        <main className="container py-6">{children}</main>
      </body>
    </html>
  )
}
