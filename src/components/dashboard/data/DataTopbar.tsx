/* ------------------------------------------------------------------ */
/*  src/components/dashboard/data/DataTopbar.tsx                      */
/* ------------------------------------------------------------------ */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import clsx from "clsx";

const TABS = [
  { label: "Basic", href: "/dashboard/data/basic" },
  { label: "Events", href: "/dashboard/data/events" },
  { label: "Teams", href: "/dashboard/data/teams" },
  { label: "Organizations", href: "/dashboard/data/organizations" },
] as const;

export default function DataTopbar() {
  const pathname = usePathname();

  const activeHref = useMemo(() => {
    const hit = TABS.find((t) => pathname === t.href);
    if (hit) return hit.href;

    const starts = TABS.find((t) => pathname?.startsWith(t.href + "/"));
    return starts?.href ?? "/dashboard/data/basic";
  }, [pathname]);

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.03em] text-neutral-50 sm:text-3xl">
          Data
        </h1>
        <p className="mt-1 text-[12px] tracking-[-0.02em] text-neutral-400 sm:text-[13px]">
          Track withdrawals and transfers in one place.
        </p>
      </div>

      <div className="pt-5 pb-3">
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <nav className="flex min-w-max items-center gap-5 text-lg font-medium tracking-[-0.35px] sm:gap-8 sm:text-2xl">
            {TABS.map((t) => {
              const active = activeHref === t.href;

              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={clsx(
                    "relative whitespace-nowrap pb-1 transition-colors",
                    active
                      ? "bg-[linear-gradient(90deg,var(--color-primary-999)_0%,var(--color-primary-400)_55%,var(--color-primary-200)_100%)] bg-clip-text text-transparent"
                      : "text-neutral-500 hover:text-neutral-200",
                  )}
                >
                  {t.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
