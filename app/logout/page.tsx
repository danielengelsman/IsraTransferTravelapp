'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LogoutPage() {
  const router = useRouter()

  useEffect(() => {
    (async () => {
      const sb = createClient()
      try {
        await sb.auth.signOut()
      } catch (_) {
        // ignore – even if it fails, send user to login
      }
      router.replace('/login')
    })()
  }, [router])

  return (
    <div className="card" style={{ maxWidth: 520 }}>
      <h2>Logging out…</h2>
      <p>Please wait while we sign you out.</p>
    </div>
  )
}
