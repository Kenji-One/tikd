// src/app/checkout/page.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useCart } from "@/store/useCart";
import { calcPrices } from "@/lib/pricing";
import { Button } from "@/components/ui/Button";
import PaymentModal from "@/components/checkout/PaymentModal";
import SuccessModal from "@/components/checkout/SuccessModal";

export default function CheckoutPage() {
  const { items, setQty, removeItem, clear, coupon, applyCoupon, clearCoupon } =
    useCart();

  // selection (purely visual like in the mock; defaults to all selected)
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const map: Record<string, boolean> = {};
    for (const it of items) map[it.key] = selected[it.key] ?? true;
    setSelected(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  const allSelected = items.length > 0 && items.every((it) => selected[it.key]);
  const selectedCount = items.filter((it) => selected[it.key]).length;

  const [code, setCode] = useState("");
  const [couponError, setCouponError] = useState<string>("");

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const price = useMemo(() => calcPrices(items, coupon), [items, coupon]);

  const normalizeCurrencyCode = (c?: string) => {
    const raw = (c || "USD").trim();
    const map: Record<string, string> = {
      $: "USD",
      "€": "EUR",
      "£": "GBP",
      "¥": "JPY",
      "₩": "KRW",
      "₦": "NGN",
      A$: "AUD",
      C$: "CAD",
    };
    return (map[raw] ?? raw).toUpperCase();
  };

  const currencyCode = useMemo(
    () => normalizeCurrencyCode(price.currency),
    [price.currency]
  );

  const fmt = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currencyCode,
        currencyDisplay: "symbol",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [currencyCode]
  );

  // For line items that may carry their own currency code
  const fmtItem = (n: number, code?: string) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: normalizeCurrencyCode(code || currencyCode),
      currencyDisplay: "symbol",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);

  const toggleAll = () => {
    const next: Record<string, boolean> = {};
    for (const it of items) next[it.key] = !allSelected;
    setSelected(next);
  };

  const toggleOne = (key: string) =>
    setSelected((s) => ({ ...s, [key]: !s[key] }));

  const onApply = () => {
    setCouponError("");
    if (!code.trim()) return;
    const { ok } = applyCoupon(code.trim());
    if (!ok) setCouponError("Invalid coupon code.");
  };

  async function startPayment() {
    if (items.length === 0) return;
    const res = await fetch("/api/stripe/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items,
        couponCode: coupon?.code ?? null,
        customerEmail: undefined,
      }),
    });
    if (!res.ok) {
      alert("Failed to initialize payment.");
      return;
    }
    const data = (await res.json()) as { clientSecret: string };
    setClientSecret(data.clientSecret);
    setShowPayment(true);
  }

  function handleSuccess() {
    clear();
    setShowPayment(false);
    setShowSuccess(true);
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto w-full max-w-[1232px] px-4 py-10">
        <h1 className="mb-6 text-center text-2xl lg:text-4xl font-extrabold uppercase tracking-tight text-neutral-0">
          CHECKOUT
        </h1>
        <div className="rounded-2xl bg-neutral-900 p-8 text-center text-neutral-200">
          Your selection is empty.{" "}
          <Link href="/events" className="text-primary-952 underline">
            Browse events
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1232px] px-4 py-10">
      {/* Title */}
      <h1 className="mb-8 lg:mb-14 text-center uppercase italic text-2xl sm:text-3xl lg:text-[40px] font-extrabold uppercase tracking-[-0.8px] leading-[90%] text-neutral-0">
        CHECKOUT
      </h1>

      <div className="grid gap-6 sm:gap-10 lg:gap-18 lg:grid-cols-[1fr_380px]">
        {/* ========== LEFT: Items ========== */}
        {/* ===== Cart tickets section  ===== */}
        <section>
          {/* Toolbar */}
          <div className="mb-6 flex items-center justify-between px-1">
            <label className="flex select-none items-center gap-3 text-neutral-0">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="size-6 accent-primary-952 rounded-md"
                aria-label="Select all"
              />
              <span className="text-lg tracking-[-0.36px]">
                {selectedCount}/{items.length} Items Selected
              </span>
            </label>
            <button
              onClick={() => clear()}
              className="text-neutral-300 transition hover:text-neutral-0 cursor-pointer"
            >
              Clear Cart
            </button>
          </div>

          {/* Tickets list */}
          <div className="rounded-2xl border border-white/12 overflow-hidden">
            {items.map((it, idx) => (
              <div
                key={it.key}
                className={`relative flex flex-wrap items-center gap-6  ${
                  idx ? "border-t border-white/12" : ""
                }`}
              >
                {/* Poster + selection */}
                <div className="relative w-[165.815px] aspect-[121/108] overflow-hidden">
                  <Image
                    src={it.image || "/dummy/event.png"}
                    alt=""
                    fill
                    sizes="165.815px"
                    className="object-cover"
                  />
                  <button
                    aria-label={
                      selected[it.key] ? "Deselect item" : "Select item"
                    }
                    aria-pressed={!!selected[it.key]}
                    onClick={() => toggleOne(it.key)}
                    className="absolute left-3 top-3 grid size-6 place-items-center rounded-md bg-white text-neutral-900 cursor-pointer"
                  >
                    {selected[it.key] ? (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 20 20"
                        fill="none"
                      >
                        <path
                          d="M5 10.5l3.2 3.2L15 7.8"
                          stroke="currentColor"
                          strokeWidth={2.2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <span className="h-full w-full rounded-md border border-neutral-800 bg-neutral-900" />
                    )}
                  </button>
                </div>

                {/* Copy */}
                <div className="min-w-0 my-auto pl-4">
                  <h3 className="text-sm font-bold leading-[90%] tracking-[-0.32px] text-white md:text-base">
                    {it.ticketLabel}
                  </h3>
                  <p className="mt-[6px] italic text-sm font-semibold leading-[90%] tracking-[-0.32px] text-white md:text-base">
                    {fmtItem(it.unitPrice, it.currency)}
                  </p>
                  <p className="mt-[6px] text-xs text-neutral-400">
                    (Includes fees)
                  </p>
                </div>

                {/* Qty + remove */}
                <div className="ml-auto self-end flex items-center justify-end gap-6 md:flex-col md:items-end md:justify-center py-4 sm:py-6 pr-4 sm:pr-6">
                  {/* Qty pill */}
                  <div className="flex items-center gap-[10px] rounded-full bg-white p-2 text-neutral-950">
                    <button
                      aria-label="Decrease quantity"
                      onClick={() => setQty(it.key, Math.max(0, it.qty - 1))}
                      className="grid size-4 place-items-center rounded-full bg-transparent text-white cursor-pointer"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="10"
                        height="2"
                        viewBox="0 0 10 2"
                        fill="none"
                      >
                        <path
                          d="M0.333336 1.66668H5.66667H9.66667V0.333344H5.66667H0.333336V1.66668Z"
                          fill="#08080F"
                        />
                      </svg>
                    </button>
                    <span className="text-center">{it.qty}</span>
                    <button
                      aria-label="Increase quantity"
                      onClick={() => setQty(it.key, it.qty + 1)}
                      className="grid size-4 place-items-center rounded-full bg-transparent text-white cursor-pointer"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="10"
                        height="10"
                        viewBox="0 0 10 10"
                        fill="none"
                      >
                        <path
                          d="M4.33334 5.66668H0.333336V4.33334H4.33334V0.333344H5.66667V4.33334H9.66667V5.66668H5.66667V9.66668H4.33334V5.66668Z"
                          fill="#08080F"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Remove (top-right on large row) */}
                  <button
                    aria-label="Remove item"
                    onClick={() => removeItem(it.key)}
                    className="absolute right-3 top-3 sm:right-6 sm:top-6 text-2xl leading-none text-white/90 hover:text-white cursor-pointer"
                    title="Remove"
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
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ========== RIGHT: Summary ========== */}
        <aside className="h-max rounded-2xl bg-neutral-900 py-4">
          {/* Coupons */}
          <div className="mb-4 px-4">
            <h3 className="mb-4 text-lg tracking-[-0.36px] text-neutral-0">
              Coupons
            </h3>

            <div className="relative">
              <input
                value={coupon ? coupon.code : code}
                onChange={(e) => {
                  setCode(e.target.value);
                  if (coupon) clearCoupon();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onApply();
                }}
                placeholder="Coupons"
                className="
      h-10 w-full rounded-lg border bg-neutral-950 px-10 pr-10 text-neutral-0
      outline-none
      border-neutral-800
      focus:border-primary-952 focus:ring-2 focus:ring-primary-952
      focus:shadow-none focus-visible:ring-2 focus-visible:ring-primary-952
      focus-visible:border-primary-952
      ring-offset-0
      transition
    "
              />
              {/* left icon */}
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                🎟️
              </span>

              {/* clear / apply control on the right */}
              {coupon ? (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-neutral-300 hover:text-neutral-0"
                  aria-label="Remove coupon"
                  onClick={() => clearCoupon()}
                  title="Remove"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <path
                      d="M4 12L12 4M4 4L12 12"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              ) : (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded bg-primary-952 px-3 py-1 text-sm font-medium text-white transition duration-200 hover:bg-primary-951"
                  onClick={onApply}
                >
                  Apply
                </button>
              )}
            </div>

            {couponError && (
              <p className="mt-2 text-sm text-error-400">{couponError}</p>
            )}
            {coupon && (
              <p className="mt-2 text-xs text-success-400">
                Applied: {coupon.label} ({coupon.code})
              </p>
            )}
          </div>

          {/* Price Details */}
          <div className="rounded-xl bg-neutral-800 text-base p-4 pb-8 mx-2">
            <h4 className="mb-4 text-lg tracking-[-0.36px] leading-[80%]">
              Price Details
            </h4>

            <p className="mb-8 text-base tracking-[-0.36px] leading-[80%]">
              {items.reduce((n, it) => n + it.qty, 0)} Ticket
              {items.reduce((n, it) => n + it.qty, 0) === 1 ? "" : "s"}
            </p>

            {/* first line: show the first line item like in mock */}
            {price.lines[0] && (
              <Row
                label={`1× ${price.lines[0].label}`}
                value={fmt.format(price.subtotal)}
              />
            )}

            {coupon && price.discount > 0 && (
              <>
                <hr className="my-4 border-neutral-0/12" />

                <Row
                  label="Coupon Discount"
                  value={`-${fmt.format(price.discount)}`}
                  valueClass="text-success-400"
                />
              </>
            )}

            <hr className="my-4 border-neutral-0/12" />
            <Row label="Service Fee" value={fmt.format(price.fees)} />

            <hr className="my-4 border-neutral-0/12" />

            <Row
              label="Total Amount"
              value={fmt.format(price.total)}
              labelClass="font-semibold text-neutral-0"
              valueClass="font-semibold text-neutral-0"
            />
          </div>
          <div className="px-4">
            <Button
              onClick={startPayment}
              className="mt-6 w-full rounded-xl font-regular"
              size="lg"
              variant="brand"
            >
              Place Order&nbsp;{" "}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="13"
                height="10"
                viewBox="0 0 13 10"
                fill="none"
              >
                <path
                  d="M0.5 5.00006C0.5 4.71982 0.705443 4.48788 0.97168 4.45123L1.0459 4.44635L10.6338 4.44635L7.16992 0.946348C6.9565 0.730692 6.95557 0.379795 7.16797 0.163145C7.36108 -0.0336742 7.66408 -0.0525141 7.87793 0.107481L7.93945 0.161192L12.3398 4.60748C12.3903 4.65853 12.4274 4.71778 12.4541 4.78033C12.4592 4.79235 12.4625 4.805 12.4668 4.81744C12.4734 4.83657 12.4799 4.85544 12.4844 4.87506C12.4877 4.88984 12.49 4.90478 12.4922 4.91998C12.4953 4.94177 12.4975 4.96344 12.498 4.98541C12.4982 4.99027 12.5 4.99517 12.5 5.00006C12.5 5.00827 12.4974 5.01634 12.4971 5.02447C12.4962 5.04449 12.4942 5.0642 12.4912 5.08404C12.4891 5.09828 12.4866 5.11218 12.4834 5.12604C12.4794 5.14315 12.4753 5.16008 12.4697 5.17682C12.4648 5.1915 12.4592 5.20568 12.4531 5.21979C12.4463 5.2357 12.439 5.25132 12.4307 5.26666C12.423 5.28071 12.415 5.2944 12.4062 5.30768C12.4015 5.31485 12.3977 5.32315 12.3926 5.33014L12.374 5.35162C12.3672 5.36006 12.3599 5.36803 12.3525 5.37604L12.3398 5.39166L7.93945 9.83893C7.72599 10.0545 7.38049 10.0535 7.16797 9.83697C6.9749 9.64004 6.95836 9.33257 7.11719 9.11627L7.16992 9.05475L10.6328 5.55377L1.0459 5.55377C0.744676 5.55377 0.500039 5.30574 0.5 5.00006Z"
                  fill="white"
                />
              </svg>
            </Button>
          </div>
        </aside>
      </div>

      {/* Stripe Modals */}
      {clientSecret && (
        <PaymentModal
          clientSecret={clientSecret}
          open={showPayment}
          onClose={() => setShowPayment(false)}
          onSuccess={handleSuccess}
          currencyCode={currencyCode}
        />
      )}
      <SuccessModal open={showSuccess} onClose={() => setShowSuccess(false)} />
    </main>
  );
}

/* -------------------- Reusable tiny bits -------------------- */

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
    <div className="mt-1 flex items-center justify-between text-base tracking-[-0.36px] leading-[80%]">
      <span className={` ${labelClass}`}>{label}</span>
      <span className={`${valueClass}`}>{value}</span>
    </div>
  );
}
