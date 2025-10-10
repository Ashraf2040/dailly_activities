import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth?.token;

    // Always let NextAuth internal routes pass
    if (pathname.startsWith('/api/auth')) {
      return NextResponse.next();
    }

    // Unauthenticated -> allow /login, block others to /login (no nested callback)
    if (!token) {
      if (pathname === '/login') return NextResponse.next();
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const role = token.role as string | undefined;

    // Land authenticated users on their home when they hit root or login
    const isRootOrLogin = pathname === '/' || pathname === '/login';
    if (isRootOrLogin) {
      if (role === 'ADMIN') return NextResponse.redirect(new URL('/admin', req.url));
      if (role === 'TEACHER') return NextResponse.redirect(new URL('/teacher', req.url));
      if (role === 'COORDINATOR') return NextResponse.redirect(new URL('/coordin', req.url));
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // If coordinator tries to open other dashboards, bounce to /coordin
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

    if ((pathname.startsWith('/coordinator') || pathname.startsWith('/coordin')) && role !== 'COORDINATOR') {
      return NextResponse.redirect(new URL('/', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token, // simple presence check; redirects handled above
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
    '/coordinator/:path*',
    // Note: do not include '/api/auth' here
  ],
};
