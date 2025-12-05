"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import {
  ArrowLeft,
  CalendarDays,
  ExternalLink,
  Users,
  Copy,
} from "lucide-react";

import { fetchEventById, type EventWithMeta } from "@/lib/api/events";

type EventLayoutProps = {
  children: ReactNode;
};

const EVENT_TABS = [
  { id: "summary", label: "Summary" },
  { id: "ticket-types", label: "Ticket Types" },
  { id: "promo-codes", label: "Promo Codes" },
  { id: "guests", label: "Guests" },
  { id: "team", label: "Team" },
  { id: "edit", label: "Edit" },
  { id: "settings", label: "Settings" },
] as const;

type EventTabId = (typeof EVENT_TABS)[number]["id"];

function formatDateTime(value?: string) {
  if (!value) return "Date not set";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Date not set";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function EventDashboardLayout({ children }: EventLayoutProps) {
  const { id: orgId, eventId } = useParams() as {
    id?: string;
    eventId?: string;
  };
  const pathname = usePathname();
  const [copied, setCopied] = useState(false);

  const basePath =
    orgId && eventId
      ? `/dashboard/organizations/${orgId}/events/${eventId}`
      : "";

  const { data: event, isLoading } = useQuery<EventWithMeta>({
    queryKey: ["event", eventId],
    queryFn: () => fetchEventById(eventId!),
    enabled: !!eventId,
  });

  let activeTab: EventTabId = "summary";
  if (basePath && pathname.startsWith(basePath)) {
    const rest = pathname.slice(basePath.length);
    const segment = rest.split("/").filter(Boolean)[0];
    if (segment && EVENT_TABS.some((t) => t.id === segment)) {
      activeTab = segment as EventTabId;
    }
  }

  const status = event?.status;
  const statusLabel = status === "draft" ? "Draft" : "Published";
  const statusClasses =
    status === "draft"
      ? "bg-neutral-900 text-neutral-200 border border-white/10"
      : "bg-success-900/40 text-success-300 border border-success-700/40";

  async function handleCopyPublicLink() {
    if (!eventId || typeof navigator === "undefined") return;
    const url = `/events/${eventId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  }

  return (
    <main className="relative min-h-screen bg-neutral-950 text-neutral-0">
      <section className="pb-16 pt-6">
        {/* Top header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-xs text-neutral-400">
              {orgId && (
                <Link
                  href={`/dashboard/organizations/${orgId}/events`}
                  prefetch
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-neutral-950/80 px-3 py-1.5 text-[11px] text-neutral-300 hover:border-primary-500 hover:text-primary-200"
                >
                  <ArrowLeft className="h-3 w-3" />
                  <span>Back to events</span>
                </Link>
              )}
              {event?.organization?.name && (
                <span className="text-[11px] text-neutral-500">
                  {event.organization.name}
                </span>
              )}
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-semibold tracking-tight text-neutral-0">
                {isLoading ? "Loading event…" : (event?.title ?? "Event")}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                <div className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5 text-neutral-500" />
                  <span>
                    {event?.date ? formatDateTime(event.date) : "Date TBA"}
                  </span>
                </div>

                <span
                  className={clsx(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                    statusClasses
                  )}
                >
                  <span className="mr-1 h-1.5 w-1.5 rounded-full bg-current" />
                  {statusLabel}
                </span>

                <span className="inline-flex items-center gap-1 rounded-full bg-neutral-900 px-2 py-0.5 text-[11px] text-neutral-300">
                  <Users className="h-3 w-3" />
                  <span>
                    {(event?.attendingCount ?? 0).toLocaleString()}{" "}
                    {(event?.attendingCount ?? 0) === 1
                      ? "attendee"
                      : "attendees"}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleCopyPublicLink}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-neutral-950/80 px-4 py-2 text-xs font-medium text-neutral-200 hover:border-primary-500 hover:text-primary-200"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>{copied ? "Link copied" : "Copy public link"}</span>
            </button>

            {eventId && (
              <Link
                href={`/events/${eventId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-primary-600 px-4 py-2 text-xs font-medium text-white shadow-[0_0_0_1px_rgba(255,255,255,0.10)] hover:bg-primary-500"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>View public page</span>
              </Link>
            )}
          </div>
        </div>

        {/* Tab bar – bigger + nicer */}
        <div className="mb-6 overflow-x-auto">
          <div className="inline-flex min-w-max gap-2 rounded-2xl bg-neutral-950/90 px-2 py-2 ring-1 ring-white/10 shadow-[0_18px_45px_rgba(0,0,0,0.7)]">
            {EVENT_TABS.map((tab) => {
              const href =
                basePath && orgId && eventId ? `${basePath}/${tab.id}` : "#";
              const isActive = activeTab === tab.id;

              return (
                <Link
                  key={tab.id}
                  href={href}
                  prefetch
                  scroll={false}
                  className={clsx(
                    "inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[13px] font-medium leading-none transition-colors",
                    isActive
                      ? "bg-primary-600 text-neutral-0 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
                      : "text-neutral-300 hover:text-neutral-0 hover:bg-neutral-900/80"
                  )}
                >
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {children}
      </section>
    </main>
  );
}
