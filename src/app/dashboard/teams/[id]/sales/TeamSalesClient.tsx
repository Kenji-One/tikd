// src/app/dashboard/teams/[id]/sales/TeamSalesClient.tsx
"use client";

import { useParams } from "next/navigation";

import ScopedSalesHistoryClient from "@/components/dashboard/sales/ScopedSalesHistoryClient";

export default function TeamSalesClient() {
  const params = useParams<{ id: string }>();
  const teamId = params?.id ?? null;

  return (
    <ScopedSalesHistoryClient
      scope="team"
      teamId={teamId}
      title="TEAM SALES"
      subtitle="Review attributed sales performance for this team"
    />
  );
}
