import { Suspense } from 'react'
import LoginForm from '@/components/LoginForm'

export const dynamic = 'force-dynamic' // avoid prerendering issues

export default function LoginPage() {
  return (
    <div className="card max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-3">Login</h1>
      <Suspense fallback={<div>Loading…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  )
}

