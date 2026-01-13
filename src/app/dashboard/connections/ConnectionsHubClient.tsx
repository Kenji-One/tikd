/* ------------------------------------------------------------------ */
/*  src/app/dashboard/connections/ConnectionsHubClient.tsx            */
/* ------------------------------------------------------------------ */
"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";

import { Skeleton } from "@/components/ui/Skeleton";
import ConnectionProfileCard, {
  type ConnectionProfileKind,
} from "@/components/connections/ConnectionProfileCard";

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

type TabKey = "all" | "establishments" | "organizations" | "teams" | "friends";

type TabItem =
  | { key: TabKey; label: string; kind?: "tab" }
  | { key: "divider"; label?: string; kind: "divider" };

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

/* ------------------------------ Tabs ------------------------------- */
const TABS: TabItem[] = [
  { key: "all", label: "All" },
  { key: "establishments", label: "Establishments" },
  { key: "organizations", label: "Organizations" },
  { key: "teams", label: "Teams" },
  { key: "divider", kind: "divider" },
  { key: "friends", label: "Friends" },
];

function titleForTab(t: TabKey) {
  switch (t) {
    case "all":
      return "Connections";
    case "establishments":
      return "Establishments";
    case "organizations":
      return "Organizations";
    case "teams":
      return "Teams";
    case "friends":
      return "Friends";
    default:
      return "Connections";
  }
}

function actionForTab(t: TabKey) {
  switch (t) {
    case "organizations":
      return {
        createHref: "/dashboard/organizations/new",
        createLabel: "New organization",
        countLabel: "Total members",
      };
    case "establishments":
      return {
        createHref: "/dashboard/establishments/new",
        createLabel: "New establishment",
        countLabel: "Total members",
      };
    case "teams":
      return {
        createHref: "/dashboard/teams/new",
        createLabel: "New team",
        countLabel: "Total members",
      };
    case "friends":
      return {
        createHref: "/dashboard/connections/friends",
        createLabel: "Add friend",
        countLabel: "Total friends",
      };
    case "all":
    default:
      return {
        createHref: "/dashboard/organizations/new",
        createLabel: "New organization",
        countLabel: "Total members",
      };
  }
}

