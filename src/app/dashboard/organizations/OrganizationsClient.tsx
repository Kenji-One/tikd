/* ------------------------------------------------------------------ */
/*  src/app/dashboard/organizations/OrganizationsClient.tsx           */
/* ------------------------------------------------------------------ */
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import clsx from "clsx";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Search, Plus, Users, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import ConnectionProfileCard, {
  type RoleBadgeMeta,
  RoleBadge,
} from "@/components/connections/ConnectionProfileCard";
import GridListToggle, {
  type GridListValue,
} from "@/components/ui/GridListToggle";
import SortControl, {
  type SortDir,
  type SortOption,
} from "@/components/ui/SortControl";

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

  /** ✅ org accent color (hex) */
  accentColor?: string;

  /** ✅ role display from backend */
  myRole?: string;
  myRoleId?: string | null;
  myRoleMeta?: RoleBadgeMeta | null;

  /** ✅ analytics-like fields (optional, for sorting UI parity) */
  pageViews?: number;
  ticketsSold?: number;
  revenue?: number;
};

type OrgRowStyle = CSSProperties & {
  ["--org-accent"]?: string;
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

function formatMembers(n?: number) {
  if (!n || n <= 0) return "0";
  try {
    return new Intl.NumberFormat(undefined).format(n);
  } catch {
    return String(n);
  }
}

function roleMetaFromOrg(org: Org): RoleBadgeMeta {
  if (org.myRoleMeta?.name) return org.myRoleMeta;

  const raw = String(org.myRole || "member")
    .trim()
    .toLowerCase();
  if (raw === "owner") {
    return {
      key: "owner",
      name: "Owner",
      color: "#F7C948",
      iconKey: "owner",
      iconUrl: null,
    };
  }

  return {
    key: raw || "member",
    name: raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "Member",
    color: "",
    iconKey: "users",
    iconUrl: null,
  };
}

function resolveOrgAccentColor(org: Org) {
  const v = String(org.accentColor || "").trim();
  // if empty, use default "what it is now" (primary)
  return v || "var(--color-primary-500)";
}

function safeNumber(v: unknown) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
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
  const roleMeta = roleMetaFromOrg(org);
  const accent = resolveOrgAccentColor(org);

  const styleVars: OrgRowStyle = { ["--org-accent"]: accent };

  const isHexAccent = String(accent || "").startsWith("#");

  // Accent-driven visuals (fallback to your primary-purple vibe)
  const borderIdle = isHexAccent ? `${accent}2B` : "rgba(154,70,255,0.22)";
  const borderHover = isHexAccent ? `${accent}55` : "rgba(154,70,255,0.40)";
  const glow = isHexAccent ? `${accent}55` : "rgba(154,70,255,0.45)";

  const iconBg = isHexAccent ? `${accent}24` : "rgba(154,70,255,0.17)";
  const iconBorder = isHexAccent ? `${accent}52` : "rgba(154,70,255,0.30)";
  const iconColor = isHexAccent ? `${accent}` : "rgba(189,153,255,0.95)";

  return (
    <Link
      href={`/dashboard/organizations/${org._id}`}
      style={styleVars}
      className={clsx(
        "group relative flex w-full items-center justify-between gap-4",
        "rounded-[12px] border border-white/10 bg-white/5 px-4 py-3",
        "transition-colors",
        // ✅ same behavior as before, but driven by org accent
        "hover:bg-white/7 hover:border-[color:var(--org-accent)]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--org-accent)]/60",
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

      <div className="flex items-center gap-6">
        {/* ✅ True-centered meta (center of the whole row) */}
        <div className="pointer-events-none md:flex items-center gap-6">
          {/* ✅ Role pill */}
          <RoleBadge meta={roleMeta} />

          {/* ✅ Total Members (better-looking pill bubble) */}
          <div
            className={clsx(
              "relative inline-flex items-center gap-2.5 overflow-hidden",
              "h-9 rounded-full pl-1 pr-3",
              "border backdrop-blur-xl",
              "shadow-[0_16px_40px_rgba(0,0,0,0.55)]",
              "transition-all duration-200",
              "group-hover:shadow-[0_18px_46px_rgba(0,0,0,0.62)]",
            )}
            style={{
              borderColor: borderIdle,
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))",
            }}
            aria-label={`${formatMembers(org.totalMembers)} Total Members`}
          >
            {/* subtle accent glow blob */}
            <span
              aria-hidden
              className={clsx(
                "pointer-events-none absolute -left-10 -top-10 h-24 w-24 rounded-full blur-2xl",
                "transition-opacity duration-200 opacity-70 group-hover:opacity-100",
              )}
              style={{
                background: `radial-gradient(circle at 30% 30%, ${glow}, transparent 62%)`,
              }}
            />
            {/* top sheen */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-70"
              style={{
                background:
                  "linear-gradient(90deg, rgba(255,255,255,0.10), rgba(255,255,255,0.03) 35%, rgba(255,255,255,0.00) 70%)",
              }}
            />

            {/* icon chip */}
            <span
              className={clsx(
                "relative inline-flex h-7 w-7 items-center justify-center",
                "rounded-full ring-1 ring-inset",
              )}
              style={{
                background: iconBg,
                borderColor: iconBorder,
                color: iconColor,
                boxShadow: `0 0 0 1px ${iconBorder}`,
              }}
            >
              <Users className="h-4 w-4" />
            </span>

            {/* text */}
            <span className="relative inline-flex items-center gap-2">
              <span className="text-[12px] font-extrabold tracking-[-0.01em] text-neutral-50">
                {formatMembers(org.totalMembers)}
              </span>
              <span className="text-[12px] font-medium text-neutral-300">
                Total Members
              </span>
            </span>

            {/* hover border pop */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              style={{
                boxShadow: `inset 0 0 0 1px ${borderHover}`,
              }}
            />
          </div>
        </div>

        {/* Right (chevron) */}
        <div className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-neutral-200 group-hover:bg-white/10">
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}

/* ------------------------------ Page ------------------------------- */
/**
 * ✅ Match the “GOOD” reference list:
 * - Title
 * - Page Views
 * - Tickets Sold
 * - Revenue
 * ❌ NO “Event Date”
 */
type OrgSortField = "title" | "pageViews" | "ticketsSold" | "revenue";

const ORG_SORT_OPTIONS: SortOption<OrgSortField>[] = [
  { key: "title", label: "Title" },
  { key: "pageViews", label: "Page Views" },
  { key: "ticketsSold", label: "Tickets Sold" },
  { key: "revenue", label: "Revenue" },
];

export default function OrganizationsClient() {
  const router = useRouter();
  const { data: session } = useSession();

  const [orgsQuery, setOrgsQuery] = useState("");
  const [orgsPage, setOrgsPage] = useState(1);

  const [view, setView] = useState<GridListValue>("grid");

  // ✅ Organizations-only sort state
  const [sortField, setSortField] = useState<OrgSortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

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

  const orgsSorted = useMemo(() => {
    const base = [...orgsFiltered];
    if (!sortField) return base;

    const dirMul = sortDir === "asc" ? 1 : -1;

    base.sort((a, b) => {
      if (sortField === "title") {
        const av = String(a.name || "").toLowerCase();
        const bv = String(b.name || "").toLowerCase();
        return av.localeCompare(bv) * dirMul;
      }

      if (sortField === "pageViews") {
        return (safeNumber(a.pageViews) - safeNumber(b.pageViews)) * dirMul;
      }

      if (sortField === "ticketsSold") {
        return (safeNumber(a.ticketsSold) - safeNumber(b.ticketsSold)) * dirMul;
      }

      // revenue
      return (safeNumber(a.revenue) - safeNumber(b.revenue)) * dirMul;
    });

    return base;
  }, [orgsFiltered, sortField, sortDir]);

  const orgsTotal = orgsSorted.length;
  const orgsTotalPages = Math.max(1, Math.ceil(orgsTotal / orgsPageSize));

  useEffect(() => {
    setOrgsPage(1);
  }, [orgsQuery, sortField, sortDir]);

  useEffect(() => {
    setOrgsPage((p) => clamp(p, 1, orgsTotalPages));
  }, [orgsTotalPages]);

  const orgsPageSafe = clamp(orgsPage, 1, orgsTotalPages);

  const orgsSlice = useMemo(() => {
    const start = (orgsPageSafe - 1) * orgsPageSize;
    return orgsSorted.slice(start, start + orgsPageSize);
  }, [orgsSorted, orgsPageSafe]);

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
                {/* ✅ Search container color now matches the "Upcoming" pill container */}
                <div
                  className={clsx(
                    "relative w-full sm:w-[420px]",
                    "rounded-lg border border-white/10 h-10",
                    "bg-[#12141f]",
                    "shadow-[0_12px_34px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)]",
                    "hover:bg-white/5 hover:border-white/14",
                    "focus-within:border-primary-500/70 focus-within:ring-2 focus-within:ring-primary-500/20",
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

                  {/* ✅ Sort button goes LEFT of "New organization" */}
                  <SortControl<OrgSortField>
                    options={ORG_SORT_OPTIONS}
                    sortField={sortField}
                    sortDir={sortDir}
                    setSortField={setSortField}
                    setSortDir={setSortDir}
                    defaultDirFor={(f) => (f === "title" ? "asc" : "desc")}
                  />

                  <Button
                    onClick={() => router.push("/dashboard/organizations/new")}
                    type="button"
                    variant="primary"
                    icon={<Plus className="h-4 w-4" />}
                    animation
                  >
                    Create Organization
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

                      const roleMeta = roleMetaFromOrg(o);

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
                          userRoleMeta={roleMeta}
                          accentColor={resolveOrgAccentColor(o)}
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
