// src/app/dashboard/teams/[id]/page.tsx
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TeamRootPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/dashboard/teams/${id}/summary`);
}
