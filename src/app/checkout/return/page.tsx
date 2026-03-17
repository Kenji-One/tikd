"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import SuccessModal from "@/components/checkout/SuccessModal";
import { useCart } from "@/store/useCart";

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
  | { ok: true; response: PaymentStatusResponse }
  | { ok: false; message: string; status?: string }
> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
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
          status: data.paymentIntentStatus,
        };
      }

      if (data.paymentIntentStatus === "succeeded" && !data.finalized) {
        await sleep(1500);
        continue;
      }

      if (data.paymentIntentStatus === "processing") {
        await sleep(1500);
        continue;
      }
    } else {
      await sleep(1500);
      continue;
    }

    await sleep(1500);
  }

  return {
    ok: false,
    message: "Payment is still processing. Please refresh this page shortly.",
    status: "processing",
  };
}

function parsePaymentIntentId(input: string | null): string | null {
  const raw = String(input ?? "").trim();
  if (!raw) return null;

  if (raw.startsWith("pi_")) {
    const secretIndex = raw.indexOf("_secret_");
    if (secretIndex > 0) {
      return raw.slice(0, secretIndex);
    }
    return raw;
  }

  return null;
}

export default function CheckoutReturn() {
  const search = useSearchParams();
  const { clear } = useCart();

  const [status, setStatus] = useState<
    "loading" | "succeeded" | "processing" | "failed"
  >("loading");

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const rawPaymentIntent =
        search.get("payment_intent") ||
        search.get("paymentIntentId") ||
        search.get("payment_intent_client_secret");

      const paymentIntentId = parsePaymentIntentId(rawPaymentIntent);

      if (!paymentIntentId) {
        if (!cancelled) setStatus("failed");
        return;
      }

      const result = await pollPaymentFinalization(paymentIntentId);

      if (cancelled) return;

      if (result.ok) {
        clear();
        setStatus("succeeded");
        return;
      }

      if (result.status === "processing") {
        setStatus("processing");
        return;
      }

      setStatus("failed");
    }

    void check();

    return () => {
      cancelled = true;
    };
  }, [search, clear]);

  return (
    <main className="min-h-[60vh] bg-neutral-950">
      {status === "succeeded" ? (
        <SuccessModal
          open={true}
          onClose={() => {
            window.location.href = "/";
          }}
        />
      ) : (
        <div className="mx-auto max-w-[900px] px-4 py-16 text-center text-neutral-200">
          {status === "loading"
            ? "Verifying payment…"
            : status === "processing"
              ? "Payment is processing. Please refresh this page shortly."
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
