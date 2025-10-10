import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth?.token;

    // 0) Never intercept NextAuth internals
    if (pathname.startsWith('/api/auth')) return NextResponse.next();

    // 1) Normalize trailing slash to avoid 308 bounce loops
    if (pathname !== '/' && pathname.endsWith('/')) {
      const url = new URL(req.url);
      url.pathname = pathname.replace(/\/+$/, '');
      return NextResponse.redirect(url);
    }

    // 2) Unauthenticated: allow /login to render; everything else goes to /login
    if (!token) {
      if (pathname === '/login') return NextResponse.next();
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // 3) Extract role from JWT (set by your NextAuth callbacks)
    const role = (token as any)?.role as string | undefined;

    // 4) Already on the correct dashboard? Do nothing (prevents self-redirect loops)
    if (role === 'ADMIN' && (pathname === '/admin' || pathname.startsWith('/admin/'))) {
      return NextResponse.next();
    }
    if (role === 'TEACHER' && (pathname === '/teacher' || pathname.startsWith('/teacher/'))) {
      return NextResponse.next();
    }
    if (role === 'COORDINATOR' && (pathname === '/coordin' || pathname.startsWith('/coordin/'))) {
      return NextResponse.next();
    }

    // 5) Landing on neutral pages? Send to the user's dashboard once
    if (pathname === '/' || pathname === '/login') {
      if (role === 'ADMIN') return NextResponse.redirect(new URL('/admin', req.url));
      if (role === 'TEACHER') return NextResponse.redirect(new URL('/teacher', req.url));
      if (role === 'COORDINATOR') return NextResponse.redirect(new URL('/coordin', req.url));
      return NextResponse.redirect(new URL('/dashboard', req.url)); // fallback if you have a generic area
    }

    // 6) Bounce coordinators away from other dashboards
    if (role === 'COORDINATOR' && (pathname.startsWith('/admin') || pathname.startsWith('/teacher'))) {
      return NextResponse.redirect(new URL('/coordin', req.url));
    }

    // 7) Guards by prefix (redirect to home, not /login, to avoid auth state ping-pong)
    if (pathname.startsWith('/admin') && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', req.url));
    }
    if (pathname.startsWith('/teacher') && role !== 'TEACHER') {
      return NextResponse.redirect(new URL('/', req.url));
    }
    if (pathname.startsWith('/coordin') && role !== 'COORDINATOR') {
      return NextResponse.redirect(new URL('/', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // Presence-only check; all routing handled above
      authorized: ({ token }) => !!token,
    },
  }
);

// Only protect the routes you need; do not include '/api/auth'
export const config = {
  matcher: [
    '/',
    '/login',
    '/admin/:path*',
    '/teacher/:path*',
    '/coordin/:path*',
  ],
};
