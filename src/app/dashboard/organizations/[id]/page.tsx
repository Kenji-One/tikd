// src/app/dashboard/organizations/[id]/page.tsx
import { redirect } from "next/navigation";

type RouteParams = {
  id: string;
};

export const dynamic = "force-dynamic";

export default async function OrganizationRootPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { id } = await params;
  redirect(`/dashboard/organizations/${id}/summary`);
}
