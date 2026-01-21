/* ------------------------------------------------------------------ */
/*  src/components/dashboard/finances/DetailedViewShell.tsx           */
/* ------------------------------------------------------------------ */
"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ChevronLeft, Eye, Ticket, BadgeDollarSign } from "lucide-react";

import SmallKpiChart from "@/components/dashboard/charts/SmallKpiChart";
import RevenueChart, {
  type RevenueTooltip,
} from "@/components/dashboard/charts/RevenueChart";
import BarsWeek from "@/components/dashboard/charts/BarsWeek";
import DonutFull, {
  type DonutSegment,
} from "@/components/dashboard/charts/DonutFull";
import MiniMetricCard from "@/components/dashboard/cards/MiniMetricCard";
import DeltaBadge from "@/components/ui/DeltaBadge";

import DateRangePicker, {
  type DateRangeValue,
} from "@/components/ui/DateRangePicker";

/* ---------------------- Dynamic (no-SSR) Map ----------------------- */
/**
 * Leaflet touches `window`, so we must import it with `ssr:false`
 * even inside a client component.
 */
const LocationsChoroplethMap = dynamic(
  () => import("@/components/dashboard/charts/LocationsChoroplethMap"),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full animate-pulse bg-neutral-950/35" />
    ),
  },
);

/* --------------------------- Date helpers ---------------------------- */
const monthLabels = (s: Date, e: Date) => {
  const a: string[] = [];
  const d = new Date(s);
  d.setDate(1);
  while (d <= e) {
    a.push(d.toLocaleDateString(undefined, { month: "short" }));
    d.setMonth(d.getMonth() + 1);
  }
  return a;
};

const monthDates = (s: Date, e: Date) => {
  const out: Date[] = [];
  const d = new Date(s);
  d.setDate(21);
  while (d <= e) {
    out.push(new Date(d));
    d.setMonth(d.getMonth() + 1);
  }
  return out;
};

function mapSeriesToCount(vals: number[], count: number) {
  if (count <= 0) return [];
  if (count === vals.length) return vals;
  const a = [...vals];
  while (a.length < count) a.push(a[a.length % vals.length]);
  return a.slice(0, count);
}

/**
 * Convert decimal comma → decimal dot (e.g. "240,8K" => "240.8K")
 * Only swaps commas that are BETWEEN digits, so text/labels remain intact.
 */
function normalizeDecimalSeparator(input?: string | number | null) {
  if (input === null || input === undefined) return "";
  if (typeof input === "number") return String(input);
  return input.replace(/(\d),(\d)/g, "$1.$2");
}

function inferBigIcon(opts: {
  heading: string;
  label: string;
  valuePrefix?: string;
}) {
  const hay = `${opts.heading} ${opts.label}`.toLowerCase();

  if (opts.valuePrefix?.includes("$") || hay.includes("revenue")) {
    return (
      <BadgeDollarSign className="h-6 w-6 shrink-0 text-white/90" aria-hidden />
    );
  }

  if (hay.includes("ticket")) {
    return <Ticket className="h-6 w-6 shrink-0 text-white/90" aria-hidden />;
  }

  if (hay.includes("view")) {
    return <Eye className="h-6 w-6 shrink-0 text-white/90" aria-hidden />;
  }

  return null;
}

/** "SEPTEMBER 2025" (current month/year, uppercase) */
function currentMonthYearUpper() {
  const now = new Date();
  return now
    .toLocaleDateString(undefined, { month: "long", year: "numeric" })
    .toUpperCase();
}

/* ------------------------------ Types ------------------------------ */
type MiniCardCfg = {
  title: string;
  value: string;
  delta?: string;
  negative?: boolean;
  series: number[];
  icon?: ReactNode;
};

type BigCardCfg = {
  label: string;
  value: string;
  delta?: string;
  deltaPositive?: boolean;
  series: number[];
  tooltip: RevenueTooltip;
  valuePrefix?: string;
  valueSuffix?: string;
  valueIcon?: ReactNode;
};

type DonutCfg = {
  label: string;
  heading: string;
  segments: DonutSegment[];
};

type Props = {
  heading: string;
  backHref?: string;

  miniCards: MiniCardCfg[];

  bigCard: BigCardCfg;

  donut: DonutCfg;

  mapLabel: string;

  mode: "revenue" | "views" | "tickets";

  barsLabel: string;
  barsHeading: string;
  barsData: number[];
};

