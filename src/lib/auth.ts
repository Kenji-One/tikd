// src/lib/auth.ts
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
import type { Types } from "mongoose"; // ✅ add this

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

        // ✅ Narrow _id to ObjectId|string to safely call toString()
        const id = (user._id as Types.ObjectId | string).toString();

        return {
          id,
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
        const t = token as TokenWithRole;
        t.role = u.role;
        t.image = u.image ?? "";
        t.remember = u.remember ?? true;

        const now = Math.floor(Date.now() / 1000);
        const max = t.remember ? 30 * 24 * 60 * 60 : 24 * 60 * 60;
        token.iat = now;
        token.exp = now + max;
      }

      // live updates from useSession().update(...)
      if (trigger === "update" && session) {
        // Only image is currently updated from the client
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
        // add id
        (session.user as { id?: string }).id = token.sub ?? "";
        // propagate role and image from token
        (session.user as { role?: "user" | "admin" }).role = t.role ?? "user";
        (session.user as { image?: string }).image = t.image ?? "";
      }

      // expose remember on the session object
      (session as { remember?: boolean }).remember = t.remember ?? true;

      return session;
    },
  },
};

export const auth = () => getServerSession(authOptions);
export const handler = NextAuth(authOptions);
