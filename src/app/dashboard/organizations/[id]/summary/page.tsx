// src/app/dashboard/organizations/[id]/summary/page.tsx
import OrgSummaryClient from "./OrgSummaryClient";

export const dynamic = "force-dynamic";

export default async function OrgSummaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OrgSummaryClient orgId={id} />;
}
