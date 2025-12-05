// src/app/dashboard/organizations/[id]/events/[eventId]/page.tsx
import { redirect } from "next/navigation";

type PageProps = {
  params: { id: string; eventId: string };
};

export default function EventRootPage({ params }: PageProps) {
  const { id, eventId } = params;
  redirect(`/dashboard/organizations/${id}/events/${eventId}/summary`);
}
