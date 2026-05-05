// src/app/dashboard/my-members/components/MemberStatsChart.tsx
"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { BadgeDollarSign, Ticket, Eye, BarChart3 } from "lucide-react";

import type { DetailedMember } from "./DetailedMemberCard";

export type MemberChartTab = "revenue" | "tickets" | "views";

function fmtUSD(n: number) {
  const whole = Math.round(n);
  return `$${whole.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function fmtNumber(n: number) {
  return n.toLocaleString(undefined);
}

function metricLabel(tab: MemberChartTab) {
  if (tab === "revenue") return "Revenue";
  if (tab === "tickets") return "Tickets Sold";
  return "Page Views";
}

function metricValue(member: DetailedMember, tab: MemberChartTab) {
  if (tab === "revenue") return member.revenue;
  if (tab === "tickets") return member.ticketsSold;
  return member.pageViews;
}

function formatMetric(member: DetailedMember, tab: MemberChartTab) {
  const value = metricValue(member, tab);
  return tab === "revenue" ? fmtUSD(value) : fmtNumber(value);
}

function progressWidth(member: DetailedMember, tab: MemberChartTab) {
  const value = metricValue(member, tab);

  if (tab === "revenue") {
    const cap = 25000;
    return Math.max(8, Math.min(100, (value / cap) * 100));
  }

  if (tab === "tickets") {
    const cap = 1000;
    return Math.max(8, Math.min(100, (value / cap) * 100));
  }

  const cap = 10000;
  return Math.max(8, Math.min(100, (value / cap) * 100));
}

function ProgressTone({ tab }: { tab: MemberChartTab }) {
  const tone =
    tab === "revenue"
      ? "from-success-500 via-primary-400 to-primary-300"
      : tab === "tickets"
        ? "from-primary-500 via-primary-400 to-warning-400"
        : "from-white/70 via-primary-300 to-primary-400";

  return (
    <div
      className={clsx("absolute inset-0 rounded-full bg-gradient-to-r", tone)}
    />
  );
}

export default function MemberStatsChart({
  member,
  defaultTab = "revenue",
}: {
  member: DetailedMember;
  defaultTab?: MemberChartTab;
}) {
  const [tab, setTab] = useState<MemberChartTab>(defaultTab);

  const totalLabel = useMemo(() => formatMetric(member, tab), [member, tab]);

  const progress = useMemo(() => progressWidth(member, tab), [member, tab]);

  const snapshotCards = useMemo(
    () => [
      {
        key: "revenue",
        label: "Revenue",
        value: fmtUSD(member.revenue),
        active: tab === "revenue",
        icon: <BadgeDollarSign className="h-4 w-4" />,
      },
      {
        key: "tickets",
        label: "Tickets Sold",
        value: fmtNumber(member.ticketsSold),
        active: tab === "tickets",
        icon: <Ticket className="h-4 w-4" />,
      },
      {
        key: "views",
        label: "Page Views",
        value: fmtNumber(member.pageViews),
        active: tab === "views",
        icon: <Eye className="h-4 w-4" />,
      },
    ],
    [member, tab],
  );

  return (
    <div className="relative overflow-hidden rounded-xl border border-neutral-800/70 bg-neutral-948/70 p-4 sm:p-5">
      <div
        className="pointer-events-none absolute inset-0 opacity-85"
        style={{
          background:
            "radial-gradient(1100px 620px at 0% 0%, rgba(154,70,255,0.22), transparent 58%), radial-gradient(900px 640px at 100% 20%, rgba(154,70,255,0.10), transparent 62%)",
        }}
      />

      <div className="relative">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[12px] font-semibold text-neutral-300">
              Live Metric Snapshot
            </div>

            <div className="mt-1 text-[24px] font-extrabold leading-none tracking-[-0.04em] text-neutral-50 sm:text-[26px]">
              {totalLabel}
            </div>

            <div className="mt-1 text-[12px] leading-[1.2] text-neutral-400">
              {metricLabel(tab)} — {member.name}
            </div>
          </div>

          <div className="grid flex-1 grid-cols-3 gap-2 lg:px-6">
            <TabButton
              label="Revenue"
              icon={<BadgeDollarSign className="h-4 w-4" />}
              active={tab === "revenue"}
              onClick={() => setTab("revenue")}
            />
            <TabButton
              label="Tickets Sold"
              icon={<Ticket className="h-4 w-4" />}
              active={tab === "tickets"}
              onClick={() => setTab("tickets")}
            />
            <TabButton
              label="Page Views"
              icon={<Eye className="h-4 w-4" />}
              active={tab === "views"}
              onClick={() => setTab("views")}
            />
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-neutral-800/60 bg-neutral-950/20 p-4 sm:p-5">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-neutral-300">
            <BarChart3 className="h-4 w-4 text-primary-200" />
            Current total
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="text-[13px] font-semibold text-neutral-200">
                {metricLabel(tab)}
              </div>
              <div className="tabular-nums text-[13px] font-bold text-neutral-50">
                {totalLabel}
              </div>
            </div>

            <div className="relative h-4 overflow-hidden rounded-full border border-white/10 bg-white/[0.05]">
              <div
                className="absolute inset-y-0 left-0 overflow-hidden rounded-full"
                style={{ width: `${progress}%` }}
              >
                <ProgressTone tab={tab} />
              </div>
            </div>

            {/* <p className="mt-3 text-[12px] leading-[1.35] text-neutral-400">
              This panel now shows the live cumulative member metric coming from
              your backend totals, instead of a generated demo timeline.
            </p> */}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {snapshotCards.map((card) => (
              <div
                key={card.key}
                className={clsx(
                  "rounded-xl border px-4 py-3 transition",
                  card.active
                    ? "border-primary-500/30 bg-primary-500/10 shadow-[0_14px_34px_rgba(154,70,255,0.10)]"
                    : "border-white/8 bg-white/[0.03]",
                )}
              >
                <div className="flex items-center gap-2 text-[12px] font-semibold text-neutral-300">
                  <span
                    className={clsx(
                      "inline-flex h-7 w-7 items-center justify-center rounded-full ring-1",
                      card.active
                        ? "bg-primary-500/18 text-primary-100 ring-primary-500/25"
                        : "bg-white/[0.05] text-neutral-200 ring-white/10",
                    )}
                  >
                    {card.icon}
                  </span>
                  <span>{card.label}</span>
                </div>

                <div className="mt-3 tabular-nums text-[18px] font-extrabold tracking-[-0.03em] text-neutral-50">
                  {card.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "group relative flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-[13px] font-semibold tracking-[-0.02em] transition",
        active
          ? clsx(
              "border-primary-500/35 bg-neutral-950/30 text-neutral-0",
              "ring-1 ring-primary-500/18",
              "shadow-[0_14px_34px_rgba(154,70,255,0.12)]",
              "shadow-[inset_0_-2px_0_rgba(154,70,255,0.55)]",
            )
          : "border-neutral-800/70 bg-neutral-950/12 text-neutral-300 hover:bg-neutral-900/18 hover:text-neutral-0",
      )}
    >
      <span
        className={clsx(
          "inline-flex items-center justify-center transition",
          active
            ? "text-primary-200"
            : "text-neutral-300 group-hover:text-neutral-0",
        )}
      >
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}
