import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth?.token;

    // Never intercept NextAuth internals
    if (pathname.startsWith('/api/auth')) return NextResponse.next();

    // Unauthenticated users: allow /login to render; redirect others to /login
    if (!token) {
      if (pathname === '/login') return NextResponse.next();
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const role = token.role as string | undefined;

    // Land authenticated users on their dashboard when they hit root/login
    if (pathname === '/' || pathname === '/login') {
      if (role === 'ADMIN') return NextResponse.redirect(new URL('/admin', req.url));
      if (role === 'TEACHER') return NextResponse.redirect(new URL('/teacher', req.url));
      if (role === 'COORDINATOR') return NextResponse.redirect(new URL('/coordin', req.url));
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Coordinators opening other dashboards -> send to /coordin
    if (role === 'COORDINATOR' && (pathname.startsWith('/admin') || pathname.startsWith('/teacher'))) {
      return NextResponse.redirect(new URL('/coordin', req.url));
    }

    // Role guards
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
    callbacks: { authorized: ({ token }) => !!token },
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
    // do not include '/api/auth'
  ],
};
