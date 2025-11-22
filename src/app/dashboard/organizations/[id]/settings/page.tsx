// src/app/dashboard/organizations/[id]/settings/page.tsx
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";

type SettingsTabKey = "financial" | "integrations" | "fees" | "other";

const SETTINGS_TABS: { key: SettingsTabKey; label: string }[] = [
  { key: "financial", label: "Financial" },
  { key: "integrations", label: "Integrations" },
  { key: "fees", label: "Service Fees" },
  { key: "other", label: "Other" },
];

export default function OrgSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTabKey>("financial");
  const params = useParams();
  const orgId = (params?.id ?? "") as string;

  return (
    <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-[32px] font-semibold leading-tight tracking-tight text-neutral-0 sm:text-[36px]">
            Settings
          </h1>
          {orgId && (
            <p className="mt-1 text-xs font-medium text-neutral-500">
              Organization ID{" "}
              <span className="font-mono text-neutral-300">{orgId}</span>
            </p>
          )}
        </header>

        {/* Tab strip */}
        <div className="mb-6 inline-flex rounded-full bg-neutral-950/80 p-1 text-sm shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
          {SETTINGS_TABS.map((tab) => {
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
          {activeTab === "financial" && <FinancialTab />}
          {activeTab === "integrations" && <IntegrationsTab />}
          {activeTab === "fees" && <ServiceFeesTab />}
          {activeTab === "other" && <OtherTab />}
        </section>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/*  Tabs content                                                      */
/* ------------------------------------------------------------------ */

function FinancialTab() {
  // Later you can fetch this from /api/organizations/[id]/settings
  const mockStripeAccountId = "acct_1P4a0uR99fvvQkrA";
  const mockOnboardingId = "66189ebc4468727d26454a07";

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-lg font-semibold text-neutral-0">Payout Info</h2>

        <div className="mt-6 space-y-5 rounded-2xl bg-neutral-950/60 px-5 py-5 sm:px-6 sm:py-6">
          {/* Stripe account row */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-neutral-100">
                Stripe Account
              </p>
              <p className="mt-1 font-mono text-xs text-neutral-400">
                {mockStripeAccountId}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-error-700/70 bg-error-900/40 px-3 py-1 text-xs font-medium text-error-200">
                Payments Disabled
              </span>
              <span className="inline-flex items-center rounded-full border border-error-700/70 bg-error-900/40 px-3 py-1 text-xs font-medium text-error-200">
                Payouts Disabled
              </span>
            </div>
          </div>

          {/* CTA */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-xs leading-relaxed text-neutral-400">
              To enable payments and payouts for this organization, resume your
              Stripe onboarding and complete all required verification steps.
            </p>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full bg-primary-700 px-5 py-2.5 text-sm font-semibold text-neutral-0 shadow-[0_10px_30px_rgba(154,70,255,0.55)] transition hover:bg-primary-600"
            >
              Resume Activation
            </button>
          </div>
        </div>
      </div>

      {/* Timeline footer */}
      <div className="flex flex-col gap-3 rounded-2xl bg-neutral-950/80 px-5 py-4 text-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 text-neutral-200">
          <span className="h-2 w-2 rounded-full bg-warning-500" />
          <span className="font-medium">Pending</span>
          <span className="text-neutral-400">(2 years ago)</span>
        </div>
        <p className="font-mono text-[11px] text-neutral-500">
          {mockOnboardingId}
        </p>
      </div>
    </div>
  );
}

function IntegrationsTab() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-neutral-0">Integrations</h2>
        <p className="mt-2 max-w-xl text-sm text-neutral-400">
          Connect third-party tools to sync orders, customers, and analytics
          with your existing stack.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Example integration card */}
        <IntegrationCard
          name="Stripe"
          description="Used for payments and payouts. This integration is required for selling tickets."
          status="Required"
        />
        <IntegrationCard
          name="Google Analytics"
          description="Track page views and conversions from your events."
          status="Optional"
        />
        <IntegrationCard
          name="Meta Pixel"
          description="Run retargeting campaigns for people who viewed your events."
          status="Optional"
        />
        <IntegrationCard
          name="Webhook"
          description="Send realtime event data to your own backend."
          status="Advanced"
        />
      </div>
    </div>
  );
}

type IntegrationCardProps = {
  name: string;
  description: string;
  status: "Required" | "Optional" | "Advanced";
};

function IntegrationCard({ name, description, status }: IntegrationCardProps) {
  const statusTone =
    status === "Required"
      ? "bg-success-950/60 text-success-300 border-success-700/60"
      : status === "Advanced"
        ? "bg-primary-950/60 text-primary-300 border-primary-700/60"
        : "bg-neutral-900 text-neutral-200 border-neutral-700/70";

  return (
    <div className="flex flex-col justify-between gap-3 rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4">
      <div>
        <h3 className="text-sm font-semibold text-neutral-0">{name}</h3>
        <p className="mt-1 text-xs leading-relaxed text-neutral-400">
          {description}
        </p>
      </div>
      <div className="flex items-center justify-between">
        <span
          className={[
            "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-medium",
            statusTone,
          ].join(" ")}
        >
          {status}
        </span>
        <button
          type="button"
          className="text-xs font-medium text-primary-300 hover:text-primary-200"
        >
          Configure
        </button>
      </div>
    </div>
  );
}

function ServiceFeesTab() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-neutral-0">Service Fees</h2>
        <p className="mt-2 max-w-xl text-sm text-neutral-400">
          Define how much you charge on top of ticket prices. These fees apply
          to all events for this organization unless overridden.
        </p>
      </div>

      <section className="space-y-6 rounded-2xl bg-neutral-950/70 px-5 py-5 sm:px-6 sm:py-6">
        {/* Name */}
        <div className="space-y-2">
          <label
            htmlFor="fee-name"
            className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400"
          >
            Ticketing Fees Name (en) *
          </label>
          <input
            id="fee-name"
            type="text"
            defaultValue="Service Fee (non-refundable)"
            className="h-11 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 text-sm text-neutral-0 placeholder:text-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-600/70"
          />
        </div>

        {/* Fee rows */}
        <div className="space-y-4">
          <FeeRow
            label="Standard tickets"
            percent="7"
            fixed="1.99"
            currency="USD"
          />
          <FeeRow
            label="High-volume events"
            percent="2.9"
            fixed=""
            currency="USD"
          />
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-3 border-t border-neutral-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-neutral-500">
            Fees are non-refundable and are charged on top of the ticket price
            to the buyer.
          </p>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full bg-neutral-0 px-5 py-2.5 text-xs font-semibold text-neutral-950 shadow-[0_8px_26px_rgba(0,0,0,0.7)] transition hover:bg-neutral-100"
          >
            Save changes
          </button>
        </div>
      </section>
    </div>
  );
}

