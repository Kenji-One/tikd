/* ------------------------------------------------------------------ */
/*  src/components/ui/DateRangePicker.tsx                             */
/* ------------------------------------------------------------------ */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export type DateRangeValue = {
  start: Date | null;
  end: Date | null;
};

type Props = {
  value: DateRangeValue;
  onChange: (next: DateRangeValue) => void;
  className?: string;
  minDate?: Date;
  maxDate?: Date;

  /**
   * Visual variant:
   * - compact: small trigger (good for dashboard cards)
   * - field: large input-style trigger (good for forms)
   */
  variant?: "compact" | "field";

  /** Popover alignment (defaults to right like before) */
  align?: "left" | "right";

  /** Optional class overrides */
  buttonClassName?: string;
  popoverClassName?: string;

  /** Marks trigger as errored (only affects variant="field") */
  error?: boolean;
};

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function clampToDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isBefore(a: Date, b: Date) {
  return a.getTime() < b.getTime();
}

function isAfter(a: Date, b: Date) {
  return a.getTime() > b.getTime();
}

function daysInMonth(year: number, month0: number) {
  return new Date(year, month0 + 1, 0).getDate();
}

function startOfMonth(year: number, month0: number) {
  return new Date(year, month0, 1);
}

function endOfMonth(year: number, month0: number) {
  return new Date(year, month0, daysInMonth(year, month0));
}

function monthOffsetMondayFirst(year: number, month0: number) {
  const d = new Date(year, month0, 1);
  const sunday0 = d.getDay();
  return (sunday0 + 6) % 7;
}