export default function ConnectionsHubClient() {
  const router = useRouter();
  const { data: session } = useSession();
  const [active, setActive] = useState<TabKey>("organizations");

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const [underline, setUnderline] = useState<{
    x: number;
    w: number;
    o: number;
  }>({ x: 0, w: 0, o: 0 });

  /* ------------------------ Data (real + demo) ----------------------- */
  const { data: orgs, isLoading: orgsLoading } = useQuery<Org[]>({
    queryKey: ["orgs", "connections-hub"],
    queryFn: () => fetchJSON<Org[]>("/api/organizations"),
    enabled: !!session,
  });

  const orgRows: CardRow[] = useMemo(() => {
    const list = orgs ?? [];
    return list.map((org) => {
      const site = domainFromUrl(org.website);
      const description =
        org.description?.trim() || (site ? `${site}` : "Public profile");

      return {
        id: org._id,
        kind: "organization",
        href: `/dashboard/organizations/${org._id}`,
        title: org.name,
        description,
        bannerUrl: org.banner,
        iconUrl: org.logo,
        totalMembers: org.totalMembers,
        joinDateLabel: joinLabel(org.createdAt),
      };
    });
  }, [orgs]);

  // Demo placeholders until endpoints exist for these.
  const demoEstablishments: CardRow[] = useMemo(
    () => [
      {
        id: "est-1",
        kind: "establishment",
        href: "/dashboard/connections",
        title: "Astro Hospitality",
        description: "Public profile",
        totalMembers: 0,
        joinDateLabel: "Joined Nov 2025",
      },
      {
        id: "est-2",
        kind: "establishment",
        href: "/dashboard/connections",
        title: "Old Town Venue",
        description: "Live venue • Rustaveli",
        totalMembers: 0,
        joinDateLabel: "Joined Oct 2025",
      },
    ],
    []
  );

  const demoTeams: CardRow[] = useMemo(
    () => [
      {
        id: "team-1",
        kind: "team",
        href: "/dashboard/connections",
        title: "Marketing",
        description: "Internal team",
        totalMembers: 0,
        joinDateLabel: "Joined Sep 2025",
      },
      {
        id: "team-2",
        kind: "team",
        href: "/dashboard/connections",
        title: "Operations",
        description: "Internal team",
        totalMembers: 0,
        joinDateLabel: "Joined Aug 2025",
      },
    ],
    []
  );

  const rowsForTab = useMemo(() => {
    if (active === "organizations") return orgRows;
    if (active === "establishments") return demoEstablishments;
    if (active === "teams") return demoTeams;
    if (active === "friends") return [];
    return [...demoEstablishments, ...orgRows, ...demoTeams];
  }, [active, orgRows, demoEstablishments, demoTeams]);

  const totalMembersForTab = useMemo(() => {
    if (active === "friends") return undefined;
    const sum = rowsForTab.reduce((acc, r) => acc + (r.totalMembers ?? 0), 0);
    return sum > 0 ? sum : undefined;
  }, [active, rowsForTab]);

  /* --------------------- Underline measurement ---------------------- */
  const measureUnderline = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const btn = tabRefs.current[active];
    if (!btn) {
      setUnderline((u) => ({ ...u, o: 0 }));
      return;
    }

    const btnRect = btn.getBoundingClientRect();
    const scRect = scroller.getBoundingClientRect();

    const x = btnRect.left - scRect.left + scroller.scrollLeft;
    const w = btnRect.width;

    setUnderline({ x, w, o: 1 });
  }, [active]);

  useLayoutEffect(() => {
    measureUnderline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    const onResize = () => measureUnderline();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [measureUnderline]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => measureUnderline());
    };

    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [measureUnderline]);

  const onSelect = (key: TabKey) => {
    setActive(key);

    const scroller = scrollerRef.current;
    const btn = tabRefs.current[key];
    if (!scroller || !btn) return;

    const scRect = scroller.getBoundingClientRect();
    const bRect = btn.getBoundingClientRect();

    const pad = 28;
    const leftOverflow = bRect.left - scRect.left;
    const rightOverflow = bRect.right - scRect.right;

    if (leftOverflow < pad) {
      scroller.scrollBy({ left: leftOverflow - pad, behavior: "smooth" });
    } else if (rightOverflow > -pad) {
      scroller.scrollBy({ left: rightOverflow + pad, behavior: "smooth" });
    }
  };

  const action = actionForTab(active);

  // ✅ Grid that fits your 264px cards perfectly (no giant gaps)
  const gridClass = clsx(
    "grid gap-4",
    "grid-cols-1",
    "sm:[grid-template-columns:repeat(auto-fill,264px)]",
    "sm:justify-start"
  );

  return (
    <div className="relative overflow-hidden bg-neutral-950 text-neutral-0">
      <section className="pb-16">
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
            {/* H1 + Actions */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-[18px] font-semibold tracking-[-0.32px] text-neutral-50">
                  {titleForTab(active)}
                </h1>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-neutral-200">
                  <Users className="h-4 w-4 text-neutral-400" />
                  <span className="font-semibold text-neutral-0">
                    {formatMembers(totalMembersForTab)}
                  </span>
                  <span className="text-neutral-400">{action.countLabel}</span>
                </span>
                <Button
                  onClick={() => router.push(action.createHref)}
                  type="button"
                  variant="primary"
                  icon={<Plus className="h-4 w-4" />}
                >
                  {action.createLabel}
                </Button>
              </div>
            </div>

            {/* Tabs (premium / reference-like) */}
            <div
              className={clsx(
                "relative",
                "rounded-lg",
                "border border-white/10",
                "bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))]",
                "backdrop-blur-md",
                "px-3 sm:px-4"
              )}
            >
              <div
                ref={scrollerRef}
                className={clsx(
                  "relative",
                  "overflow-x-auto overflow-y-hidden whitespace-nowrap",
                  "no-scrollbar"
                )}
              >
                <div
                  role="tablist"
                  aria-label="Connections tabs"
                  className={clsx(
                    "relative inline-flex items-center gap-5 sm:gap-7",
                    "py-2.5"
                  )}
                >
                  {TABS.map((t) => {
                    if (t.kind === "divider") {
                      return (
                        <span
                          key="divider"
                          aria-hidden="true"
                          className="mx-1 h-5 w-px bg-white/10"
                        />
                      );
                    }

                    const isActive = active === t.key;

                    return (
                      <button
                        key={t.key}
                        ref={(el) => {
                          tabRefs.current[t.key] = el;
                        }}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => onSelect(t.key)}
                        className={clsx(
                          "relative",
                          "px-1",
                          "py-2",
                          "text-[13px] sm:text-[14px]",
                          "font-semibold tracking-[-0.28px]",
                          "transition-colors duration-200",
                          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 focus-visible:ring-offset-0",
                          isActive
                            ? "text-neutral-50"
                            : "text-neutral-300 hover:text-neutral-100"
                        )}
                      >
                        <span
                          className={clsx(
                            "relative",
                            isActive &&
                              "drop-shadow-[0_0_16px_rgba(154,70,255,0.20)]"
                          )}
                        >
                          {t.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="pointer-events-none absolute left-0 right-0 bottom-0 h-px bg-white/10" />

                <div
                  aria-hidden="true"
                  className={clsx(
                    "pointer-events-none absolute bottom-0 left-0",
                    "h-[2px] rounded-full",
                    "bg-primary-500/80",
                    "shadow-[0_0_0_1px_rgba(154,70,255,0.18),0_10px_28px_rgba(154,70,255,0.16)]",
                    "transition-[transform,width,opacity] duration-300 ease-out"
                  )}
                  style={{
                    width: underline.w ? `${underline.w}px` : "0px",
                    transform: `translateX(${underline.x}px)`,
                    opacity: underline.o,
                  }}
                />

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-neutral-948/70 to-transparent"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-neutral-948/70 to-transparent"
                />
              </div>
            </div>

            {/* Cards */}
            <div className="mt-4">
              {active === "organizations" && orgsLoading ? (
                <div className={gridClass}>
                  {[...Array(6)].map((_, i) => (
                    <Skeleton
                      key={i}
                      className="h-[205px] w-full sm:w-[264px] rounded-[12px]"
                    />
                  ))}
                </div>
              ) : rowsForTab.length ? (
                <div className={gridClass}>
                  {rowsForTab.map((item) => (
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
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/15 bg-neutral-950/50 p-10 text-center">
                  <p className="text-sm font-medium text-neutral-0">
                    Nothing here yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}