const data = [
  { key: "US", revenue: 240000, viewers: 120000, tickets: 18000 },
  { key: "CA", revenue: 110000, viewers: 52000, tickets: 7600 },
  { key: "GB", revenue: 98000, viewers: 47000, tickets: 6400 },

  { key: "Germany", revenue: 88000, viewers: 39000, tickets: 6100 },
  { key: "France", revenue: 82000, viewers: 36000, tickets: 5600 },
  { key: "Italy", revenue: 76000, viewers: 34000, tickets: 5200 },
  { key: "Spain", revenue: 69000, viewers: 31000, tickets: 4700 },
  { key: "Netherlands", revenue: 54000, viewers: 22000, tickets: 3200 },
  { key: "Sweden", revenue: 48000, viewers: 19000, tickets: 2700 },
  { key: "Norway", revenue: 42000, viewers: 16500, tickets: 2400 },

  { key: "Mexico", revenue: 51000, viewers: 28000, tickets: 4100 },
  { key: "Brazil", revenue: 62000, viewers: 33000, tickets: 5200 },
  { key: "Argentina", revenue: 38000, viewers: 17000, tickets: 2100 },

  { key: "Japan", revenue: 105000, viewers: 49000, tickets: 6900 },
  { key: "South Korea", revenue: 64000, viewers: 27000, tickets: 3800 },
  { key: "China", revenue: 130000, viewers: 61000, tickets: 9100 },
  { key: "India", revenue: 90000, viewers: 72000, tickets: 10200 },

  { key: "Australia", revenue: 58000, viewers: 24000, tickets: 3500 },
  { key: "New Zealand", revenue: 22000, viewers: 9000, tickets: 1200 },

  { key: "Turkey", revenue: 46000, viewers: 21000, tickets: 2900 },
  {
    key: "United Arab Emirates",
    revenue: 52000,
    viewers: 18000,
    tickets: 2500,
  },
  { key: "Saudi Arabia", revenue: 57000, viewers: 20000, tickets: 2600 },
  { key: "South Africa", revenue: 34000, viewers: 16000, tickets: 1900 },
  { key: "Nigeria", revenue: 28000, viewers: 22000, tickets: 2400 },
  { key: "Egypt", revenue: 26000, viewers: 14000, tickets: 1700 },
];

