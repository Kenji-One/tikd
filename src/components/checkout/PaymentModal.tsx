// src/components/checkout/PaymentModal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { loadStripe, type StripeElementsOptions } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useCart } from "@/store/useCart";
import { calcPrices } from "@/lib/pricing";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string
);

type PaymentModalProps = {
  clientSecret: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customerEmail?: string;
  currencyCode?: string;
};

export default function PaymentModal({
  clientSecret,
  open,
  onClose,
  onSuccess,
  customerEmail,
  currencyCode,
}: PaymentModalProps) {
  const options = useMemo<StripeElementsOptions>(
    () => ({
      clientSecret,
      appearance: {
        theme: "night" as const,
        labels: "floating" as const,
        variables: {
          colorPrimary: "#9A51FF",
          colorText: "#FFFFFF",
          colorBackground: "#0B0B14",
          borderRadius: "12px",
        },
      },
    }),
    [clientSecret]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <button
        aria-label="Close"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        className="relative z-[101] w-screen sm:w-[min(980px,95vw)]
   sm:rounded-2xl bg-neutral-950
  max-h-[100dvh] sm:max-h-[90dvh] overflow-y-auto
  pb-[env(safe-area-inset-bottom)]"
      >
        <Elements stripe={stripePromise} options={options}>
          <CheckoutForm
            onClose={onClose}
            onSuccess={onSuccess}
            customerEmail={customerEmail}
            currencyCode={currencyCode}
          />
        </Elements>
      </div>
    </div>
  );
}

function CheckoutForm({
  onClose,
  onSuccess,
  customerEmail,
  currencyCode,
}: {
  onClose: () => void;
  onSuccess: () => void;
  customerEmail?: string;
  currencyCode?: string;
}) {
  const stripe = useStripe();
  const elements = useElements();

  // cart + pricing for the LEFT summary panel
  const { items, coupon } = useCart();
  const price = useMemo(() => calcPrices(items, coupon), [items, coupon]);

  const normalizeCurrencyCode = (c?: string) =>
    (c || "USD").trim().toUpperCase();
  const code = normalizeCurrencyCode(currencyCode ?? price.currency);

  const moneyFmt = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: code,
        currencyDisplay: "symbol",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [code]
  );
  const fmt = (n: number) => moneyFmt.format(n);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setError(null), []);

  const handleSubmit = async () => {
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        receipt_email: customerEmail,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/return`,
      },
    });

    if (error) {
      setError(error.message || "Payment failed. Try another method.");
      setSubmitting(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      onSuccess();
    } else {
      onClose();
    }
  };

  // helper
  const first = items[0];

  return (
    <div>
      <div className="flex items-center justify-between p-4 pb-0 sm:pt-6 sm:px-8">
        <h2 className="text-xl font-semibold text-neutral-0">Stripe Payment</h2>
        <button
          onClick={onClose}
          className="cursor-pointer text-neutral-300 transition duration-200 hover:text-neutral-0"
          aria-label="Close"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M6 18L18 6M6 6L18 18"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Two-column layout: LEFT summary, RIGHT payment form */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-[420px_1fr] p-4 sm:p-6 sm:px-8">
        {/* LEFT: Order summary (Figma-styled) */}
        <div className="rounded-2xl bg-neutral-900 p-4 sm:p-6">
          {/* Brand chip */}
          <div className="mb-6 flex items-center gap-1">
            <span className="inline-block size-4 rounded-full border border-white bg-gradient-to-tr from-primary-800 to-primary-900" />
            <span className="text-neutral-0 text-base">Tikd</span>
          </div>

          <p className="text-neutral-100">One Time Payment</p>
          <div className="mt-1 text-2xl lg:text-4xl font-extrabold tracking-tight text-white">
            {fmt(Math.max(price.subtotal, 0))}
          </div>

          {/* First line item (like mock) */}
          {first && (
            <div className="mt-6 sm:mt-8">
              <div className="flex items-center justify-between text-neutral-0">
                <span className="font-medium">{first.ticketLabel}</span>
                <span className="font-semibold">
                  {fmt(first.unitPrice * first.qty)}
                </span>
              </div>
              <div className="mt-1 text-sm text-neutral-500">{first.qty}x</div>
            </div>
          )}

          <hr className="my-6 border-neutral-800" />

          <div className="space-y-4">
            <Row label="Subtotal" value={fmt(price.subtotal)} />
            {price.discount > 0 && (
              <Row
                label="Coupon Discount"
                value={`-${fmt(price.discount)}`}
                valueClass="text-success-400"
              />
            )}
            {price.fees > 0 && (
              <Row label="Service Fee" value={fmt(price.fees)} />
            )}
          </div>

          <hr className="my-6 border-neutral-800" />

          <Row
            label="Total due today"
            value={fmt(price.total)}
            labelClass="text-base"
            valueClass="text-base font-semibold text-white"
          />
        </div>

        {/* RIGHT: Stripe Payment Element */}
        <div className="rounded-2xl bg-neutral-900 p-4 mb-4 sm:mb-0">
          <PaymentElement />
          {error && <p className="mt-3 text-sm text-error-400">{error}</p>}
          {/* sticky action on mobile, normal on ≥sm */}

          <button
            onClick={handleSubmit}
            disabled={submitting || !stripe || !elements}
            className="hidden sm:block h-12 w-full mt-4 rounded-xl bg-primary-952 font-semibold text-neutral-0 disabled:opacity-60"
          >
            {submitting ? "Processing…" : "Pay now"}
          </button>
        </div>
      </div>
      <div
        className="w-full block sm:hidden -mx-4 bg-neutral-900/95 backdrop-blur p-4
            sticky bottom-0 left-0 right-0
            sm:static sm:bg-transparent sm:backdrop-blur-0 sm:mx-0 sm:p-0"
      >
        <button
          onClick={handleSubmit}
          disabled={submitting || !stripe || !elements}
          className="h-12 w-full rounded-xl bg-primary-952 font-semibold text-neutral-0 disabled:opacity-60"
        >
          {submitting ? "Processing…" : "Pay now"}
        </button>
      </div>
    </div>
  );
}

/* tiny row component for summary */
function Row({
  label,
  value,
  labelClass = "",
  valueClass = "",
}: {
  label: string;
  value: string;
  labelClass?: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-neutral-300 ${labelClass}`}>{label}</span>
      <span className={`text-neutral-200 ${valueClass}`}>{value}</span>
    </div>
  );
}
