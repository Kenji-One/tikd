// src/components/features/settings/PaymentMethods.tsx
"use client";

import { Button } from "@/components/ui/Button";
import clsx from "classnames";

type Card = {
  id: string;
  brand: "Visa" | "Mastercard" | "Amex" | "Card";
  last4: string;
  isDefault?: boolean;
  label?: string;
};

const demo: Card[] = [
  {
    id: "1",
    brand: "Visa",
    last4: "4724",
    label: "My New Visa",
    isDefault: true,
  },
  { id: "2", brand: "Card", last4: "4724", label: "Credit Card" },
  { id: "3", brand: "Card", last4: "4724", label: "Tom’s Card" },
];

function DefaultPill() {
  return (
    <span className="inline-flex items-center rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
      Default Method
    </span>
  );
}

export default function PaymentMethods() {
  return (
    <div className="w-full">
      <h3 className="text-[16px] font-extrabold tracking-[-0.02em] text-neutral-0">
        Payment Methods
      </h3>

      <div className="mt-6 ">
        <div className="space-y-3">
          {demo.map((c) => (
            <div
              key={c.id}
              className={clsx(
                "flex flex-col gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3",
                "sm:flex-row sm:items-center sm:justify-between",
              )}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-[13px] font-semibold text-neutral-0">
                    {c.label ?? c.brand}
                  </p>
                  {c.isDefault ? <DefaultPill /> : null}
                </div>
                <p className="mt-0.5 text-[11px] text-neutral-400">
                  {c.brand} ending in {c.last4}
                  {c.isDefault ? " · Default" : ""}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                {!c.isDefault ? (
                  <Button size="sm" variant="secondary">
                    Make as Default
                  </Button>
                ) : null}
                <Button size="sm" variant="destructive">
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <Button variant="secondary" size="sm">
            Download Invoices
          </Button>
          <Button variant="brand" size="sm" animation>
            Add Payment Method
          </Button>
        </div>
      </div>
    </div>
  );
}
