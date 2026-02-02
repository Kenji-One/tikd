// src/app/dashboard/events/[eventId]/tracking-links/page.tsx
"use client";

import { useParams } from "next/navigation";
import TrackingLinksTable from "@/components/dashboard/tables/TrackingLinksTable";

export default function EventTrackingLinksPage() {
  const { eventId } = useParams() as { eventId?: string };

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
      <TrackingLinksTable scope="event" eventId={eventId} showViewAll={false} />
    </div>
  );
}
