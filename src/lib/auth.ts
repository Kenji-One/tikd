import NextAuth, {
  AuthOptions,
  getServerSession,
  User as NextAuthUser,
} from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import type { Types } from "mongoose";
import { JWT } from "next-auth/jwt";

import { connectDB } from "@/lib/db";
import User from "@/models/User";

type TokenWithRole = JWT & {
  role?: "user" | "admin";
  remember?: boolean;
  image?: string;
};

type AuthUserLean = {
  _id: Types.ObjectId | string;
  email: string;
  username: string;
  password: string;
  role: "user" | "admin";
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
        const rawUsername = String(credentials?.username ?? "")
          .trim()
          .toLowerCase();
        const rawPassword = String(credentials?.password ?? "");

        if (!rawUsername || !rawPassword) return null;

        await connectDB();

        const user = await User.findOne({ username: rawUsername })
          .select("+password email username role image")
          .lean<AuthUserLean | null>();

        if (!user || !user.password) return null;

        const remember = ["true", "on", "1"].includes(
          String(credentials?.remember ?? "").toLowerCase(),
        );

        const valid = await bcrypt.compare(rawPassword, user.password);
        if (!valid) return null;

        const id = String(user._id);

        return {
          id,
          email: user.email,
          name: user.username,
          role: user.role,
          remember,
          image: user.image ?? "",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        const u = user as NextAuthUser & {
          role?: "user" | "admin";
          remember?: boolean;
          image?: string;
        };

        const t = token as TokenWithRole;
        t.role = u.role ?? "user";
        t.image = u.image ?? "";
        t.remember = u.remember ?? true;

        const now = Math.floor(Date.now() / 1000);
        const max = t.remember ? 30 * 24 * 60 * 60 : 24 * 60 * 60;

        token.iat = now;
        token.exp = now + max;
      }

      if (trigger === "update" && session) {
        const s = session as { image?: string };
        const t = token as TokenWithRole;

        if (typeof s.image !== "undefined") {
          t.image = s.image ?? "";
        }
      }

      return token;
    },

    async session({ session, token }) {
      const t = token as TokenWithRole;

      if (session.user) {
        (session.user as { id?: string }).id = token.sub ?? "";
        (session.user as { role?: "user" | "admin" }).role = t.role ?? "user";
        (session.user as { image?: string }).image = t.image ?? "";
      }

      (session as { remember?: boolean }).remember = t.remember ?? true;

      return session;
    },
  },
};

export const auth = () => getServerSession(authOptions);
export const handler = NextAuth(authOptions);
