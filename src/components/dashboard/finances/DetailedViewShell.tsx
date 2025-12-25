"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
} from "lucide-react";
import clsx from "clsx";

import SmallKpiChart from "@/components/dashboard/charts/SmallKpiChart";
import RevenueChart, {
  type RevenueTooltip,
} from "@/components/dashboard/charts/RevenueChart";
import BarsWeek from "@/components/dashboard/charts/BarsWeek";
import DonutFull, {
  type DonutSegment,
} from "@/components/dashboard/charts/DonutFull";
import MiniMetricCard from "@/components/dashboard/cards/MiniMetricCard";

/* --------------------------- Date helpers ---------------------------- */
type Range = { id: string; label: string; start: Date; end: Date };

const makeRange = (label: string, y: number): Range => ({
  id: `y-${y}`,
  label,
  start: new Date(y, 0, 1),
  end: new Date(y, 11, 31),
});

const RANGES: Range[] = [
  makeRange("Jan 2024 – Dec 2024", 2024),
  makeRange("Jan 2025 – Dec 2025", 2025),
];

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

/* ------------------------------ Types ------------------------------ */
type MiniCardCfg = {
  title: string;
  value: string;
  delta?: string;
  negative?: boolean;
  series: number[];
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
  mapSrc?: string;

  barsLabel: string;
  barsHeading: string;
  barsData: number[];
};

export function DeltaBadge({ delta }: { delta?: string }) {
  const raw = (delta ?? "").trim();
  if (!raw) return null;

  const isNegative = raw.startsWith("-");
  const txt = raw.replace(/^[-+]\s*/, "");

  const deltaColor = isNegative
    ? "bg-error-900 text-error-500 border-error-800"
    : "bg-success-900 text-success-500 border-success-800";

  const deltaIcon = isNegative ? (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M14.6133 11.5867C14.5457 11.7496 14.4162 11.879 14.2533 11.9467C14.1732 11.9808 14.0871 11.9989 14 12H10.6667C10.4899 12 10.3203 11.9298 10.1953 11.8047C10.0702 11.6797 10 11.5101 10 11.3333C10 11.1565 10.0702 10.987 10.1953 10.8619C10.3203 10.7369 10.4899 10.6667 10.6667 10.6667H12.3933L8.66667 6.94L6.47333 9.14C6.41136 9.20249 6.33762 9.25208 6.25638 9.28593C6.17515 9.31977 6.08801 9.3372 6 9.3372C5.91199 9.3372 5.82486 9.31977 5.74362 9.28593C5.66238 9.25208 5.58864 9.20249 5.52667 9.14L1.52667 5.14C1.46418 5.07802 1.41458 5.00429 1.38074 4.92305C1.34689 4.84181 1.32947 4.75467 1.32947 4.66667C1.32947 4.57866 1.34689 4.49152 1.38074 4.41028C1.41458 4.32904 1.46418 4.25531 1.52667 4.19333C1.58864 4.13085 1.66238 4.08125 1.74362 4.04741C1.82486 4.01356 1.91199 3.99613 2 3.99613C2.08801 3.99613 2.17514 4.01356 2.25638 4.04741C2.33762 4.08125 2.41136 4.13085 2.47333 4.19333L6 7.72667L8.19333 5.52667C8.25531 5.46418 8.32904 5.41459 8.41028 5.38074C8.49152 5.34689 8.57866 5.32947 8.66667 5.32947C8.75467 5.32947 8.84181 5.34689 8.92305 5.38074C9.00429 5.41459 9.07802 5.46418 9.14 5.52667L13.3333 9.72667V8C13.3333 7.82319 13.4036 7.65362 13.5286 7.5286C13.6536 7.40357 13.8232 7.33333 14 7.33333C14.1768 7.33333 14.3464 7.40357 14.4714 7.5286C14.5964 7.65362 14.6667 7.82319 14.6667 8V11.3333C14.6656 11.4205 14.6475 11.5065 14.6133 11.5867Z"
        fill="#FF454A"
      />
    </svg>
  ) : (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M14.6133 4.41333C14.5457 4.25043 14.4162 4.12098 14.2533 4.05333C14.1732 4.01917 14.0871 4.00105 14 4H10.6667C10.4899 4 10.3203 4.07024 10.1953 4.19526C10.0702 4.32029 10 4.48986 10 4.66667C10 4.84348 10.0702 5.01305 10.1953 5.13807C10.3203 5.2631 10.4899 5.33333 10.6667 5.33333H12.3933L8.66667 9.06L6.47333 6.86C6.41136 6.79751 6.33762 6.74792 6.25638 6.71407C6.17515 6.68023 6.08801 6.6628 6 6.6628C5.91199 6.6628 5.82486 6.68023 5.74362 6.71407C5.66238 6.74792 5.58864 6.79751 5.52667 6.86L1.52667 10.86C1.46418 10.922 1.41458 10.9957 1.38074 11.0769C1.34689 11.1582 1.32947 11.2453 1.32947 11.3333C1.32947 11.4213 1.34689 11.5085 1.38074 11.5897C1.41458 11.671 1.46418 11.7447 1.52667 11.8067C1.58864 11.8692 1.66238 11.9187 1.74362 11.9526C1.82486 11.9864 1.91199 12.0039 2 12.0039C2.08801 12.0039 2.17514 11.9864 2.25638 11.9526C2.33762 11.9187 2.41136 11.8692 2.47333 11.8067L6 8.27333L8.19333 10.4733C8.25531 10.5358 8.32904 10.5854 8.41028 10.6193C8.49152 10.6531 8.57866 10.6705 8.66667 10.6705C8.75467 10.6705 8.84181 10.6531 8.92305 10.6193C9.00429 10.5854 9.07802 10.5358 9.14 10.4733L13.3333 6.27333V8C13.3333 8.17681 13.4036 8.34638 13.5286 8.4714C13.6536 8.59643 13.8232 8.66667 14 8.66667C14.1768 8.66667 14.3464 8.59643 14.4714 8.4714C14.5964 8.34638 14.6667 8.17681 14.6667 8V4.66667C14.6656 4.57955 14.6475 4.49348 14.6133 4.41333Z"
        fill="#45FF79"
      />
    </svg>
  );

  return (
    <span
      className={clsx(
        "flex items-center gap-0.5 rounded-md px-1.5 py-1 text-[12px] font-semibold leading-none border",
        deltaColor
      )}
    >
      {deltaIcon}
      <span className="tabular-nums">{txt}</span>
    </span>
  );
}

