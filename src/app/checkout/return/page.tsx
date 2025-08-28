"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import SuccessModal from "@/components/checkout/SuccessModal";
import { useCart } from "@/store/useCart";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string
);

export default function CheckoutReturn() {
  const search = useSearchParams();
  const { clear } = useCart();
  const [status, setStatus] = useState<
    | "loading"
    | "succeeded"
    | "processing"
    | "requires_payment_method"
    | "requires_action"
    | "canceled"
    | "failed"
  >("loading");

  useEffect(() => {
    let cancelled = false;
    async function check() {
      const clientSecret = search.get("payment_intent_client_secret");
      if (!clientSecret) {
        setStatus("failed");
        return;
      }
      const stripe = await stripePromise;
      if (!stripe) return setStatus("failed");

      const { paymentIntent } =
        await stripe.retrievePaymentIntent(clientSecret);
      if (cancelled) return;

      if (!paymentIntent) return setStatus("failed");
      setStatus(paymentIntent.status as typeof status);
      if (paymentIntent.status === "succeeded") clear();
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [search, clear]);

  return (
    <main className="min-h-[60vh] bg-neutral-950">
      {/* Show success modal when succeeded; otherwise a simple message */}
      {status === "succeeded" ? (
        <SuccessModal
          open={true}
          onClose={() => (window.location.href = "/")}
        />
      ) : (
        <div className="mx-auto max-w-[900px] px-4 py-16 text-center text-neutral-200">
          {status === "loading"
            ? "Verifying payment…"
            : "Payment not completed."}
          <div className="mt-4">
            <a className="text-primary-952 underline" href="/checkout">
              Back to Checkout
            </a>
          </div>
        </div>
      )}
    </main>
  );
}
