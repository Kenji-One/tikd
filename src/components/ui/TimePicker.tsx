/* ------------------------------------------------------------------ */
/*  src/components/ui/TimePicker.tsx                                  */
/* ------------------------------------------------------------------ */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { ChevronDown, ChevronUp, Clock } from "lucide-react";

type Props = {
  label?: string;
  value: string; // "HH:MM" 24h, or "" when empty
  onChange: (next: string) => void;
  className?: string;
  error?: boolean;
  minuteStep?: number; // default 5
  placeholder?: string; // default "Select Time"
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function parseHHMM(v: string): { hh: number; mm: number } | null {
  const m = /^([0-1]\d|2[0-3]):([0-5]\d)$/.exec(v.trim());
  if (!m) return null;
  return { hh: parseInt(m[1], 10), mm: parseInt(m[2], 10) };
}

function to12h(hh24: number) {
  const am = hh24 < 12;
  const h = hh24 % 12;
  return { h12: h === 0 ? 12 : h, am };
}

function to24h(h12: number, am: boolean) {
  const h = h12 % 12;
  return am ? h : h + 12;
}

function fmtDisplay(hh24: number, mm: number) {
  const { h12, am } = to12h(hh24);
  return `${h12} : ${pad2(mm)} ${am ? "AM" : "PM"}`;
}

export default function TimePicker({
  label,
  value,
  onChange,
  className,
  error,
  minuteStep = 5,
  placeholder = "Select Time",
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  const parsed = useMemo(() => parseHHMM(value), [value]);

  const init = useMemo(() => {
    if (parsed) return parsed;
    return { hh: 18, mm: 0 };
  }, [parsed]);

  const [h12, setH12] = useState(() => to12h(init.hh).h12);
  const [mm, setMM] = useState(() => init.mm);
  const [am, setAM] = useState(() => to12h(init.hh).am);

  // sync local state when external value changes
  useEffect(() => {
    if (!parsed) return;
    const t = to12h(parsed.hh);
    setH12(t.h12);
    setAM(t.am);
    setMM(parsed.mm);
  }, [parsed]);

  // outside click / escape
  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      if (!open) return;
      const el = rootRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function commit(nextH12: number, nextMM: number, nextAM: boolean) {
    const step = Math.max(1, Math.floor(minuteStep));
    const snapped = Math.round(nextMM / step) * step;
    const mm2 = clamp(snapped === 60 ? 0 : snapped, 0, 59);

    const hh24 = to24h(clamp(nextH12, 1, 12), nextAM);
    const next = `${pad2(hh24)}:${pad2(mm2)}`;

    setH12(clamp(nextH12, 1, 12));
    setMM(mm2);
    setAM(nextAM);

    onChange(next);
  }

  function incHour(delta: number) {
    let nh = h12 + delta;
    if (nh < 1) nh = 12;
    if (nh > 12) nh = 1;
    commit(nh, mm, am);
  }

  function incMinute(delta: number) {
    const step = Math.max(1, Math.floor(minuteStep));
    let n = mm + delta * step;
    while (n < 0) n += 60;
    while (n >= 60) n -= 60;
    commit(h12, n, am);
  }

  const display = parsed ? fmtDisplay(parsed.hh, parsed.mm) : null;

  const inputShell = clsx(
    "w-full rounded-lg border bg-neutral-950/60 px-4 py-3 transition",
    "flex items-center justify-between gap-3",
    "focus:outline-none",
    open ? "border-primary-500" : "border-white/10 hover:border-white/15",
    error && "border-error-500/70 ring-2 ring-error-500/10"
  );

  const arrowBtn = clsx(
    "grid h-7 w-7 place-items-center rounded-full cursor-pointer transition",
    "text-white/80",
    " hover:text-white",
    "focus:outline-none"
  );

  return (
    <div ref={rootRef} className={clsx("relative", className)}>
      <style jsx global>{`
        .tikd-time-shadow-sm {
          box-shadow: 0 24px 70px rgba(0, 0, 0, 0.62);
        }
      `}</style>

      {label ? (
        <label className="mb-2 block text-sm font-medium text-neutral-0/90">
          {label}
        </label>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={inputShell}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <div className="min-w-0 text-left">
          {display ? (
            <div className="truncate text-base font-medium leading-none text-white/85 tabular-nums">
              {display}
            </div>
          ) : (
            <div className="truncate text-base font-medium leading-none text-white/35">
              {placeholder}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary-300" />
          <ChevronDown
            className={clsx(
              "h-5 w-5 text-white/45 transition-transform",
              open && "rotate-180"
            )}
          />
        </div>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Select time"
          className={clsx(
            "absolute left-0 z-40 mt-2",
            // compact like your 2nd image
            "w-[164px] max-w-[calc(100vw-2rem)]",
            "rounded-xl border border-white/10 bg-neutral-950/92 backdrop-blur-md",
            "p-3"
          )}
        >
          {/* tight body */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            {/* Hours */}
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => incHour(+1)}
                className={arrowBtn}
                aria-label="Increase hour"
              >
                <ChevronUp className="h-5 w-5" />
              </button>

              <div className="mt-2 text-lg font-medium text-white/90 tabular-nums leading-none">
                {h12}
              </div>

              <button
                type="button"
                onClick={() => incHour(-1)}
                className={clsx(arrowBtn, "mt-2")}
                aria-label="Decrease hour"
              >
                <ChevronDown className="h-5 w-5" />
              </button>
            </div>

            <div className="text-lg font-medium text-white/35 leading-none">
              :
            </div>

            {/* Minutes */}
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => incMinute(+1)}
                className={arrowBtn}
                aria-label="Increase minutes"
              >
                <ChevronUp className="h-5 w-5" />
              </button>

              <div className="mt-2 text-lg font-medium text-white/90 tabular-nums leading-none">
                {pad2(mm)}
              </div>

              <button
                type="button"
                onClick={() => incMinute(-1)}
                className={clsx(arrowBtn, "mt-2")}
                aria-label="Decrease minutes"
              >
                <ChevronDown className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* AM/PM segmented (compact like your 2nd image) */}
          <div className="mt-4 rounded-md border border-primary-400/35 bg-neutral-950/35 p-1">
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => commit(h12, mm, true)}
                className={clsx(
                  "rounded-sm py-1 text-base font-semibold transition",
                  "focus:outline-none focus:ring-2 focus:ring-primary-500/15",
                  am
                    ? "bg-primary-500/20 text-primary-200"
                    : "text-white/65 hover:text-white"
                )}
                aria-pressed={am}
              >
                AM
              </button>
              <button
                type="button"
                onClick={() => commit(h12, mm, false)}
                className={clsx(
                  "rounded-sm py-1 text-base font-semibold transition",
                  "focus:outline-none focus:ring-2 focus:ring-primary-500/15",
                  !am
                    ? "bg-primary-500/20 text-primary-200"
                    : "text-white/65 hover:text-white"
                )}
                aria-pressed={!am}
              >
                PM
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
