// src/components/ui/DateRangePicker.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
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

  /** Popover side (defaults to bottom) */
  side?: "top" | "bottom";

  /** Optional class overrides */
  buttonClassName?: string;
  popoverClassName?: string;

  /** Marks trigger as errored (only affects variant="field") */
  error?: boolean;

  /** controlled open support (optional) */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;

  /** hide built-in trigger button (popover still renders/works) */
  hideTrigger?: boolean;

  /**
   * Selection mode:
   * - range (default): pick start + end, confirm via Done
   * - single: pick one day, apply + close immediately (no To, no Done)
   */
  selectionMode?: "range" | "single";
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

/**
 * Month-aware subtraction/addition that keeps the day as stable as possible.
 * Example: Mar 31 - 1 month => Feb 28/29.
 */
function addMonths(d: Date, delta: number) {
  const x = new Date(d);
  const day = x.getDate();

  x.setMonth(x.getMonth() + delta);

  if (x.getDate() !== day) {
    x.setDate(0);
  }

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

function setYearPreserveMonthDay(d: Date, nextYear: number) {
  const month = d.getMonth();
  const day = d.getDate();
  const maxDay = daysInMonth(nextYear, month);
  return clampToDay(new Date(nextYear, month, Math.min(day, maxDay)));
}

export default function DateRangePicker({
  value,
  onChange,
  className,
  minDate: minDateProp,
  maxDate: maxDateProp,
  variant = "compact",
  align = "right",
  side = "bottom",
  buttonClassName,
  popoverClassName,
  error,
  open: openProp,
  onOpenChange,
  hideTrigger,
  selectionMode = "range",
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const isSingle = selectionMode === "single";

  const [openInternal, setOpenInternal] = useState(false);
  const [monthOpen, setMonthOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  const isControlled = typeof openProp === "boolean";
  const open = isControlled ? (openProp as boolean) : openInternal;

  const setOpen = (next: boolean | ((prev: boolean) => boolean)) => {
    const resolved =
      typeof next === "function"
        ? (next as (p: boolean) => boolean)(open)
        : next;

    if (!isControlled) setOpenInternal(resolved);
    onOpenChange?.(resolved);
  };

  const closePicker = () => {
    setOpen(false);
    setMonthOpen(false);
    setYearOpen(false);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia("(max-width: 639px)");
    const sync = () => setIsMobileViewport(media.matches);

    sync();

    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobileViewport(event.matches);
    };

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", handleChange);
      return () => media.removeEventListener("change", handleChange);
    }

    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, []);

  useEffect(() => {
    if (!open || !isMobileViewport) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open, isMobileViewport]);

  const today = useMemo(() => clampToDay(new Date()), []);
  const currentYear = useMemo(() => today.getFullYear(), [today]);

  const hardMin = useMemo(() => new Date(2020, 0, 1), []);

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

  const [draft, setDraft] = useState<DateRangeValue>({
    start: value.start ? clampToDay(value.start) : null,
    end: value.end ? clampToDay(value.end) : null,
  });

  const [didPickInThisOpen, setDidPickInThisOpen] = useState(false);

  const committedStart = value.start ? clampToDay(value.start) : null;
  const committedEnd = value.end ? clampToDay(value.end) : null;

  const start = draft.start ? clampToDay(draft.start) : null;
  const end = draft.end ? clampToDay(draft.end) : null;

  useEffect(() => {
    if (!open) return;

    const s = value.start ? clampToDay(value.start) : null;
    const e = value.end ? clampToDay(value.end) : null;

    setDraft({ start: s, end: e });
    setDidPickInThisOpen(false);

    const anchor = s ?? e ?? today;
    setViewYear(anchor.getFullYear());
    setViewMonth(anchor.getMonth());
  }, [open, value.start, value.end, today]);

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      if (!open || isMobileViewport) return;
      const el = rootRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        closePicker();
      }
    }

    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [open, isMobileViewport]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") {
        closePicker();
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
    return !isBefore(
      prevMonthStart,
      startOfMonth(effMin.getFullYear(), effMin.getMonth()),
    );
  }, [viewYear, viewMonth, effMin]);

  const canNext = useMemo(() => {
    const nextMonthEnd = endOfMonth(viewYear, viewMonth + 1);
    return !isAfter(
      nextMonthEnd,
      endOfMonth(effMax.getFullYear(), effMax.getMonth()),
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

  function applyRange(next: DateRangeValue) {
    const normalized = normalizeRange(next, effMin, effMax);
    onChange(normalized);
    closePicker();
  }

  function commitPick(day: number) {
    setDidPickInThisOpen(true);

    const picked = clampToDay(new Date(viewYear, viewMonth, day));
    if (isDisabled(picked, effMin, effMax)) return;

    if (isSingle) {
      applyRange({ start: picked, end: picked });
      return;
    }

    if (!start || (start && end)) {
      setDraft({ start: picked, end: null });
      return;
    }

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
    setDraft({ start: null, end: null });
    onChange({ start: null, end: null });
  }

  function applyDone() {
    if (!draft.start) return;

    const next: DateRangeValue = draft.end
      ? draft
      : { start: draft.start, end: draft.start };

    applyRange(next);
  }

  const presets = useMemo(() => {
    if (variant !== "compact") return [] as const;

    const t = today;

    const last3Months = {
      start: clampToDay(addMonths(t, -3)),
      end: t,
    };

    const last6Months = {
      start: clampToDay(addMonths(t, -6)),
      end: t,
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
      { key: "m3", label: "3 Months", range: last3Months },
      { key: "m6", label: "6 Months", range: last6Months },
    ] as const;
  }, [variant, today]);

  const activeKey = useMemo(() => {
    if (variant !== "compact") return null;
    for (const p of presets) {
      if (rangeEq(value, p.range)) return p.key;
    }
    return null;
  }, [variant, presets, value]);

  const compactBtn =
    "inline-flex w-full items-center gap-2 rounded-md border border-white/10 bg-neutral-700 px-2.5 py-1.5 text-[11px] font-semibold text-white/80 hover:border-primary-500 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 cursor-pointer";

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

  const mobileSectionBtn = (active: boolean) =>
    clsx(
      "rounded-lg border px-3 py-2 text-[11px] font-semibold transition",
      active
        ? "border-primary-500/35 bg-primary-500/16 text-primary-200"
        : "border-white/10 bg-white/[0.03] text-white/82 hover:border-primary-500/40 hover:text-white",
    );

  const showSidebar = variant === "compact";
  const hasRange = !!start && !!end;

  const desktopPopoverClass = clsx(
    "absolute z-30 mt-2 rounded-xl border border-white/10 bg-neutral-950/92 p-2.5 backdrop-blur-md",
    variant === "compact" ? "w-[420px]" : "w-[292px]",
    side === "top" ? "bottom-full mb-2 mt-0" : "mt-2",
    align === "right" ? "right-0" : "left-0",
    popoverClassName,
  );

  const renderPanel = (mobile: boolean) => (
    <div
      className={clsx(
        mobile
          ? "w-full max-w-[420px] rounded-[24px] border border-white/10 bg-neutral-950/96 p-3.5 shadow-[0_30px_90px_rgba(0,0,0,0.65)] backdrop-blur-xl"
          : desktopPopoverClass,
      )}
      role="dialog"
      aria-modal={mobile || undefined}
      aria-label="Select date range"
    >
      <div className="sm:hidden mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-white/90">
            Select Dates
          </div>
          <div className="truncate text-[11px] text-white/45">{label}</div>
        </div>

        <button
          type="button"
          onClick={closePicker}
          className="grid size-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/75 transition hover:border-primary-500 hover:text-white"
          aria-label="Close date picker"
        >
          <X size={16} />
        </button>
      </div>

      <div
        className={clsx(
          "grid grid-cols-1 gap-3 sm:gap-2.5",
          showSidebar && "sm:grid-cols-[124px_1fr]",
        )}
      >
        {showSidebar && (
          <div className="rounded-xl border border-white/10 bg-neutral-900/60 p-2 sm:p-1.5">
            <div className="sm:hidden space-y-3">
              {!!presets.length && (
                <div>
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                    Quick ranges
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {presets.map((p) => (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => applyRange(p.range)}
                        className={mobileSectionBtn(activeKey === p.key)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="h-px bg-white/10" />

              <div>
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                  Years
                </div>
                <div className="grid grid-cols-3 gap-2">
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
                        className={mobileSectionBtn(active)}
                      >
                        {y}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="hidden sm:block">
              <div className="tikd-scroll max-h-[250px] overflow-auto pr-1">
                <div className="space-y-1">
                  {presets.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => applyRange(p.range)}
                      className={sidebarBtn(activeKey === p.key)}
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
                        className={sidebarBtn(active)}
                      >
                        {y}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="min-w-0">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => canPrev && moveMonth(-1)}
              className={clsx(
                "grid size-8 shrink-0 place-items-center rounded-full border border-white/10 bg-neutral-900 text-white/80 transition hover:border-primary-500 hover:text-white sm:size-7",
                !canPrev && "pointer-events-none opacity-40",
              )}
              aria-label="Previous month"
            >
              <ChevronLeft size={14} />
            </button>

            <div className="relative flex min-w-0 flex-1 items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setMonthOpen((v) => !v);
                  setYearOpen(false);
                }}
                className={clsx(
                  "inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md border border-white/10 bg-neutral-900 px-3 py-2 text-xs font-semibold text-white/90 sm:flex-none sm:px-2.5 sm:py-1.5 sm:text-[11px]",
                  "hover:border-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40",
                )}
                aria-expanded={monthOpen}
                aria-haspopup="listbox"
              >
                <span className="truncate">{MONTHS[viewMonth]}</span>
                <ChevronDown
                  size={13}
                  className={clsx(
                    "shrink-0 opacity-70 transition-transform",
                    monthOpen && "rotate-180",
                  )}
                />
              </button>

              <button
                type="button"
                onClick={() => {
                  setYearOpen((v) => !v);
                  setMonthOpen(false);
                }}
                className={clsx(
                  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-white/10 bg-neutral-900 px-3 py-2 text-xs font-semibold text-white/90 sm:px-2.5 sm:py-1.5 sm:text-[11px]",
                  "hover:border-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40",
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
                  className="absolute left-0 top-[44px] z-40 w-[126px] overflow-hidden rounded-md border border-white/10 bg-neutral-900 sm:top-[38px] sm:w-[89px]"
                  role="listbox"
                  aria-label="Select month"
                >
                  <div className="tikd-scroll max-h-[207px] overflow-auto p-1">
                    {MONTHS.map((m, i) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setViewMonth(i);
                          setMonthOpen(false);
                        }}
                        className={clsx(
                          "w-full rounded-md px-2 py-2 text-left text-xs font-semibold transition sm:px-2 sm:py-1.5 sm:text-[11px]",
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
                  className="absolute right-0 top-[44px] z-40 w-[82px] overflow-hidden rounded-md border border-white/10 bg-neutral-900 sm:top-[38px] sm:w-[68px]"
                  role="listbox"
                  aria-label="Select year"
                >
                  <div className="tikd-scroll max-h-[207px] overflow-auto p-1">
                    {years.map((y) => (
                      <button
                        key={y}
                        type="button"
                        onClick={() => {
                          if (
                            !didPickInThisOpen &&
                            (draft.start || draft.end)
                          ) {
                            const nextStart = draft.start
                              ? setYearPreserveMonthDay(draft.start, y)
                              : null;

                            const nextEnd = draft.end
                              ? setYearPreserveMonthDay(draft.end, y)
                              : null;

                            setDraft(
                              normalizeRange(
                                { start: nextStart, end: nextEnd },
                                effMin,
                                effMax,
                              ),
                            );
                          }

                          setViewYear(y);
                          setYearOpen(false);
                        }}
                        className={clsx(
                          "w-full rounded-md px-2.5 py-2 text-left text-xs font-semibold transition sm:px-2.5 sm:py-1.5 sm:text-[11px]",
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
                "grid size-8 shrink-0 place-items-center rounded-full border border-white/10 bg-neutral-900 text-white/80 transition hover:border-primary-500 hover:text-white sm:size-7",
                !canNext && "pointer-events-none opacity-40",
              )}
              aria-label="Next month"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1 px-1 sm:mt-2.5">
            {WEEKDAYS.map((w) => (
              <div
                key={w}
                className="text-center text-[10px] font-semibold text-neutral-400"
              >
                {w}
              </div>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1 px-1 sm:mt-1.5">
            {Array.from({ length: offset }).map((_, i) => (
              <div key={`sp-${i}`} className="h-9 sm:h-8" />
            ))}

            {Array.from({ length: dim }).map((_, idx) => {
              const day = idx + 1;
              const d = clampToDay(new Date(viewYear, viewMonth, day));

              const disabled = isDisabled(d, effMin, effMax);

              const isStart = !!start && sameDay(d, start);
              const isEnd = !!end && sameDay(d, end);

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
                    "h-9 rounded-lg text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 sm:h-8 sm:text-[11px]",
                    disabled
                      ? "cursor-not-allowed text-white/20 opacity-45"
                      : "cursor-pointer text-white/85 hover:bg-white/5",
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

          <div className="mt-3 flex flex-col gap-2.5 sm:mt-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div className="min-w-0 rounded-lg border border-white/6 bg-white/[0.03] px-2.5 py-2 text-[11px] font-semibold text-white/70 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:text-[10px]">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-white/50">From:</span>
                <span className="text-white/85">
                  {start ? fmtFull(start) : "—"}
                </span>

                {!isSingle && (
                  <>
                    <span className="hidden text-white/25 sm:inline">•</span>
                    <span className="text-white/50">To:</span>
                    <span className="text-white/85">
                      {end ? fmtFull(end) : "—"}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
              <button
                type="button"
                onClick={clear}
                className="flex-1 rounded-md border border-white/10 bg-neutral-900 px-3 py-2 text-[11px] font-semibold text-white/75 hover:border-primary-500 hover:text-white sm:flex-none sm:px-2.5 sm:py-1.5 sm:text-[10px]"
              >
                Clear
              </button>

              {!isSingle && (
                <button
                  type="button"
                  onClick={applyDone}
                  disabled={!draft.start}
                  className={clsx(
                    "flex-1 rounded-md border px-3 py-2 text-[11px] font-semibold transition sm:flex-none sm:px-2.5 sm:py-1.5 sm:text-[10px]",
                    draft.start
                      ? "cursor-pointer border-primary-500/35 bg-primary-500/20 text-primary-100 hover:border-primary-500/55 hover:bg-primary-500/26"
                      : "cursor-not-allowed border-white/10 bg-white/5 text-white/30 opacity-80",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40",
                  )}
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <span className="sr-only">
        {viewStart.toISOString()} {viewEnd.toISOString()} {String(open)}
      </span>
    </div>
  );

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

      {!hideTrigger && (
        <>
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
        </>
      )}

      {open && isMobileViewport && (
        <div className="fixed inset-0 z-[120] sm:hidden">
          <button
            type="button"
            onClick={closePicker}
            className="absolute inset-0 bg-black/72 backdrop-blur-md"
            aria-label="Close date picker backdrop"
          />
          <div className="relative z-[121] flex min-h-full items-start justify-center overflow-y-auto px-3 py-4">
            {renderPanel(true)}
          </div>
        </div>
      )}

      {open && !isMobileViewport && renderPanel(false)}
    </div>
  );
}
