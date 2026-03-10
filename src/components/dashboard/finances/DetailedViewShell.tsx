"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ChevronLeft, Eye, Ticket, BadgeDollarSign } from "lucide-react";

import SmallKpiChart from "@/components/dashboard/charts/SmallKpiChart";
import RevenueChart, {
  type RevenueTooltip,
} from "@/components/dashboard/charts/RevenueChart";
import RevenueChartMulti, {
  type MultiSeriesLine,
} from "@/components/dashboard/charts/RevenueChartMulti";
import BarsWeek from "@/components/dashboard/charts/BarsWeek";
import BarsWeekStacked, {
  type BarsStackSeries,
} from "@/components/dashboard/charts/BarsWeekStacked";
import DonutFull, {
  type DonutSegment,
} from "@/components/dashboard/charts/DonutFull";
import MiniMetricCard from "@/components/dashboard/cards/MiniMetricCard";
import DeltaBadge from "@/components/ui/DeltaBadge";

import DateRangePicker, {
  type DateRangeValue,
} from "@/components/ui/DateRangePicker";

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

function mapSeriesToCount<T>(vals: T[], count: number): T[] {
  if (count <= 0) return [];
  if (count === vals.length) return vals;
  if (vals.length === 0) return [];

  const a = [...vals];
  while (a.length < count) {
    a.push(a[a.length % vals.length] as T);
  }
  return a.slice(0, count);
}

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
  const top = Math.max(1, Math.ceil(max / step) * step);

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

function formatRangeHeading(start: Date, end: Date) {
  const sameMonth =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth();

  if (sameMonth) {
    return start
      .toLocaleDateString(undefined, { month: "long", year: "numeric" })
      .toUpperCase();
  }

  const sameYear = start.getFullYear() === end.getFullYear();

  if (sameYear) {
    return `${start
      .toLocaleDateString(undefined, { month: "short" })
      .toUpperCase()} – ${end
      .toLocaleDateString(undefined, {
        month: "short",
        year: "numeric",
      })
      .toUpperCase()}`;
  }

  return `${start
    .toLocaleDateString(undefined, {
      month: "short",
      year: "numeric",
    })
    .toUpperCase()} – ${end
    .toLocaleDateString(undefined, {
      month: "short",
      year: "numeric",
    })
    .toUpperCase()}`;
}

function hasMeaningfulMapData(
  items: Array<{
    revenue?: number;
    viewers?: number;
    tickets?: number;
  }>,
) {
  return items.some(
    (item) =>
      Number(item.revenue ?? 0) > 0 ||
      Number(item.viewers ?? 0) > 0 ||
      Number(item.tickets ?? 0) > 0,
  );
}

function hasMeaningfulBars(data: number[]) {
  return data.some((value) => Number(value) > 0);
}

/* ------------------------------ Types ------------------------------ */
type MiniCardCfg = {
  title: string;
  value: string;
  delta?: string;
  negative?: boolean;
  series: number[];
  icon?: ReactNode;
  xLabels?: string[];
  dates?: Date[];
  pinnedIndex?: number;
};

