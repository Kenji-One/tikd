/* ------------------------------------------------------------------ */
/*  src/app/dashboard/teams/TeamsClient.tsx                           */
/* ------------------------------------------------------------------ */
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import clsx from "clsx";
import { Plus, Users, Search, RefreshCw, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/Button";
import GridListToggle, {
  type GridListValue,
} from "@/components/ui/GridListToggle";
import ConnectionProfileCard, {
  type ConnectionProfileKind,
  type RoleBadgeMeta,
  RoleBadge,
} from "@/components/connections/ConnectionProfileCard";

/* ------------------------------ Types ------------------------------ */
type CardRow = {
  id: string;
  kind: ConnectionProfileKind;
  href: string;
  title: string;
  description: string;
  bannerUrl?: string;
  iconUrl?: string;
  totalMembers?: number;
  joinDateLabel?: string;

  /** ✅ org-like role meta support */
  userRoleMeta?: RoleBadgeMeta | null;
  roleLabel?: string;

  /** ✅ org/team accent color */
  accentColor?: string;
};

type TeamApi = {
  _id: string;
  name: string;
  description?: string;
  banner?: string;
  logo?: string;
  website?: string;
  location: string;
  accentColor?: string;
  totalMembers?: number;
  createdAt?: string;
  updatedAt?: string;

  /** ✅ backend can return any of these */
  myRole?: string;
  role?: string;
  userRole?: string;

  /** ✅ optional (preferred) like orgs */
  myRoleId?: string | null;
  myRoleMeta?: RoleBadgeMeta | null;
};

type TeamRowStyle = CSSProperties & {
  ["--team-accent"]?: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function initialsFromName(name: string) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return "TM";

  const a = parts[0]?.[0] ?? "";
  const b = (parts.length > 1 ? parts[1]?.[0] : parts[0]?.[1]) ?? "";
  const two = `${a}${b}`.toUpperCase();
  return two || "TM";
}

function formatJoinDateLabel(createdAt?: string) {
  if (!createdAt) return undefined;
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return undefined;

  try {
    const label = new Intl.DateTimeFormat(undefined, {
      month: "short",
      year: "numeric",
    }).format(d);
    return `Created ${label}`;
  } catch {
    return undefined;
  }
}

function clampText(input: string, maxChars: number) {
  const clean = String(input || "")
    .replace(/\s+/g, " ")
    .trim();
  if (clean.length <= maxChars) return clean;
  return `${clean.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

function formatMembers(n?: number) {
  if (!n || n <= 0) return "0";
  try {
    return new Intl.NumberFormat(undefined).format(n);
  } catch {
    return String(n);
  }
}

function roleLabelFromTeam(t: TeamApi): string {
  const raw = String(t.myRole || t.userRole || t.role || "member")
    .trim()
    .toLowerCase();

  if (!raw) return "Member";
  if (raw === "owner") return "Owner";

  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/** ✅ Same fallback behavior as orgs page */
function roleMetaFromTeam(t: TeamApi): RoleBadgeMeta {
  if (t.myRoleMeta?.name) return t.myRoleMeta;

  const raw = String(t.myRole || t.userRole || t.role || "member")
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

function resolveTeamAccentColor(t: TeamApi) {
  const v = String(t.accentColor || "").trim();
  return v || "var(--color-primary-500)";
}

async function fetchMyTeams(): Promise<TeamApi[]> {
  const res = await fetch("/api/teams", {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const j: unknown = await res.json().catch(() => null);
    const msg =
      (typeof j === "object" &&
        j !== null &&
        ("error" in j || "message" in j) &&
        (String((j as { error?: unknown }).error || "") ||
          String((j as { message?: unknown }).message || ""))) ||
      `Failed to load teams (${res.status})`;
    throw new Error(msg);
  }

  return res.json() as Promise<TeamApi[]>;
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
function TeamListRow({ item }: { item: CardRow }) {
  const badge = initialsFromName(item.title);
  const accent =
    String(item.accentColor || "").trim() || "var(--color-primary-500)";

  const roleMeta: RoleBadgeMeta = item.userRoleMeta?.name
    ? item.userRoleMeta
    : {
        key: String(item.roleLabel || "member").toLowerCase(),
        name: String(item.roleLabel || "Member"),
        color: "",
        iconKey: "users",
        iconUrl: null,
      };

  const styleVars: TeamRowStyle = { ["--team-accent"]: accent };

  return (
    <Link
      href={item.href}
      style={styleVars}
      className={clsx(
        "group relative flex w-full items-center justify-between gap-4",
        "rounded-[12px] border border-white/10 bg-white/5 px-4 py-3",
        "transition-colors",
        "hover:bg-white/7 hover:border-[color:var(--team-accent)]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--team-accent)]/60",
      )}
    >
      {/* Left (title + description) */}
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-[10px] bg-white/5 ring-1 ring-white/10">
          {item.iconUrl ? (
            <Image
              src={item.iconUrl}
              alt={item.title}
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
            {item.title}
          </div>
          <div className="mt-0.5 truncate text-[12px] text-neutral-400">
            {item.description}
          </div>
        </div>
      </div>

      {/* ✅ True-centered meta (matches Organizations list row) */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:flex items-center gap-6">
        <RoleBadge meta={roleMeta} />

        <div className="inline-flex items-center gap-2 text-[12px] text-neutral-200">
          <span
            className={clsx(
              "inline-flex h-7 w-7 items-center justify-center rounded-lg",
              "ring-1 ring-inset",
            )}
            style={{
              background:
                accent && String(accent).startsWith("#")
                  ? `${accent}22`
                  : "rgba(154,70,255,0.15)",
              color:
                accent && String(accent).startsWith("#")
                  ? `${accent}`
                  : "rgba(189,153,255,0.95)",
              borderColor:
                accent && String(accent).startsWith("#")
                  ? `${accent}33`
                  : "rgba(154,70,255,0.22)",
            }}
          >
            <Users className="h-4 w-4" />
          </span>

          <span className="font-semibold text-neutral-100">
            {formatMembers(item.totalMembers)}
          </span>
          <span className="text-neutral-400">Total Members</span>
        </div>
      </div>

      {/* Right (chevron) */}
      <div className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-neutral-200 group-hover:bg-white/10">
        <ChevronRight className="h-4 w-4" />
      </div>
    </Link>
  );
}

export default function TeamsClient() {
  const router = useRouter();

  const [teamsQuery, setTeamsQuery] = useState("");
  const [teamsPage, setTeamsPage] = useState(1);

  const [teamsView, setTeamsView] = useState<GridListValue>("grid");

  const {
    data: teams,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["teams"],
    queryFn: fetchMyTeams,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const rows: CardRow[] = useMemo(() => {
    const list = teams ?? [];
    return list.map((t) => ({
      id: t._id,
      kind: "team",
      href: `/dashboard/teams/${t._id}`,
      title: t.name,
      description: clampText(t.description?.trim() || "Internal team", 32),
      bannerUrl: t.banner || undefined,
      iconUrl: t.logo || undefined,
      totalMembers: typeof t.totalMembers === "number" ? t.totalMembers : 0,
      joinDateLabel: formatJoinDateLabel(t.createdAt),

      roleLabel: roleLabelFromTeam(t),
      userRoleMeta: roleMetaFromTeam(t),
      accentColor: resolveTeamAccentColor(t),
    }));
  }, [teams]);

  const teamsPageSize = 10;

  const teamsFiltered = useMemo(() => {
    const q = teamsQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((t) => {
      const hay = `${t.title} ${t.description}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, teamsQuery]);

  const teamsTotal = teamsFiltered.length;
  const teamsTotalPages = Math.max(1, Math.ceil(teamsTotal / teamsPageSize));

  useEffect(() => setTeamsPage(1), [teamsQuery]);
  useEffect(() => {
    setTeamsPage((p) => clamp(p, 1, teamsTotalPages));
  }, [teamsTotalPages]);

  const teamsPageSafe = clamp(teamsPage, 1, teamsTotalPages);

  const teamsSlice = useMemo(() => {
    const start = (teamsPageSafe - 1) * teamsPageSize;
    return teamsFiltered.slice(start, start + teamsPageSize);
  }, [teamsFiltered, teamsPageSafe]);

  const teamsShowingLabel = useMemo(() => {
    if (!teamsTotal) return "Showing 0-0 from 0 data";
    const start = (teamsPageSafe - 1) * teamsPageSize + 1;
    const end = Math.min(teamsTotal, start + teamsPageSize - 1);
    return `Showing ${start}-${end} from ${teamsTotal} data`;
  }, [teamsTotal, teamsPageSafe]);

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
            {/* Teams Header (same pattern as Organizations) */}
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-base font-semibold tracking-[0.18em] text-neutral-300">
                  TEAMS
                </div>
                <div className="mt-1 text-neutral-400">
                  Manage your teams and members
                </div>
              </div>

              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
                <div
                  className={clsx(
                    "relative w-full sm:w-[420px]",
                    "rounded-lg border border-white/10 h-10",
                    "bg-[#12141f]",
                    "shadow-[0_12px_34px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)]",
                    "hover:bg-white/5 hover:border-white/14",
                    "focus-within:border-primary-500/70 focus-within:ring-2 focus-within:ring-primary-500/20 focus:border-primary-500/70",
                  )}
                >
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-300" />
                  <input
                    value={teamsQuery}
                    onChange={(e) => setTeamsQuery(e.target.value)}
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
                  <GridListToggle
                    value={teamsView}
                    onChange={setTeamsView}
                    ariaLabel="Teams view toggle"
                  />

                  <Button
                    onClick={() => router.push("/dashboard/teams/new")}
                    type="button"
                    variant="primary"
                    icon={<Plus className="h-4 w-4" />}
                    animation
                  >
                    New team
                  </Button>
                </div>
              </div>
            </div>

            {/* Teams Content */}
            <div className="mt-4">
              {isLoading ? (
                <div className="w-full rounded-2xl border border-dashed border-white/15 bg-transparent p-10 text-center">
                  <p className="text-sm font-medium text-neutral-0">
                    Loading teams…
                  </p>
                  <p className="mt-2 text-[12px] text-neutral-400">
                    Fetching your teams from the backend.
                  </p>
                </div>
              ) : isError ? (
                <div className="w-full rounded-2xl border border-dashed border-white/15 bg-transparent p-10 text-center">
                  <p className="text-sm font-medium text-neutral-0">
                    Couldn’t load teams.
                  </p>
                  <p className="mt-2 text-[12px] text-neutral-400">
                    {(error as Error)?.message || "Something went wrong."}
                  </p>
                  <div className="mt-4 flex justify-center">
                    <Button
                      type="button"
                      variant="secondary"
                      icon={<RefreshCw className="h-4 w-4" />}
                      onClick={() => refetch()}
                    >
                      Retry
                    </Button>
                  </div>
                </div>
              ) : teamsSlice.length ? (
                teamsView === "grid" ? (
                  <div
                    className={clsx(
                      teamsSlice.length > 4 ? "grid" : "flex flex-wrap",
                      "gap-4",
                      "grid-cols-[repeat(auto-fit,minmax(240px,1fr))]",
                    )}
                  >
                    {teamsSlice.map((item) => (
                      <ConnectionProfileCard
                        key={item.id}
                        href={item.href}
                        kind={item.kind}
                        title={item.title}
                        description={item.description}
                        bannerUrl={item.bannerUrl}
                        iconUrl={item.iconUrl}
                        totalMembers={item.totalMembers}
                        joinDateLabel={item.joinDateLabel}
                        userRoleMeta={item.userRoleMeta ?? undefined}
                        userRoleLabel={item.roleLabel}
                        accentColor={item.accentColor}
                        tilt
                        tiltMaxDeg={3.5}
                        tiltPerspective={1600}
                        tiltLiftPx={2}
                        cardWidth={
                          teamsSlice.length > 4 ? "compact" : "default"
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {teamsSlice.map((item) => (
                      <TeamListRow key={item.id} item={item} />
                    ))}
                  </div>
                )
              ) : (
                <div className="w-full rounded-2xl border border-dashed border-white/15 bg-transparent p-10 text-center">
                  <p className="text-sm font-medium text-neutral-0">
                    No teams yet.
                  </p>
                  <p className="mt-2 text-[12px] text-neutral-400">
                    Create one to start collaborating and inviting members.
                  </p>
                </div>
              )}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-[12px] text-neutral-300">
                  {teamsShowingLabel}
                </div>

                <div className="flex items-center gap-3">
                  {isFetching ? (
                    <span className="text-[12px] text-neutral-400">
                      Updating…
                    </span>
                  ) : null}
                  <Pagination
                    page={teamsPageSafe}
                    totalPages={teamsTotalPages}
                    onPage={setTeamsPage}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}
