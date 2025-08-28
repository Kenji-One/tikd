// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SessionProvider from "@/context/SessionProvider";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/components/ui/Toast";
import { auth } from "@/lib/auth";
import QueryProvider from "@/context/QueryProvider"; //  ← NEW

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tikd.",
  description: "Discover and book events effortlessly.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // server-side session
  const session = await auth();

  return (
    <html lang="en" className={inter.className}>
      <body className="flex min-h-screen flex-col bg-surface text-brand-900">
        <SessionProvider session={session}>
          <AuthProvider>
            {/* client-only providers must sit inside a client component */}
            <QueryProvider>
              <ToastProvider>
                <Header />
                <main className="flex-1">{children}</main>
                <Footer />
              </ToastProvider>
            </QueryProvider>
          </AuthProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
