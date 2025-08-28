"use client";

import { SessionProvider as NextAuthProvider } from "next-auth/react";
import type { Session } from "next-auth";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  session: Session | null;
}

/**
 * Wraps NextAuth's <SessionProvider>, letting us hydrate the session
 * from the server so the UI knows the auth state on first paint.
 */
export default function SessionProvider({ children, session }: Props) {
  return <NextAuthProvider session={session}>{children}</NextAuthProvider>;
}
