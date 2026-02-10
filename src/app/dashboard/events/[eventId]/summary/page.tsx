// src/app/dashboard/events/[eventId]/summary/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Eye, Ticket } from "lucide-react";

import { fetchEventById, type EventWithMeta } from "@/lib/api/events";

import { Button } from "@/components/ui/Button";
import KpiCard from "@/components/dashboard/cards/KpiCard";
import RevenueChart from "@/components/dashboard/charts/RevenueChart";
import SmallKpiChart from "@/components/dashboard/charts/SmallKpiChart";
import RecentSalesTable from "@/components/dashboard/tables/RecentSalesTable";
import TrackingLinksTable from "@/components/dashboard/tables/TrackingLinksTable";
import MyTeamTable, {
  DEMO_MY_TEAM,
} from "@/components/dashboard/tables/MyTeamTable";
import DateRangePicker, {
  type DateRangeValue,
} from "@/components/ui/DateRangePicker";
import DonutFull, {
  type DonutSegment,
} from "@/components/dashboard/charts/DonutFull";

/* ----------------------------- Date helpers (same logic style as main dashboard) ----------------------------- */
function clampToDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysInMonth(year: number, month0: number) {
  return new Date(year, month0 + 1, 0).getDate();
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

function dateIsSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
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
  const first = dates[0];
  const last = dates[dates.length - 1];
  const sameMonth = first && last ? dateIsSameMonth(first, last) : false;

  if (n <= 7) {
    return dates.map((d) =>
      d.toLocaleDateString(undefined, { weekday: "short" }),
    );
  }

  if (sameMonth) {
    return dates.map((d) => `${d.getDate()}`);
  }

  return dates.map((d) =>
    d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
  );
}

function dailyizeFromMonthly(monthly: number[], dates: Date[]) {
  return dates.map((d, i) => {
    const m = d.getMonth();
    const y = d.getFullYear();
    const dim = daysInMonth(y, m) || 30;

    const monthTotal = monthly[m % monthly.length] ?? monthly[0] ?? 0;
    const base = monthTotal / dim;

    const wiggle =
      1 +
      0.22 * Math.sin(i * 0.85) +
      0.1 * Math.cos(i * 0.33) +
      0.06 * Math.sin(i * 0.17);

    return Math.max(0, base * wiggle);
  });
}

function niceTicks(maxValue: number, targetCount = 6) {
  const max = Math.max(1, maxValue);
  const pow = Math.pow(10, Math.floor(Math.log10(max)));
  const norm = max / pow;

  let stepNorm = 1;
  if (norm <= 1.2) stepNorm = 0.2;
  else if (norm <= 2.5) stepNorm = 0.5;
  else if (norm <= 6) stepNorm = 1;
  else stepNorm = 2;

  const step = stepNorm * pow;
  const top = Math.ceil(max / step) * step;

  const ticks: number[] = [];
  const count = Math.max(2, Math.min(8, targetCount));
  const actualStep = top / (count - 1);

  for (let i = 0; i < count; i++) ticks.push(Math.round(i * actualStep));

  ticks[0] = 0;
  ticks[ticks.length - 1] = top;

  const uniq: number[] = [];
  for (const t of ticks) {
    if (uniq.length === 0 || uniq[uniq.length - 1] !== t) uniq.push(t);
  }
  return uniq;
}

