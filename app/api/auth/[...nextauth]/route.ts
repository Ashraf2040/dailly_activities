// app/api/auth/[...nextauth]/route.ts (v4)
import NextAuth, { type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";

export const runtime = "nodejs";

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { username: credentials.username },
        });
        if (!user) return null;

        // Plain-text compare (requested)
        if (user.password !== credentials.password) return null;

        return {
          id: String(user.id),
          name: user.name ?? user.username,
          username: user.username,
          role: user.role ?? "USER",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id as any;
        token.name = (user as any).name as any;
        (token as any).username = (user as any).username;
        (token as any).role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: String((token as any).id ?? ""),
        name: String((token as any).name ?? ""),
        username: String((token as any).username ?? ""),
        role: String((token as any).role ?? ""),
      } as any;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
