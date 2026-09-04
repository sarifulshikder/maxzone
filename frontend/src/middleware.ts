import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('maxzone_token')?.value;

  // Normalize /dashboard to /admin/dashboard
  if (pathname === '/dashboard') {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }

  // Protect admin routes
  if (pathname.startsWith('/admin')) {
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Protect reseller routes
  if (pathname.startsWith('/reseller')) {
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Customer portal is public (PPPoE self-care — customers use their own credentials via API)
  // No server-side redirect needed; API calls handle auth

  // If already logged in and visiting /login, let client-side login page
  // handle role-aware redirect via getTargetUrl(user.role)
  // (do NOT redirect here — middleware cannot decode JWT role without the secret)

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/reseller/:path*',
    '/dashboard',
    '/login',
  ],
};
