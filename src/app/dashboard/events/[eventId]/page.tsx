import { redirect } from "next/navigation";

type RouteParams = {
  eventId: string;
};

export default async function EventRootPage({
  params,
}: {
  params: RouteParams;
}) {
  redirect(`/dashboard/events/${params.eventId}/summary`);
}
