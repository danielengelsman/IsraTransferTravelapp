import './globals.css'
import Header from '@/components/Header'

export const metadata = { title: 'IsraTransfer Travel App', description: 'Simple trips manager' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body className="min-h-screen"><Header /><main className="max-w-5xl mx-auto p-4">{children}</main></body></html>)
}
