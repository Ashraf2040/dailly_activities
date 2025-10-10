import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth?.token;

    // Do not intercept NextAuth internals
    if (pathname.startsWith('/api/auth')) return NextResponse.next();

    // Normalize trailing slash to avoid redirect bounces
    if (pathname !== '/' && pathname.endsWith('/')) {
      const url = new URL(req.url);
      url.pathname = pathname.replace(/\/+$/, '');
      return NextResponse.redirect(url);
    }

    // Unauthenticated: allow /login, block others
    if (!token) {
      if (pathname === '/login') return NextResponse.next();
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const role = (token as any)?.role as string | undefined;

    // Already on the correct dashboard? Do nothing.
    if (role === 'ADMIN' && (pathname === '/admin' || pathname.startsWith('/admin/'))) {
      return NextResponse.next();
    }
    if (role === 'TEACHER' && (pathname === '/teacher' || pathname.startsWith('/teacher/'))) {
      return NextResponse.next();
    }
    if (role === 'COORDINATOR' && (pathname === '/coordin' || pathname.startsWith('/coordin/'))) {
      return NextResponse.next();
    }

    // Landing on neutral pages -> go to role home once
    if (pathname === '/' || pathname === '/login') {
      if (role === 'ADMIN') return NextResponse.redirect(new URL('/admin', req.url));
      if (role === 'TEACHER') return NextResponse.redirect(new URL('/teacher', req.url));
      if (role === 'COORDINATOR') return NextResponse.redirect(new URL('/coordin', req.url));
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Coordinators trying other dashboards -> push to /coordin
    if (role === 'COORDINATOR' && (pathname.startsWith('/admin') || pathname.startsWith('/teacher'))) {
      return NextResponse.redirect(new URL('/coordin', req.url));
    }

    // Guards by prefix
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
    callbacks: { authorized: ({ token }) => !!token },
  }
);

export const config = {
  matcher: [
    '/',
    '/login',
    '/admin/:path*',
    '/teacher/:path*',
    '/coordin/:path*', // only this prefix
  ],
};
