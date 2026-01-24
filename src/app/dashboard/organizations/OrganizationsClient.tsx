/* ------------------------------------------------------------------ */
/*  src/app/dashboard/organizations/OrganizationsClient.tsx           */
/* ------------------------------------------------------------------ */
"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Search, Plus, Users } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import ConnectionProfileCard from "@/components/connections/ConnectionProfileCard";

/* ------------------------------ Types ------------------------------ */
type Org = {
  _id: string;
  name: string;

  logo?: string;
  banner?: string;
  description?: string;

  totalMembers?: number;
  createdAt?: string;

  website?: string;
};

/* ---------------------------- Helpers ------------------------------ */
async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok)
    throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
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

function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  const visible = useMemo(() => {
    const max = Math.min(totalPages, 4);
    return Array.from({ length: max }).map((_, i) => i + 1);
  }, [totalPages]);

  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-1">
      <button
        type="button"
        onClick={() => onPage(clamp(page - 1, 1, totalPages))}
        disabled={page <= 1}
        className={clsx(
          "inline-flex h-8 w-8 items-center justify-center rounded-md",
          "border border-white/10 bg-white/5 text-neutral-100",
          "hover:border-primary-500 disabled:opacity-40 disabled:hover:bg-white/5",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
        )}
        aria-label="Previous page"
      >
        ‹
      </button>

      {visible.map((p) => {
        const active = p === page;
        return (
          <button
            key={p}
            type="button"
            onClick={() => onPage(p)}
            className={clsx(
              "inline-flex h-8 w-8 items-center justify-center rounded-md text-[12px] font-semibold",
              "transition-colors",
              active
                ? "bg-primary-500 text-neutral-0"
                : "bg-white/0 text-neutral-200 hover:bg-white/10 hover:border-white/20",
            )}
            aria-current={active ? "page" : undefined}
          >
            {p}
          </button>
        );
      })}

      <button
        type="button"
        onClick={() => onPage(clamp(page + 1, 1, totalPages))}
        disabled={page >= totalPages}
        className={clsx(
          "inline-flex h-8 w-8 items-center justify-center rounded-md",
          "border border-white/10 bg-white/5 text-neutral-100",
          "hover:border-primary-500 disabled:opacity-40 disabled:hover:bg-white/5",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
        )}
        aria-label="Next page"
      >
        ›
      </button>
    </div>
  );
}