function fmtMonthYearLong(d: Date) {
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

/** "JANUARY 2026" style (matches Traffic Source header vibe) */
function currentMonthYearUpper() {
  const now = new Date();
  return now
    .toLocaleDateString(undefined, { month: "long", year: "numeric" })
    .toUpperCase();
}

/* ----------------------------- Event-metrics + breakdown demo ----------------------------- */
type EventMetrics = {
  ticketsSold: number;
  pageViews: number;
  revenue: number;
};

function deriveEventMetrics(event?: EventWithMeta): EventMetrics {
  const ticketsSold = event?.attendingCount ?? 0;

  const pageViews =
    ticketsSold > 0 ? Math.max(ticketsSold * 3, ticketsSold + 10) : 0;

  const assumedAvgTicket = 25; // USD demo
  const revenue = ticketsSold * assumedAvgTicket;

  return { ticketsSold, pageViews, revenue };
}

function splitByPercent(total: number, percents: number[]) {
  const safeTotal = Math.max(0, total);
  if (safeTotal === 0) return percents.map(() => 0);

  const raw = percents.map((p) => (safeTotal * p) / 100);
  const floors = raw.map((x) => Math.floor(x));
  let remainder = safeTotal - floors.reduce((a, b) => a + b, 0);

  const fracIdx = raw
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac)
    .map((x) => x.i);

  const out = [...floors];
  let k = 0;
  while (remainder > 0 && fracIdx.length > 0) {
    out[fracIdx[k % fracIdx.length]] += 1;
    remainder -= 1;
    k += 1;
  }
  return out;
}

/** ✅ Deterministic dummy total per event (so it doesn't jump on rerenders) */
function stableDummyTotal(seed: string, min = 8000, max = 48000) {
  let h = 2166136261; // FNV-ish
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const n = Math.abs(h) % (max - min + 1);
  return min + n;
}

/** Tiny deterministic PRNG */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic age distribution: no ranges, each age is its own segment */
function buildStableAges(seedStr: string, total: number) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const rand = mulberry32(Math.abs(h) || 1);

  const N = 12;
  const poolMin = 18;
  const poolMax = 65;

  const chosen = new Set<number>();
  while (chosen.size < N) {
    const a = poolMin + Math.floor(rand() * (poolMax - poolMin + 1));
    chosen.add(a);
  }

  const ages = Array.from(chosen);
  const weights = ages.map(() => 0.25 + rand() * 1.75);
  const sumW = weights.reduce((a, b) => a + b, 0) || 1;

  const raw = weights.map((w) => (total * w) / sumW);
  const floors = raw.map((x) => Math.floor(x));
  let remainder = Math.max(0, total - floors.reduce((a, b) => a + b, 0));

  const fracIdx = raw
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac)
    .map((x) => x.i);

  const counts = [...floors];
  let k = 0;
  while (remainder > 0 && fracIdx.length > 0) {
    counts[fracIdx[k % fracIdx.length]] += 1;
    remainder -= 1;
    k += 1;
  }

  const pairs = ages.map((age, i) => ({ age, count: counts[i] ?? 0 }));
  pairs.sort((a, b) => b.count - a.count);

  return pairs.filter((p) => p.count > 0);
}

const AGE_COLORS = [
  "#FF7A45",
  "#FF3B4A",
  "#9A46FF",
  "#3B82F6",
  "#22C55E",
  "#F59E0B",
  "#EC4899",
  "#14B8A6",
  "#A3E635",
  "#60A5FA",
  "#FB7185",
  "#C084FC",
];

