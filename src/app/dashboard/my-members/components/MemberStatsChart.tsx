"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { BadgeDollarSign, Ticket, Eye } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import DateRangePicker, {
  type DateRangeValue,
} from "@/components/ui/DateRangePicker";

import type { DetailedMember } from "./DetailedMemberCard";

export type MemberChartTab = "revenue" | "tickets" | "views";

function clampToDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, delta: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + delta);
  return x;
}

function diffDaysInclusive(a: Date, b: Date) {
  const A = clampToDay(a).getTime();
  const B = clampToDay(b).getTime();
  const ms = Math.abs(B - A);
  return Math.floor(ms / (24 * 60 * 60 * 1000)) + 1;
}

function buildDailyDates(start: Date, end: Date) {
  const out: Date[] = [];
  const s = clampToDay(start);
  const e = clampToDay(end);
  const forward = s.getTime() <= e.getTime();
  const a = forward ? s : e;
  const b = forward ? e : s;

  let cur = a;
  while (cur <= b) {
    out.push(new Date(cur));
    cur = addDays(cur, 1);
  }
  return forward ? out : out.reverse();
}

function buildDailyLabels(dates: Date[]) {
  const n = dates.length;
  if (n <= 7) {
    return dates.map((d) =>
      d.toLocaleDateString(undefined, { weekday: "short" }),
    );
  }
  return dates.map((d) =>
    d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
  );
}

function monthLabels(start: Date, end: Date) {
  const labels: string[] = [];
  const d = new Date(start);
  d.setDate(1);
  while (d <= end) {
    labels.push(d.toLocaleDateString(undefined, { month: "short" }));
    d.setMonth(d.getMonth() + 1);
  }
  return labels;
}

function monthDates(start: Date, end: Date) {
  const out: Date[] = [];
  const d = new Date(start);
  d.setDate(21);
  while (d <= end) {
    out.push(new Date(d));
    d.setMonth(d.getMonth() + 1);
  }
  return out;
}

function mapSeriesToCount(vals: number[], count: number) {
  if (count === vals.length) return vals;
  const a = [...vals];
  while (a.length < count) a.push(a[a.length % vals.length]);
  return a.slice(0, count);
}

