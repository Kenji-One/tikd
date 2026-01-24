/* ------------------------------------------------------------------ */
/*  src/app/dashboard/teams/TeamsClient.tsx                           */
/* ------------------------------------------------------------------ */
"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Plus, Users, Search, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/Button";
import ConnectionProfileCard, {
  type ConnectionProfileKind,
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
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function formatMembers(n?: number) {
  if (!n || n <= 0) return "—";
  try {
    return new Intl.NumberFormat(undefined).format(n);
  } catch {
    return String(n);
  }
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
    return `Joined ${label}`;
  } catch {
    return undefined;
  }
}

async function fetchMyTeams(): Promise<TeamApi[]> {
  const res = await fetch("/api/teams", {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const j = await res.json().catch(() => null);
    const msg =
      (j && (j.error || j.message)) || `Failed to load teams (${res.status})`;
    throw new Error(msg);
  }

  return res.json();
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

export default function TeamsClient() {
  const router = useRouter();

  const [teamsQuery, setTeamsQuery] = useState("");
  const [teamsPage, setTeamsPage] = useState(1);

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
      description: (t.description?.trim() || "Internal team") as string,
      bannerUrl: t.banner || undefined,
      iconUrl: t.logo || undefined,
      totalMembers: typeof t.totalMembers === "number" ? t.totalMembers : 0,
      joinDateLabel: formatJoinDateLabel(t.createdAt),
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

  const totalMembers = useMemo(() => {
    const sum = rows.reduce((acc, r) => acc + (r.totalMembers ?? 0), 0);
    return sum > 0 ? sum : undefined;
  }, [rows]);

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
                    "rounded-lg border border-white/10 bg-white/5 h-10",
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

                {/* Top-right controls swap */}
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-neutral-200">
                    <Users className="h-4 w-4 text-neutral-400" />
                    <span className="font-semibold text-neutral-0">
                      {formatMembers(totalMembers)}
                    </span>
                    <span className="text-neutral-400">Total members</span>
                  </span>

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
                <div className="flex flex-wrap gap-4">
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
                      tilt
                      tiltMaxDeg={4}
                      tiltPerspective={900}
                      tiltLiftPx={2}
                    />
                  ))}
                </div>
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
