// src/app/dashboard/layout.tsx
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Topbar from "@/components/dashboard/Topbar";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/auth?callback=/dashboard");
  }

  return (
    <div className="min-h-dvh w-full bg-neutral-950 text-white">
      <div className="mx-auto max-w-[1600px]">
        <main className="p-4 md:p-6 lg:p-8 !pt-0">
          <Topbar />
          {children}
        </main>
      </div>
    </div>
  );
}
