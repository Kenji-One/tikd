/* ------------------------------------------------------------------ */
/*  src/components/dashboard/data/DownloadCsvModal.tsx                 */
/* ------------------------------------------------------------------ */
"use client";

import { useMemo, useState } from "react";
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

const DEFAULTS: Record<ToggleKey, boolean> = {
  typesOfTicket: true,
  guestList: true,
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
          // smaller like Figma (and never becomes a giant monster)
          "max-w-[592px]",
          "rounded-3xl border border-white/10",
          "bg-neutral-950/85 backdrop-blur-2xl",
          "shadow-[0_24px_90px_rgba(0,0,0,0.70),inset_0_1px_0_rgba(255,255,255,0.06)]",
          // cap height + internal scroll
          "max-h-[calc(100vh-48px)] overflow-hidden",
        )}
      >
        {/* header */}
        <div className="flex items-start justify-between px-7 pt-7">
          <div className="pr-8">
            <h2 className="text-[28px] font-semibold tracking-[-0.6px] text-neutral-0">
              Download CSV
            </h2>
            <p className="mt-3 font-medium text-neutral-400">
              Select the information you want to download from Event
            </p>
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#181828] text-neutral-400 hover:text-neutral-50"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* body scroll area */}
        <div className="no-scrollbar overflow-y-auto px-7 pb-7 pt-5">
          {/* event name */}
          <div className="font-semibold text-neutral-0">Event Name</div>
          <div className="mt-2.5">
            <input
              readOnly
              value={eventName ?? ""}
              className={clsx(
                "w-full",
                // Figma-like input (less “ugly”, less tall)
                "rounded-lg border border-neutral-700/60",
                "bg-neutral-900/55",
                "px-4 py-3",
                "font-medium text-neutral-200",
                "placeholder:text-neutral-500",
                "focus:outline-none focus:ring-2 focus:ring-primary-951/25",
              )}
              placeholder="Select event"
            />
          </div>

          {/* toggles */}
          <div className="mt-6 space-y-3.5">
            {LABELS.map((it) => (
              <div
                key={it.key}
                className="flex items-center justify-between gap-6"
              >
                <div className="text-[18px] font-semibold tracking-[-0.35px] text-neutral-0">
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

          {/* actions */}
          <div className="mt-8 flex items-center justify-end gap-4">
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