function fmtUSD(n: number) {
  const whole = Math.round(n);
  return `$${whole.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function fmtFullDate(d?: Date) {
  return d
    ? d.toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";
}

function fmtMonthYearLong(d?: Date) {
  return d
    ? d.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      })
    : "";
}

function computeNiceTicks(max: number) {
  const safeMax = Math.max(1, max);
  const steps = 4;
  const step = Math.ceil(safeMax / steps / 10) * 10;
  return Array.from({ length: steps + 1 }, (_, i) => step * (steps - i));
}

function hash(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h;
}

/** deterministic “wiggle” based on member + tab */
function genSeries(member: DetailedMember, tab: MemberChartTab, count: number) {
  const base =
    tab === "revenue"
      ? member.revenue
      : tab === "tickets"
        ? member.ticketsSold
        : member.pageViews;

  const seed = hash(`${member.id}-${tab}`);
  const out: number[] = [];

  for (let i = 0; i < count; i++) {
    const t = i / Math.max(1, count - 1);
    const wave =
      1 +
      0.22 * Math.sin((i + (seed % 13)) * 0.7) +
      0.1 * Math.cos((i + (seed % 7)) * 0.33);

    const trend = 0.85 + 0.35 * t; // gentle uptrend
    const v = Math.max(0, (base / Math.max(1, count)) * 18 * wave * trend);

    out.push(tab === "revenue" ? v * 100 : Math.round(v));
  }

  return out;
}

export default function MemberStatsChart({
  member,
  defaultTab = "revenue",
}: {
  member: DetailedMember;
  defaultTab?: MemberChartTab;
}) {
  const [tab, setTab] = useState<MemberChartTab>(defaultTab);

  const today = useMemo(() => clampToDay(new Date()), []);
  const currentYear = useMemo(() => today.getFullYear(), [today]);

  const ALL_TIME_START = useMemo(
    () => new Date(currentYear, 0, 1),
    [currentYear],
  );
  const ALL_TIME_END = useMemo(
    () => new Date(currentYear, 11, 31),
    [currentYear],
  );

  const [dateRange, setDateRange] = useState<DateRangeValue>({
    start: null,
    end: null,
  });

  const hasChosenRange = !!dateRange.start && !!dateRange.end;

  const effectiveStart = useMemo(
    () => (hasChosenRange ? (dateRange.start as Date) : ALL_TIME_START),
    [hasChosenRange, dateRange.start, ALL_TIME_START],
  );

  const effectiveEnd = useMemo(
    () => (hasChosenRange ? (dateRange.end as Date) : ALL_TIME_END),
    [hasChosenRange, dateRange.end, ALL_TIME_END],
  );

  const rangeDays = useMemo(
    () => diffDaysInclusive(effectiveStart, effectiveEnd),
    [effectiveStart, effectiveEnd],
  );

  const dailyMode = useMemo(() => {
    if (!hasChosenRange) return false;
    return rangeDays <= 31;
  }, [hasChosenRange, rangeDays]);

  const labels = useMemo(() => {
    if (!dailyMode) return monthLabels(effectiveStart, effectiveEnd);
    const ds = buildDailyDates(effectiveStart, effectiveEnd);
    return buildDailyLabels(ds);
  }, [dailyMode, effectiveStart, effectiveEnd]);

  const dates = useMemo(() => {
    if (!dailyMode) return monthDates(effectiveStart, effectiveEnd);
    return buildDailyDates(effectiveStart, effectiveEnd);
  }, [dailyMode, effectiveStart, effectiveEnd]);

  // base monthly “shape”, then mapped to label count
  const monthly = useMemo(() => {
    const baseCount = 12;
    return genSeries(member, tab, baseCount);
  }, [member, tab]);

  const series = useMemo(() => {
    if (!dailyMode) return mapSeriesToCount(monthly, labels.length);

    // daily: generate directly at requested size so it feels consistent
    return genSeries(member, tab, labels.length);
  }, [dailyMode, monthly, labels.length, member, tab]);

  const rows = useMemo(() => {
    return labels.map((name, i) => ({
      i,
      name,
      date: dates[i],
      value: series[i] ?? 0,
    }));
  }, [labels, dates, series]);

  const totalLabel = useMemo(() => {
    if (tab === "revenue") return fmtUSD(member.revenue);
    if (tab === "tickets") return `${member.ticketsSold.toLocaleString()}`;
    return `${member.pageViews.toLocaleString()}`;
  }, [tab, member]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-neutral-800/70 bg-neutral-948/70 p-4 sm:p-5">
      {/* same “Finances chart” wash */}
      <div
        className="pointer-events-none absolute inset-0 opacity-85"
        style={{
          background:
            "radial-gradient(1100px 620px at 0% 0%, rgba(154,70,255,0.22), transparent 58%), radial-gradient(900px 640px at 100% 20%, rgba(154,70,255,0.10), transparent 62%)",
        }}
      />

      <div className="relative">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[12px] font-semibold text-neutral-300">
              {tab === "revenue"
                ? "Revenue"
                : tab === "tickets"
                  ? "Tickets Sold"
                  : "Page Views"}
            </div>

            <div className="mt-1 text-[24px] font-extrabold leading-none tracking-[-0.04em] text-neutral-50 sm:text-[26px]">
              {tab === "revenue" ? totalLabel : totalLabel}
            </div>

            <div className="mt-1 text-[12px] leading-[1.15] text-neutral-400">
              {dailyMode ? "Daily" : "Monthly"} overview (demo) — {member.name}
            </div>
          </div>

          {/* tabs (Finances-style layout) */}
          <div className="grid grid-cols-3 gap-2 flex-1 px-6">
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

          <div className="w-[min(144px,100%)]">
            <DateRangePicker value={dateRange} onChange={setDateRange} />
          </div>
        </div>

        <div className="mt-5 h-[320px] w-full overflow-hidden rounded-xl border border-neutral-800/60 bg-neutral-950/20">
          <MemberAreaChart rows={rows} dailyMode={dailyMode} />
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
              "shadow-[0_14px_34px_rgba(154,70,255,0.12)]",
              "ring-1 ring-primary-500/18",
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

function MemberAreaChart({
  rows,
  dailyMode,
}: {
  rows: Array<{ i: number; name: string; date?: Date; value: number }>;
  dailyMode: boolean;
}) {
  const stroke = "rgba(154,70,255,0.95)";
  const stops = { a: "rgba(154,70,255,0.38)", b: "rgba(154,70,255,0.02)" };

  const yMax = useMemo(() => Math.max(1, ...rows.map((r) => r.value)), [rows]);
  const yTicks = useMemo(() => computeNiceTicks(yMax), [yMax]);

  const yLabelStrings = useMemo(
    () =>
      yTicks.map((v) => (v >= 1000 ? `${Math.round(v / 100) / 10}K` : `${v}`)),
    [yTicks],
  );

  return (
    <div className="h-full w-full">
      <div className="flex h-full w-full">
        <div className="w-[48px] shrink-0 px-2 pt-[18px] pb-[44px] pr-3">
          <div className="flex h-full flex-col justify-between text-[10px] font-medium tracking-[-0.02em] text-neutral-500">
            {yLabelStrings.map((s, idx) => (
              <div key={`${s}-${idx}`} className="leading-none text-right">
                {s}
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-0 flex-1 pr-3 py-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={rows}
              margin={{ top: 10, right: 0, left: 0, bottom: 8 }}
            >
              <defs>
                <linearGradient id="mem-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={stops.a} />
                  <stop offset="100%" stopColor={stops.b} />
                </linearGradient>
              </defs>

              <YAxis
                width={0}
                domain={[0, yTicks[0] ?? yMax]}
                tick={false}
                tickLine={false}
                axisLine={false}
              />

              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={{ stroke: "rgba(44,44,68,1)", strokeWidth: 1 }}
                interval="preserveStartEnd"
                tick={{
                  fill: "var(--color-neutral-500, #727293)",
                  fontFamily: "Gilroy, ui-sans-serif, system-ui",
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: -0.2,
                }}
              />

              <Area
                type="monotone"
                dataKey="value"
                stroke={stroke}
                strokeWidth={2.6}
                fill="url(#mem-fill)"
                dot={false}
                activeDot={{ r: 4, fill: "#FFFFFF", stroke, strokeWidth: 2 }}
                isAnimationActive={false}
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              <Tooltip
                isAnimationActive={false}
                cursor={{ stroke: "rgba(255,255,255,0.12)", strokeWidth: 1 }}
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const p = payload[0]?.payload as
                    | { value?: number; date?: Date; name?: string }
                    | undefined;
                  if (!p) return null;

                  const dateLabel = dailyMode
                    ? fmtFullDate(p.date)
                    : fmtMonthYearLong(p.date);

                  return (
                    <div className="pointer-events-none rounded-xl border border-white/10 bg-neutral-950/85 px-4 py-3 text-neutral-0 backdrop-blur-md shadow-[0_18px_44px_rgba(0,0,0,0.55)]">
                      <div className="text-[18px] font-extrabold tracking-[-0.02em]">
                        {p.value != null
                          ? p.value >= 1000
                            ? `${Math.round(p.value).toLocaleString()}`
                            : `${Math.round(p.value)}`
                          : "—"}
                      </div>
                      <div className="mt-1 text-[12px] font-semibold text-neutral-300">
                        {dateLabel || p.name || ""}
                      </div>
                    </div>
                  );
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
