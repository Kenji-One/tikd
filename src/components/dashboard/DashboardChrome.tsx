// src/components/dashboard/DashboardChrome.tsx
"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import clsx from "clsx";

import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";

type Props = {
  children: ReactNode;
};

export default function DashboardChrome({ children }: Props) {
  const pathname = usePathname();

  // Any route under /dashboard/organizations/[id]... should use
  // the organization sidebar + hide logo in Topbar.
  const isOrgSubpage =
    pathname.startsWith("/dashboard/organizations/") &&
    pathname.split("/").length >= 4; // /dashboard/organizations/[id](/*)

  const hasOrgSidebar = isOrgSubpage;

  return (
    <div className="min-h-dvh w-full bg-neutral-950 text-white">
      <div className={clsx("mx-auto max-w-[1600px]", hasOrgSidebar && "flex")}>
        {hasOrgSidebar && (
          <aside className="sticky top-0 hidden h-dvh shrink-0 md:block">
            <Sidebar variant="organization" />
          </aside>
        )}

        <main className="flex-1 p-4 md:p-6 lg:p-8 !pt-0">
          <Topbar hideLogo={hasOrgSidebar} />
          {children}
        </main>
      </div>
    </div>
  );
}