export default function DetailedViewShell({
  heading,
  backHref = "/dashboard",

  miniCards,

  bigCard,

  donut,

  mapLabel,
  mode,

  barsLabel,
  barsHeading,
  barsData,
}: Props) {
  const [dateRange, setDateRange] = useState<DateRangeValue>(() => ({
    start: new Date(2024, 0, 1),
    end: new Date(2024, 11, 31),
  }));

  const effective = useMemo(() => {
    const fallbackStart = new Date(2024, 0, 1);
    const fallbackEnd = new Date(2024, 11, 31);

    const s = (dateRange.start as Date | null) ?? fallbackStart;
    const e = (dateRange.end as Date | null) ?? fallbackEnd;

    return s.getTime() <= e.getTime()
      ? { start: s, end: e }
      : { start: e, end: s };
  }, [dateRange.start, dateRange.end]);

  const labels = useMemo(
    () => monthLabels(effective.start, effective.end),
    [effective.start, effective.end],
  );
  const dates = useMemo(
    () => monthDates(effective.start, effective.end),
    [effective.start, effective.end],
  );

  const bigSeries = useMemo(
    () => mapSeriesToCount(bigCard.series, labels.length),
    [bigCard.series, labels.length],
  );

  const bigTooltip = useMemo(() => {
    const t = bigCard.tooltip;
    const max = Math.max(0, bigSeries.length - 1);
    const idx = Number.isFinite(t.index)
      ? Math.max(0, Math.min(t.index, max))
      : 0;

    return {
      ...t,
      index: idx,
      valueLabel: normalizeDecimalSeparator(t.valueLabel),
    };
  }, [bigCard.tooltip, bigSeries.length]);

  const bigValueIcon =
    bigCard.valueIcon ??
    inferBigIcon({
      heading,
      label: bigCard.label,
      valuePrefix: bigCard.valuePrefix,
    });

  // ✅ dynamic month/year for Donut + Peak Days
  const monthYear = useMemo(() => currentMonthYearUpper(), []);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 pt-2">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#121220] px-3 py-1.5 text-sm text-white/80 hover:bg-white/10"
        >
          <ChevronLeft size={16} /> Back
        </Link>
        <h1 className="text-lg font-extrabold tracking-tight uppercase text-white">
          {heading}
        </h1>
      </div>

      {/* 4 KPIs */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {miniCards.map((c) => (
          <MiniMetricCard
            key={c.title}
            title={c.title}
            value={normalizeDecimalSeparator(c.value)}
            delta={c.delta ? normalizeDecimalSeparator(c.delta) : undefined}
            icon={c.icon}
            series={c.series}
            chart={
              <SmallKpiChart
                data={c.series}
                domain={[0, 500]}
                yTicks={[0, 100, 250, 500]}
                xLabels={["12AM", "8AM", "4PM", "11PM"]}
                stroke="#9A46FF"
              />
            }
          />
        ))}
      </section>

      {/* Total + Donut */}
      <section className="grid grid-cols-12 gap-5">
        <div className="col-span-12 xl:col-span-8 rounded-lg border border-neutral-700 bg-neutral-900 pl-4">
          <div className="flex items-start justify-between pr-6 pt-5">
            <div>
              <div className="text-[16px] uppercase text-neutral-400 font-extrabold leading-none">
                {bigCard.label}
              </div>

              <div className="mt-1 flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  {bigValueIcon ? (
                    <span className="inline-flex items-center justify-center">
                      {bigValueIcon}
                    </span>
                  ) : null}
                  <div className="text-3xl font-extrabold">
                    {normalizeDecimalSeparator(bigCard.value)}
                  </div>
                </div>

                <DeltaBadge
                  delta={
                    bigCard.delta
                      ? normalizeDecimalSeparator(bigCard.delta)
                      : undefined
                  }
                />
              </div>
            </div>

            <div className="max-w-[210px]">
              <DateRangePicker value={dateRange} onChange={setDateRange} />
            </div>
          </div>

          <div className="pr-6 pb-5 h-[320px] sm:h-[340px] lg:h-[360px]">
            <RevenueChart
              data={bigSeries}
              dates={dates}
              domain={[0, 250_000]}
              yTicks={[0, 25_000, 50_000, 100_000, 150_000, 200_000, 250_000]}
              xLabels={labels}
              tooltip={bigTooltip}
              stroke="#9A46FF"
              fillTop="#9A46FF"
              tooltipVariant="primary"
              valuePrefix={bigCard.valuePrefix}
              valueSuffix={bigCard.valueSuffix}
            />
          </div>
        </div>

        <div className="col-span-12 xl:col-span-4 rounded-lg border border-neutral-700 bg-neutral-900 p-5 flex flex-col justify-between">
          <div>
            <div className="text-[16px] uppercase text-neutral-400 font-extrabold leading-none">
              {donut.label}
            </div>
            <div className="mt-1 text-2xl font-extrabold">{monthYear}</div>
          </div>

          <div className="flex flex-col justify-end mt-auto">
            <DonutFull
              segments={donut.segments}
              height={281}
              thickness={56}
              padAngle={4}
              minSliceAngle={6}
              trackColor="transparent"
              showSliceBadges
            />

            <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm">
              {donut.segments.map((s) => (
                <li
                  key={s.label}
                  className="flex items-center gap-2 whitespace-nowrap text-white/80"
                >
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="font-semibold text-white/90">
                    {normalizeDecimalSeparator(s.value)}
                  </span>
                  <span className="text-white/70">{s.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Map + Peak days */}
      <section className="grid grid-cols-12 gap-5">
        <div className="col-span-12 xl:col-span-8 rounded-lg border border-neutral-700 bg-neutral-900 p-5">
          <div className="text-[16px] uppercase text-neutral-400 font-extrabold leading-none">
            {mapLabel}
          </div>

          <div className="mt-3 aspect-[16/9] overflow-hidden rounded-lg border border-neutral-700">
            <LocationsChoroplethMap scope="world" mode={mode} data={data} />
          </div>
        </div>

        {/* ✅ Peak days card now grows the chart to fill height */}
        <div className="col-span-12 xl:col-span-4 rounded-lg border border-neutral-700 bg-neutral-900 p-5 flex flex-col">
          <div className="shrink-0">
            <div className="text-[16px] uppercase text-neutral-400 font-extrabold leading-none">
              {barsLabel}
            </div>

            <div className="mt-1 text-2xl font-extrabold">{monthYear}</div>
          </div>

          {/* key change: flex-1 instead of fixed h-[260px] */}
          <div className="mt-4 flex-1 min-h-[260px]">
            <BarsWeek data={barsData} highlightIndex={4} metric={mode} />
          </div>
        </div>
      </section>
    </div>
  );
}
