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

  /** Optional constraints */
  minDate?: Date;
  maxDate?: Date;
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

/** Monday-first offset (0..6) */
function monthOffsetMondayFirst(year: number, month0: number) {
  const d = new Date(year, month0, 1);
  const sunday0 = d.getDay(); // 0=Sun
  return (sunday0 + 6) % 7; // shift so Monday=0
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

/**
 * Button label rule:
 * - if range covers whole months (start day=1, end=last day) => "MMM YYYY – MMM YYYY"
 * - else => "MMM D, YYYY – MMM D, YYYY"
 */
function fmtRangeLabel(start: Date | null, end: Date | null) {
  if (!start && !end) return "Select dates";
  if (start && !end) return `${fmtFull(start)} – …`;
  if (!start && end) return `… – ${fmtFull(end)}`;

  const s = start!;
  const e = end!;
  const wholeMonths = s.getDate() === 1 && isLastDayOfMonth(e);

  if (wholeMonths) {
    const a = fmtMonthYear(s);
    const b = fmtMonthYear(e);
    return a === b ? a : `${a} – ${b}`;
  }

  const a = fmtFull(s);
  const b = fmtFull(e);
  return a === b ? a : `${a} – ${b}`;
}

function inRange(d: Date, start: Date, end: Date) {
  const t = d.getTime();
  const a = start.getTime();
  const b = end.getTime();
  return t >= Math.min(a, b) && t <= Math.max(a, b);
}

function isDisabled(d: Date, minDate?: Date, maxDate?: Date) {
  const t = d.getTime();
  if (minDate && t < clampToDay(minDate).getTime()) return true;
  if (maxDate && t > clampToDay(maxDate).getTime()) return true;
  return false;
}

export default function DateRangePicker({
  value,
  onChange,
  className,
  minDate,
  maxDate,
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [monthOpen, setMonthOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);

  const today = useMemo(() => clampToDay(new Date()), []);
  const initialAnchor = useMemo(() => {
    const d = value.start ?? value.end ?? today;
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }, [value.start, value.end, today]);

  const [viewYear, setViewYear] = useState(initialAnchor.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialAnchor.getMonth());

  // keep view aligned when opening
  useEffect(() => {
    if (!open) return;
    const d = value.start ?? value.end ?? today;
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // outside click
  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      if (!open) return;
      const el = rootRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        setOpen(false);
        setMonthOpen(false);
        setYearOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [open]);

  // escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") {
        setOpen(false);
        setMonthOpen(false);
        setYearOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const start = value.start ? clampToDay(value.start) : null;
  const end = value.end ? clampToDay(value.end) : null;

  const label = useMemo(() => fmtRangeLabel(start, end), [start, end]);

  const offset = monthOffsetMondayFirst(viewYear, viewMonth);
  const dim = daysInMonth(viewYear, viewMonth);

  const viewStart = startOfMonth(viewYear, viewMonth);
  const canPrev =
    !minDate ||
    isAfter(viewStart, startOfMonth(minDate.getFullYear(), minDate.getMonth()));
  const viewEnd = endOfMonth(viewYear, viewMonth);
  const canNext =
    !maxDate ||
    isBefore(viewEnd, endOfMonth(maxDate.getFullYear(), maxDate.getMonth()));

  const years = useMemo(() => {
    const base = (value.start ?? value.end ?? today).getFullYear();
    const from = Math.min(
      base - 50,
      minDate ? minDate.getFullYear() : base - 50
    );
    const to = Math.max(base + 10, maxDate ? maxDate.getFullYear() : base + 10);
    const out: number[] = [];
    for (let y = from; y <= to; y++) out.push(y);
    return out;
  }, [value.start, value.end, today, minDate, maxDate]);

  function moveMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  function commitPick(day: number) {
    const picked = clampToDay(new Date(viewYear, viewMonth, day));
    if (isDisabled(picked, minDate, maxDate)) return;

    // Range picking logic:
    // - if no start OR (start and end already set) => set start, clear end
    // - else set end (swap if needed), then close
    if (!start || (start && end)) {
      onChange({ start: picked, end: null });
      return;
    }

    // start set, end not set
    let a = start;
    let b = picked;

    if (isBefore(b, a)) {
      const tmp = a;
      a = b;
      b = tmp;
    }

    onChange({ start: a, end: b });
    setOpen(false);
    setMonthOpen(false);
    setYearOpen(false);
  }

  function clear() {
    onChange({ start: null, end: null });
  }

  const popover =
    "absolute right-0 z-30 mt-2 w-[320px] rounded-2xl border border-white/10 bg-neutral-948 p-3 shadow-[0_22px_55px_rgba(0,0,0,0.55)]";
  const controlBtn =
    "inline-flex items-center gap-2 rounded-md border border-white/10 bg-neutral-700 px-3 py-2 text-xs text-white/80 hover:text-white hover:border-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 cursor-pointer";

  return (
    <div ref={rootRef} className={clsx("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={controlBtn}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <CalendarIcon size={14} className="opacity-80" />
        <span className="whitespace-nowrap">{label}</span>
        <ChevronDown
          size={14}
          className={clsx(
            "opacity-70 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className={popover} role="dialog" aria-label="Select date range">
          {/* Header controls: prev / month dropdown / year dropdown / next */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => canPrev && moveMonth(-1)}
              className={clsx(
                "grid size-9 place-items-center rounded-full border border-white/10 bg-neutral-900 text-white/80 transition hover:border-primary-500 hover:text-white",
                !canPrev && "opacity-40 pointer-events-none"
              )}
              aria-label="Previous month"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="relative flex items-center gap-2">
              {/* Month dropdown */}
              <button
                type="button"
                onClick={() => {
                  setMonthOpen((v) => !v);
                  setYearOpen(false);
                }}
                className={clsx(
                  " inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-neutral-900 px-2.5 py-1.5 text-xs font-semibold text-white/90",
                  "hover:border-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
                )}
                aria-expanded={monthOpen}
                aria-haspopup="listbox"
              >
                {MONTHS[viewMonth]}
                <ChevronDown
                  size={14}
                  className={clsx(
                    "opacity-70 transition-transform",
                    monthOpen && "rotate-180"
                  )}
                />
              </button>

              {/* Year dropdown */}
              <button
                type="button"
                onClick={() => {
                  setYearOpen((v) => !v);
                  setMonthOpen(false);
                }}
                className={clsx(
                  "inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-neutral-900 px-2.5 py-1.5 text-xs font-semibold text-white/90",
                  "hover:border-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
                )}
                aria-expanded={yearOpen}
                aria-haspopup="listbox"
              >
                {viewYear}
                <ChevronDown
                  size={14}
                  className={clsx(
                    "opacity-70 transition-transform",
                    yearOpen && "rotate-180"
                  )}
                />
              </button>

              {/* Month list */}
              {monthOpen && (
                <div
                  className="absolute left-0 top-[42px] z-40 w-[107px] overflow-hidden rounded-[6px] border border-white/10 bg-neutral-900 shadow-[0_18px_45px_rgba(0,0,0,0.55)]"
                  role="listbox"
                  aria-label="Select month"
                >
                  <div className="max-h-[240px] overflow-auto p-1">
                    {MONTHS.map((m, i) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setViewMonth(i);
                          setMonthOpen(false);
                        }}
                        className={clsx(
                          "w-full rounded-lg px-3 py-2 text-left text-xs font-semibold transition",
                          i === viewMonth
                            ? "bg-primary-500/15 text-primary-300"
                            : "text-white/80 hover:bg-white/5 hover:text-white"
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

              {/* Year list */}
              {yearOpen && (
                <div
                  className="absolute right-0 top-[42px] z-40 w-[78px] overflow-hidden rounded-[6px] border border-white/10 bg-neutral-900 shadow-[0_18px_45px_rgba(0,0,0,0.55)]"
                  role="listbox"
                  aria-label="Select year"
                >
                  <div className="max-h-[240px] overflow-auto p-1">
                    {years.map((y) => (
                      <button
                        key={y}
                        type="button"
                        onClick={() => {
                          setViewYear(y);
                          setYearOpen(false);
                        }}
                        className={clsx(
                          "w-full rounded-lg px-3 py-2 text-left text-xs font-semibold transition",
                          y === viewYear
                            ? "bg-primary-500/15 text-primary-300"
                            : "text-white/80 hover:bg-white/5 hover:text-white"
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
                "grid size-9 place-items-center rounded-full border border-white/10 bg-neutral-900 text-white/80 transition hover:border-primary-500 hover:text-white",
                !canNext && "opacity-40 pointer-events-none"
              )}
              aria-label="Next month"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Weekdays */}
          <div className="mt-3 grid grid-cols-7 gap-1 px-1">
            {WEEKDAYS.map((w) => (
              <div
                key={w}
                className="text-center text-[11px] font-semibold text-neutral-400"
              >
                {w}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="mt-2 grid grid-cols-7 gap-1 px-1">
            {Array.from({ length: offset }).map((_, i) => (
              <div key={`sp-${i}`} className="h-9" />
            ))}

            {Array.from({ length: dim }).map((_, idx) => {
              const day = idx + 1;
              const d = clampToDay(new Date(viewYear, viewMonth, day));

              const disabled = isDisabled(d, minDate, maxDate);

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
                    "h-9 rounded-lg text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40",
                    disabled
                      ? "text-white/25"
                      : "text-white/85 hover:bg-white/5",
                    between && "bg-primary-500/12 text-white",
                    (isStart || isEnd) &&
                      "bg-primary-500 text-white shadow-[0_10px_24px_rgba(154,70,255,0.30)]",
                    isToday && !isStart && !isEnd && "border border-white/10"
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

          {/* Footer (compact + matches dashboard vibe) */}
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="min-w-0 text-[11px] font-semibold text-white/70">
              <span className="text-white/50">From:</span>{" "}
              <span className="text-white/85">
                {start ? fmtFull(start) : "—"}
              </span>
              <span className="mx-2 text-white/25">•</span>
              <span className="text-white/50">To:</span>{" "}
              <span className="text-white/85">{end ? fmtFull(end) : "—"}</span>
            </div>

            <button
              type="button"
              onClick={clear}
              className="shrink-0 rounded-md border border-white/10 bg-neutral-900 px-2.5 py-1.5 text-[11px] font-semibold text-white/75 hover:border-primary-500 hover:text-white"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
