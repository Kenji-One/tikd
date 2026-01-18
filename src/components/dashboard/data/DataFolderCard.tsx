/* ------------------------------------------------------------------ */
/*  src/components/dashboard/data/DataFolderCard.tsx                   */
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
    "grid h-10 w-10 place-items-center rounded-lg border border-neutral-700 bg-neutral-0 text-neutral-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]";
  const iconCls = "h-6 w-6"; // 24x24

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
        "group relative overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900 p-4",
        "transition-[transform,filter,box-shadow,border-color] duration-200",
        "hover:brightness-[1.04] hover:border-primary-500",
        "shadow-[0_18px_56px_rgba(0,0,0,0.50),inset_0_1px_0_rgba(255,255,255,0.05)]",
      )}
      aria-label={title}
    >
      {/* arrow indicator */}
      <div className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-neutral-700 bg-neutral-900 text-neutral-200 transition-colors group-hover:text-neutral-0">
        <ChevronRight className="h-4 w-4" />
      </div>

      <div className="flex items-start gap-2">
        <KindIcon kind={iconKind} />
        <div className="min-w-0">
          <div className="truncate text-base font-semibold text-neutral-0">
            {title}
          </div>
          <div className="text-xs font-medium text-primary-951">
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

        <div className="mt-2 text-xs text-neutral-0">{usedLabel}</div>
      </div>
    </Link>
  );
}
