import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

import SessionProvider from "@/context/SessionProvider";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/components/ui/Toast";
import { auth } from "@/lib/auth";
import QueryProvider from "@/context/QueryProvider";
import AppChrome from "@/components/layout/AppChrome";
import { ReactNode } from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tikd.",
  description: "Discover and book events effortlessly.",
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  // server-side session
  const session = await auth();

  return (
    <html lang="en" className={inter.className}>
      <body className="flex min-h-screen flex-col bg-surface text-brand-900">
        <SessionProvider session={session}>
          <AuthProvider>
            <QueryProvider>
              <ToastProvider>
                {/* Client chrome decides whether to show Header/Footer */}
                <AppChrome>{children}</AppChrome>
              </ToastProvider>
            </QueryProvider>
          </AuthProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
