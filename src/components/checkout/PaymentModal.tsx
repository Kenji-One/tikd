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
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string,
);

type PaymentModalProps = {
  clientSecret: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customerEmail?: string;
  currencyCode?: string;
};

type PaymentStatusResponse = {
  ok: true;
  paymentIntentId: string;
  paymentIntentStatus: string;
  finalized: boolean;
  order: {
    id: string;
    status: string;
    ticketIds: string[];
    total: number;
    currency: string;
    eventId: string;
  };
};

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollPaymentFinalization(
  paymentIntentId: string,
): Promise<
  { ok: true; response: PaymentStatusResponse } | { ok: false; message: string }
> {
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const res = await fetch(
      `/api/stripe/payment-status?paymentIntentId=${encodeURIComponent(paymentIntentId)}`,
      {
        method: "GET",
        cache: "no-store",
      },
    );

    if (res.ok) {
      const data = (await res.json()) as PaymentStatusResponse;

      if (data.finalized) {
        return { ok: true, response: data };
      }

      if (
        ["requires_payment_method", "canceled"].includes(
          data.paymentIntentStatus,
        )
      ) {
        return {
          ok: false,
          message: "Payment was not completed.",
        };
      }
    }

    await sleep(1500);
  }

  return {
    ok: false,
    message:
      "Payment was submitted, but order finalization is still processing. Please check again in a moment.",
  };
}

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
    [clientSecret],
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

  const { items, coupon } = useCart();
  const price = useMemo(() => calcPrices(items, coupon), [items, coupon]);

  const normalizeCurrencyCode = (value?: string) =>
    (value || "USD").trim().toUpperCase();

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
    [code],
  );

  const fmt = (amount: number) => moneyFmt.format(amount);

  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setError(null), []);

  const handleSubmit = async () => {
    if (!stripe || !elements) return;

    setSubmitting(true);
    setVerifying(false);
    setError(null);

    const result = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        receipt_email: customerEmail,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/return`,
      },
    });

    if (result.error) {
      setError(result.error.message || "Payment failed. Try another method.");
      setSubmitting(false);
      return;
    }

    const paymentIntent = result.paymentIntent;

    if (
      paymentIntent?.id &&
      ["succeeded", "processing"].includes(paymentIntent.status)
    ) {
      setVerifying(true);

      const finalized = await pollPaymentFinalization(paymentIntent.id);

      if (finalized.ok) {
        onSuccess();
        return;
      }

      setVerifying(false);
      setSubmitting(false);
      setError(finalized.message);
      return;
    }

    if (paymentIntent?.status === "requires_payment_method") {
      setError("Payment was not completed. Please try another method.");
      setSubmitting(false);
      return;
    }

    /**
     * For redirect-based methods Stripe may navigate away.
     * If we stay here without a resolvable terminal state, close and let the
     * return page handle post-redirect verification.
     */
    onClose();
  };

  const first = items[0];

  return (
    <div>
      <div className="flex items-center justify-between p-4 pb-0 sm:pt-6 sm:px-8">
        <h2 className="text-xl font-semibold text-neutral-0">Stripe Payment</h2>
        <button
          onClick={onClose}
          className="cursor-pointer text-neutral-300 transition duration-200 hover:text-neutral-0"
          aria-label="Close"
          disabled={verifying}
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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-[420px_1fr] p-4 sm:p-6 sm:px-8">
        <div className="rounded-2xl bg-neutral-900 p-4 sm:p-6">
          <div className="mb-6 flex items-center gap-1">
            <span className="inline-block size-4 rounded-full border border-white bg-gradient-to-tr from-primary-800 to-primary-900" />
            <span className="text-neutral-0 text-base">Tikd</span>
          </div>

          <p className="text-neutral-100">One Time Payment</p>
          <div className="mt-1 text-2xl lg:text-4xl font-extrabold tracking-tight text-white">
            {fmt(Math.max(price.subtotal, 0))}
          </div>

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

        <div className="rounded-2xl bg-neutral-900 p-4 mb-4 sm:mb-0">
          <PaymentElement />

          {error && <p className="mt-3 text-sm text-error-400">{error}</p>}

          {verifying ? (
            <p className="mt-3 text-sm text-neutral-300">
              Payment received. Finalizing your order…
            </p>
          ) : null}

          <button
            onClick={handleSubmit}
            disabled={submitting || verifying || !stripe || !elements}
            className="hidden sm:block h-12 w-full mt-4 rounded-xl bg-primary-952 font-semibold text-neutral-0 disabled:opacity-60"
          >
            {verifying ? "Verifying…" : submitting ? "Processing…" : "Pay now"}
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
          disabled={submitting || verifying || !stripe || !elements}
          className="h-12 w-full rounded-xl bg-primary-952 font-semibold text-neutral-0 disabled:opacity-60"
        >
          {verifying ? "Verifying…" : submitting ? "Processing…" : "Pay now"}
        </button>
      </div>
    </div>
  );
}

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
