/* ------------------------------------------------------------------ */
/*  src/app/dashboard/organizations/OrganizationsClient.tsx           */
/* ------------------------------------------------------------------ */
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Search, Plus, Users, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import ConnectionProfileCard from "@/components/connections/ConnectionProfileCard";
import GridListToggle, {
  type GridListValue,
} from "@/components/ui/GridListToggle";

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

function joinLabel(iso?: string) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const m = d.toLocaleString(undefined, { month: "short" });
    return `Created ${m} ${d.getFullYear()}`;
  } catch {
    return "—";
  }
}

function clampText(input: string, maxChars: number) {
  const clean = String(input || "")
    .replace(/\s+/g, " ")
    .trim();
  if (clean.length <= maxChars) return clean;
  return `${clean.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

function initialsFromName(name: string) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return "OR";

  const a = parts[0]?.[0] ?? "";
  const b = (parts.length > 1 ? parts[1]?.[0] : parts[0]?.[1]) ?? "";
  const two = `${a}${b}`.toUpperCase();
  return two || "OR";
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

/* ------------------------ Row card (List) ------------------------- */
function OrganizationListRow({
  org,
  description,
}: {
  org: Org;
  description: string;
}) {
  const badge = initialsFromName(org.name);

  return (
    <Link
      href={`/dashboard/organizations/${org._id}`}
      className={clsx(
        "group relative flex w-full items-center justify-between gap-4",
        "rounded-[12px] border border-white/10 bg-white/5 px-4 py-3",
        "hover:border-primary-500 hover:bg-white/7 transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
      )}
    >
      {/* Left (title + description) */}
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-[10px] bg-white/5 ring-1 ring-white/10">
          {org.logo ? (
            <Image
              src={org.logo}
              alt={org.name}
              width={40}
              height={40}
              className="h-10 w-10 object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[12px] font-extrabold text-neutral-200">
              {badge}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-neutral-50">
            {org.name}
          </div>
          <div className="mt-0.5 truncate text-[12px] text-neutral-400">
            {description}
          </div>
        </div>
      </div>

      {/* ✅ True-centered meta (center of the whole row) */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:flex items-center gap-6">
        <div className="inline-flex items-center gap-2 text-[12px] text-neutral-200">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary-500/15 text-primary-300 ring-1 ring-primary-500/20">
            <Users className="h-4 w-4" />
          </span>
          <span className="font-semibold text-neutral-100">
            {typeof org.totalMembers === "number" ? org.totalMembers : 0}
          </span>
          <span className="text-neutral-400">members</span>
        </div>

        <div className="text-[12px] text-neutral-400">
          {joinLabel(org.createdAt)}
        </div>
      </div>

      {/* Right (chevron) */}
      <div className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-neutral-200 group-hover:bg-white/10">
        <ChevronRight className="h-4 w-4" />
      </div>
    </Link>
  );
}

/* ------------------------------ Page ------------------------------- */
export default function OrganizationsClient() {
  const router = useRouter();
  const { data: session } = useSession();

  const [orgsQuery, setOrgsQuery] = useState("");
  const [orgsPage, setOrgsPage] = useState(1);

  // ✅ view toggle state
  const [view, setView] = useState<GridListValue>("grid");

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

                <div className="flex items-center gap-2">
                  <GridListToggle value={view} onChange={setView} />

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
                view === "grid" ? (
                  <div
                    className={clsx(
                      "grid gap-4",
                      // ✅ Compact 240px cards, but let grid distribute leftover nicely (no ghost columns)
                      "grid-cols-[repeat(auto-fit,minmax(240px,1fr))]",
                    )}
                  >
                    {Array.from({ length: 10 }).map((_, i) => (
                      <Skeleton
                        key={`org-skel-${i}`}
                        className="h-[224px] w-full rounded-[12px]"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <Skeleton
                        key={`org-row-skel-${i}`}
                        className="h-[56px] w-full rounded-[12px]"
                      />
                    ))}
                  </div>
                )
              ) : orgsSlice.length ? (
                view === "grid" ? (
                  <div
                    className={clsx(
                      orgsSlice.length > 4 ? "grid" : "flex flex-wrap",
                      "gap-4",
                      "grid-cols-[repeat(auto-fit,minmax(240px,1fr))]",
                    )}
                  >
                    {orgsSlice.map((o) => {
                      const site = domainFromUrl(o.website);
                      const desc = clampText(
                        o.description?.trim() ||
                          (site ? site : "Public profile"),
                        52,
                      );

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
                          tiltMaxDeg={3.5}
                          tiltPerspective={1600}
                          tiltLiftPx={2}
                          cardWidth={
                            orgsSlice.length > 4 ? "compact" : "default"
                          }
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orgsSlice.map((o) => {
                      const site = domainFromUrl(o.website);
                      const desc = clampText(
                        o.description?.trim() ||
                          (site ? site : "Public profile"),
                        52,
                      );

                      return (
                        <OrganizationListRow
                          key={o._id}
                          org={o}
                          description={desc}
                        />
                      );
                    })}
                  </div>
                )
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
