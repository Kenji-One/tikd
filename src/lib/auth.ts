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

type TokenWithRole = JWT & {
  role?: "user" | "admin";
  remember?: boolean;
  image?: string;
};

export const authOptions: AuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text", placeholder: "john_doe" },
        password: { label: "Password", type: "password" },
        remember: { label: "Remember", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials.password) return null;

        await connectDB();
        const uname = credentials.username.trim().toLowerCase();

        const user = (await User.findOne({ username: uname })) as IUser | null;
        if (!user) return null;

        const remember = ["true", "on", "1"].includes(
          (credentials.remember ?? "").toString().toLowerCase()
        );
        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.username,
          role: user.role as "user" | "admin",
          remember,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // initial sign-in
      if (user) {
        const u = user as NextAuthUser & {
          role?: "user" | "admin";
          remember?: boolean;
          image?: string;
        };
        token.role = u.role;
        (token as TokenWithRole).image = u.image ?? "";
        (token as TokenWithRole).remember = u.remember ?? true;

        const now = Math.floor(Date.now() / 1000);
        const max = (token as TokenWithRole).remember
          ? 30 * 24 * 60 * 60
          : 24 * 60 * 60;
        token.iat = now;
        token.exp = now + max;
      }

      // live updates from useSession().update(...)
      if (trigger === "update" && session) {
        if (typeof (session as any).image !== "undefined") {
          (token as TokenWithRole).image = (session as any).image ?? "";
        }
      }

      return token;
    },
    async session({ session, token }) {
      const t = token as TokenWithRole;
      if (session.user) {
        session.user.id = token.sub ?? "";
        (session.user as any).role = t.role ?? "user";
        (session.user as any).image = t.image ?? "";
      }
      (session as any).remember = t.remember ?? true;
      return session;
    },
  },
};

export const auth = () => getServerSession(authOptions);
export const handler = NextAuth(authOptions);
