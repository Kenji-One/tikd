// src/app/dashboard/organizations/[id]/events/[eventId]/promo-codes/page.tsx
"use client";

import { useState } from "react";
import { Search, Plus, Percent } from "lucide-react";

type PromoCodeRow = {
  id: string;
  code: string;
  description: string;
  discount: string;
  uses: number;
  maxUses?: number;
  active: boolean;
};

const MOCK_PROMOS: PromoCodeRow[] = [];

export default function PromoCodesPage() {
  const [query, setQuery] = useState("");

  const filtered = MOCK_PROMOS.filter((p) =>
    p.code.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-0">Promo codes</h2>
          <p className="mt-1 text-xs text-neutral-400">
            Create discount codes for early birds, influencers and partners.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full bg-primary-600 px-4 py-2 text-xs font-medium text-white shadow-[0_0_0_1px_rgba(255,255,255,0.10)] hover:bg-primary-500"
        >
          <Plus className="h-4 w-4" />
          <span>New promo code</span>
        </button>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="search"
            placeholder="Search promo codes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-full border border-white/10 bg-neutral-950 px-9 py-2 text-xs text-neutral-0 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-white/10 bg-neutral-950/80 px-6 py-12 text-center">
          <Percent className="mb-3 h-7 w-7 text-neutral-500" />
          <p className="text-sm font-medium text-neutral-0">
            No promo codes yet
          </p>
          <p className="mt-1 max-w-md text-xs text-neutral-400">
            Create your first code to reward loyal guests or unlock hidden
            ticket types.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* When you hook up the backend, render each promo row here */}
        </div>
      )}
    </div>
  );
}
