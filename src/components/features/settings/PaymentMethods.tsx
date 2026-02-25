"use client";

import { useMemo, useState } from "react";
import clsx from "classnames";
import { Button } from "@/components/ui/Button";

type Card = {
  id: string;
  brand: "Visa" | "Mastercard" | "Amex" | "Card";
  last4: string;
  isDefault?: boolean;
  label?: string;
};

const initialDemo: Card[] = [
  {
    id: "visa",
    brand: "Visa",
    last4: "4724",
    label: "My New Visa",
    isDefault: true,
  },
  { id: "credit", brand: "Card", last4: "4724", label: "Credit Card" },
  { id: "toms", brand: "Card", last4: "4724", label: "Tom’s Card" },
];

function DefaultPill() {
  return (
    <span className="inline-flex items-center rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-[12px] font-semibold text-emerald-300">
      Default Method
    </span>
  );
}

export default function PaymentMethods() {
  const [cards, setCards] = useState<Card[]>(initialDemo);

  const defaultId = useMemo(
    () => cards.find((c) => c.isDefault)?.id ?? null,
    [cards],
  );

  function makeDefault(id: string) {
    setCards((prev) => {
      const next = prev.map((c) => ({ ...c, isDefault: c.id === id }));
      const chosen = next.find((c) => c.id === id);
      const rest = next.filter((c) => c.id !== id);
      return chosen ? [chosen, ...rest] : next;
    });
  }

  function removeCard(id: string) {
    setCards((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="w-full">
      <h2 className="mb-8 text-[20px] font-semibold tracking-[-0.01em] text-white">
        Payment Methods
      </h2>

      <div className="space-y-4">
        {cards.map((c) => (
          <div
            key={c.id}
            className={clsx(
              "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
              "rounded-2xl border border-white/10 bg-white/[0.02] p-6",
              "transition hover:bg-white/[0.04] hover:border-white/15",
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <div className="text-[15px] font-semibold text-white">
                  {c.label ?? c.brand}
                </div>
                {c.isDefault ? <DefaultPill /> : null}
              </div>

              <div className="mt-1 text-[13px] text-white/50">
                {c.brand} ending in {c.last4}
                {c.isDefault ? ", Default" : ""}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:justify-end">
              {!c.isDefault ? (
                <button
                  type="button"
                  onClick={() => makeDefault(c.id)}
                  className={clsx(
                    "rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-[13px] font-semibold text-white cursor-pointer",
                    "transition hover:bg-white/10 hover:scale-[1.05] active:scale-[0.98]",
                  )}
                >
                  Make as Default
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => removeCard(c.id)}
                className={clsx(
                  "rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-[13px] font-semibold text-red-300 cursor-pointer",
                  "transition hover:bg-red-500/20 hover:scale-[1.05] active:scale-[0.98]",
                )}
                aria-label={`Remove ${c.label ?? c.brand}`}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          className={clsx(
            "rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-[14px] font-semibold text-white cursor-pointer",
            "transition hover:bg-white/10 hover:scale-[1.03] active:scale-[0.98]",
          )}
        >
          Download Invoices
        </button>

        <Button
          type="button"
          variant="premium"
          size="md"
          className="rounded-xl py-4 px-6"
          animation
        >
          Add Payment Method
        </Button>
      </div>

      {/* (Optional) keep a stable default marker if list becomes empty */}
      {cards.length > 0 && defaultId === null ? null : null}
    </div>
  );
}