/* ----------------------------- Compact, modern pills row ----------------------------- */
function StatPillsRow(opts: {
  items: {
    key: string;
    label: string;
    value: number;
    pct: number;
    color: string;
  }[];
  withArrows?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const { items, withArrows, onPrev, onNext } = opts;

  // hex -> rgba helper (supports "#RGB" or "#RRGGBB")
  const rgba = (hex: string, a: number) => {
    const h = hex.replace("#", "").trim();
    const full =
      h.length === 3
        ? h
            .split("")
            .map((c) => c + c)
            .join("")
        : h;
    const r = parseInt(full.slice(0, 2), 16) || 0;
    const g = parseInt(full.slice(2, 4), 16) || 0;
    const b = parseInt(full.slice(4, 6), 16) || 0;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  };

  const ArrowBtn = (props: {
    dir: "left" | "right";
    onClick?: () => void;
    label: string;
  }) => {
    const Icon = props.dir === "left" ? ChevronLeft : ChevronRight;

    return (
      <button
        type="button"
        onClick={props.onClick}
        aria-label={props.label}
        className={[
          "group inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          "border border-white/10 bg-white/[0.03] backdrop-blur-xl",
          "shadow-[0_12px_28px_rgba(0,0,0,0.42)]",
          "text-white/75 hover:text-white",
          "hover:bg-white/[0.06]",
          "active:scale-[0.98]",
          "focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_rgba(154,81,255,0.30),0_12px_28px_rgba(0,0,0,0.42)]",
        ].join(" ")}
      >
        <Icon
          size={16}
          className={[
            "transition-transform duration-150",
            props.dir === "left" ? "group-hover:-translate-x-0.5" : "",
            props.dir === "right" ? "group-hover:translate-x-0.5" : "",
          ].join(" ")}
        />
      </button>
    );
  };

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2.5">
        {withArrows ? (
          <ArrowBtn dir="left" onClick={onPrev} label="Previous" />
        ) : (
          <div className="w-9" />
        )}

        {/* ✅ FLEX instead of grid:
            - auto-fits 3 items (gender) without forcing 4 cols
            - still fits 4 (age) nicely on wide screens
            - wraps cleanly on small screens
        */}
        <div className="flex flex-1 flex-wrap gap-2.5">
          {items.map((it) => {
            const borderBg = `linear-gradient(135deg,
              ${rgba(it.color, 0.38)} 0%,
              rgba(154, 70, 255, 0.22) 46%,
              rgba(255, 255, 255, 0.10) 100%)`;

            return (
              <div
                key={it.key}
                className={[
                  // ✅ sizing rules: never too narrow, but flexible
                  "min-w-[160px] flex-1",
                  "sm:min-w-[170px] md:min-w-[180px]",
                  // ✅ gradient border wrapper
                  "group relative rounded-xl p-[1px]",
                ].join(" ")}
                style={{ background: borderBg }}
              >
                <div
                  className={[
                    "relative overflow-hidden rounded-[11px]",
                    "border border-white/10 bg-white/[0.03] backdrop-blur-xl",
                    "px-3 py-2",
                    "shadow-[0_14px_34px_rgba(0,0,0,0.40)]",
                    "transition-[transform,background-color,border-color] duration-150",
                    "hover:bg-white/[0.045] hover:border-white/15",
                    "active:scale-[0.99]",
                  ].join(" ")}
                >
                  {/* subtle top sheen */}
                  <div
                    className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0) 55%)",
                    }}
                  />

                  <div className="relative flex items-center justify-between gap-3">
                    {/* ✅ label: NO truncate; wraps if needed */}
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white/10"
                        style={{
                          backgroundColor: it.color,
                          boxShadow: `0 0 0 1px rgba(0,0,0,0.15), 0 0 18px rgba(154,70,255,0.10)`,
                        }}
                      />
                      <span className="min-w-0 text-[12.5px] font-semibold tracking-[-0.01em] leading-tight text-white/80 break-words">
                        {it.label}
                      </span>
                    </div>

                    {/* ✅ numbers: always fully visible */}
                    <div className="flex shrink-0 items-baseline gap-2 whitespace-nowrap">
                      <span className="text-[14px] font-extrabold tabular-nums text-white">
                        {it.value.toLocaleString()}
                      </span>
                      <span className="text-[11px] font-semibold tabular-nums text-white/45">
                        {it.pct}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {withArrows ? (
          <ArrowBtn dir="right" onClick={onNext} label="Next" />
        ) : (
          <div className="w-9" />
        )}
      </div>
    </div>
  );
}

