// src/components/dashboard/DashboardChrome.tsx
"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import clsx from "clsx";

import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";

type Props = {
  children: ReactNode;
};

export default function DashboardChrome({ children }: Props) {
  const pathname = usePathname() || "";
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const isOrgSubpage =
    pathname.startsWith("/dashboard/organizations/") &&
    pathname.split("/").length >= 4;

  const isEventDashboard =
    pathname.startsWith("/dashboard/events/") &&
    pathname.split("/").length >= 4;

  const isDashboardArea =
    pathname === "/dashboard" || pathname.startsWith("/dashboard");

  const hasSidebar = isOrgSubpage || isDashboardArea;

  const sidebarVariant = isOrgSubpage
    ? ("organization" as const)
    : ("dashboard" as const);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileSidebarOpen) return;

    const onResize = () => {
      if (window.innerWidth >= 768) {
        setMobileSidebarOpen(false);
      }
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [mobileSidebarOpen]);

  return (
    <div className="min-h-dvh w-full bg-neutral-950 text-white">
      <div
        className={clsx(
          "tikd-dashboard-shell relative",
          hasSidebar ? "flex w-full" : "mx-auto max-w-[1600px]",
        )}
      >
        {hasSidebar && (
          <>
            <aside className="sticky top-0 z-50 hidden h-dvh shrink-0 md:block">
              <Sidebar variant={sidebarVariant} />
            </aside>

            <Sidebar
              variant={sidebarVariant}
              mode="mobile"
              mobileOpen={mobileSidebarOpen}
              onMobileClose={() => setMobileSidebarOpen(false)}
            />
          </>
        )}

        <main className="min-w-0 flex-1">
          {isEventDashboard ? (
            <>
              <Topbar
                hideLogo={isOrgSubpage}
                showSidebarToggle={hasSidebar}
                sidebarOpen={mobileSidebarOpen}
                onSidebarToggle={() => setMobileSidebarOpen((prev) => !prev)}
              />
              {children}
            </>
          ) : (
            <>
              <div className="px-4 md:px-6 lg:px-8">
                <Topbar
                  hideLogo={isOrgSubpage}
                  showSidebarToggle={hasSidebar}
                  sidebarOpen={mobileSidebarOpen}
                  onSidebarToggle={() => setMobileSidebarOpen((prev) => !prev)}
                />
              </div>

              <div className="px-4 pb-4 md:px-6 md:pb-6 lg:px-8 lg:pb-8">
                {children}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
