/* ------------------------------------------------------------------ */
/*  src/app/dashboard/connections/organizations/page.tsx               */
/*  Tikd – My Organizations (moved out of /dashboard home)             */
/* ------------------------------------------------------------------ */
"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { DollarSign, Plus } from "lucide-react";

import { Skeleton } from "@/components/ui/Skeleton";

/* ------------------------------ Types ------------------------------ */
type Org = {
  _id: string;
  name: string;
  logo?: string;
  website?: string;
};

type MyEvent = {
  _id: string;
  title: string;
  image?: string;
  date: string; // ISO string
  location: string;
  category?: string;
  status?: "draft" | "published";
  pinned?: boolean;

  // Optional dashboard stats (safe: backend can add later)
  revenue?: number;
  revenueTotal?: number;
  grossRevenue?: number;
  ticketsSold?: number;
  sold?: number;
};

/* ---------------------------- Helpers ------------------------------ */
async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok)
    throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

function domainFromUrl(url?: string) {
  if (!url) return "";
  try {
    const clean = url.startsWith("http") ? url : `https://${url}`;
    const u = new URL(clean);
    return u.host.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\/(www\.)?/, "");
  }
}

function money(n: number) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `$${Math.round(n).toLocaleString()}`;
  }
}

function revenueOf(e: MyEvent) {
  const raw = e.revenue ?? e.revenueTotal ?? e.grossRevenue ?? 0;
  return typeof raw === "number" ? raw : 0;
}

/* -------------------------- Org Card (shared) ---------------------- */
function OrgCard({ org }: { org: Org }) {
  const site = domainFromUrl(org.website);

  return (
    <Link
      href={`/dashboard/organizations/${org._id}`}
      className={clsx(
        "group relative flex items-center gap-5 rounded-2xl",
        "border border-white/10 bg-neutral-948 p-5",
        "ring-1 ring-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.35)]",
        "transition-all duration-200 hover:-translate-y-0.5",
        "hover:border-primary-700/40 hover:ring-primary-700/25"
      )}
    >
      {/* Logo tile */}
      <div
        className={clsx(
          "relative h-16 w-16 shrink-0 overflow-hidden rounded-md",
          "bg-neutral-900 ring-1 ring-inset ring-white/10",
          "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]",
          "transition-colors duration-200 group-hover:ring-primary-700/40"
        )}
        aria-hidden="true"
      >
        {org.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={org.logo} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-[conic-gradient(from_220deg_at_50%_50%,#6d28d9,#3b82f6,#111827)] text-white">
            <span className="text-lg font-semibold">
              {org.name?.[0]?.toUpperCase() ?? "O"}
            </span>
          </div>
        )}
      </div>

      {/* Text block */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold leading-tight">
          {org.name}
        </p>
        <p className="mt-1 truncate text-sm text-neutral-300/90">
          {site || "Public profile"}
        </p>
      </div>

      {/* Right pill + chevron */}
      <div className="ml-auto flex items-center gap-2">
        <span
          className={clsx(
            "rounded-full px-3 py-1.5 text-xs",
            "text-neutral-200 ring-1 ring-inset ring-white/10",
            "bg-white/5 transition-colors duration-200",
            "group-hover:bg-primary-700/20 group-hover:text-neutral-0"
          )}
        >
          View
        </span>
        <svg
          className="h-4 w-4 text-neutral-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-neutral-0"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M7.5 15l5-5-5-5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Focus ring */}
      <span className="pointer-events-none absolute inset-0 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600/50" />
    </Link>
  );
}

/* ----------------------------- Page -------------------------------- */
export default function DashboardOrganizationsPage() {
  const { data: session } = useSession();

  const { data: orgs, isLoading: orgsLoading } = useQuery<Org[]>({
    queryKey: ["orgs", "connections-organizations"],
    queryFn: () => fetchJSON<Org[]>("/api/organizations"),
    enabled: !!session,
  });

  // Used only for the “Total revenue” pill (safe even if backend adds fields later)
  const { data: allEvents } = useQuery<MyEvent[]>({
    queryKey: ["myEvents", "connections-organizations"],
    queryFn: () => fetchJSON<MyEvent[]>("/api/events?owned=1"),
    enabled: !!session,
  });

  const orgsList = useMemo<Org[]>(() => orgs ?? [], [orgs]);
  const events = useMemo<MyEvent[]>(() => allEvents ?? [], [allEvents]);

  const totalOrgRevenue = useMemo(() => {
    const published = events.filter((e) => e.status !== "draft");
    return published.reduce((acc, e) => acc + revenueOf(e), 0);
  }, [events]);

  return (
    <div className="relative overflow-hidden bg-neutral-950 text-neutral-0">
      <section className="pb-20">
        <section
          className={clsx(
            "mt-4 overflow-hidden rounded-2xl border border-white/10",
            "bg-neutral-950/70 shadow-[0_18px_60px_rgba(0,0,0,0.55)]"
          )}
        >
          <div
            className={clsx(
              "relative p-4 md:p-5",
              "bg-[radial-gradient(900px_320px_at_25%_0%,rgba(154,70,255,0.10),transparent_60%),radial-gradient(900px_320px_at_90%_110%,rgba(66,139,255,0.08),transparent_55%)]"
            )}
          >
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-neutral-300">
                  My Organizations
                </p>
                <p className="mt-1 text-xs text-neutral-400">
                  Create and manage organizations that own your events.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-neutral-200">
                  <DollarSign className="h-4 w-4 text-neutral-400" />
                  <span className="font-semibold text-neutral-0">
                    {money(totalOrgRevenue)}
                  </span>
                  <span className="text-neutral-400">Total revenue</span>
                </span>

                <Link
                  href="/dashboard/organizations/new"
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-neutral-0 transition-colors hover:border-primary-600/60 hover:bg-primary-700/30"
                >
                  <Plus className="h-3 w-3" />
                  New organization
                </Link>
              </div>
            </div>

            {orgsLoading ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-2xl" />
                ))}
              </div>
            ) : orgsList.length ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {orgsList.map((o) => (
                  <OrgCard key={o._id} org={o} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/15 bg-neutral-950/50 p-10 text-center">
                <p className="text-sm font-medium text-neutral-0">
                  You don&apos;t have any organizations yet.
                </p>
                <p className="mt-1 text-xs text-neutral-300">
                  Create an organization to host events under your own brand.
                </p>
                <Link
                  href="/dashboard/organizations/new"
                  className="mt-4 inline-flex items-center justify-center rounded-full border border-white/14 bg-white/5 px-4 py-2 text-xs font-medium text-neutral-0 transition hover:bg-white/10"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add your first organization
                </Link>
              </div>
            )}
          </div>
        </section>
      </section>
    </div>
  );
}
