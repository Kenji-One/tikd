// src/app/dashboard/events/[eventId]/page.tsx
import { redirect } from "next/navigation";

type RouteParams = {
  eventId: string;
};

export default async function EventRootPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { eventId } = await params;
  redirect(`/dashboard/events/${eventId}/summary`);
}
