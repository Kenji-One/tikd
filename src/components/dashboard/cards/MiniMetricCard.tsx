/* ------------------------------------------------------------------ */
/*  src/components/dashboard/cards/MiniMetricCard.tsx                 */
/* ------------------------------------------------------------------ */
"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";

import Modal from "@/components/ui/Modal";
import DateRangePicker, {
  type DateRangeValue,
} from "@/components/ui/DateRangePicker";

import RevenueChart from "@/components/dashboard/charts/RevenueChart";
import DeltaBadge from "@/components/ui/DeltaBadge";

type Props = {
  title: string;
  value: string;
  delta?: string;
  icon?: ReactNode;

  /** Base series for the card + Expand modal */
  series: number[];

  chart: ReactNode;
  className?: string;
};

type ResolutionPreset = "auto" | "daily" | "12h" | "6h" | "hourly";

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

function buildEvenlySpacedDates(start: Date, end: Date, count: number) {
  const s = clampToDay(start).getTime();
  const e = clampToDay(end).getTime() + (24 * 60 * 60 * 1000 - 1);
  if (count <= 1) return [new Date(s)];
  const step = (e - s) / (count - 1);
  return Array.from({ length: count }, (_, i) => new Date(s + step * i));
}

function resampleLinear(series: number[], count: number) {
  const a = series.length ? series : [0];
  if (count <= 1) return [a[0] ?? 0];
  if (a.length === 1) return Array.from({ length: count }, () => a[0] ?? 0);

  const last = a.length - 1;
  return Array.from({ length: count }, (_, i) => {
    const t = (i * last) / (count - 1);
    const lo = Math.floor(t);
    const hi = Math.min(lo + 1, last);
    const p = t - lo;
    const v0 = a[lo] ?? 0;
    const v1 = a[hi] ?? v0;
    return v0 * (1 - p) + v1 * p;
  });
}

function niceTicks(maxValue: number, targetCount = 5) {
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

  const count = Math.max(3, Math.min(7, targetCount));
  const actualStep = top / (count - 1);

  const ticks: number[] = [];
  for (let i = 0; i < count; i++) ticks.push(Math.round(i * actualStep));

  ticks[0] = 0;
  ticks[ticks.length - 1] = top;

  const uniq: number[] = [];
  for (const t of ticks) {
    if (uniq.length === 0 || uniq[uniq.length - 1] !== t) uniq.push(t);
  }
  return uniq;
}

