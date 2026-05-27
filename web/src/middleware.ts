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
    pathname.startsWith('/schedule') || 
    pathname.startsWith('/create-event') || 
    pathname.startsWith('/past-events') || 
    pathname.startsWith('/customers') ||
    pathname.startsWith('/events');

  // 1. If visiting a protected page without an access token, redirect directly to login
  if (isProtectedRoute && !token) {
    const loginUrl = new URL('/', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Role-based Server-side Protection Guard
  if (token && role) {
    // If requesting ADMIN path but role is not ADMIN, redirect to their home dashboard
    if (pathname.startsWith('/admin') && role !== 'ADMIN') {
      if (role === 'SALES_REPRESENTATIVE' || role === 'REPRESENTATIVE') {
        return NextResponse.redirect(new URL('/representative', request.url));
      } else if (role === 'LOADING_STAFF') {
        return NextResponse.redirect(new URL('/logistics', request.url));
      } else {
        return NextResponse.redirect(new URL('/schedule', request.url));
      }
    }

    // If requesting representative / events / past-events / customers paths but role is restricted
    const isRepOnlyRoute = 
      pathname.startsWith('/representative') || 
      pathname.startsWith('/create-event') || 
      pathname.startsWith('/past-events') || 
      pathname.startsWith('/customers');

    if (isRepOnlyRoute && role !== 'ADMIN' && role !== 'SALES_REPRESENTATIVE' && role !== 'REPRESENTATIVE') {
      if (role === 'LOADING_STAFF') {
        return NextResponse.redirect(new URL('/logistics', request.url));
      } else {
        return NextResponse.redirect(new URL('/schedule', request.url));
      }
    }

    // 3. If visiting login page ('/') while already authenticated, redirect directly to their dashboard
    if (pathname === '/') {
      if (role === 'ADMIN') {
        return NextResponse.redirect(new URL('/admin', request.url));
      } else if (role === 'SALES_REPRESENTATIVE' || role === 'REPRESENTATIVE') {
        return NextResponse.redirect(new URL('/representative', request.url));
      } else if (role === 'LOADING_STAFF') {
        return NextResponse.redirect(new URL('/logistics', request.url));
      } else {
        return NextResponse.redirect(new URL('/schedule', request.url));
      }
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
