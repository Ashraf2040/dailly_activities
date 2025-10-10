import NextAuth, { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaClient } from '@prisma/client';

// Force Node.js runtime for Prisma on Vercel (App Router route handlers)
export const runtime = 'nodejs';

// Serverless-safe Prisma client pattern
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Type augmentation (optional if you already have a global *.d.ts, keep one source of truth)
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name: string;
      username: string;
      role: string;
    };
  }
  interface User {
    id: string;
    name: string;
    username: string;
    role: string;
  }
}
declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    name: string;
    username: string;
    role: string;
  }
}

export const authOptions: NextAuthOptions = {
  // Ensure NEXTAUTH_URL is set exactly to https://dailly-activities.vercel.app (no trailing slash) in Vercel
  session: { strategy: 'jwt' },

  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { username: credentials.username },
        });
        if (!user) return null;

        // Plain-text check for your current setup; replace with hashing in production
        if (user.password !== credentials.password) return null;

        return {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role,
        };
      },
    }),
  ],

  pages: {
    signIn: '/login', // Your custom login page
  },

  callbacks: {
    // Prevent redirect loops by sanitizing callbackUrl
    async redirect({ url, baseUrl }) {
      // If url is relative, resolve it against baseUrl
      let target: URL;
      try {
        target = new URL(url, baseUrl);
      } catch {
        return baseUrl;
      }

      // Disallow returning to /login (breaks nested callbackUrl loops)
      if (target.pathname === '/login') return baseUrl;

      // Only allow same-origin redirects
      if (target.origin === baseUrl) return target.toString();

      return baseUrl;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.name = (user as any).name;
        token.username = (user as any).username;
        token.role = (user as any).role;
      }
      return token;
    },

    async session({ session, token }) {
      if (token?.id && token?.name && token?.username && token?.role) {
        session.user = {
          id: token.id as string,
          name: token.name as string,
          username: token.username as string,
          role: token.role as string,
        };
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