export default function DetailedViewShell({
  heading,
  backHref = "/dashboard",

  miniCards,

  bigCard,

  donut,

  mapLabel,
  mapSrc = "https://www.openstreetmap.org/export/embed.html?bbox=-140.0,5.0,-45.0,70.0&layer=mapnik",

  barsLabel,
  barsHeading,
  barsData,
}: Props) {
  const [range, setRange] = useState<Range>(RANGES[0]);
  const [menuOpen, setMenuOpen] = useState(false);

  const labels = useMemo(() => monthLabels(range.start, range.end), [range]);
  const dates = useMemo(() => monthDates(range.start, range.end), [range]);

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
            value={c.value}
            delta={c.delta}
            negative={c.negative}
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
              <div className="text-xs text-white/60">{bigCard.label}</div>
              <div className="mt-1 flex items-center gap-2">
                <div className="text-3xl font-extrabold">{bigCard.value}</div>
                <DeltaBadge delta={bigCard.delta} />
              </div>
            </div>

            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#1A1C29] px-3 py-2 text-xs text-white/80 hover:border-violet-500/40"
              >
                <CalendarIcon size={14} className="opacity-80" />
                {range.label}
                <ChevronDown size={14} className="opacity-70" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 z-10 mt-2 w-56 rounded-lg border border-white/10 bg-[#1A1C29] p-1 text-xs text-white/80 shadow-lg">
                  {RANGES.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        setRange(r);
                        setMenuOpen(false);
                      }}
                      className={clsx(
                        "w-full rounded-md px-3 py-2 text-left hover:bg-white/5",
                        r.id === range.id && "bg-white/10"
                      )}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="pr-6 pb-5 h-[320px] sm:h-[340px] lg:h-[360px]">
            <RevenueChart
              data={bigCard.series}
              dates={dates}
              domain={[0, 250_000]}
              yTicks={[0, 25_000, 50_000, 100_000, 150_000, 200_000, 250_000]}
              xLabels={labels}
              tooltip={bigCard.tooltip}
              stroke="#9A46FF"
              fillTop="#9A46FF"
              tooltipVariant="primary"
              valuePrefix={bigCard.valuePrefix}
              valueSuffix={bigCard.valueSuffix}
            />
          </div>
        </div>

        <div className="col-span-12 xl:col-span-4 rounded-lg border border-neutral-700 bg-neutral-900 p-5">
          <div className="text-xs text-white/60">{donut.label}</div>
          <div className="mt-1 text-lg font-extrabold">{donut.heading}</div>

          <DonutFull
            segments={donut.segments}
            height={260}
            thickness={28}
            padAngle={4}
            minSliceAngle={6}
            trackColor="rgba(255,255,255,0.10)"
            showSliceBadges
          />

          <ul className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
            {donut.segments.map((s) => (
              <li
                key={s.label}
                className="flex items-center gap-2 text-white/80"
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span className="mr-auto">{s.label}</span>
                <span className="text-white/60">{s.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Map + Peak days */}
      <section className="grid grid-cols-12 gap-5">
        <div className="col-span-12 xl:col-span-8 rounded-lg border border-neutral-700 bg-neutral-900 p-5">
          <div className="text-xs text-white/60">{mapLabel}</div>
          <div className="mt-3 aspect-[16/9] overflow-hidden rounded-lg border border-neutral-700">
            <iframe
              title="Locations Map"
              className="h-full w-full"
              src={mapSrc}
            />
          </div>
        </div>

        <div className="col-span-12 xl:col-span-4 rounded-lg border border-neutral-700 bg-neutral-900 p-5">
          <div className="text-xs text-white/60">{barsLabel}</div>
          <div className="mt-1 text-lg font-extrabold">{barsHeading}</div>
          <div className="mt-4 h-[260px]">
            <BarsWeek data={barsData} highlightIndex={4} />
          </div>
        </div>
      </section>
    </div>
  );
}
