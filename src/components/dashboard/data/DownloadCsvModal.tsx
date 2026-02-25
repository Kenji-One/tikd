/* ------------------------------------------------------------------ */
/*  src/components/dashboard/data/DownloadCsvModal.tsx                 */
/* ------------------------------------------------------------------ */
"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Toggle from "@/components/ui/Toggle";

type Props = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  eventName?: string;
};

type ToggleKey =
  | "typesOfTicket"
  | "guestList"
  | "djRequests"
  | "promoCodes"
  | "tableOrders"
  | "date"
  | "artistsAttending"
  | "location"
  | "contactInfo"
  | "terms"
  | "revenue"
  | "pageViews"
  | "ticketsSold"
  | "buyers"
  | "gender"
  | "age"
  | "teamMembers";

/**
 * ✅ Per task:
 * - "Types of Ticket" OFF by default
 * - "Guest List" OFF by default
 */
const DEFAULTS: Record<ToggleKey, boolean> = {
  typesOfTicket: false,
  guestList: false,
  djRequests: false,
  promoCodes: false,
  tableOrders: false,
  date: false,
  artistsAttending: false,
  location: false,
  contactInfo: false,
  terms: false,
  revenue: false,
  pageViews: false,
  ticketsSold: false,
  buyers: false,
  gender: false,
  age: false,
  teamMembers: false,
};

const LABELS: { key: ToggleKey; label: string }[] = [
  { key: "typesOfTicket", label: "Types of Ticket" },
  { key: "guestList", label: "Guest list" },
  { key: "djRequests", label: "DJ Requests" },
  { key: "promoCodes", label: "Promo Codes" },
  { key: "tableOrders", label: "Table Orders" },
  { key: "date", label: "Date" },
  { key: "artistsAttending", label: "Artists Attending" },
  { key: "location", label: "Location" },
  { key: "contactInfo", label: "Contact Info" },
  { key: "terms", label: "Terms" },
  { key: "revenue", label: "Revenue" },
  { key: "pageViews", label: "Page Views" },
  { key: "ticketsSold", label: "Number of Tickets sold" },
  { key: "buyers", label: "User list of buyers" },
  { key: "gender", label: "Gender Statistic" },
  { key: "age", label: "Age Statistic" },
  { key: "teamMembers", label: "Team Members" },
];

export default function DownloadCsvModal({
  open,
  onOpenChange,
  eventName,
}: Props) {
  const [toggles, setToggles] = useState(DEFAULTS);

  // ✅ Hard reset on open (prevents any “sticky” UI state across re-opens)
  useEffect(() => {
    if (open) setToggles(DEFAULTS);
  }, [open]);

  const allOn = useMemo(() => Object.values(toggles).every(Boolean), [toggles]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
      aria-modal="true"
      role="dialog"
    >
      {/* backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        onClick={() => onOpenChange(false)}
        aria-label="Close"
      />

      {/* modal */}
      <div
        className={clsx(
          "relative w-full",
          // ✅ slightly smaller overall size
          "max-w-[540px]",
          "rounded-3xl border border-white/10",
          "bg-neutral-950/85 backdrop-blur-2xl",
          "shadow-[0_24px_90px_rgba(0,0,0,0.70),inset_0_1px_0_rgba(255,255,255,0.06)]",
          // ✅ fix scrolling: real flex layout with a dedicated scroll region
          "max-h-[calc(100vh-48px)] overflow-hidden",
          "flex flex-col",
        )}
      >
        {/* header */}
        <div className="flex items-start justify-between px-6 pt-6">
          <div className="pr-8">
            <h2 className="text-[24px] font-semibold tracking-[-0.5px] text-neutral-0">
              Download CSV
            </h2>
            <p className="mt-2.5 text-[13px] font-medium leading-[1.35] text-neutral-400">
              Select the information you want to download from Event
            </p>
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#181828] text-neutral-400 hover:text-neutral-50 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* body scroll area */}
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-4">
          {/* event name */}
          <div className="text-[13px] font-semibold text-neutral-0">
            Event Name
          </div>
          <div className="mt-2.5">
            <input
              readOnly
              value={eventName ?? ""}
              className={clsx(
                "w-full",
                "rounded-lg border border-neutral-700/60",
                "bg-neutral-900/55",
                // ✅ slightly smaller input
                "px-3.5 py-2.5",
                "font-medium text-neutral-200",
                "placeholder:text-neutral-500",
                "focus:outline-none focus:ring-2 focus:ring-primary-951/25",
              )}
              placeholder="Select event"
            />
          </div>

          {/* toggles */}
          <div className="mt-5 space-y-3">
            {LABELS.map((it) => (
              <div
                key={it.key}
                className="flex items-center justify-between gap-6"
              >
                <div className="text-[16px] font-semibold tracking-[-0.3px] text-neutral-0">
                  {it.label}
                </div>

                <Toggle
                  size="sm"
                  checked={toggles[it.key]}
                  onCheckedChange={(next) =>
                    setToggles((s) => ({ ...s, [it.key]: next }))
                  }
                />
              </div>
            ))}
          </div>
        </div>

        {/* footer actions (always reachable) */}
        <div className="shrink-0 border-t border-white/10 bg-neutral-950/60 px-6 py-5 backdrop-blur-2xl">
          <div className="flex items-center justify-end gap-3">
            {/* Figma: white pill */}
            <Button
              variant="secondary"
              size="lg"
              type="button"
              className={clsx(
                "rounded-full",
                "bg-neutral-0 text-neutral-950",
                "hover:bg-neutral-50",
              )}
              onClick={() => {
                const next = !allOn;
                const obj = { ...toggles };
                (Object.keys(obj) as ToggleKey[]).forEach(
                  (k) => (obj[k] = next),
                );
                setToggles(obj);
              }}
            >
              Select All
            </Button>

            {/* Figma: purple pill */}
            <Button
              variant="brand"
              size="lg"
              type="button"
              animation
              className="rounded-full"
              onClick={() => {
                // Wire to backend later
                onOpenChange(false);
              }}
            >
              Download CSV
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
