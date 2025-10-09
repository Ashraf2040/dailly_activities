import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth?.token;

    // Unauthenticated -> login
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const role = token.role as string | undefined;

    // If coordinator is authenticated, always land on /coordin when hitting root or login
    // and bounce away from other dashboards.
    const isRootOrLogin = pathname === '/' || pathname === '/login';
    const isOtherDash =
      pathname.startsWith('/admin') || pathname.startsWith('/teacher');

    if (role === 'COORDINATOR' && (isRootOrLogin || isOtherDash)) {
      return NextResponse.redirect(new URL('/coordin', req.url));
    }

    // Admin routes guard
    if (pathname.startsWith('/admin') && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', req.url));
    }

    // Teacher routes guard
    if (pathname.startsWith('/teacher') && role !== 'TEACHER') {
      return NextResponse.redirect(new URL('/', req.url));
    }

    // Coordinator routes guard
    // Support both /coordinator and /coordin if you use either
    if ((pathname.startsWith('/coordinator') || pathname.startsWith('/coordin')) && role !== 'COORDINATOR') {
      return NextResponse.redirect(new URL('/', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token, // let handler above manage redirects
    },
  }
);

// Ensure matcher includes all protected prefixes you actually use.
// If your coordinator route is /coordin, include that. If it's /coordinator, include that too.
export const config = {
  matcher: [
    '/',
    '/login',
    '/admin/:path*',
    '/teacher/:path*',
    '/coordin/:path*',
    '/coordinator/:path*',
  ],
};
