import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth?.token;

    // Allow NextAuth internal routes
    if (pathname.startsWith('/api/auth')) return NextResponse.next();

    // Remove trailing slashes
    if (pathname !== '/' && pathname.endsWith('/')) {
      const url = new URL(req.url);
      url.pathname = pathname.replace(/\/+$/, '');
      return NextResponse.redirect(url);
    }

    // If not authenticated
    if (!token) {
      // Allow access to login page
      if (pathname === '/login') return NextResponse.next();

      // Redirect others to login without nested callbackUrl
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const role = (token as any)?.role as string | undefined;

    // Already in correct dashboard
    if (role === 'ADMIN' && pathname.startsWith('/admin')) return NextResponse.next();
    if (role === 'TEACHER' && pathname.startsWith('/teacher')) return NextResponse.next();
    if (role === 'COORDINATOR' && pathname.startsWith('/coordin')) return NextResponse.next();

    // Redirect neutral pages to role-based dashboards
    if (pathname === '/' || pathname === '/login') {
      if (role === 'ADMIN') return NextResponse.redirect(new URL('/admin', req.url));
      if (role === 'TEACHER') return NextResponse.redirect(new URL('/teacher', req.url));
      if (role === 'COORDINATOR') return NextResponse.redirect(new URL('/coordin', req.url));
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Prevent COORDINATOR from accessing others
    if (role === 'COORDINATOR' && (pathname.startsWith('/admin') || pathname.startsWith('/teacher'))) {
      return NextResponse.redirect(new URL('/coordin', req.url));
    }

    // Guard routes
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
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    '/',
    '/login',
    '/admin/:path*',
    '/teacher/:path*',
    '/coordin/:path*',
  ],
};
