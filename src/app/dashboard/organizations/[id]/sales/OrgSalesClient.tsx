// src/app/dashboard/organizations/[id]/sales/OrgSalesClient.tsx
"use client";

import { useParams } from "next/navigation";

import ScopedSalesHistoryClient from "@/components/dashboard/sales/ScopedSalesHistoryClient";

export default function OrgSalesClient() {
  const params = useParams<{ id: string }>();
  const orgId = params?.id ?? null;

  return (
    <ScopedSalesHistoryClient
      scope="organization"
      orgId={orgId}
      title="ORGANIZATION SALES"
      subtitle="Review transactions and ticket revenue for this organization"
    />
  );
}
