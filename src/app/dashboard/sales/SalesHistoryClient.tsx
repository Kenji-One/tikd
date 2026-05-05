// src/app/dashboard/sales/SalesHistoryClient.tsx
"use client";

import ScopedSalesHistoryClient from "@/components/dashboard/sales/ScopedSalesHistoryClient";

export default function SalesHistoryClient() {
  return (
    <ScopedSalesHistoryClient
      scope="global"
      title="SALES HISTORY"
      subtitle="Review your transactions and ticket revenue"
    />
  );
}
