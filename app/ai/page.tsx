'use client'
export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function AiPageBody() {
  // ✅ It's safe to call this here because we’re inside Suspense
  const search = useSearchParams()
  const tripId = search.get('tripId') // if you use a query param

  // 👉 Put your existing AI UI here (form, messages, etc.)
  return (
    <div className="two-col">
      <aside className="sidebar">{/* optional */}</aside>
      <main className="content">
        <h1>Trip AI Assistant</h1>
        {/* your current JSX for the assistant */}
      </main>
    </div>
  )
}

export default function AiPage() {
  return (
    <Suspense fallback={<div className="card">Loading assistant…</div>}>
      <AiPageBody />
    </Suspense>
  )
}
