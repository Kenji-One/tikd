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

  // Event dashboard pages (inside a specific event)
  // e.g. /dashboard/events/[eventId]/summary, /ticket-types, /promo-codes, etc.
  const isEventDashboard =
    pathname.startsWith("/dashboard/events/") &&
    pathname.split("/").length >= 4;

  // Dashboard default page: replace internal tabs with a sidebar
  // ✅ include ALL finances subroutes
  const isDashboardHome =
    pathname === "/dashboard" || pathname.startsWith("/dashboard");

  const hasSidebar = isOrgSubpage || isDashboardHome;

  const sidebarVariant = isOrgSubpage
    ? ("organization" as const)
    : ("dashboard" as const);

  return (
    <div className="min-h-dvh w-full bg-neutral-950 text-white">
      <div
        className={clsx(
          "tikd-dashboard-shell relative",
          // When a sidebar is present, the layout must be flush-left (no mx-auto centering)
          hasSidebar ? "flex w-full" : "mx-auto max-w-[1600px]",
        )}
      >
        {hasSidebar && (
          <aside className="sticky top-0 hidden h-dvh shrink-0 md:block z-50">
            <Sidebar variant={sidebarVariant} />
          </aside>
        )}

        <main
          className={clsx(
            "flex-1 min-w-0 !pt-0",
            // ✅ remove paddings for event dashboard
            isEventDashboard ? "p-0" : "p-4 md:p-6 lg:p-8",
          )}
        >
          <Topbar hideLogo={isOrgSubpage} />
          {children}
        </main>
      </div>
    </div>
  );
}
