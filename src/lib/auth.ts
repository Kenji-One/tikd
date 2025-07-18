import NextAuth, {
  AuthOptions,
  getServerSession,
  User as NextAuthUser,
} from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { connectDB } from "@/lib/db";
import User, { IUser } from "@/models/User";
import { JWT } from "next-auth/jwt";

// helper type just for this file
type TokenWithRole = JWT & { role?: "user" | "admin" };
/* -------------------------------------------------------------------------- */
/*  Auth options                                                              */
/* -------------------------------------------------------------------------- */

export const authOptions: AuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text", placeholder: "john@doe.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        await connectDB();
        const user = (await User.findOne({
          email: credentials.email,
        })) as IUser | null;
        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role as "user" | "admin",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = (user as NextAuthUser).role; // no `any`
      return token;
    },
    async session({ session, token }) {
      const t = token as TokenWithRole;

      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = t.role ?? "user";
      }
      return session;
    },
  },
};

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

export const auth = () => getServerSession(authOptions);
export const handler = NextAuth(authOptions);
