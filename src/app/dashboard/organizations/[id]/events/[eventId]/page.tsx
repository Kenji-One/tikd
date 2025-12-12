// src/app/dashboard/organizations/[id]/events/[eventId]/page.tsx
import { redirect } from "next/navigation";

type RouteParams = {
  id: string;
  eventId: string;
};

export default async function EventRootPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { id, eventId } = await params;

  redirect(`/dashboard/organizations/${id}/events/${eventId}/summary`);
}
