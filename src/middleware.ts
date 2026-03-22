import { NextRequest, NextResponse } from 'next/server'

/**
 * Next.js middleware – protects /admin/* routes with the PIN-based session cookie.
 * The /reset-password route is intentionally NOT included in the matcher so that
 * recovery users can always reach the reset form without being redirected.
 */
const adminPin = process.env.ADMIN_PIN || '123456'

export function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname

    // Skip authentication for the login page and the auth API endpoint
    if (
        pathname.startsWith('/admin/login') ||
        pathname.startsWith('/api/admin/auth')
    ) {
        return NextResponse.next()
    }

    // Protect admin routes
    if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
        const adminCookie = request.cookies.get('admin_session')

        if (!adminCookie || adminCookie.value !== adminPin) {
            return NextResponse.redirect(new URL('/admin/login', request.url))
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/admin/:path*', '/api/admin/:path*'],
}
