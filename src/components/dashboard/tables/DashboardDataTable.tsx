/* ------------------------------------------------------------------ */
/*  src/components/dashboard/tables/DashboardDataTable.tsx            */
/* ------------------------------------------------------------------ */
"use client";

import { useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import clsx from "clsx";
import SortArrowsIcon from "@/components/ui/SortArrowsIcon";

export type SortDir = "asc" | "desc";

export type DashboardTableColumn<T> = {
  /** unique key for sorting + identification */
  key: string;

  /** header label */
  header: ReactNode;

  /** cell renderer */
  cell: (row: T, index: number) => ReactNode;

  /** enable sorting on this column */
  sortable?: boolean;

  /** value used for sorting (recommended if sortable) */
  sortValue?: (row: T) => string | number;

  /** header cell alignment */
  headerAlign?: "left" | "right" | "center";

  /** body cell alignment */
  align?: "left" | "right" | "center";

  /** optional width */
  width?: string | number;

  /** optional class names */
  thClassName?: string;
  tdClassName?: string;

  /** for headers where you want the hover cursor but not sort behavior */
  headerInteractive?: boolean;
};

type Props<T> = {
  title?: ReactNode;
  subtitle?: ReactNode;

  rows: T[];
  columns: DashboardTableColumn<T>[];
  getRowKey: (row: T, index: number) => string;

  /** default sorting */
  initialSort?: { key: string; dir: SortDir };

  /** header right slot (buttons etc.) */
  headerRight?: ReactNode;

  /** empty state (optional) */
  emptyState?: ReactNode;

  /** container class */
  className?: string;

  /** table class */
  tableClassName?: string;

  /** show the bottom fade like the Tracking Links table (NO layout space) */
  showBottomFade?: boolean;

  /** insert the subtle gradient separator between rows like Tracking Links table */
  showRowSeparators?: boolean;
};

function cmp(a: string | number, b: string | number) {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

function cellAlignCls(a?: "left" | "right" | "center") {
  return a === "right"
    ? "text-right"
    : a === "center"
      ? "text-center"
      : "text-left";
}

/** Reusable avatar for ANY table (26x26, radius 4px) */
export function TableAvatar({
  src,
  alt = "Avatar",
  className,
  bgClassName,
}: {
  src?: string | null;
  alt?: string;
  className?: string;
  bgClassName?: string;
}) {
  const base = clsx(
    "h-[26px] w-[26px] rounded-[4px] border border-white/10 overflow-hidden",
    className,
  );

  if (src) {
    return (
      <Image
        src={src}
        alt={alt}
        width={26}
        height={26}
        className={clsx(base, "object-cover")}
      />
    );
  }

  return (
    <div aria-hidden className={clsx(base, bgClassName ?? "bg-white/10")} />
  );
}

/** Small action icon button (matches reference sizing) */
export function TableActionIconButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={clsx(
        "rounded-md border border-white/10 p-1.5 text-white/70",
        "hover:text-white hover:border-white/20",
        "focus:outline-none focus:ring-1 focus:ring-primary-600/35",
        "cursor-pointer",
      )}
    >
      {children}
    </button>
  );
}

