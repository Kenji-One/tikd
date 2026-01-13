/* ------------------------------------------------------------------ */
/*  src/app/dashboard/connections/organizations/page.tsx               */
/* ------------------------------------------------------------------ */
"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { Users, Plus } from "lucide-react";

import { Skeleton } from "@/components/ui/Skeleton";
import ConnectionProfileCard from "@/components/connections/ConnectionProfileCard";

/* ------------------------------ Types ------------------------------ */
type Org = {
  _id: string;
  name: string;

  /** Used as the small icon block */
  logo?: string;

  /** Used as the banner at the top */
  banner?: string;

  /** Description under title */
  description?: string;

  /** Footer fields */
  totalMembers?: number;
  createdAt?: string; // ISO string

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

function formatMembers(n?: number) {
  if (!n || n <= 0) return "—";
  try {
    return new Intl.NumberFormat(undefined).format(n);
  } catch {
    return String(n);
  }
}

function joinLabel(iso?: string) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const m = d.toLocaleString(undefined, { month: "short" });
    return `Joined ${m} ${d.getFullYear()}`;
  } catch {
    return "—";
  }
}

function revenueOf(e: MyEvent) {
  const raw = e.revenue ?? e.revenueTotal ?? e.grossRevenue ?? 0;
  return typeof raw === "number" ? raw : 0;
}

/* ----------------------------- Page -------------------------------- */
export default function DashboardOrganizationsPage() {
  const { data: session } = useSession();

  const { data: orgs, isLoading: orgsLoading } = useQuery<Org[]>({
    queryKey: ["orgs", "connections-organizations"],
    queryFn: () => fetchJSON<Org[]>("/api/organizations"),
    enabled: !!session,
  });

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
                  My Connections
                </p>
                <p className="mt-1 text-xs text-neutral-400">
                  Central hub for establishments, organizations, and teams.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-neutral-200">
                  <Users className="h-4 w-4 text-neutral-400" />
                  <span className="font-semibold text-neutral-0">
                    {formatMembers(
                      orgsList.reduce((a, o) => a + (o.totalMembers ?? 0), 0)
                    )}
                  </span>
                  <span className="text-neutral-400">Total members</span>
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
              <div className="grid grid-cols-1 gap-4 justify-items-start sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <Skeleton
                    key={i}
                    className="h-[205px] w-full sm:w-[300px] rounded-[16px]"
                  />
                ))}
              </div>
            ) : orgsList.length ? (
              <div className="grid grid-cols-1 gap-4 justify-items-start sm:grid-cols-2 lg:grid-cols-3">
                {orgsList.map((org) => {
                  const site = domainFromUrl(org.website);

                  const description =
                    org.description?.trim() ||
                    (site ? `${site}` : "Public profile");

                  return (
                    <ConnectionProfileCard
                      key={org._id}
                      href={`/dashboard/organizations/${org._id}`}
                      kind="organization"
                      title={org.name}
                      description={description}
                      bannerUrl={org.banner}
                      iconUrl={org.logo}
                      totalMembers={org.totalMembers}
                      joinDateLabel={joinLabel(org.createdAt)}
                    />
                  );
                })}
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
