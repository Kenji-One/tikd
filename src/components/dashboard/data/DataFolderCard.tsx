/* ------------------------------------------------------------------ */
/*  src/components/dashboard/data/DataFolderCard.tsx                  */
/* ------------------------------------------------------------------ */
"use client";

import Link from "next/link";
import clsx from "clsx";
import {
  ChevronRight,
  FileText,
  Folder,
  Image as Img,
  CalendarDays,
  Users,
} from "lucide-react";

type IconKind = "users" | "calendar" | "doc" | "image" | "folder";

type Props = {
  title: string;
  itemsLabel: string;
  usedLabel: string;
  percent: number; // 0..1
  iconKind: IconKind;
  href: string;
};

function KindIcon({ kind }: { kind: IconKind }) {
  const boxCls =
    "grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-neutral-700 bg-neutral-0 text-neutral-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] sm:h-10 sm:w-10";
  const iconCls = "h-5 w-5 sm:h-6 sm:w-6";

  switch (kind) {
    case "users":
      return (
        <div className={boxCls}>
          <Users className={iconCls} />
        </div>
      );
    case "calendar":
      return (
        <div className={boxCls}>
          <CalendarDays className={iconCls} />
        </div>
      );
    case "doc":
      return (
        <div className={boxCls}>
          <FileText className={iconCls} />
        </div>
      );
    case "image":
      return (
        <div className={boxCls}>
          <Img className={iconCls} />
        </div>
      );
    default:
      return (
        <div className={boxCls}>
          <Folder className={iconCls} />
        </div>
      );
  }
}

export default function DataFolderCard({
  title,
  itemsLabel,
  usedLabel,
  percent,
  iconKind,
  href,
}: Props) {
  const pct = Math.max(0, Math.min(1, percent));

  return (
    <Link
      href={href}
      className={clsx(
        "group relative w-full min-w-0 overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900 p-3.5 sm:min-w-[232px] sm:p-4",
        "transition-[transform,filter,box-shadow,border-color] duration-200",
        "hover:brightness-[1.04] hover:border-primary-500",
        "shadow-[0_18px_56px_rgba(0,0,0,0.50),inset_0_1px_0_rgba(255,255,255,0.05)]",
      )}
      aria-label={title}
    >
      <div className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full border border-neutral-700 bg-neutral-900 text-neutral-200 transition-colors group-hover:text-neutral-0 sm:right-4 sm:top-4 sm:h-9 sm:w-9">
        <ChevronRight className="h-4 w-4" />
      </div>

      <div className="flex items-start gap-3 pr-10 sm:pr-12">
        <KindIcon kind={iconKind} />

        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold text-neutral-0 sm:text-base">
            {title}
          </div>
          <div className="mt-0.5 text-[11px] font-medium leading-4 text-primary-951 sm:text-xs">
            {itemsLabel}
          </div>
        </div>
      </div>

      <div className="mt-3.5">
        <div className="h-1 w-full rounded-full bg-neutral-0/90">
          <div
            className="h-1 rounded-full bg-primary-951"
            style={{ width: `${pct * 100}%` }}
          />
        </div>

        <div className="mt-2 text-[11px] leading-4 text-neutral-0 sm:text-xs">
          {usedLabel}
        </div>
      </div>
    </Link>
  );
}
