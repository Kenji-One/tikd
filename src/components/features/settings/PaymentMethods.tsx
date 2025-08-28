"use client";

import { Button } from "@/components/ui/Button";

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

export default function PaymentMethods() {
  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-surface p-4">
      <h3 className="text-lg font-semibold">Payment Methods</h3>

      <div className="space-y-3">
        {demo.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between rounded-lg border border-white/10 p-3"
          >
            <div>
              <p className="font-medium">{c.label ?? c.brand}</p>
              <p className="text-xs text-white/60">
                {c.brand} ending in {c.last4}
                {c.isDefault ? " · Default" : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!c.isDefault && (
                <Button size="sm" variant="secondary">
                  Make as Default
                </Button>
              )}
              <Button size="sm" variant="ghost">
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-2">
        <Button variant="brand" size="sm">
          Add Payment Method
        </Button>
        <Button variant="secondary" size="sm">
          Download Invoices
        </Button>
      </div>

      <p className="text-xs text-white/60">
        These methods will be available at checkout. Integrate with Stripe to
        sync real cards.
      </p>
    </div>
  );
}
