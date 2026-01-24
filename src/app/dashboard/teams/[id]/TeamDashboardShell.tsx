// src/app/dashboard/teams/[id]/TeamDashboardShell.tsx
"use client";

import {
  useMemo,
  useEffect,
  useState,
  type ComponentType,
  type SVGProps,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard,
  UsersRound,
  PencilLine,
  Settings,
} from "lucide-react";

type TeamShellProps = {
  children: React.ReactNode;
  team: {
    _id: string;
    name: string;
    description?: string;
    banner?: string;
    logo?: string;
    location?: string;
    accentColor?: string;
  };
  stats: {
    totalMembers: number;
    activeMembers: number;
    pendingInvites: number;
  };
};

type TeamTabId = "summary" | "members" | "edit" | "settings";
type TeamTabIcon = ComponentType<SVGProps<SVGSVGElement>>;

type TeamTab = {
  id: TeamTabId;
  label: string;
  Icon: TeamTabIcon;
  href: (basePath: string) => string;
  matchSegments: string[];
};

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export default function TeamDashboardShell({
  children,
  team,
  stats,
}: TeamShellProps) {
  const pathname = usePathname();
  const { id } = useParams() as { id?: string };

  const basePath = id ? `/dashboard/teams/${id}` : "";

  const TEAM_TABS: TeamTab[] = useMemo(
    () => [
      {
        id: "summary",
        label: "Summary",
        Icon: LayoutDashboard,
        href: (b) => `${b}/summary`,
        matchSegments: ["summary"],
      },
      {
        id: "members",
        label: "Members",
        Icon: UsersRound,
        href: (b) => `${b}/members`,
        matchSegments: ["members"],
      },
      {
        id: "edit",
        label: "Edit",
        Icon: PencilLine,
        href: (b) => `${b}/edit`,
        matchSegments: ["edit"],
      },
      {
        id: "settings",
        label: "Settings",
        Icon: Settings,
        href: (b) => `${b}/settings`,
        matchSegments: ["settings"],
      },
    ],
    [],
  );

  const activeTab: TeamTabId = useMemo(() => {
    if (!basePath) return "summary";

    if (pathname === basePath || pathname === `${basePath}/`) return "summary";
    if (!pathname.startsWith(basePath)) return "summary";

    const rest = pathname.slice(basePath.length);
    const segment = rest.split("/").filter(Boolean)[0] || "";

    const hit = TEAM_TABS.find((t) => t.matchSegments.includes(segment));
    return hit?.id ?? "summary";
  }, [TEAM_TABS, basePath, pathname]);

  const bannerUrl = team.banner?.trim() || "";
  const logoUrl = team.logo?.trim() || "";

  const accent = useMemo(() => {
    const v = (team.accentColor ?? "").trim();
    if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(v)) return v;
    return "#9A46FF";
  }, [team.accentColor]);

  const showTeamHero = true;

  const [isScrolled, setIsScrolled] = useState(false);
  useEffect(() => {
    if (!showTeamHero) return;

    const threshold = 8;
    let raf: number | null = null;

    const onScroll = () => {
      if (raf != null) return;
      raf = window.requestAnimationFrame(() => {
        setIsScrolled((window.scrollY || 0) > threshold);
        raf = null;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf != null) window.cancelAnimationFrame(raf);
    };
  }, [showTeamHero]);

  return (
    <main className="relative min-h-screen bg-neutral-950 text-neutral-0">
      {showTeamHero ? (
        <section className="pb-8">
          {/* Banner */}
          <div className="px-4 pt-4">
            <div className="relative">
              <div
                className={clsx(
                  "relative overflow-hidden rounded-card border border-white/5 shadow-xl shadow-black/45",
                  "h-[200px] sm:h-[240px] lg:h-[260px]",
                  isScrolled && "will-change-transform",
                )}
                style={{
                  background: bannerUrl
                    ? undefined
                    : `radial-gradient(900px 320px at 16% 20%, ${accent}22, transparent 62%),
                       radial-gradient(780px 320px at 86% 0%, rgba(255,255,255,0.06), transparent 60%),
                       linear-gradient(180deg, rgba(18,18,32,0.8), rgba(8,8,15,0.95))`,
                }}
              >
                {bannerUrl ? (
                  <>
                    <Image
                      src={bannerUrl}
                      alt={`${team.name} banner`}
                      fill
                      sizes="(max-width: 1024px) 100vw, 1100px"
                      className="object-cover"
                      priority
                    />
                    <div
                      aria-hidden="true"
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.62) 72%, rgba(8,8,15,0.96) 100%)",
                      }}
                    />
                    <div
                      aria-hidden="true"
                      className="absolute -left-24 -top-20 h-[320px] w-[520px] blur-2xl"
                      style={{
                        background: `radial-gradient(circle at 30% 30%, ${accent}2a, transparent 62%)`,
                      }}
                    />
                  </>
                ) : (
                  <div
                    aria-hidden="true"
                    className="absolute -left-24 -top-20 h-[320px] w-[520px] blur-2xl"
                    style={{
                      background: `radial-gradient(circle at 30% 30%, ${accent}2a, transparent 62%)`,
                    }}
                  />
                )}
              </div>

              {/* Logo */}
              <div className="absolute left-1/2 bottom-0 z-10 translate-x-[-50%] translate-y-[52%]">
                <div className="relative h-[84px] w-[84px] rounded-full bg-neutral-950 ring-1 ring-white/10 shadow-2xl shadow-black/60">
                  <div className="absolute inset-[6px] overflow-hidden rounded-full bg-neutral-900 ring-1 ring-white/10">
                    {logoUrl ? (
                      <Image
                        src={logoUrl}
                        alt={`${team.name} logo`}
                        fill
                        sizes="84px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[18px] font-semibold text-neutral-100">
                        {initials(team.name)}
                      </div>
                    )}
                  </div>

                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -inset-[1px] rounded-full"
                    style={{
                      background: `linear-gradient(180deg, ${accent}55, rgba(255,255,255,0.10))`,
                      maskImage:
                        "radial-gradient(circle at 50% 50%, transparent 66%, #000 68%)",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Name + chips */}
          <div className="px-4 pt-14 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-0 sm:text-3xl">
              {team.name}
            </h1>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <span className="tikd-chip">
                <span className="text-neutral-300">{stats.totalMembers}</span>
                <span className="text-neutral-500">total members</span>
              </span>
              <span className="tikd-chip tikd-chip-primary">
                <span className="text-neutral-0">{stats.activeMembers}</span>
                <span className="text-neutral-100/90">active</span>
              </span>
              <span className="tikd-chip tikd-chip-muted">
                <span className="text-neutral-0">{stats.pendingInvites}</span>
                <span className="text-neutral-200/80">invited</span>
              </span>
            </div>

            {team.description ? (
              <p className="mx-auto mt-3 max-w-2xl text-sm text-neutral-200">
                {team.description}
              </p>
            ) : null}
          </div>

          {/* Tabs */}
          <div className="mt-5 px-4">
            <div className="no-scrollbar overflow-x-auto overflow-y-visible">
              <div className="flex w-full justify-center">
                <nav
                  aria-label="Team dashboard tabs"
                  role="tablist"
                  className="tikd-tabs-shell relative inline-flex min-w-max items-center gap-3 px-2 py-2"
                >
                  {TEAM_TABS.map((tab) => {
                    const href = basePath ? tab.href(basePath) : "#";
                    const isActive = activeTab === tab.id;
                    const Icon = tab.Icon;

                    return (
                      <Link
                        key={tab.id}
                        href={href}
                        prefetch
                        scroll={false}
                        role="tab"
                        aria-selected={isActive}
                        aria-current={isActive ? "page" : undefined}
                        title={!isActive ? tab.label : undefined}
                        className={clsx(
                          "relative z-10 min-h-[44px] px-3.5 py-2 outline-none focus-visible:ring-2 focus-visible:ring-primary-500/35 focus-visible:ring-offset-0",
                          isActive ? "tikd-tab-active" : "tikd-tab-icon",
                        )}
                      >
                        <Icon className={clsx("shrink-0", "h-5.5 w-5.5")} />
                        {isActive ? (
                          <span className="whitespace-nowrap text-[15px] font-semibold tracking-[-0.2px]">
                            {tab.label}
                          </span>
                        ) : (
                          <span className="sr-only">{tab.label}</span>
                        )}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Content */}
      <section className={clsx(!showTeamHero && "pt-4")}>{children}</section>
    </main>
  );
}
