/* ------------------------------------------------------------------ */
/*  src/app/dashboard/teams/TeamsClient.tsx                           */
/* ------------------------------------------------------------------ */
"use client";

import { useMemo, useRef } from "react";
import clsx from "clsx";
import { Plus, Users } from "lucide-react";
import { useRouter } from "next/navigation";

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

function formatMembers(n?: number) {
  if (!n || n <= 0) return "—";
  try {
    return new Intl.NumberFormat(undefined).format(n);
  } catch {
    return String(n);
  }
}

/* -------------------------- Demo Teams ----------------------------- */
const DEMO_TEAMS: CardRow[] = [
  {
    id: "team-1",
    kind: "team",
    href: "/dashboard/teams/marketing",
    title: "Marketing",
    description: "Internal team",
    totalMembers: 0,
    joinDateLabel: "Joined Sep 2025",
  },
  {
    id: "team-2",
    kind: "team",
    href: "/dashboard/teams/operations",
    title: "Operations",
    description: "Internal team",
    totalMembers: 0,
    joinDateLabel: "Joined Aug 2025",
  },
  {
    id: "team-3",
    kind: "team",
    href: "/dashboard/teams/support",
    title: "Support",
    description: "Internal team",
    totalMembers: 0,
    joinDateLabel: "Joined Nov 2025",
  },
  {
    id: "team-4",
    kind: "team",
    href: "/dashboard/teams/security",
    title: "Security",
    description: "Internal team",
    totalMembers: 0,
    joinDateLabel: "Joined Oct 2025",
  },
];

export default function TeamsClient() {
  const router = useRouter();
  const railRef = useRef<HTMLDivElement | null>(null);

  const rows = useMemo(() => DEMO_TEAMS, []);
  const totalMembers = useMemo(() => {
    const sum = rows.reduce((acc, r) => acc + (r.totalMembers ?? 0), 0);
    return sum > 0 ? sum : undefined;
  }, [rows]);

  return (
    <div className="relative overflow-hidden bg-neutral-950 text-neutral-0">
      {/* Header OUTSIDE the card (title/subtitle + members/button) */}
      <section className="pt-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-base font-semibold tracking-[0.18em] text-neutral-300">
              TEAMS
            </div>
            <div className="mt-1 text-neutral-400">
              Track performance, manage drafts, and jump into event setup.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
            >
              New team
            </Button>
          </div>
        </div>
      </section>

      {/* Card ONLY wraps the rail area */}
      <section className="pb-16">
        <section
          className={clsx(
            "rounded-2xl border border-white/10",
            "bg-neutral-950/70 shadow-[0_18px_60px_rgba(0,0,0,0.55)]"
          )}
        >
          <div
            className={clsx(
              "relative p-4 md:p-5",
              "bg-[radial-gradient(900px_320px_at_25%_0%,rgba(154,70,255,0.10),transparent_60%),radial-gradient(900px_320px_at_90%_110%,rgba(66,139,255,0.08),transparent_55%)]"
            )}
          >
            {/* Rail container (no arrows) */}
            <div className={clsx("relative  ")}>
              <div className="relative">
                <div
                  ref={railRef}
                  className={clsx(
                    "no-scrollbar overflow-x-auto overflow-y-hidden",
                    "scroll-smooth"
                  )}
                >
                  {/* IMPORTANT: transparent rail (no bg on items/grid wrapper) */}
                  <div className="flex w-max items-stretch gap-4 pr-4 bg-transparent">
                    {rows.length ? (
                      rows.map((item) => (
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
                      ))
                    ) : (
                      <div className="w-full min-w-[520px] rounded-2xl border border-dashed border-white/15 bg-transparent p-10 text-center">
                        <p className="text-sm font-medium text-neutral-0">
                          No teams yet.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}
