/* ------------------------------------------------------------------ */
/*  src/components/dashboard/data/DataTopbar.tsx                       */
/* ------------------------------------------------------------------ */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { Search as SearchIcon } from "lucide-react";

const TABS = [
  { label: "Basic", href: "/dashboard/data/basic" },
  { label: "Events", href: "/dashboard/data/events" },
  { label: "Teams", href: "/dashboard/data/teams" },
  { label: "Organizations", href: "/dashboard/data/organizations" },
] as const;

export default function DataTopbar() {
  const pathname = usePathname();
  const [query, setQuery] = useState("");

  const activeHref = useMemo(() => {
    const hit = TABS.find((t) => pathname === t.href);
    if (hit) return hit.href;

    const starts = TABS.find((t) => pathname?.startsWith(t.href + "/"));
    return starts?.href ?? "/dashboard/data/basic";
  }, [pathname]);

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-[-0.6px] text-neutral-0">
        Data
      </h1>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-5 pb-3">
        {/* Tabs (back to old style, just better) */}
        <nav className="flex items-center gap-8 text-2xl font-medium tracking-[-0.35px]">
          {TABS.map((t) => {
            const active = activeHref === t.href;

            return (
              <Link
                key={t.href}
                href={t.href}
                className={clsx(
                  "relative transition-colors",
                  active
                    ? // faint purple / subtle gradient text
                      "bg-[linear-gradient(90deg,var(--color-primary-999)_0%,var(--color-primary-400)_55%,var(--color-primary-200)_100%)] bg-clip-text text-transparent"
                    : "text-neutral-500 hover:text-neutral-200",
                )}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>

        {/* Search (same shape as Topbar, but editable) */}
        {/* <div className="flex w-full sm:max-w-md">
          <div className="flex h-[44px] w-full items-center gap-3 rounded-full border border-white/10 bg-[#121420] px-3 text-left text-sm text-white outline-none focus-within:border-primary-500">
            <SearchIcon className="h-4 w-4 opacity-70" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-[14px] text-neutral-0 placeholder:text-white/50 focus:outline-none border-0 focus:ring-0"
              placeholder="Search a user"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </div> */}
      </div>
    </div>
  );
}