function fmtMonthYear(d: Date) {
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

function fmtFull(d: Date) {
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isLastDayOfMonth(d: Date) {
  const last = daysInMonth(d.getFullYear(), d.getMonth());
  return d.getDate() === last;
}

function fmtRangeLabel(start: Date | null, end: Date | null) {
  if (!start || !end) return "Select Dates";

  const wholeMonths = start.getDate() === 1 && isLastDayOfMonth(end);
  if (wholeMonths) {
    const a = fmtMonthYear(start);
    const b = fmtMonthYear(end);
    return a === b ? a : `${a} – ${b}`;
  }

  const a = fmtFull(start);
  const b = fmtFull(end);
  return a === b ? a : `${a} – ${b}`;
}

function inRange(d: Date, start: Date, end: Date) {
  const t = d.getTime();
  const a = start.getTime();
  const b = end.getTime();
  return t >= Math.min(a, b) && t <= Math.max(a, b);
}

function maxDate(a: Date, b: Date) {
  return a.getTime() >= b.getTime() ? a : b;
}

function minDate(a: Date, b: Date) {
  return a.getTime() <= b.getTime() ? a : b;
}

function isDisabled(d: Date, minD?: Date, maxD?: Date) {
  const t = d.getTime();
  if (minD && t < clampToDay(minD).getTime()) return true;
  if (maxD && t > clampToDay(maxD).getTime()) return true;
  return false;
}

function startOfYear(y: number) {
  return new Date(y, 0, 1);
}

function endOfYear(y: number) {
  return new Date(y, 11, 31);
}

function addDays(d: Date, delta: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + delta);
  return x;
}

function rangeEq(a: DateRangeValue, b: DateRangeValue) {
  if (!a.start || !a.end || !b.start || !b.end) return false;
  return (
    clampToDay(a.start).getTime() === clampToDay(b.start).getTime() &&
    clampToDay(a.end).getTime() === clampToDay(b.end).getTime()
  );
}

function normalizeRange(next: DateRangeValue, effMin: Date, effMax: Date) {
  const s = next.start ? clampToDay(next.start) : null;
  const e = next.end ? clampToDay(next.end) : null;

  const cs = s ? maxDate(s, effMin) : null;
  const ce = e ? minDate(e, effMax) : null;

  if (cs && ce && isBefore(ce, cs)) return { start: ce, end: cs };
  return { start: cs, end: ce };
}

export default function DateRangePicker({
  value,
  onChange,
  className,
  minDate: minDateProp,
  maxDate: maxDateProp,
  variant = "compact",
  align = "right",
  buttonClassName,
  popoverClassName,
  error,
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [monthOpen, setMonthOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);

  const today = useMemo(() => clampToDay(new Date()), []);
  const currentYear = useMemo(() => today.getFullYear(), [today]);

  const hardMin = useMemo(() => new Date(2020, 0, 1), []);

  // ✅ compact: up to current year
  // ✅ field: up to current year + 3
  const hardMax = useMemo(() => {
    const maxYear = variant === "field" ? currentYear + 3 : currentYear;
    return new Date(maxYear, 11, 31);
  }, [variant, currentYear]);

  const effMin = useMemo(() => {
    if (!minDateProp) return hardMin;
    return maxDate(clampToDay(minDateProp), hardMin);
  }, [minDateProp, hardMin]);

  const effMax = useMemo(() => {
    if (!maxDateProp) return hardMax;
    return minDate(clampToDay(maxDateProp), hardMax);
  }, [maxDateProp, hardMax]);

  const initialAnchor = useMemo(() => {
    const d = value.start ?? value.end ?? today;
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }, [value.start, value.end, today]);

  const [viewYear, setViewYear] = useState(initialAnchor.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialAnchor.getMonth());

  // Draft selection (only applied on "Done")
  const [draft, setDraft] = useState<DateRangeValue>({
    start: value.start ? clampToDay(value.start) : null,
    end: value.end ? clampToDay(value.end) : null,
  });

  // Committed values (from props)
  const committedStart = value.start ? clampToDay(value.start) : null;
  const committedEnd = value.end ? clampToDay(value.end) : null;

  // Draft values (used while popover is open)
  const start = draft.start ? clampToDay(draft.start) : null;
  const end = draft.end ? clampToDay(draft.end) : null;

  useEffect(() => {
    if (!open) return;

    const s = value.start ? clampToDay(value.start) : null;
    const e = value.end ? clampToDay(value.end) : null;

    setDraft({ start: s, end: e });

    const anchor = s ?? e ?? today;
    setViewYear(anchor.getFullYear());
    setViewMonth(anchor.getMonth());

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      if (!open) return;
      const el = rootRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        setOpen(false);
        setMonthOpen(false);
        setYearOpen(false);
        // ✅ closing without "Done" should NOT apply anything
      }
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") {
        setOpen(false);
        setMonthOpen(false);
        setYearOpen(false);
        // ✅ closing without "Done" should NOT apply anything
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const label = useMemo(
    () => fmtRangeLabel(committedStart, committedEnd),
    [committedStart, committedEnd],
  );

  const offset = monthOffsetMondayFirst(viewYear, viewMonth);
  const dim = daysInMonth(viewYear, viewMonth);

  const viewStart = startOfMonth(viewYear, viewMonth);
  const viewEnd = endOfMonth(viewYear, viewMonth);

  const canPrev = useMemo(() => {
    const prevMonthStart = startOfMonth(viewYear, viewMonth - 1);
    return (
      !effMin ||
      !isBefore(
        prevMonthStart,
        startOfMonth(effMin.getFullYear(), effMin.getMonth()),
      )
    );
  }, [viewYear, viewMonth, effMin]);

  const canNext = useMemo(() => {
    const nextMonthEnd = endOfMonth(viewYear, viewMonth + 1);
    return (
      !effMax ||
      !isAfter(
        nextMonthEnd,
        endOfMonth(effMax.getFullYear(), effMax.getMonth()),
      )
    );
  }, [viewYear, viewMonth, effMax]);

  const years = useMemo(() => {
    const baseFrom = variant === "field" ? 2025 : 2024;
    const baseTo = variant === "field" ? currentYear + 3 : currentYear;

    const from = Math.max(baseFrom, effMin.getFullYear());
    const to = Math.min(baseTo, effMax.getFullYear());

    const out: number[] = [];
    for (let y = to; y >= from; y--) out.push(y);
    return out;
  }, [variant, effMin, effMax, currentYear]);

  function moveMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  function commitPick(day: number) {
    const picked = clampToDay(new Date(viewYear, viewMonth, day));
    if (isDisabled(picked, effMin, effMax)) return;

    // ✅ Draft-only selection. "Done" applies.
    if (!start || (start && end)) {
      setDraft({ start: picked, end: null });
      return;
    }

    // start exists and end is null => set end
    let a = start;
    let b = picked;

    if (isBefore(b, a)) {
      const tmp = a;
      a = b;
      b = tmp;
    }

    setDraft({ start: a, end: b });
  }

  function clear() {
    // Keep existing behavior: clear applies immediately
    setDraft({ start: null, end: null });
    onChange({ start: null, end: null });
  }

  function applyRange(next: DateRangeValue) {
    const normalized = normalizeRange(next, effMin, effMax);
    onChange(normalized);

    setOpen(false);
    setMonthOpen(false);
    setYearOpen(false);
  }

  function applyDone() {
    if (!draft.start) return;

    // ✅ Single-day selection should apply immediately via Done (end = start)
    const next: DateRangeValue = draft.end
      ? draft
      : { start: draft.start, end: draft.start };

    applyRange(next);
  }

  // ✅ Presets are ONLY for compact variant (field variant should NOT show them at all)
  const presets = useMemo(() => {
    if (variant !== "compact") return [] as const;

    const t = today;

    const thisYear = {
      start: startOfYear(currentYear),
      end: endOfYear(currentYear),
    };
    const lastYear = {
      start: startOfYear(currentYear - 1),
      end: endOfYear(currentYear - 1),
    };

    return [
      { key: "today", label: "Today", range: { start: t, end: t } },
      {
        key: "last7",
        label: "Last 7 days",
        range: { start: addDays(t, -6), end: t },
      },
      {
        key: "last30",
        label: "Last 30 days",
        range: { start: addDays(t, -29), end: t },
      },
      { key: "thisYear", label: "This year", range: thisYear },
      { key: "lastYear", label: "Last year", range: lastYear },
    ] as const;
  }, [variant, today, currentYear]);

  const activeKey = useMemo(() => {
    if (variant !== "compact") return null;
    for (const p of presets) {
      if (rangeEq(value, p.range)) return p.key;
    }
    return null;
  }, [variant, presets, value]);

  const popover = clsx(
    "absolute z-30 mt-2 rounded-xl border border-white/10 bg-neutral-950/92 p-2.5 backdrop-blur-md",
    variant === "compact" ? "w-[min(420px,calc(100vw-24px))]" : "w-[292px]",
    align === "right" ? "right-0" : "left-0",
    popoverClassName,
  );

  const compactBtn =
    "inline-flex w-full items-center gap-2 rounded-md border border-white/10 bg-neutral-700 px-2.5 py-1.5 text-[11px] font-semibold text-white/80 hover:text-white hover:border-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 cursor-pointer";

  const fieldBtn = clsx(
    "w-full rounded-lg border bg-neutral-950/60 px-4 py-3 transition",
    "flex items-center justify-between gap-3",
    open ? "border-primary-500" : "border-white/10 hover:border-white/15",
    error && "border-error-500/70 ring-2 ring-error-500/10",
  );

  const sidebarBtn = (active: boolean) =>
    clsx(
      "w-full rounded-md px-2.5 py-1.5 text-left text-[11px] font-semibold leading-none transition",
      active
        ? "bg-primary-500/15 text-primary-300"
        : "text-white/80 hover:bg-white/5 hover:text-white",
    );

  const showSidebar = variant === "compact";

  return (
    <div ref={rootRef} className={clsx("relative", className)}>
      <style jsx>{`
        .tikd-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.18) rgba(255, 255, 255, 0.06);
        }
        .tikd-scroll::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .tikd-scroll::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.06);
          border-radius: 999px;
        }
        .tikd-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.18);
          border-radius: 999px;
        }
        .tikd-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.26);
        }
        .tikd-scroll::-webkit-scrollbar-button {
          display: none;
          width: 0;
          height: 0;
        }
      `}</style>

      {variant === "compact" ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={clsx(compactBtn, buttonClassName)}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <CalendarIcon size={13} className="opacity-80" />
          <span className="truncate">{label}</span>
          <ChevronDown
            size={13}
            className={clsx(
              "ml-auto opacity-70 transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={clsx(fieldBtn, buttonClassName)}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <div className="min-w-0 text-left">
            {committedStart && committedEnd ? (
              <div className="truncate text-base font-medium leading-none text-white/85 tabular-nums">
                {label}
              </div>
            ) : (
              <div className="truncate text-base font-medium leading-none text-white/35">
                Select Dates
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary-300" />
            <ChevronDown
              className={clsx(
                "h-5 w-5 text-white/50 transition-transform",
                open && "rotate-180",
              )}
            />
          </div>
        </button>
      )}

      {open && (
        <div className={popover} role="dialog" aria-label="Select date range">
          <div
            className={clsx(
              "gap-2.5",
              showSidebar ? "grid grid-cols-[124px_1fr]" : "grid grid-cols-1",
            )}
          >
            {/* ✅ Sidebar ONLY for compact variant (presets + year quick ranges) */}
            {showSidebar && (
              <div className="rounded-xl border border-white/10 bg-neutral-900/60 p-1.5">
                <div
                  className={clsx(
                    "tikd-scroll max-h-[250px] overflow-auto pr-1",
                  )}
                >
                  <div className="space-y-1">
                    {presets.map((p) => (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => applyRange(p.range)}
                        className={
                          sidebarBtn(activeKey === p.key) + " cursor-pointer"
                        }
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  <div className="my-2 h-px bg-white/10" />

                  <div className="space-y-1">
                    {years.map((y) => {
                      const yrRange = {
                        start: startOfYear(y),
                        end: endOfYear(y),
                      };
                      const active = rangeEq(value, yrRange);
                      return (
                        <button
                          key={y}
                          type="button"
                          onClick={() => applyRange(yrRange)}
                          className={sidebarBtn(active) + " cursor-pointer"}
                        >
                          {y}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Calendar */}
            <div>
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => canPrev && moveMonth(-1)}
                  className={clsx(
                    "grid size-7 place-items-center rounded-full border border-white/10 bg-neutral-900 text-white/80 transition hover:border-primary-500 hover:text-white cursor-pointer",
                    !canPrev && "opacity-40 pointer-events-none",
                  )}
                  aria-label="Previous month"
                >
                  <ChevronLeft size={14} />
                </button>

                <div className="relative flex items-center gap-2">
                  {/* Month */}
                  <button
                    type="button"
                    onClick={() => {
                      setMonthOpen((v) => !v);
                      setYearOpen(false);
                    }}
                    className={clsx(
                      "inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-neutral-900 px-2.5 py-1.5 text-[11px] font-semibold text-white/90",
                      "hover:border-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 cursor-pointer",
                    )}
                    aria-expanded={monthOpen}
                    aria-haspopup="listbox"
                  >
                    {MONTHS[viewMonth]}
                    <ChevronDown
                      size={13}
                      className={clsx(
                        "opacity-70 transition-transform",
                        monthOpen && "rotate-180",
                      )}
                    />
                  </button>

                  {/* Year */}
                  <button
                    type="button"
                    onClick={() => {
                      setYearOpen((v) => !v);
                      setMonthOpen(false);
                    }}
                    className={clsx(
                      "inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-neutral-900 px-2.5 py-1.5 text-[11px] font-semibold text-white/90",
                      "hover:border-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 cursor-pointer",
                    )}
                    aria-expanded={yearOpen}
                    aria-haspopup="listbox"
                  >
                    {viewYear}
                    <ChevronDown
                      size={13}
                      className={clsx(
                        "opacity-70 transition-transform",
                        yearOpen && "rotate-180",
                      )}
                    />
                  </button>

                  {monthOpen && (
                    <div
                      className="absolute left-0 top-[38px] z-40 w-[89px] overflow-hidden rounded-md border border-white/10 bg-neutral-900"
                      role="listbox"
                      aria-label="Select month"
                    >
                      <div
                        className={clsx(
                          "tikd-scroll max-h-[207px] overflow-auto p-1",
                        )}
                      >
                        {MONTHS.map((m, i) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => {
                              setViewMonth(i);
                              setMonthOpen(false);
                            }}
                            className={clsx(
                              "w-full rounded-md px-2 py-1.5 text-left text-[11px] font-semibold transition cursor-pointer",
                              i === viewMonth
                                ? "bg-primary-500/15 text-primary-300"
                                : "text-white/80 hover:bg-white/5 hover:text-white",
                            )}
                            role="option"
                            aria-selected={i === viewMonth}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {yearOpen && (
                    <div
                      className="absolute right-0 top-[38px] z-40 w-[68px] overflow-hidden rounded-md border border-white/10 bg-neutral-900"
                      role="listbox"
                      aria-label="Select year"
                    >
                      <div
                        className={clsx(
                          "tikd-scroll max-h-[207px] overflow-auto p-1",
                        )}
                      >
                        {years.map((y) => (
                          <button
                            key={y}
                            type="button"
                            onClick={() => {
                              setViewYear(y);
                              setYearOpen(false);
                            }}
                            className={clsx(
                              "w-full rounded-md px-2.5 py-1.5 text-left text-[11px] font-semibold transition cursor-pointer",
                              y === viewYear
                                ? "bg-primary-500/15 text-primary-300"
                                : "text-white/80 hover:bg-white/5 hover:text-white",
                            )}
                            role="option"
                            aria-selected={y === viewYear}
                          >
                            {y}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => canNext && moveMonth(1)}
                  className={clsx(
                    "grid size-7 place-items-center rounded-full border border-white/10 bg-neutral-900 text-white/80 transition hover:border-primary-500 hover:text-white cursor-pointer",
                    !canNext && "opacity-40 pointer-events-none",
                  )}
                  aria-label="Next month"
                >
                  <ChevronRight size={14} />
                </button>
              </div>

              <div className="mt-2.5 grid grid-cols-7 gap-1 px-1">
                {WEEKDAYS.map((w) => (
                  <div
                    key={w}
                    className="text-center text-[10px] font-semibold text-neutral-400"
                  >
                    {w}
                  </div>
                ))}
              </div>

              <div className="mt-1.5 grid grid-cols-7 gap-1 px-1">
                {Array.from({ length: offset }).map((_, i) => (
                  <div key={`sp-${i}`} className="h-8" />
                ))}

                {Array.from({ length: dim }).map((_, idx) => {
                  const day = idx + 1;
                  const d = clampToDay(new Date(viewYear, viewMonth, day));

                  const disabled = isDisabled(d, effMin, effMax);

                  const isStart = !!start && sameDay(d, start);
                  const isEnd = !!end && sameDay(d, end);
                  const hasRange = !!start && !!end;

                  const between =
                    hasRange &&
                    start &&
                    end &&
                    inRange(d, start, end) &&
                    !isStart &&
                    !isEnd;

                  const isToday = sameDay(d, today);

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => commitPick(day)}
                      disabled={disabled}
                      className={clsx(
                        "h-8 rounded-lg text-[11px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 cursor-pointer",
                        disabled
                          ? "cursor-not-allowed text-white/20 opacity-45"
                          : "text-white/85 hover:bg-white/5",
                        between && !disabled && "bg-primary-500/12 text-white",
                        (isStart || isEnd) &&
                          !disabled &&
                          "bg-primary-500 text-white shadow-[0_10px_24px_rgba(154,70,255,0.26)]",
                        isToday &&
                          !disabled &&
                          !isStart &&
                          !isEnd &&
                          "border border-white/10",
                      )}
                      aria-label={d.toLocaleDateString(undefined, {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              <div className="mt-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0 text-[10px] font-semibold text-white/70">
                  <span className="text-white/50">From:</span>{" "}
                  <span className="text-white/85">
                    {start ? fmtFull(start) : "—"}
                  </span>
                  <span className="mx-2 text-white/25">•</span>
                  <span className="text-white/50">To:</span>{" "}
                  <span className="text-white/85">
                    {end ? fmtFull(end) : "—"}
                  </span>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={clear}
                    className="rounded-md border border-white/10 bg-neutral-900 px-2.5 py-1.5 text-[10px] font-semibold text-white/75 hover:border-primary-500 hover:text-white cursor-pointer"
                  >
                    Clear
                  </button>

                  <button
                    type="button"
                    onClick={applyDone}
                    disabled={!draft.start}
                    className={clsx(
                      "rounded-md px-2.5 py-1.5 text-[10px] font-semibold transition",
                      "border",
                      draft.start
                        ? "cursor-pointer border-primary-500/35 bg-primary-500/20 text-primary-100 hover:bg-primary-500/26 hover:border-primary-500/55"
                        : "cursor-not-allowed border-white/10 bg-white/5 text-white/30 opacity-80",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40",
                    )}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>

          <span className="sr-only">
            {viewStart.toISOString()} {viewEnd.toISOString()} {String(open)}
          </span>
        </div>
      )}
    </div>
  );
}
