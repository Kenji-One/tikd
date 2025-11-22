// src/app/dashboard/organizations/[id]/finances/page.tsx
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { CalendarDays, Search } from "lucide-react";

type FinancesTabKey = "overview" | "payouts" | "disputes";

const FINANCE_TABS: { key: FinancesTabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "payouts", label: "Payouts" },
  { key: "disputes", label: "Disputes" },
];

export default function OrgFinancesPage() {
  const [activeTab, setActiveTab] = useState<FinancesTabKey>("overview");
  const params = useParams();
  const orgId = (params?.id ?? "") as string;

  return (
    <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-[32px] font-semibold leading-tight tracking-tight text-neutral-0 sm:text-[36px]">
            Balances
          </h1>
          {orgId && (
            <p className="mt-1 text-xs font-medium text-neutral-500">
              Organization ID{" "}
              <span className="font-mono text-neutral-300">{orgId}</span>
            </p>
          )}
        </header>

        {/* Tabs */}
        <div className="mb-6 inline-flex rounded-full bg-neutral-950/80 p-1 text-sm shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
          {FINANCE_TABS.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={[
                  "relative min-w-[110px] rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950",
                  isActive
                    ? "bg-primary-950 text-neutral-0 shadow-[0_6px_18px_rgba(0,0,0,0.7)]"
                    : "text-neutral-300 hover:text-neutral-0",
                ].join(" ")}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Card */}
        <section className="rounded-card bg-neutral-948 px-4 py-6 shadow-[0_24px_80px_rgba(0,0,0,0.75)] sm:px-8 sm:py-8">
          {/* Filters */}
          <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-xs text-neutral-400">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900/80">
                <Search className="h-4 w-4" />
              </span>
              <span>
                {activeTab === "overview" &&
                  "View your available and pending balances."}
                {activeTab === "payouts" &&
                  "Review payouts sent to your bank account."}
                {activeTab === "disputes" &&
                  "Monitor disputes and chargebacks for this org."}
              </span>
            </div>

            {/* Date range pill (static for now) */}
            <button
              type="button"
              className="inline-flex items-center gap-3 rounded-full bg-neutral-950 px-4 py-2 text-xs font-medium text-neutral-0 shadow-[0_8px_24px_rgba(0,0,0,0.75)] hover:bg-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
            >
              <span>9/19/2025 – 12/18/2025</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900">
                <CalendarDays className="h-4 w-4 text-neutral-300" />
              </span>
            </button>
          </div>

          {/* Empty state */}
          <div className="flex min-h-[260px] flex-col items-center justify-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-900 text-neutral-500">
              {/* Equals + search, mimicking the competitor icon vibe */}
              <span className="text-2xl leading-none">≡</span>
              <span className="relative -left-2 text-xl leading-none">🔍</span>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-neutral-100">
                No information available
              </p>
              <p className="text-xs text-neutral-400 max-w-xs">
                Once you start selling tickets with this organization, your
                balances, payouts and disputes will appear here.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
