// src/app/dashboard/teams/[id]/summary/page.tsx
import TeamSummaryClient from "./TeamSummaryClient";

export const dynamic = "force-dynamic";

export default async function TeamSummaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TeamSummaryClient teamId={id} />;
}
