// src/components/layout/AppChrome.tsx
"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const isDashboard = pathname.startsWith("/dashboard");
  const isGate = pathname.startsWith("/gate");

  const hideChrome = isDashboard || isGate;

  return (
    <>
      {!hideChrome && <Header />}
      <main className="flex-1">{children}</main>
      {!hideChrome && <Footer />}
    </>
  );
}
