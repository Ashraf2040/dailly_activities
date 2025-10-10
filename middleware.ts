import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth?.token;

    // Never intercept NextAuth internals
    if (pathname.startsWith('/api/auth')) return NextResponse.next();

    // Normalize trailing slash to avoid 308 loops
    if (pathname !== '/' && pathname.endsWith('/')) {
      const url = new URL(req.url);
      url.pathname = pathname.replace(/\/+$/, '');
      return NextResponse.redirect(url);
    }

    // If no token and requesting a protected area, go to /login
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const role = (token as any)?.role as string | undefined;

    // Role guards (send to neutral '/' to avoid chained auth redirects)
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
      authorized: ({ token }) => !!token, // only presence; routing above
    },
  }
);

// Only protect dashboards; do NOT protect '/' or '/login'
export const config = {
  matcher: [
    '/admin/:path*',
    '/teacher/:path*',
    '/coordin/:path*',
  ],
};
