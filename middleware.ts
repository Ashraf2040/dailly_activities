import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const session = req.nextauth?.token; // Changed from nextAuth to nextauth

    // If no session or token, redirect to login
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const role = session.role;

    // Protect admin routes
    if (pathname.startsWith('/admin') && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/teacher', req.url));
    }

    // Protect teacher routes
    if (pathname.startsWith('/teacher') && role !== 'TEACHER') {
      return NextResponse.redirect(new URL('/admin', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

// export const config = {
//   matcher: ['/teacher/:path*', '/admin/:path*'],
// };
export const config = {
  matcher: ['/', '/teacher/:path*', '/admin/:path*'],
};