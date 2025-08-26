import Link from 'next/link'

export default function Home() {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="card">
        <h1 className="text-2xl font-semibold mb-2">Welcome</h1>
        <p className="text-gray-600">
          Use this app to manage overseas trips, keep flight/hotel/car details, and upload invoices that sync across devices.
        </p>
        <div className="mt-4 flex gap-2">
          <Link className="btn-primary btn" href="/trips">Go to Trips</Link>
          <Link className="btn" href="/login">Login</Link>
        </div>
      </div>
      <div className="card">
        <h2 className="text-xl font-semibold mb-2">What’s included</h2>
        <ul className="list-disc pl-6 text-gray-700 space-y-1">
          <li>Supabase auth (email sign-in)</li>
          <li>Profiles with roles: <code>admin</code> and <code>staff</code></li>
          <li>Trips with flights/hotel/car</li>
          <li>Invoice uploads to Supabase Storage</li>
          <li>RLS policies so users only see their team’s trips</li>
        </ul>
      </div>
    </div>
  )
}
