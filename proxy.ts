import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decrypt } from '@/app/lib/session'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('session')?.value
  const session = await decrypt(token)

  // Protect dashboard routes
  if (pathname.startsWith('/dashboard')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    // Role-based access
    if (pathname.startsWith('/dashboard/adviser') && session.role !== 'adviser') {
      return NextResponse.redirect(new URL('/dashboard/applicant', request.url))
    }
    if (pathname.startsWith('/dashboard/applicant') && session.role !== 'applicant') {
      return NextResponse.redirect(new URL('/dashboard/adviser', request.url))
    }
  }

  // Redirect already-logged-in users away from auth pages
  if (pathname === '/login' || pathname.startsWith('/register')) {
    if (session) {
      const dest =
        session.role === 'adviser' ? '/dashboard/adviser' : '/dashboard/applicant'
      return NextResponse.redirect(new URL(dest, request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register', '/register/:path*'],
}
