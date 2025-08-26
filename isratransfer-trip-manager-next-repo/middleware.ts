import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  // Lightweight auth gate: if no sb-access-token cookie and path starts with /trips, redirect to /login
  const url = req.nextUrl
  if (url.pathname.startsWith('/trips')) {
    const hasSession =
      req.cookies.get('sb-access-token')?.value ||
      req.cookies.get('sb:token')?.value
    if (!hasSession) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('next', url.pathname)
      return NextResponse.redirect(loginUrl)
    }
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/trips/:path*'],
}