type FeeRowProps = {
  label: string;
  percent: string;
  fixed: string;
  currency: string;
};

function FeeRow({ label, percent, fixed, currency }: FeeRowProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-neutral-300">{label}</p>
      <div className="flex flex-wrap gap-3">
        {/* % value */}
        <div className="flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2">
          <input
            type="number"
            defaultValue={percent}
            className="w-14 bg-transparent text-sm font-medium text-neutral-0 outline-none"
          />
          <span className="inline-flex h-8 min-w-[40px] items-center justify-center rounded-full bg-primary-500 text-xs font-semibold text-neutral-950">
            %
          </span>
          <span className="text-xs text-neutral-400">{currency}</span>
        </div>

        {/* Fixed value, optional */}
        <div className="flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2">
          <input
            type="number"
            defaultValue={fixed}
            placeholder="0.00"
            className="w-16 bg-transparent text-sm font-medium text-neutral-0 outline-none placeholder:text-neutral-500"
          />
          <span className="inline-flex h-8 min-w-[40px] items-center justify-center rounded-full bg-primary-500 text-xs font-semibold text-neutral-950">
            {currency}
          </span>
        </div>

        {/* Add button (placeholder) */}
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-lg leading-none text-neutral-300 hover:bg-neutral-850"
        >
          +
        </button>
      </div>
    </div>
  );
}

function OtherTab() {
  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-0">
            Terms and Conditions
          </h2>
          <p className="mt-1 text-sm text-neutral-400">Ticketing</p>
        </div>

        {/* Terms blocks */}
        <TermsBlock
          label="General Terms"
          placeholder="All items are non-refundable. All sales are final."
        />
        <TermsBlock
          label="Refund Policy"
          placeholder="All sales are final. There are no refunds, exchanges or cancellations under any circumstance."
        />
        <TermsBlock label="Age Restriction" placeholder="Optional." />
      </section>

      {/* Checkout checkboxes */}
      <section className="space-y-4 border-t border-neutral-850 pt-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-neutral-0">
              Checkout Mandatory Checkboxes
            </h3>
            <p className="mt-1 text-xs text-neutral-400">
              These checkboxes will appear on the final step of checkout and
              must be accepted by buyers.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full bg-primary-700 px-4 py-2 text-xs font-semibold text-neutral-0 shadow-[0_8px_26px_rgba(154,70,255,0.55)] hover:bg-primary-600"
          >
            <span className="text-base leading-none">+</span>
            Add Checkbox
          </button>
        </div>

        {/* Placeholder empty state */}
        <div className="flex min-h-[80px] items-center justify-center rounded-2xl border border-dashed border-neutral-800 bg-neutral-950/60 px-4 text-xs text-neutral-500">
          No mandatory checkboxes configured yet.
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-neutral-850 pt-4 text-xs text-neutral-400 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full bg-neutral-0 px-5 py-2.5 text-xs font-semibold text-neutral-950 shadow-[0_8px_26px_rgba(0,0,0,0.7)] hover:bg-neutral-100"
          >
            Save
          </button>
          <div className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 text-[11px] text-neutral-300">
            <span className="h-2 w-2 rounded-full bg-neutral-600" />
            Updated 4 years ago
          </div>
        </div>
      </section>
    </div>
  );
}

type TermsBlockProps = {
  label: string;
  placeholder: string;
};

function TermsBlock({ label, placeholder }: TermsBlockProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-neutral-300">{label}</p>
      <div className="relative">
        <textarea
          rows={3}
          defaultValue={placeholder}
          className="w-full resize-none rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-0 placeholder:text-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-600/70"
        />
        {/* Pencil icon placeholder (purely decorative for now) */}
        <div className="pointer-events-none absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-800 bg-neutral-950 text-xs text-neutral-300">
          ✎
        </div>
      </div>
    </div>
  );
}
