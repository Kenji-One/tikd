// src/app/dashboard/organizations/[id]/events/[eventId]/guests/page.tsx
"use client";

import { useState } from "react";
import { Search, User2, Check, Eye, Download } from "lucide-react";

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

export default function GuestsPage() {
  const [activeTab, setActiveTab] = useState<InnerTab>("tickets");
  const [query, setQuery] = useState("");

  const filtered = MOCK_GUESTS.filter((g) =>
    g.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-0">Guests</h2>
          <p className="mt-1 text-xs text-neutral-400">
            View attendees, check them in and inspect their orders.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-neutral-950 px-4 py-2 text-xs font-medium text-neutral-200 hover:border-primary-500 hover:text-primary-200"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </header>

      {/* Tickets / Orders toggle */}
      <div className="inline-flex rounded-full bg-neutral-950/80 p-1 ring-1 ring-neutral-800/70">
        <button
          type="button"
          onClick={() => setActiveTab("tickets")}
          className={`rounded-full px-4 py-1.5 text-xs font-medium ${
            activeTab === "tickets"
              ? "bg-primary-600 text-white"
              : "text-neutral-300"
          }`}
        >
          Tickets
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("orders")}
          className={`rounded-full px-4 py-1.5 text-xs font-medium ${
            activeTab === "orders"
              ? "bg-primary-600 text-white"
              : "text-neutral-300"
          }`}
        >
          Orders
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="search"
            placeholder={
              activeTab === "tickets" ? "Search guests…" : "Search orders…"
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-full border border-white/10 bg-neutral-950 px-9 py-2 text-xs text-neutral-0 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>

      {activeTab === "tickets" ? (
        <div className="space-y-3">
          {filtered.map((g) => (
            <div
              key={g.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-white/8 bg-neutral-948/90 px-5 py-4 shadow-[0_18px_45px_rgba(0,0,0,0.7)]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 text-neutral-300">
                  <User2 className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-0">
                    {g.name}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-neutral-400">
                    {g.ticketType} ·{" "}
                    {g.price === 0 ? "Free" : `$${g.price.toFixed(2)}`}
                  </p>
                  {g.handle && (
                    <p className="mt-0.5 text-[11px] text-neutral-500">
                      {g.handle}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs">
                <button
                  type="button"
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 font-medium ${
                    g.checkedIn
                      ? "bg-success-900/40 text-success-300 border border-success-700/40"
                      : "border border-white/10 bg-neutral-950 text-neutral-200 hover:border-primary-500 hover:text-primary-200"
                  }`}
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
            </div>
          ))}
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