export default function DashboardDataTable<T>({
  title,
  subtitle,
  rows,
  columns,
  getRowKey,
  initialSort,
  headerRight,
  emptyState,
  className,
  tableClassName,
  showBottomFade = true,
  showRowSeparators = true,
}: Props<T>) {
  const sortableKeys = useMemo(
    () => new Set(columns.filter((c) => c.sortable).map((c) => c.key)),
    [columns],
  );

  const [sortBy, setSortBy] = useState<string | null>(initialSort?.key ?? null);
  const [dir, setDir] = useState<SortDir>(initialSort?.dir ?? "desc");

  const toggleSort = (key: string) => {
    if (!sortableKeys.has(key)) return;
    if (sortBy === key) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setDir("desc");
    }
  };

  const sorted = useMemo(() => {
    if (!sortBy || !sortableKeys.has(sortBy)) return rows;

    const col = columns.find((c) => c.key === sortBy);
    if (!col) return rows;

    const getVal =
      col.sortValue ??
      ((r: any) => {
        const v = r?.[sortBy];
        if (typeof v === "number") return v;
        return String(v ?? "");
      });

    const arr = [...rows];
    arr.sort((a, b) => {
      const A = getVal(a);
      const B = getVal(b);
      const d0 = cmp(A, B);
      return dir === "asc" ? d0 : -d0;
    });
    return arr;
  }, [rows, columns, sortBy, dir, sortableKeys]);

  const thRow = "[&>th]:pb-3 [&>th]:pt-1 [&>th]:px-4";
  const thBase =
    "text-base text-left font-semibold cursor-pointer select-none text-neutral-400 hover:text-white/80";
  const thRight =
    "text-base text-right font-semibold cursor-pointer select-none text-neutral-400 hover:text-white/80";

  const separatorLine =
    "bg-[linear-gradient(90deg,rgba(154,70,255,0)_0%,rgba(154,70,255,0.18)_30%,rgba(255,255,255,0.08)_50%,rgba(154,70,255,0.18)_70%,rgba(154,70,255,0)_100%)]";

  return (
    <div
      className={clsx(
        "relative rounded-lg border border-neutral-700 bg-neutral-900 pt-2",
        className,
      )}
    >
      {title || subtitle || headerRight ? (
        <div className="mb-2 flex items-start justify-between gap-4 border-b border-neutral-700 px-4 pb-2">
          <div className="min-w-0">
            {title ? (
              <h3 className="text-xl font-semibold uppercase text-neutral-400">
                {title}
              </h3>
            ) : null}
            {subtitle ? (
              <div className="mt-1 text-[13px] text-neutral-500">
                {subtitle}
              </div>
            ) : null}
          </div>

          {headerRight ? (
            <div className="flex shrink-0 items-center">{headerRight}</div>
          ) : null}
        </div>
      ) : null}

      <div className="relative overflow-hidden rounded-lg">
        <table
          className={clsx("w-full border-collapse font-medium", tableClassName)}
        >
          <thead className="text-neutral-400">
            <tr className={thRow}>
              {columns.map((c) => {
                const canSort = !!c.sortable;
                const isActive = canSort && sortBy === c.key;

                const headerCls = clsx(
                  c.headerAlign === "right" ? thRight : thBase,
                  cellAlignCls(c.headerAlign),
                  (canSort || c.headerInteractive) && "cursor-pointer",
                  c.thClassName,
                );

                return (
                  <th
                    key={c.key}
                    style={c.width ? { width: c.width } : undefined}
                    className={headerCls}
                    onClick={() => toggleSort(c.key)}
                    aria-sort={
                      isActive
                        ? dir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <div
                      className={clsx(
                        "inline-flex items-center",
                        c.headerAlign === "right" && "justify-end w-full",
                        c.headerAlign === "center" && "justify-center w-full",
                      )}
                    >
                      {c.header}
                      {canSort ? (
                        <SortArrowsIcon
                          direction={isActive ? dir : null}
                          className="ml-2 -translate-y-[1px]"
                        />
                      ) : null}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="text-white">
            {sorted.length === 0 ? (
              <tr className="bg-neutral-900">
                <td
                  className="px-4 py-10 text-center text-neutral-400"
                  colSpan={columns.length}
                >
                  {emptyState ?? "No data to show."}
                </td>
              </tr>
            ) : (
              sorted.flatMap((row, i) => {
                const isLast = i === sorted.length - 1;
                const rowBg = i % 2 === 0 ? "bg-neutral-948" : "bg-neutral-900";

                const dataRow = (
                  <tr
                    key={getRowKey(row, i)}
                    className={clsx("transition-colors", rowBg)}
                  >
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={clsx(
                          "px-4 py-3",
                          cellAlignCls(c.align),
                          c.tdClassName,
                        )}
                      >
                        {c.cell(row, i)}
                      </td>
                    ))}
                  </tr>
                );

                if (!showRowSeparators || isLast) return [dataRow];

                const sep = (
                  <tr
                    key={`${getRowKey(row, i)}-sep`}
                    aria-hidden
                    className="bg-neutral-900"
                  >
                    <td colSpan={columns.length} className="p-0">
                      <div className={clsx("mx-4 h-px", separatorLine)} />
                    </td>
                  </tr>
                );

                return [dataRow, sep];
              })
            )}
          </tbody>
        </table>

        {showBottomFade ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(0deg,#181828_0%,rgba(24,24,40,0)_100%)]" />
        ) : null}
      </div>
    </div>
  );
}