export default function EventSummaryPage() {
  const router = useRouter();

  const { eventId } = useParams() as { eventId?: string };

  const { data: event } = useQuery<EventWithMeta>({
    queryKey: ["event", eventId],
    queryFn: () => fetchEventById(eventId!),
    enabled: !!eventId,
  });

  const metrics = useMemo(() => deriveEventMetrics(event), [event]);

  /* ---------- Use same dashboard layout + date range picker UX ---------- */
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

  const scale = useMemo(() => {
    const t = metrics.ticketsSold;
    if (t <= 0) return 0.15;
    if (t <= 25) return 0.35;
    if (t <= 150) return 0.75;
    return Math.min(2.2, 0.6 + t / 250);
  }, [metrics.ticketsSold]);

  const sparkRevenueMonthly = useMemo(
    () =>
      [6, 10, 18, 28, 42, 120, 140, 125, 130, 170, 210, 230].map((v) =>
        Math.round(v * 1000 * scale),
      ),
    [scale],
  );

  const sparkPageViewsMonthly = useMemo(
    () =>
      [120, 240, 180, 220, 260, 180, 320, 260, 380, 300, 260, 120].map((v) =>
        Math.max(1, Math.round(v * scale)),
      ),
    [scale],
  );

  const sparkTicketsMonthly = useMemo(
    () =>
      [420, 280, 300, 260, 310, 210, 120, 180, 220, 200, 240, 480].map((v) =>
        Math.max(1, Math.round(v * scale)),
      ),
    [scale],
  );

  const revenueData = useMemo(() => {
    if (!dailyMode) return mapSeriesToCount(sparkRevenueMonthly, labels.length);
    return dailyizeFromMonthly(sparkRevenueMonthly, dates);
  }, [dailyMode, labels.length, dates, sparkRevenueMonthly]);

  const pageViewsData = useMemo(() => {
    if (!dailyMode)
      return mapSeriesToCount(sparkPageViewsMonthly, labels.length);
    return dailyizeFromMonthly(sparkPageViewsMonthly, dates).map((v) =>
      Math.round(v),
    );
  }, [dailyMode, labels.length, dates, sparkPageViewsMonthly]);

  const ticketsSoldData = useMemo(() => {
    if (!dailyMode) return mapSeriesToCount(sparkTicketsMonthly, labels.length);
    return dailyizeFromMonthly(sparkTicketsMonthly, dates).map((v) =>
      Math.round(v),
    );
  }, [dailyMode, labels.length, dates, sparkTicketsMonthly]);

  const revenueMax = useMemo(() => Math.max(0, ...revenueData), [revenueData]);
  const revenueDomain = useMemo<[number, number]>(
    () => [0, Math.max(1, revenueMax)],
    [revenueMax],
  );
  const revenueTicks = useMemo(
    () => niceTicks(revenueDomain[1], 6),
    [revenueDomain],
  );

  const pvMax = useMemo(() => Math.max(0, ...pageViewsData), [pageViewsData]);
  const pvDomain = useMemo<[number, number]>(
    () => [0, Math.max(1, pvMax)],
    [pvMax],
  );
  const pvTicks = useMemo(() => niceTicks(pvDomain[1], 4), [pvDomain]);

  const tsMax = useMemo(
    () => Math.max(0, ...ticketsSoldData),
    [ticketsSoldData],
  );
  const tsDomain = useMemo<[number, number]>(
    () => [0, Math.max(1, tsMax)],
    [tsMax],
  );
  const tsTicks = useMemo(() => niceTicks(tsDomain[1], 4), [tsDomain]);

  const pinnedIndex = useMemo(() => {
    const len = revenueData.length;
    if (len <= 0) return 0;

    if (!hasChosenRange && !dailyMode) {
      return Math.min(Math.max(today.getMonth(), 0), len - 1);
    }

    return len - 1;
  }, [revenueData.length, hasChosenRange, dailyMode, today]);

  const pinnedSubLabel = useMemo(() => {
    const d = dates[pinnedIndex];
    if (!d) return "";
    if (!dailyMode) return fmtMonthYearLong(d);
    return d.toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, [dates, pinnedIndex, dailyMode]);

  /* ---------- ✅ Dummy demographics: always non-zero (until real analytics exists) ---------- */
  const breakdownTotal = useMemo(() => {
    return stableDummyTotal(eventId ?? "no-event");
  }, [eventId]);

  const monthYearUpper = useMemo(() => currentMonthYearUpper(), []);

  const genderSegments = useMemo<DonutSegment[]>(() => {
    const total = breakdownTotal;
    const [male, female, other] = splitByPercent(total, [66, 23, 11]);

    return [
      { label: "Male", value: male, color: "#3B82F6" },
      { label: "Female", value: female, color: "#EC4899" },
      { label: "Other", value: other, color: "#9CA3AF" },
    ];
  }, [breakdownTotal]);

  const genderTotal = useMemo(
    () => genderSegments.reduce((a, s) => a + Number(s.value || 0), 0),
    [genderSegments],
  );

  const genderPills = useMemo(() => {
    return genderSegments.map((s) => ({
      key: s.label,
      label: s.label,
      value: Number(s.value || 0),
      pct:
        genderTotal > 0
          ? Math.round((Number(s.value || 0) / genderTotal) * 100)
          : 0,
      color: s.color,
    }));
  }, [genderSegments, genderTotal]);

  const agePairs = useMemo(() => {
    const total = Math.max(1, breakdownTotal);
    return buildStableAges(`${eventId ?? "no-event"}::ages`, total);
  }, [breakdownTotal, eventId]);

  // ✅ TASK: show 4 at a time and paginate with arrows
  const [agePage, setAgePage] = useState(0);

  const agePages = useMemo(() => {
    const per = 4;
    return Math.max(1, Math.ceil(agePairs.length / per));
  }, [agePairs.length]);

  const ageSlicePairs = useMemo(() => {
    const per = 4;
    const start = (agePage % agePages) * per;
    return agePairs.slice(start, start + per);
  }, [agePairs, agePage, agePages]);

  const ageSliceSegments = useMemo<DonutSegment[]>(() => {
    return ageSlicePairs.map((p, idx) => ({
      label: String(p.age),
      value: p.count,
      color: AGE_COLORS[idx % AGE_COLORS.length],
    }));
  }, [ageSlicePairs]);

  const ageSliceTotal = useMemo(() => {
    return ageSliceSegments.reduce((a, s) => a + Number(s.value || 0), 0);
  }, [ageSliceSegments]);

  const agePills = useMemo(() => {
    return ageSliceSegments.map((s) => ({
      key: s.label,
      label: `Age ${s.label}`,
      value: Number(s.value || 0),
      pct:
        ageSliceTotal > 0
          ? Math.round((Number(s.value || 0) / ageSliceTotal) * 100)
          : 0,
      color: s.color,
    }));
  }, [ageSliceSegments, ageSliceTotal]);

  const kpiRevenueValue = useMemo(() => {
    const v = metrics.revenue;
    if (!Number.isFinite(v)) return "$0";
    if (v >= 1000) return `$${(v / 1000).toFixed(1)}K`;
    return `$${v.toFixed(0)}`;
  }, [metrics.revenue]);

  return (
    <div className="space-y-5 px-4 md:px-6 lg:px-8">
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[3.10fr_1.51fr]">
        <div className="grid grid-cols-1 rounded-lg border border-neutral-700 bg-neutral-900 pl-4 lg:grid-cols-[3.15fr_1.74fr]">
          <KpiCard
            title="Total Revenue"
            value={kpiRevenueValue}
            delta="+24.6%"
            accent="from-[#7C3AED] to-[#9333EA]"
            className="border-neutral-700 pr-6 py-5 lg:border-r"
            stretchChart
            detailsHref={`/dashboard/events/${eventId ?? ""}/summary`}
            toolbar={
              <div className="max-w-[210px]">
                <DateRangePicker value={dateRange} onChange={setDateRange} />
              </div>
            }
          >
            <RevenueChart
              data={revenueData}
              dates={dates}
              domain={revenueDomain}
              yTicks={revenueTicks}
              xLabels={labels}
              tooltip={{
                index: pinnedIndex,
                valueLabel: kpiRevenueValue,
                subLabel: pinnedSubLabel,
                deltaText: "+24.6%",
                deltaPositive: true,
              }}
              tooltipDateMode={dailyMode ? "full" : "monthYear"}
              stroke="#9A46FF"
              fillTop="#9A46FF"
            />
          </KpiCard>

          <div>
            <KpiCard
              title="Total Page Views"
              value={metrics.pageViews.toLocaleString()}
              valueIcon={
                <Eye className="h-5 w-5 shrink-0 text-white/90" aria-hidden />
              }
              delta="+24.6%"
              accent="from-[#7C3AED] to-[#9A46FF]"
              className="border-neutral-700 p-5 lg:border-b"
              detailsHref={`/dashboard/events/${eventId ?? ""}/summary`}
            >
              <SmallKpiChart
                data={pageViewsData}
                dates={dates}
                pinnedIndex={pinnedIndex}
                tooltipIcon="eye"
                tooltipDateMode={dailyMode ? "full" : "monthYear"}
                domain={pvDomain}
                yTicks={pvTicks}
                xLabels={labels}
                stroke="#9A46FF"
                deltaText="+24.6%"
                deltaPositive
              />
            </KpiCard>

            <KpiCard
              title="Total Tickets Sold"
              value={metrics.ticketsSold.toLocaleString()}
              valueIcon={
                <Ticket
                  className="h-5 w-5 shrink-0 text-white/90"
                  aria-hidden
                />
              }
              delta="-24.6%"
              accent="from-[#7C3AED] to-[#9A46FF]"
              className="p-5"
              detailsHref={`/dashboard/events/${eventId ?? ""}/summary`}
            >
              <SmallKpiChart
                data={ticketsSoldData}
                dates={dates}
                pinnedIndex={pinnedIndex}
                tooltipIcon="ticket"
                tooltipDateMode={dailyMode ? "full" : "monthYear"}
                domain={tsDomain}
                yTicks={tsTicks}
                xLabels={labels}
                stroke="#9A46FF"
                deltaText="-24.6%"
                deltaPositive={false}
              />
            </KpiCard>
          </div>
        </div>

        <RecentSalesTable />
      </section>

      {/* ✅ Gender + Age section */}
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[3.10fr_1.51fr]">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Gender Breakdown */}
          <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[16px] uppercase text-neutral-400 font-extrabold leading-none">
                  Gender Breakdown
                </div>
                <div className="mt-1 text-2xl font-extrabold">
                  {monthYearUpper}
                </div>
              </div>

              <Button
                variant="viewAction"
                size="sm"
                type="button"
                onClick={() =>
                  router.push(`/dashboard/gender-breakdown?eventId=${eventId}`)
                }
              >
                Detailed View
              </Button>
            </div>

            <div className="mt-4">
              <DonutFull
                segments={genderSegments}
                height={300}
                thickness={60}
                padAngle={4}
                minSliceAngle={6}
                trackColor="transparent"
                showSliceBadges
              />

              <StatPillsRow items={genderPills} />
            </div>
          </div>

          {/* Age Breakdown */}
          <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[16px] uppercase text-neutral-400 font-extrabold leading-none">
                  Age Breakdown
                </div>
                <div className="mt-1 text-2xl font-extrabold">
                  {monthYearUpper}
                </div>
              </div>

              <Button
                variant="viewAction"
                size="sm"
                type="button"
                onClick={() =>
                  router.push(`/dashboard/age-breakdown?eventId=${eventId}`)
                }
              >
                Detailed View
              </Button>
            </div>

            <div className="mt-4">
              <DonutFull
                segments={ageSliceSegments}
                height={300}
                thickness={60}
                padAngle={5}
                minSliceAngle={8}
                trackColor="transparent"
                showSliceBadges
              />

              <StatPillsRow
                items={agePills}
                withArrows
                onPrev={() => setAgePage((p) => (p - 1 + agePages) % agePages)}
                onNext={() => setAgePage((p) => (p + 1) % agePages)}
              />
            </div>
          </div>
        </div>

        <MyTeamTable
          members={DEMO_MY_TEAM}
          onDetailedView={() => console.log("Team detailed view clicked")}
        />
      </section>

      <TrackingLinksTable scope="event" eventId={eventId} showViewAll />
    </div>
  );
}
