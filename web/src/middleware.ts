import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('accessToken')?.value;
  const role = request.cookies.get('userRole')?.value;
  const { pathname } = request.nextUrl;

  // Define protected paths
  const isProtectedRoute =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/representative') ||
    pathname.startsWith('/inventory') ||
    pathname.startsWith('/logistics') ||
    pathname.startsWith('/site-incharge') ||
    pathname.startsWith('/schedule') ||
    pathname.startsWith('/create-event') ||
    pathname.startsWith('/past-events') ||
    pathname.startsWith('/customers') ||
    pathname.startsWith('/events');

  const isRepOnlyRoute =
    pathname.startsWith('/representative') ||
    pathname.startsWith('/create-event') ||
    pathname.startsWith('/past-events') ||
    pathname.startsWith('/customers');

  const getRoleHome = (currentRole: string) => {
    if (currentRole === 'ADMIN') return '/admin';
    if (currentRole === 'SALES_REPRESENTATIVE' || currentRole === 'REPRESENTATIVE') return '/representative';
    if (currentRole === 'LOADING_STAFF') return '/logistics';
    if (currentRole === 'SITE_INCHARGE' || currentRole === 'CAPTAIN') return '/site-incharge';
    return '/schedule';
  };

  // 1. If visiting a protected page without an access token, redirect directly to login
  if (isProtectedRoute && !token) {
    const loginUrl = new URL('/', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Role-based Server-side Protection Guard
  if (token && role) {
    if (pathname.startsWith('/admin') && role !== 'ADMIN') {
      return NextResponse.redirect(new URL(getRoleHome(role), request.url));
    }

    if (isRepOnlyRoute && role !== 'ADMIN' && role !== 'SALES_REPRESENTATIVE' && role !== 'REPRESENTATIVE') {
      return NextResponse.redirect(new URL(getRoleHome(role), request.url));
    }

    if (pathname === '/') {
      return NextResponse.redirect(new URL(getRoleHome(role), request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API endpoints)
     * - _next/static (static server files)
     * - _next/image (image optimization utilities)
     * - favicon.ico (favicon images)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