/* ------------------------------ Page ------------------------------- */
export default function OrganizationsClient() {
  const router = useRouter();
  const { data: session } = useSession();

  const [orgsQuery, setOrgsQuery] = useState("");
  const [orgsPage, setOrgsPage] = useState(1);

  const { data: orgs, isLoading: orgsLoading } = useQuery<Org[]>({
    queryKey: ["orgs", "organizations-page"],
    queryFn: () => fetchJSON<Org[]>("/api/organizations"),
    enabled: !!session,
  });

  const orgsPageSize = 10;

  const orgsFiltered = useMemo(() => {
    const q = orgsQuery.trim().toLowerCase();
    const list = orgs ?? [];
    if (!q) return list;

    return list.filter((o) => {
      const hay =
        `${o.name} ${o.description ?? ""} ${o.website ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [orgsQuery, orgs]);

  const orgsTotal = orgsFiltered.length;
  const orgsTotalPages = Math.max(1, Math.ceil(orgsTotal / orgsPageSize));

  useEffect(() => {
    setOrgsPage(1);
  }, [orgsQuery]);

  useEffect(() => {
    setOrgsPage((p) => clamp(p, 1, orgsTotalPages));
  }, [orgsTotalPages]);

  const orgsPageSafe = clamp(orgsPage, 1, orgsTotalPages);

  const orgsSlice = useMemo(() => {
    const start = (orgsPageSafe - 1) * orgsPageSize;
    return orgsFiltered.slice(start, start + orgsPageSize);
  }, [orgsFiltered, orgsPageSafe]);

  const orgsShowingLabel = useMemo(() => {
    if (!orgsTotal) return "Showing 0-0 from 0 data";
    const start = (orgsPageSafe - 1) * orgsPageSize + 1;
    const end = Math.min(orgsTotal, start + orgsPageSize - 1);
    return `Showing ${start}-${end} from ${orgsTotal} data`;
  }, [orgsTotal, orgsPageSafe]);

  const totalMembers = useMemo(() => {
    const base = orgs ?? [];
    const sum = base.reduce((acc, o) => acc + (o.totalMembers ?? 0), 0);
    return sum > 0 ? sum : undefined;
  }, [orgs]);

  return (
    <div className="relative overflow-hidden bg-neutral-950 text-neutral-0">
      <section className="pb-16">
        <section
          className={clsx(
            "mt-4 overflow-hidden rounded-2xl border border-white/10",
            "bg-neutral-950/70 shadow-[0_18px_60px_rgba(0,0,0,0.55)]",
          )}
        >
          <div
            className={clsx(
              "relative p-4 md:p-5",
              "bg-[radial-gradient(900px_320px_at_25%_0%,rgba(154,70,255,0.10),transparent_60%),radial-gradient(900px_320px_at_90%_110%,rgba(66,139,255,0.08),transparent_55%)]",
            )}
          >
            {/* Header */}
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-base font-semibold tracking-[0.18em] text-neutral-300">
                  ORGANIZATIONS
                </div>
                <div className="mt-1 text-neutral-400">
                  Manage your organizations and members
                </div>
              </div>

              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
                <div
                  className={clsx(
                    "relative w-full sm:w-[420px]",
                    "rounded-lg border border-white/10 bg-white/5 h-10",
                  )}
                >
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-300" />
                  <input
                    value={orgsQuery}
                    onChange={(e) => setOrgsQuery(e.target.value)}
                    placeholder="Search here"
                    className={clsx(
                      "h-10 w-full rounded-lg bg-transparent",
                      "pl-10 pr-4 text-[12px] text-neutral-100",
                      "placeholder:text-neutral-500",
                      "outline-none border-none focus:ring-1 focus:ring-primary-500",
                    )}
                  />
                </div>

                {/* Top-right controls swap (client request) */}
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-neutral-200">
                    <Users className="h-4 w-4 text-neutral-400" />
                    <span className="font-semibold text-neutral-0">
                      {formatMembers(totalMembers)}
                    </span>
                    <span className="text-neutral-400">Total members</span>
                  </span>

                  <Button
                    onClick={() => router.push("/dashboard/organizations/new")}
                    type="button"
                    variant="primary"
                    icon={<Plus className="h-4 w-4" />}
                    animation
                  >
                    New organization
                  </Button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="mt-4">
              {orgsLoading ? (
                <div className="flex flex-wrap gap-4">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <Skeleton
                      key={`org-skel-${i}`}
                      className="h-[224px] w-full sm:w-[264px] rounded-[12px]"
                    />
                  ))}
                </div>
              ) : orgsSlice.length ? (
                <div className="flex flex-wrap gap-4">
                  {orgsSlice.map((o) => {
                    const site = domainFromUrl(o.website);
                    const desc =
                      o.description?.trim() || (site ? site : "Public profile");

                    return (
                      <ConnectionProfileCard
                        key={o._id}
                        href={`/dashboard/organizations/${o._id}`}
                        kind="organization"
                        title={o.name}
                        description={desc}
                        bannerUrl={o.banner}
                        iconUrl={o.logo}
                        totalMembers={o.totalMembers}
                        joinDateLabel={joinLabel(o.createdAt)}
                        tilt
                        tiltMaxDeg={4}
                        tiltPerspective={900}
                        tiltLiftPx={2}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="w-full rounded-2xl border border-dashed border-white/15 bg-transparent p-10 text-center">
                  <p className="text-sm font-medium text-neutral-0">
                    No organizations yet.
                  </p>
                  <p className="mt-2 text-[12px] text-neutral-400">
                    Create one to start hosting events and inviting members.
                  </p>
                </div>
              )}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-[12px] text-neutral-300">
                  {orgsShowingLabel}
                </div>
                <Pagination
                  page={orgsPageSafe}
                  totalPages={orgsTotalPages}
                  onPage={setOrgsPage}
                />
              </div>
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}
