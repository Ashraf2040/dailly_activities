import NextAuth, { type NextAuthOptions, type Session, type User } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaClient } from '@prisma/client';

// Force Node.js runtime for Prisma on Vercel (App Router route handlers)
export const runtime = 'nodejs';

// Serverless-safe Prisma client pattern
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };
export const prisma =
  globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Extend types
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

        // Plain-text check (for small-scale/local use)
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
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.username = user.username;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id && token?.name && token?.role && token?.username) {
        session.user = {
          id: token.id,
          name: token.name as string,
          username: token.username as string,
          role: token.role as string,
        };
      }
      return session;
    },
  },
  pages: { signIn: '/login' },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
