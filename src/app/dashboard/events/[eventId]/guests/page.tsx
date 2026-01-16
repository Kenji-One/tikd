// src/app/dashboard/events/[eventId]/guests/page.tsx
"use client";

import { useLayoutEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Search, User2, Check, Eye, Download } from "lucide-react";

import { RowCard } from "@/components/ui/RowCard";
import { Button } from "@/components/ui/Button";

type GuestRow = {
  id: string;
  name: string;
  handle?: string;
  ticketType: string;
  price: number;
  checkedIn: boolean;
};

const MOCK_GUESTS: GuestRow[] = [
  {
    id: "1",
    name: "Jacob Antilety",
    handle: "@jacob",
    ticketType: "Free RSVP",
    price: 0,
    checkedIn: false,
  },
  {
    id: "2",
    name: "Sam Yalvac",
    handle: "@samyalvac",
    ticketType: "Free RSVP",
    price: 0,
    checkedIn: true,
  },
];

type InnerTab = "tickets" | "orders";

/* ------------------------- Bits-style tab underline -------------- */
function useFluidTabIndicator(
  containerRef: { current: HTMLElement | null },
  indicatorRef: { current: HTMLElement | null },
  tab: string
) {
  useLayoutEffect(() => {
    const c = containerRef.current;
    const i = indicatorRef.current;
    if (!c || !i) return;
    const active = c.querySelector<HTMLButtonElement>(`[data-tab="${tab}"]`);
    if (!active) return;
    const { offsetLeft, offsetWidth } = active;
    i.style.transform = `translateX(${offsetLeft}px)`;
    i.style.width = `${offsetWidth}px`;
  }, [containerRef, indicatorRef, tab]);
}

export default function GuestsPage() {
  const [activeTab, setActiveTab] = useState<InnerTab>("tickets");
  const [query, setQuery] = useState("");

  const tabBarRef = useRef<HTMLDivElement | null>(null);
  const indicatorRef = useRef<HTMLSpanElement | null>(null);
  useFluidTabIndicator(tabBarRef, indicatorRef, activeTab);

  const filtered = MOCK_GUESTS.filter((g) =>
    g.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-neutral-0">Guests</h2>
          <p className="mt-1 text-neutral-300">
            View attendees, check them in and inspect their orders.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Team-style search input */}
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">
              <Search className="h-4 w-4" />
            </span>

            <input
              className="w-64 rounded-full border bg-neutral-900/80 pl-10 pr-16 py-2 text-sm outline-none placeholder:text-neutral-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              placeholder={
                activeTab === "tickets" ? "Search guests…" : "Search orders…"
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search guests"
            />

            {query && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-xs text-neutral-400 hover:text-neutral-0"
                onClick={() => setQuery("")}
                type="button"
              >
                Clear
              </button>
            )}
          </div>

          {/* Use Button component */}
          <Button
            type="button"
            variant="secondary"
            icon={<Download className="h-4 w-4" />}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Tabs (same style as Team page) */}
      <div
        ref={tabBarRef}
        className="relative mb-3.5 inline-flex rounded-full border border-white/10 bg-neutral-950"
      >
        <button
          data-tab="tickets"
          className={clsx(
            "relative z-10 rounded-full px-4 py-2 text-sm",
            activeTab === "tickets"
              ? "text-neutral-0"
              : "text-neutral-300 hover:text-neutral-0"
          )}
          onClick={() => setActiveTab("tickets")}
          type="button"
        >
          Tickets
        </button>

        <button
          data-tab="orders"
          className={clsx(
            "relative z-10 rounded-full px-4 py-2 text-sm",
            activeTab === "orders"
              ? "text-neutral-0"
              : "text-neutral-300 hover:text-neutral-0"
          )}
          onClick={() => setActiveTab("orders")}
          type="button"
        >
          Orders
        </button>

        <span
          ref={indicatorRef}
          className="absolute left-0 top-0 h-full w-0 rounded-full bg-white/10 ring-1 ring-inset ring-white/15 transition-[transform,width] duration-200 ease-out"
          aria-hidden="true"
        />
      </div>

      {activeTab === "tickets" ? (
        <div className="space-y-3">
          {filtered.map((g) => (
            <RowCard
              key={g.id}
              icon={<User2 className="h-5 w-5" />}
              title={g.name}
              description={
                <span className="inline-flex items-center gap-2">
                  <span className="truncate">
                    {g.ticketType} ·{" "}
                    {g.price === 0 ? "Free" : `$${g.price.toFixed(2)}`}
                  </span>
                  {g.handle ? (
                    <>
                      <span className="text-neutral-600">•</span>
                      <span className="truncate text-neutral-500">
                        {g.handle}
                      </span>
                    </>
                  ) : null}
                </span>
              }
              actions={
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <button
                    type="button"
                    className={clsx(
                      "inline-flex items-center gap-1.5 rounded-full px-4 py-2 font-medium",
                      g.checkedIn
                        ? "border border-success-700/40 bg-success-900/40 text-success-300"
                        : "border border-white/10 bg-neutral-950 text-neutral-200 hover:border-primary-500 hover:text-primary-200"
                    )}
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>{g.checkedIn ? "Checked in" : "Check in"}</span>
                  </button>

                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-neutral-950 px-4 py-2 font-medium text-neutral-200 hover:border-primary-500 hover:text-primary-200"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>View order</span>
                  </button>
                </div>
              }
            />
          ))}

          {filtered.length === 0 && (
            <div className="rounded-card border border-dashed border-white/10 bg-neutral-950/80 px-6 py-10 text-center text-sm text-neutral-300">
              No guests found.
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-card border border-dashed border-white/10 bg-neutral-950/80 px-6 py-10 text-center text-sm text-neutral-300">
          Orders view coming soon – wire this up to your payments collection
          once that&apos;s ready.
        </div>
      )}
    </div>
  );
}