function formatAxisLabel(d: Date) {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function pointsForResolution(days: number, preset: ResolutionPreset) {
  if (preset === "auto") return Math.max(24, Math.min(120, days * 2));

  const factor: Record<Exclude<ResolutionPreset, "auto">, number> = {
    daily: 1,
    "12h": 2,
    "6h": 4,
    hourly: 24,
  };

  return Math.max(2, Math.min(180, days * factor[preset]));
}

function isMoneyOrPercent(title: string, value: string) {
  const t = title.toLowerCase();
  const v = value.toLowerCase();
  return (
    v.includes("$") ||
    v.includes("%") ||
    t.includes("revenue") ||
    t.includes("rate")
  );
}

const RES_OPTIONS: Array<{
  key: ResolutionPreset;
  label: string;
  hint: string;
}> = [
  { key: "auto", label: "Auto", hint: "Balanced detail" },
  { key: "daily", label: "Daily", hint: "One point / day" },
  { key: "12h", label: "12h", hint: "Twice per day" },
  { key: "6h", label: "6h", hint: "Four points / day" },
  { key: "hourly", label: "Hourly", hint: "Most detailed" },
];

export default function MiniMetricCard({
  title,
  value,
  delta,
  icon,
  series,
  chart,
  className,
}: Props) {
  const [open, setOpen] = useState(false);

  // default expand range: last 7 days
  const today = useMemo(() => clampToDay(new Date()), []);
  const [dateRange, setDateRange] = useState<DateRangeValue>(() => ({
    start: addDays(today, -6),
    end: today,
  }));

  const [resolution, setResolution] = useState<ResolutionPreset>("auto");

  const expanded = useMemo(() => {
    const start = (dateRange.start as Date) ?? addDays(today, -6);
    const end = (dateRange.end as Date) ?? today;

    const days = diffDaysInclusive(start, end);
    const points = pointsForResolution(days, resolution);

    const base = resampleLinear(series, points);

    const keepDecimals = isMoneyOrPercent(title, value);
    const data = base.map((v) =>
      keepDecimals ? Math.round(v * 10) / 10 : Math.round(v),
    );

    const dates = buildEvenlySpacedDates(start, end, points);

    const max = Math.max(0, ...data);
    const domain: [number, number] = [0, Math.max(1, max)];
    const yTicks = niceTicks(domain[1], 5);

    const xLabels = dates.map(formatAxisLabel);

    return { data, dates, domain, yTicks, xLabels };
  }, [dateRange.start, dateRange.end, series, resolution, today, title, value]);

  /* -------------------------- Resolution dropdown -------------------------- */
  const [resOpen, setResOpen] = useState(false);
  const resWrapRef = useRef<HTMLDivElement | null>(null);

  const resLabel = useMemo(() => {
    return RES_OPTIONS.find((o) => o.key === resolution)?.label ?? "Auto";
  }, [resolution]);

  useEffect(() => {
    if (!resOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setResOpen(false);
    };

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const el = resWrapRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setResOpen(false);
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("touchstart", onPointerDown, { passive: true });

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("touchstart", onPointerDown as any);
    };
  }, [resOpen]);

  const ResItem = ({
    active,
    label,
    hint,
    onClick,
  }: {
    active: boolean;
    label: string;
    hint: string;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "w-full text-left px-3 py-2 rounded-md",
        "transition-[background,color] duration-150",
        active
          ? "bg-primary-500/14 text-white"
          : "text-white/80 hover:bg-white/5",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12px] font-semibold">{label}</span>
        {active ? (
          <span className="text-[10px] font-semibold text-primary-200">
            Selected
          </span>
        ) : null}
      </div>
      <div className="mt-0.5 text-[11px] text-white/45">{hint}</div>
    </button>
  );

  return (
    <>
      <div
        className={clsx(
          "rounded-lg border border-neutral-700 bg-neutral-900 p-4",
          className,
        )}
      >
        {/* Title + top-right icon */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[16px] uppercase text-neutral-400 font-extrabold leading-none">
              {title}
            </div>

            <div className="mt-2 flex items-center gap-2">
              <div className="text-xl font-extrabold tracking-tight">
                {value}
              </div>
              <DeltaBadge delta={delta} />
            </div>
          </div>

          {icon ? (
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-[5px] border border-primary-500/40 bg-primary-500/20 text-primary-200 shadow-[0_10px_26px_rgba(154,70,255,0.12)]">
              {icon}
            </div>
          ) : null}
        </div>

        <div className="mt-3">{chart}</div>

        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="pointer-events-auto rounded-full border border-neutral-500 bg-neutral-700 px-3 py-1.5 text-xs font-medium text-white transition duration-200 hover:border-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-5"
          >
            Expand
          </button>
        </div>
      </div>

      {/* Expand Modal */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`${title} — Expanded`}
        size="lg"
      >
        <div className="grid gap-3">
          {/* Header row */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[11px] text-white/55 uppercase font-semibold tracking-wide">
                {title}
              </div>

              <div className="mt-1 flex items-center gap-2">
                <div className="text-2xl font-extrabold tracking-tight">
                  {value}
                </div>
                <DeltaBadge delta={delta} />
              </div>

              <div className="mt-1 text-[11px] text-white/45">
                Choose date range and time granularity.
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              {/* Date range */}
              <div className="w-[220px]">
                <DateRangePicker value={dateRange} onChange={setDateRange} />
              </div>

              {/* Resolution dropdown */}
              <div ref={resWrapRef} className="relative">
                <button
                  type="button"
                  onClick={() => setResOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={resOpen}
                  className={clsx(
                    "h-[36px] px-3.5 rounded-lg",
                    "inline-flex items-center gap-2",
                    "bg-neutral-950/28 backdrop-blur-xl",
                    "border border-white/8 ring-1 ring-white/5",
                    "text-white/80",
                    "transition-[background,border,filter,transform] duration-200",
                    "hover:bg-neutral-950/34 hover:border-white/12",
                    "active:scale-[0.99]",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30",
                  )}
                >
                  <span className="text-[11px] text-white/55 font-semibold">
                    Resolution
                  </span>
                  <span className="text-[12px] font-semibold text-white">
                    {resLabel}
                  </span>
                  <span className="text-white/55 text-[12px] leading-none">
                    ▾
                  </span>
                </button>

                {resOpen ? (
                  <div
                    role="menu"
                    className={clsx(
                      "absolute right-0 mt-2 w-full p-1.5",
                      "rounded-xl",
                      "bg-neutral-950/80 backdrop-blur-2xl",
                      "border border-white/10 ring-1 ring-white/6",
                      "shadow-[0_22px_70px_rgba(0,0,0,0.55)]",
                      "z-50",
                    )}
                  >
                    {RES_OPTIONS.map((opt) => (
                      <ResItem
                        key={opt.key}
                        active={resolution === opt.key}
                        label={opt.label}
                        hint={opt.hint}
                        onClick={() => {
                          setResolution(opt.key);
                          setResOpen(false);
                        }}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Chart */}
          <div
            className={clsx(
              "h-[280px] rounded-lg",
              "bg-neutral-950/16",
              "ring-1 ring-white/7",
              "shadow-[0_18px_52px_rgba(0,0,0,0.36)]",
              "p-3",
            )}
          >
            <RevenueChart
              data={expanded.data}
              dates={expanded.dates}
              domain={expanded.domain}
              yTicks={expanded.yTicks}
              xLabels={expanded.xLabels}
              tooltipDateMode="full"
              tooltipVariant="primary"
              valuePrefix=""
              valueSuffix=""
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
