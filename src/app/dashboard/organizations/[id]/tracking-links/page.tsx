// src/app/dashboard/organizations/[id]/tracking-links/page.tsx
"use client";

import { useParams } from "next/navigation";
import TrackingLinksTable from "@/components/dashboard/tables/TrackingLinksTable";

export default function OrgTrackingLinksPage() {
  const { id } = useParams() as { id?: string };

  return (
    <div className="mx-auto px-4 pb-8">
      <div className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-[18px] font-semibold tracking-[-0.2px] text-neutral-0">
              Tracking Links
            </h2>
            <p className="mt-1 text-[13px] text-neutral-300">
              Create and manage tracking links for this organization and its
              events.
            </p>
          </div>
        </div>

        <TrackingLinksTable
          scope="organization"
          organizationId={id}
          showViewAll={false}
        />
      </div>
    </div>
  );
}