type BigCardCfg = {
  label: string;
  value: string;
  delta?: string;
  deltaPositive?: boolean;
  series: number[];
  seriesLines?: MultiSeriesLine[];
  pinSeriesKey?: string;
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

type MapDatum = {
  key: string;
  label?: string;
  revenue: number;
  viewers: number;
  tickets: number;
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
  barsStacks?: BarsStackSeries[];

  mapData?: MapDatum[];

  chartLabels?: string[];
  chartDates?: Date[];

  dateRange?: DateRangeValue;
  onDateRangeChange?: (next: DateRangeValue) => void;
  isLoading?: boolean;
};

const DEFAULT_MAP_DATA: MapDatum[] = [
  { key: "US", revenue: 240000, viewers: 120000, tickets: 18000 },
  { key: "CA", revenue: 110000, viewers: 52000, tickets: 7600 },
  { key: "GB", revenue: 98000, viewers: 47000, tickets: 6400 },
  {
    key: "DE",
    label: "Germany",
    revenue: 88000,
    viewers: 39000,
    tickets: 6100,
  },
  { key: "FR", label: "France", revenue: 82000, viewers: 36000, tickets: 5600 },
  { key: "IT", label: "Italy", revenue: 76000, viewers: 34000, tickets: 5200 },
];

const DEFAULT_BARS_DATA = [38000, 52000, 47000, 61000, 88000, 70000, 56000];

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
  barsStacks,
  mapData,
  chartLabels,
  chartDates,
  dateRange: controlledDateRange,
  onDateRangeChange,
  isLoading = false,
}: Props) {
  const [internalDateRange, setInternalDateRange] = useState<DateRangeValue>(
    () => ({
      start: new Date(2024, 0, 1),
      end: new Date(2024, 11, 31),
    }),
  );

  const dateRange = controlledDateRange ?? internalDateRange;

  const handleDateRangeChange = (next: DateRangeValue) => {
    if (onDateRangeChange) {
      onDateRangeChange(next);
      return;
    }
    setInternalDateRange(next);
  };

  const effective = useMemo(() => {
    const fallbackStart = new Date(2024, 0, 1);
    const fallbackEnd = new Date(2024, 11, 31);

    const s = (dateRange.start as Date | null) ?? fallbackStart;
    const e = (dateRange.end as Date | null) ?? fallbackEnd;

    return s.getTime() <= e.getTime()
      ? { start: s, end: e }
      : { start: e, end: s };
  }, [dateRange.start, dateRange.end]);

  const fallbackLabels = useMemo(
    () => monthLabels(effective.start, effective.end),
    [effective.start, effective.end],
  );
  const fallbackDates = useMemo(
    () => monthDates(effective.start, effective.end),
    [effective.start, effective.end],
  );

  const labels =
    chartLabels && chartLabels.length > 0 ? chartLabels : fallbackLabels;
  const dates =
    chartDates && chartDates.length > 0 ? chartDates : fallbackDates;

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

  const multiLines = useMemo(() => {
    if (!bigCard.seriesLines?.length) return null;
    return bigCard.seriesLines.map((l) => ({
      ...l,
      series: mapSeriesToCount(l.series, labels.length),
    }));
  }, [bigCard.seriesLines, labels.length]);

  const bigMax = useMemo(() => {
    if (multiLines?.length) {
      return Math.max(
        1,
        ...multiLines.flatMap((line) => line.series.map((n) => Math.max(0, n))),
      );
    }

    return Math.max(1, ...bigSeries.map((n) => Math.max(0, n)));
  }, [bigSeries, multiLines]);

  const bigDomain = useMemo<[number, number]>(() => {
    return [0, Math.max(1, bigMax)];
  }, [bigMax]);

  const bigTicks = useMemo(() => niceTicks(bigDomain[1], 6), [bigDomain]);

  const panelHeading = useMemo(
    () => formatRangeHeading(effective.start, effective.end),
    [effective.start, effective.end],
  );

  const safeMapData =
    mapData?.length && hasMeaningfulMapData(mapData)
      ? mapData
      : DEFAULT_MAP_DATA;

  const safeBarsData =
    barsData.length === 7 && hasMeaningfulBars(barsData)
      ? barsData
      : DEFAULT_BARS_DATA;

  return (
    <div className="space-y-5">
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

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {miniCards.map((c) => {
          const localMax = Math.max(1, ...c.series.map((n) => Math.max(0, n)));
          const localTicks = niceTicks(localMax, 4);
          const localLabels =
            c.xLabels && c.xLabels.length > 0
              ? mapSeriesToCount(c.xLabels, c.series.length)
              : mapSeriesToCount(
                  ["12AM", "8AM", "4PM", "11PM"],
                  c.series.length,
                );

          return (
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
                  dates={c.dates}
                  pinnedIndex={c.pinnedIndex}
                  tooltipDateMode="full"
                  domain={[0, localMax]}
                  yTicks={localTicks}
                  xLabels={localLabels}
                  stroke="#9A46FF"
                />
              }
            />
          );
        })}
      </section>

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
              <DateRangePicker
                value={dateRange}
                onChange={handleDateRangeChange}
              />
            </div>
          </div>

          <div
            className={[
              "pr-6 pb-5 h-[320px] sm:h-[340px] lg:h-[360px]",
              isLoading ? "opacity-70 transition-opacity" : "",
            ].join(" ")}
          >
            {multiLines ? (
              <RevenueChartMulti
                series={multiLines}
                pinSeriesKey={bigCard.pinSeriesKey}
                dates={dates}
                domain={bigDomain}
                yTicks={bigTicks}
                xLabels={labels}
                tooltip={bigTooltip}
                valuePrefix={bigCard.valuePrefix ?? ""}
                valueSuffix={bigCard.valueSuffix ?? ""}
                tooltipVariant="primary"
              />
            ) : (
              <RevenueChart
                data={bigSeries}
                dates={dates}
                domain={bigDomain}
                yTicks={bigTicks}
                xLabels={labels}
                tooltip={bigTooltip}
                stroke="#9A46FF"
                fillTop="#9A46FF"
                tooltipVariant="primary"
                valuePrefix={bigCard.valuePrefix}
                valueSuffix={bigCard.valueSuffix}
              />
            )}
          </div>
        </div>

        <div className="col-span-12 xl:col-span-4 rounded-lg border border-neutral-700 bg-neutral-900 p-5 flex flex-col justify-between">
          <div>
            <div className="text-[16px] uppercase text-neutral-400 font-extrabold leading-none">
              {donut.label}
            </div>
            <div className="mt-1 text-2xl font-extrabold">
              {panelHeading || donut.heading}
            </div>
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

      <section className="grid grid-cols-12 gap-5">
        <div className="col-span-12 xl:col-span-8 rounded-lg border border-neutral-700 bg-neutral-900 p-5">
          <div className="text-[16px] uppercase text-neutral-400 font-extrabold leading-none">
            {mapLabel}
          </div>

          <div className="mt-3 aspect-[16/9] overflow-hidden rounded-lg border border-neutral-700">
            <div className={isLoading ? "opacity-75 transition-opacity" : ""}>
              <LocationsChoroplethMap
                scope="world"
                mode={mode}
                data={safeMapData}
              />
            </div>
          </div>
        </div>

        <div className="col-span-12 xl:col-span-4 rounded-lg border border-neutral-700 bg-neutral-900 p-5 flex flex-col">
          <div className="shrink-0">
            <div className="text-[16px] uppercase text-neutral-400 font-extrabold leading-none">
              {barsLabel}
            </div>

            <div className="mt-1 text-2xl font-extrabold">
              {panelHeading || barsHeading}
            </div>
          </div>

          <div className="mt-4 flex-1 min-h-[260px]">
            {barsStacks?.length ? (
              <BarsWeekStacked
                series={barsStacks}
                highlightIndex={4}
                metric={mode}
              />
            ) : (
              <BarsWeek data={safeBarsData} highlightIndex={4} metric={mode} />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
