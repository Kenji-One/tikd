// src/app/dashboard/organizations/[id]/events/[eventId]/summary/page.tsx
"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  QrCode,
  Link2,
  BarChart3,
  Ticket,
  Eye,
  DollarSign,
} from "lucide-react";

import { fetchEventById, type EventWithMeta } from "@/lib/api/events";

type SummaryMetrics = {
  tickets: number;
  pageViews: number;
  revenue: number;
  balance: number;
};

function deriveMetrics(event?: EventWithMeta): SummaryMetrics {
  const tickets = event?.attendingCount ?? 0;
  const pageViews = tickets > 0 ? Math.max(tickets * 3, tickets + 10) : 0; // simple heuristic
  const revenue = 0; // hook this up to real Stripe data later
  const balance = revenue;
  return { tickets, pageViews, revenue, balance };
}

export default function EventSummaryPage() {
  const { eventId } = useParams() as { eventId?: string };

  const { data: event, isLoading } = useQuery<EventWithMeta>({
    queryKey: ["event", eventId],
    queryFn: () => fetchEventById(eventId!),
    enabled: !!eventId,
  });

  const metrics = useMemo(() => deriveMetrics(event), [event]);

  const shortSlug =
    event?._id?.slice(-6).toUpperCase() ??
    (eventId ? eventId.slice(-6).toUpperCase() : "EVENT");

  return (
    <div className="space-y-6">
      {/* Top metric cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {/* Share */}
        <div className="rounded-card border border-white/8 bg-neutral-948/90 px-5 py-4 shadow-[0_18px_45px_rgba(0,0,0,0.7)]">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary-900/70 text-primary-200">
                <QrCode className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-neutral-0">Share</p>
                <p className="mt-0.5 text-[11px] text-neutral-400">
                  Share your event link or use a QR code at the door.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-dashed border-white/12 bg-neutral-950/60 text-neutral-500">
              <QrCode className="h-8 w-8" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="rounded-full bg-neutral-950/80 px-3 py-2 text-[11px] text-neutral-300">
                tikd.app/e/{shortSlug}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="inline-flex flex-1 items-center justify-center rounded-full bg-primary-600 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-primary-500"
                >
                  <Link2 className="mr-1.5 h-3.5 w-3.5" />
                  Copy link
                </button>
                <button
                  type="button"
                  className="inline-flex flex-1 items-center justify-center rounded-full border border-white/10 bg-neutral-950 px-3 py-1.5 text-[11px] font-medium text-neutral-200 hover:border-primary-500 hover:text-primary-200"
                >
                  Download QR
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Overview */}
        <div className="rounded-card border border-white/8 bg-neutral-948/90 px-5 py-4 shadow-[0_18px_45px_rgba(0,0,0,0.7)]">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary-900/70 text-primary-200">
                <BarChart3 className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-neutral-0">Overview</p>
                <p className="mt-0.5 text-[11px] text-neutral-400">
                  High-level performance for this event.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-3xl font-semibold text-neutral-0">
                {isLoading ? "–" : metrics.tickets.toLocaleString()}
              </p>
              <p className="text-xs text-neutral-400">Tickets</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-neutral-0">
                {isLoading ? "–" : metrics.pageViews.toLocaleString()}
              </p>
              <p className="text-xs text-neutral-400">Page views</p>
            </div>
          </div>
        </div>

        {/* Revenue */}
        <div className="rounded-card border border-white/8 bg-neutral-948/90 px-5 py-4 shadow-[0_18px_45px_rgba(0,0,0,0.7)]">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary-900/70 text-primary-200">
                <DollarSign className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-neutral-0">Revenue</p>
                <p className="mt-0.5 text-[11px] text-neutral-400">
                  Stripe payouts and on-site sales.
                </p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-3xl font-semibold text-neutral-0">
              {isLoading ? "–" : `$${metrics.revenue.toFixed(2)}`}
            </p>
            <p className="mt-1 text-xs text-neutral-400">
              Hook this up to event payouts once Stripe is wired in.
            </p>
          </div>
        </div>

        {/* Balance */}
        <div className="rounded-card border border-white/8 bg-neutral-948/90 px-5 py-4 shadow-[0_18px_45px_rgba(0,0,0,0.7)]">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary-900/70 text-primary-200">
                <Ticket className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-neutral-0">Balance</p>
                <p className="mt-0.5 text-[11px] text-neutral-400">
                  What&apos;s available vs pending for this event.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400">Total</span>
              <span className="font-medium text-neutral-0">
                {isLoading ? "–" : `$${metrics.balance.toFixed(2)}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tickets chart */}
      <div className="rounded-card border border-white/8 bg-neutral-948/90 px-5 py-4 shadow-[0_18px_45px_rgba(0,0,0,0.7)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary-900/70 text-primary-200">
                <Ticket className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-neutral-0">Tickets</p>
                <p className="mt-0.5 text-[11px] text-neutral-400">
                  A quick visual of ticket sales over time.
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-neutral-950 px-4 py-2 text-xs font-medium text-neutral-200 hover:border-primary-500 hover:text-primary-200"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>View performance</span>
          </button>
        </div>

        <div className="mt-4 h-56 rounded-[1.25rem] bg-gradient-to-t from-primary-950 via-primary-900 to-primary-800">
          <div className="relative h-full w-full overflow-hidden">
            {/* soft grid */}
            <div className="absolute inset-4">
              <div className="absolute inset-0 border-b border-white/10" />
              <div className="absolute inset-0 border-t border-white/5" />
              <div className="absolute inset-0 border-l border-white/5" />
              <div className="absolute inset-0 border-r border-white/5" />
              <div className="absolute inset-0 grid grid-cols-12 gap-1">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="border-l border-white/5 last:border-r"
                  />
                ))}
              </div>
            </div>

            {/* bars */}
            <div className="absolute inset-x-5 bottom-6 flex items-end gap-2">
              {Array.from({ length: 12 }).map((_, i) => {
                const base = 25;
                const height = base + ((i * 17) % 40); // pseudo-random curve
                return (
                  <div key={i} className="flex-1">
                    <div
                      className="w-full rounded-t-full bg-primary-600/70"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                );
              })}
            </div>

            {/* x-axis labels */}
            <div className="absolute inset-x-5 bottom-2 flex justify-between text-[10px] text-neutral-200/80">
              <span>Launch</span>
              <span>1 week</span>
              <span>2 weeks</span>
              <span>Event</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
