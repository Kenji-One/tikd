// src/app/dashboard/events/[eventId]/tracking-links/page.tsx
"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import TrackingLinksTable from "@/components/dashboard/tables/TrackingLinksTable";
import { fetchEventById, type EventWithMeta } from "@/lib/api/events";

/* ----------------------------- Small TS-safe helpers ----------------------------- */
type UnknownRecord = Record<string, unknown>;

function asRecord(v: unknown): UnknownRecord | null {
  return v !== null && typeof v === "object" ? (v as UnknownRecord) : null;
}

function getString(rec: UnknownRecord | null, key: string): string | null {
  if (!rec) return null;
  const v = rec[key];
  return typeof v === "string" ? v : null;
}

export default function EventTrackingLinksPage() {
  const { eventId } = useParams<{ eventId?: string }>();

  const { data: event } = useQuery<EventWithMeta>({
    queryKey: ["event", eventId],
    queryFn: () => fetchEventById(eventId!),
    enabled: !!eventId,
  });

  // ✅ Same "currentEventMeta" logic as summary page (defensive, no `any`)
  const currentEventMeta = useMemo(() => {
    if (!eventId) return null;

    const e = asRecord(event);

    const title =
      getString(e, "title") ?? getString(e, "name") ?? "Current Event";

    const image =
      getString(e, "image") ??
      getString(e, "poster") ??
      getString(e, "photo") ??
      getString(e, "coverImage") ??
      null;

    const date =
      getString(e, "date") ??
      getString(e, "startDate") ??
      getString(e, "startsAt") ??
      getString(e, "startTime") ??
      null;

    const orgNameDirect = getString(e, "orgName");

    const orgRec = asRecord(e?.organization);
    const orgNameNested = getString(orgRec, "name");

    const orgName = orgNameDirect ?? orgNameNested ?? null;

    return { title, image, date, orgName };
  }, [event, eventId]);

  return (
    <div className="space-y-4 px-4 md:px-6 lg:px-8">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-semibold tracking-[-0.2px] text-neutral-0">
            Tracking Links
          </h2>
          <p className="mt-1 text-[13px] text-neutral-300">
            Create and manage tracking links for this event.
          </p>
        </div>
      </div>

      <TrackingLinksTable
        scope="event"
        eventId={eventId}
        showViewAll={false}
        currentEventMeta={currentEventMeta}
      />
    </div>
  );
}
