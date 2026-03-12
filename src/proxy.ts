import { NextRequest, NextResponse } from 'next/server'

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Only handle admin routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    // Skip authentication for login pages and auth API
    if (pathname.startsWith('/admin/login') || pathname.startsWith('/api/admin/auth')) {
      return NextResponse.next()
    }
    
    // Check for admin session cookie
    const adminCookie = request.cookies.get('admin_session')
    const correctPin = process.env.ADMIN_PIN || '123456'
    
    if (!adminCookie || adminCookie.value !== correctPin) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }
  
  // Allow request to proceed
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
