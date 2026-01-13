// src/app/dashboard/events/[eventId]/page.tsx
import { redirect } from "next/navigation";

type RouteParams = {
  eventId: string;
};

export default function EventRootPage({ params }: { params: RouteParams }) {
  redirect(`/dashboard/events/${params.eventId}/summary`);
}
