/* ------------------------------------------------------------------ */
/*  src/components/ui/SortControl.tsx                                  */
/* ------------------------------------------------------------------ */
"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { ArrowDownNarrowWide, ArrowDownWideNarrow } from "lucide-react";

export type SortDir = "asc" | "desc";
export type SortOption<K extends string> = { key: K; label: string };

type Props<K extends string> = {
  options: SortOption<K>[];
  sortField: K | null;
  sortDir: SortDir;
  setSortField: (v: K | null) => void;
  setSortDir: (v: SortDir) => void;
  defaultDirFor: (f: K) => SortDir;
  dropdownWidthClass?: string;
  className?: string;
};

export default function SortControl<K extends string>({
  options,
  sortField,
  sortDir,
  setSortField,
  setSortDir,
  defaultDirFor,
  dropdownWidthClass = "w-[220px]",
  className,
}: Props<K>) {
  const [open, setOpen] = useState(false);

  // wrapper still holds the button (used for outside click)
  const ref = useRef<HTMLDivElement>(null);

  // portal panel ref (because it won't be inside `ref` anymore)
  const panelRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const sortLabel = useMemo(() => {
    if (!sortField) return "";
    return options.find((o) => o.key === sortField)?.label ?? "Sort";
  }, [options, sortField]);

  const [pos, setPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  const inferWidthFallback = useCallback(() => {
    // best-effort parse: "w-[220px]" => 220
    const m = /w-\[(\d+)px\]/.exec(dropdownWidthClass);
    const n = m?.[1] ? Number(m[1]) : Number.NaN;
    return Number.isFinite(n) ? n : 220;
  }, [dropdownWidthClass]);

  const recalc = useCallback(() => {
    const wrapEl = ref.current;
    if (!wrapEl) return;

    const button = wrapEl.querySelector("button");
    if (!button) return;

    const r = button.getBoundingClientRect();
    const vw = window.innerWidth;

    const panelW =
      panelRef.current?.getBoundingClientRect().width ?? inferWidthFallback();

    // align dropdown to the button's right edge
    let left = r.right - panelW;
    const top = r.bottom + 8;

    // clamp into viewport so it never goes off-screen
    left = Math.max(12, Math.min(left, vw - 12 - panelW));

    setPos({ top, left });
  }, [inferWidthFallback]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;

      const inButton = !!ref.current?.contains(t);
      const inPanel = !!panelRef.current?.contains(t);

      if (!inButton && !inPanel) setOpen(false);
    }

    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    // position immediately + after the panel measures itself
    recalc();
    const raf = requestAnimationFrame(recalc);

    const onScrollOrResize = () => recalc();

    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open, recalc]);

  function apply(field: K) {
    // Clicking the active option again clears sorting
    if (sortField === field) {
      setSortField(null);
      return;
    }

    setSortField(field);
    setSortDir(defaultDirFor(field));
  }

  function setDir(dir: SortDir) {
    if (!sortField) return;
    setSortDir(dir);
  }

  const DirIcon = sortDir === "asc" ? ArrowDownNarrowWide : ArrowDownWideNarrow;

  const dropdown = (
    <div
      ref={panelRef}
      className="fixed z-[99999]"
      style={{ top: pos.top, left: pos.left }}
    >
      <div className="relative">
        <span className="pointer-events-none absolute -top-1 right-4 h-3 w-3 rotate-45 border border-white/10 border-b-0 border-r-0 bg-[#121420]" />
        <div
          className={clsx(
            "overflow-hidden rounded-2xl border border-white/10",
            "bg-[#121420] backdrop-blur",
            "shadow-[0_18px_40px_rgba(0,0,0,0.45)]",
            dropdownWidthClass,
          )}
        >
          <div role="listbox" aria-label="Sort" className="p-2">
            {options.map((opt) => {
              const active = opt.key === sortField;
              return (
                <button
                  key={opt.key}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => apply(opt.key)}
                  title={active ? "Click again to clear sort" : undefined}
                  className={clsx(
                    "flex w-full items-center justify-between",
                    "rounded-lg px-3 py-2.5",
                    "text-left text-sm outline-none",
                    "hover:bg-white/5 focus:bg-white/5",
                    active ? "bg-white/5 text-white" : "text-white/90",
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {active ? (
                    <span className="text-xs font-semibold text-white/80">
                      ✓
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="h-px w-full bg-white/10" />

          <div className="p-2">
            <div
              className={clsx(
                "grid grid-cols-2 overflow-hidden rounded-xl border border-white/10 bg-neutral-950/35",
                !sortField && "opacity-60",
              )}
            >
              <button
                type="button"
                onClick={() => setDir("asc")}
                disabled={!sortField}
                className={clsx(
                  "flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium",
                  "outline-none transition",
                  "hover:bg-white/6 focus-visible:bg-white/6",
                  sortField && sortDir === "asc"
                    ? "bg-white/8 text-white"
                    : "text-white/80",
                  "disabled:cursor-not-allowed",
                )}
                aria-label="Ascending"
              >
                <ArrowDownNarrowWide className="h-4 w-4 opacity-90" />
                Asc
              </button>

              <button
                type="button"
                onClick={() => setDir("desc")}
                disabled={!sortField}
                className={clsx(
                  "flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium",
                  "outline-none transition",
                  "hover:bg-white/6 focus-visible:bg-white/6",
                  sortField && sortDir === "desc"
                    ? "bg-white/8 text-white"
                    : "text-white/80",
                  "disabled:cursor-not-allowed",
                )}
                aria-label="Descending"
              >
                <ArrowDownWideNarrow className="h-4 w-4 opacity-90" />
                Desc
              </button>
            </div>

            {!sortField ? (
              <p className="mt-2 px-1 text-[11px] text-white/45">
                Select a sort type first
              </p>
            ) : null}

            {sortField ? (
              <div className="mt-2 flex items-center justify-between rounded-xl border border-white/10 bg-neutral-950/25 px-3 py-2">
                <p className="truncate text-[11px] text-white/70">
                  <span className="text-white/45">Sorting:</span> {sortLabel}
                </p>
                <DirIcon className="h-4 w-4 text-white/70" />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div ref={ref} className={clsx("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={
          !sortField
            ? "Sort"
            : `Sort by ${sortLabel} ${
                sortDir === "asc" ? "ascending" : "descending"
              }`
        }
        data-open={open ? "1" : "0"}
        data-active={sortField ? "1" : "0"}
        className={clsx(
          // ✅ match MiniSelect container bg (Upcoming pill)
          "tikd-sort-btn group inline-flex select-none items-center justify-center",
          "h-10.5 w-10.5 rounded-lg border border-white/10",
          "bg-[#121420] text-neutral-100",
          "shadow-[0_12px_34px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)]",
          "transition-[transform,box-shadow,border-color,background-color] duration-150",
          "hover:bg-white/5 hover:border-white/14",
          "active:scale-[0.985]",
          "focus:outline-none focus-visible:border-primary-500",
          open && "border-primary-500/70",
          "cursor-pointer",
        )}
      >
        <span className="tikd-sort-bars" aria-hidden="true">
          <span className="tikd-sort-bar tikd-sort-bar1">
            <span className="tikd-sort-dot" />
          </span>
          <span className="tikd-sort-bar tikd-sort-bar2">
            <span className="tikd-sort-dot" />
          </span>
          <span className="tikd-sort-bar tikd-sort-bar1">
            <span className="tikd-sort-dot" />
          </span>
        </span>

        {sortField ? (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border border-white/20 bg-neutral-500 shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
          />
        ) : null}
      </button>

      {/* ✅ Portal dropdown so parent overflow can’t clip it */}
      {mounted && open ? createPortal(dropdown, document.body) : null}

      <style jsx>{`
        .tikd-sort-bars {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .tikd-sort-bar {
          width: 50%;
          height: 1.5px;
          background: rgba(229, 229, 229, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          border-radius: 2px;
        }

        .tikd-sort-dot {
          width: 4px;
          height: 4px;
          position: absolute;
          border-radius: 999px;
          border: 1.5px solid rgba(255, 255, 255, 0.92);
          background: rgba(140, 140, 166, 0.95);
          box-shadow: 0 0 6px rgba(255, 255, 255, 0.28);
          transition: transform 0.3s ease;
        }

        .tikd-sort-bar1 .tikd-sort-dot {
          transform: translateX(-4px);
        }
        .tikd-sort-bar2 .tikd-sort-dot {
          transform: translateX(4px);
        }

        .tikd-sort-btn:hover .tikd-sort-bar1 .tikd-sort-dot {
          transform: translateX(4px);
        }
        .tikd-sort-btn:hover .tikd-sort-bar2 .tikd-sort-dot {
          transform: translateX(-4px);
        }

        @media (prefers-reduced-motion: reduce) {
          .tikd-sort-dot {
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
}
