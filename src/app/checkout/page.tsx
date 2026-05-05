"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useEffect, useRef } from "react";
import { signIn, useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";

import { useCart } from "@/store/useCart";
import { calcPrices } from "@/lib/pricing";
import { Button } from "@/components/ui/Button";
import PaymentModal from "@/components/checkout/PaymentModal";
import SuccessModal from "@/components/checkout/SuccessModal";
import CheckoutBuyerDetailsCard, {
  type BuyerDetailsFormErrors,
  type BuyerDetailsFormValues,
} from "@/components/checkout/CheckoutBuyerDetailsCard";
import type { CartItem, Coupon } from "@/types/cart";
import {
  CHECKOUT_REQUIREMENTS_DEFAULTS,
  type CheckoutGender,
  type CheckoutRequirementsSnapshot,
} from "@/types/checkout";

type CheckoutProfileResponse = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  instagramProfile: string;
  facebookProfile: string;
  gender: CheckoutGender | null;
  dateOfBirth: string;
};

type CreatePaymentIntentBuyerProfile = {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  facebookProfile: string;
  instagramProfile: string;
  gender: CheckoutGender | null;
  dateOfBirth: string | null;
  declaredAge: number | null;
};

const EMPTY_REQUIRED_FIELDS: CheckoutRequirementsSnapshot = {
  requireFullName: false,
  requireEmail: false,
  requirePhone: false,
  requireFacebook: false,
  requireInstagram: false,
  requireGender: false,
  requireDob: false,
  requireAge: false,
  subjectToApproval: false,
  addBuyerDetailsToOrder: CHECKOUT_REQUIREMENTS_DEFAULTS.addBuyerDetailsToOrder,
  addPurchasedTicketsToAttendeesCount:
    CHECKOUT_REQUIREMENTS_DEFAULTS.addPurchasedTicketsToAttendeesCount,
  enableEmailAttachments: CHECKOUT_REQUIREMENTS_DEFAULTS.enableEmailAttachments,
};

const EMPTY_BUYER_DETAILS: BuyerDetailsFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  facebookProfile: "",
  instagramProfile: "",
  gender: "",
  dateOfBirth: "",
  declaredAge: "",
};

function normalizePhone(value: string): string {
  const raw = value.trim();
  const hasPlus = raw.startsWith("+");
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return "";
  return hasPlus ? `+${digits}` : digits;
}

function isEmailLike(value: string): boolean {
  const v = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function isPhoneLike(value: string): boolean {
  const digits = normalizePhone(value).replace(/^\+/, "");
  return digits.length >= 7 && digits.length <= 15;
}

function isPositiveIntegerLike(value: string): boolean {
  if (!value.trim()) return false;
  const num = Number(value);
  return Number.isInteger(num) && num >= 0 && num <= 130;
}

function validateBuyerDetails(
  values: BuyerDetailsFormValues,
  requiredFields: CheckoutRequirementsSnapshot,
): BuyerDetailsFormErrors {
  const nextErrors: BuyerDetailsFormErrors = {};

  if (requiredFields.requireFullName) {
    const firstName = values.firstName.trim();
    const lastName = values.lastName.trim();

    if (!firstName) {
      nextErrors.firstName = "First name is required.";
    }

    if (!lastName) {
      nextErrors.lastName = "Last name is required.";
    }
  }

  if (requiredFields.requireEmail) {
    if (!values.email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!isEmailLike(values.email)) {
      nextErrors.email = "Enter a valid email address.";
    }
  }

  if (requiredFields.requirePhone) {
    if (!values.phone.trim()) {
      nextErrors.phone = "Phone number is required.";
    } else if (!isPhoneLike(values.phone)) {
      nextErrors.phone = "Enter a valid phone number.";
    }
  }

  if (requiredFields.requireFacebook && !values.facebookProfile.trim()) {
    nextErrors.facebookProfile = "Facebook profile is required.";
  }

  if (requiredFields.requireInstagram && !values.instagramProfile.trim()) {
    nextErrors.instagramProfile = "Instagram profile is required.";
  }

  if (requiredFields.requireGender && !values.gender) {
    nextErrors.gender = "Select a gender.";
  }

  if (requiredFields.requireDob && !values.dateOfBirth.trim()) {
    nextErrors.dateOfBirth = "Date of birth is required.";
  }

  if (requiredFields.requireAge) {
    if (!values.declaredAge.trim()) {
      nextErrors.declaredAge = "Age is required.";
    } else if (!isPositiveIntegerLike(values.declaredAge)) {
      nextErrors.declaredAge = "Enter a valid age.";
    }
  }

  return nextErrors;
}

function buildBuyerProfilePayload(input: {
  values: BuyerDetailsFormValues;
  fallbackEmail?: string | null;
}): CreatePaymentIntentBuyerProfile {
  const firstName = input.values.firstName.trim();
  const lastName = input.values.lastName.trim();
  const fullName = `${firstName} ${lastName}`.trim();

  const email =
    input.values.email.trim().toLowerCase() ||
    String(input.fallbackEmail ?? "")
      .trim()
      .toLowerCase();

  const declaredAge = isPositiveIntegerLike(input.values.declaredAge)
    ? Number(input.values.declaredAge)
    : null;

  return {
    firstName,
    lastName,
    fullName,
    email,
    phone: normalizePhone(input.values.phone),
    facebookProfile: input.values.facebookProfile.trim(),
    instagramProfile: input.values.instagramProfile.trim(),
    gender: input.values.gender ? input.values.gender : null,
    dateOfBirth: input.values.dateOfBirth.trim() || null,
    declaredAge,
  };
}

export default function CheckoutPage() {
  const { data: session, status: sessionStatus } = useSession();

  const { items, setQty, removeItem, clear, coupon, applyCoupon, clearCoupon } =
    useCart();

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const buyerDetailsRef = useRef<HTMLDivElement | null>(null);
  const didHydrateProfileRef = useRef(false);

  useEffect(() => {
    const next: Record<string, boolean> = {};

    for (const item of items) {
      next[item.key] = selected[item.key] ?? true;
    }

    setSelected(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map((item) => item.key).join("|")]);

  const selectedItems = useMemo(
    () => items.filter((item) => selected[item.key]),
    [items, selected],
  );

  const requiredBuyerFields = useMemo<CheckoutRequirementsSnapshot>(() => {
    if (selectedItems.length === 0) return EMPTY_REQUIRED_FIELDS;

    return selectedItems.reduce<CheckoutRequirementsSnapshot>(
      (acc, item) => ({
        requireFullName:
          acc.requireFullName || item.checkoutRequirements.requireFullName,
        requireEmail:
          acc.requireEmail || item.checkoutRequirements.requireEmail,
        requirePhone:
          acc.requirePhone || item.checkoutRequirements.requirePhone,
        requireFacebook:
          acc.requireFacebook || item.checkoutRequirements.requireFacebook,
        requireInstagram:
          acc.requireInstagram || item.checkoutRequirements.requireInstagram,
        requireGender:
          acc.requireGender || item.checkoutRequirements.requireGender,
        requireDob: acc.requireDob || item.checkoutRequirements.requireDob,
        requireAge: acc.requireAge || item.checkoutRequirements.requireAge,

        subjectToApproval:
          acc.subjectToApproval || item.checkoutRequirements.subjectToApproval,

        addBuyerDetailsToOrder:
          acc.addBuyerDetailsToOrder ||
          item.checkoutRequirements.addBuyerDetailsToOrder,
        addPurchasedTicketsToAttendeesCount:
          acc.addPurchasedTicketsToAttendeesCount ||
          item.checkoutRequirements.addPurchasedTicketsToAttendeesCount,

        enableEmailAttachments:
          acc.enableEmailAttachments ||
          item.checkoutRequirements.enableEmailAttachments,
      }),
      EMPTY_REQUIRED_FIELDS,
    );
  }, [selectedItems]);

  const allSelected =
    items.length > 0 && items.every((item) => selected[item.key]);
  const selectedCount = selectedItems.length;

  const [code, setCode] = useState("");
  const [couponError, setCouponError] = useState<string>("");
  const [checkoutInitError, setCheckoutInitError] = useState<string>("");

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [startingPayment, setStartingPayment] = useState(false);

  const [buyerDetails, setBuyerDetails] =
    useState<BuyerDetailsFormValues>(EMPTY_BUYER_DETAILS);
  const [buyerErrors, setBuyerErrors] = useState<BuyerDetailsFormErrors>({});

  const [pendingPaymentItems, setPendingPaymentItems] = useState<CartItem[]>(
    [],
  );
  const [pendingPaymentCoupon, setPendingPaymentCoupon] = useState<
    Coupon | undefined
  >(undefined);
  const [paymentCustomerEmail, setPaymentCustomerEmail] = useState<
    string | undefined
  >(undefined);

  const profileQuery = useQuery<CheckoutProfileResponse>({
    queryKey: ["checkout-profile", session?.user?.id ?? null],
    enabled: sessionStatus === "authenticated" && Boolean(session?.user?.id),
    staleTime: 60_000,
    queryFn: async () => {
      const res = await fetch("/api/checkout/profile", {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Failed to load checkout profile.");
      }

      return (await res.json()) as CheckoutProfileResponse;
    },
  });

  useEffect(() => {
    if (
      sessionStatus === "authenticated" &&
      session?.user?.email &&
      !didHydrateProfileRef.current
    ) {
      setBuyerDetails((prev) => ({
        ...prev,
        email: prev.email || session.user.email || "",
      }));
    }
  }, [session?.user?.email, sessionStatus]);

  useEffect(() => {
    const profile = profileQuery.data;
    if (!profile || didHydrateProfileRef.current) return;

    setBuyerDetails((prev) => ({
      ...prev,
      firstName: profile.firstName || prev.firstName,
      lastName: profile.lastName || prev.lastName,
      email: profile.email || prev.email,
      phone: profile.phone || prev.phone,
      instagramProfile: profile.instagramProfile || prev.instagramProfile,
      facebookProfile: profile.facebookProfile || prev.facebookProfile,
      gender: (profile.gender ??
        prev.gender) as BuyerDetailsFormValues["gender"],
      dateOfBirth: profile.dateOfBirth || prev.dateOfBirth,
    }));

    didHydrateProfileRef.current = true;
  }, [profileQuery.data]);

  useEffect(() => {
    setCheckoutInitError("");
  }, [selectedItems, coupon?.code]);

  const price = useMemo(
    () => calcPrices(selectedItems, coupon),
    [selectedItems, coupon],
  );

  const normalizeCurrencyCode = (value?: string) => {
    const raw = (value || "USD").trim();
    const map: Record<string, string> = {
      $: "USD",
      "€": "EUR",
      "£": "GBP",
      "¥": "JPY",
      "₩": "KRW",
      "₦": "NGN",
      A$: "AUD",
      C$: "CAD",
      "₾": "GEL",
    };
    return (map[raw] ?? raw).toUpperCase();
  };

  const currencyCode = useMemo(
    () => normalizeCurrencyCode(price.currency),
    [price.currency],
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
    [currencyCode],
  );

  const fmtItem = (amount: number, codeValue?: string) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: normalizeCurrencyCode(codeValue || currencyCode),
      currencyDisplay: "symbol",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

  const toggleAll = () => {
    const next: Record<string, boolean> = {};
    for (const item of items) {
      next[item.key] = !allSelected;
    }
    setSelected(next);
  };

  const toggleOne = (key: string) => {
    setSelected((state) => ({ ...state, [key]: !state[key] }));
  };

  const onApply = () => {
    setCouponError("");
    if (!code.trim()) return;
    const result = applyCoupon(code.trim());
    if (!result.ok) {
      setCouponError("Invalid coupon code.");
    }
  };

  const hasAnyBuyerValidationError = Object.keys(buyerErrors).length > 0;

  async function startPayment() {
    if (selectedItems.length === 0 || startingPayment) return;

    if (sessionStatus === "unauthenticated") {
      await signIn(undefined, { callbackUrl: "/checkout" });
      return;
    }

    if (sessionStatus !== "authenticated" || !session?.user?.id) {
      setCheckoutInitError("Please sign in to complete your purchase.");
      return;
    }

    const nextErrors = validateBuyerDetails(buyerDetails, requiredBuyerFields);
    setBuyerErrors(nextErrors);
    setCheckoutInitError("");

    if (Object.keys(nextErrors).length > 0) {
      buyerDetailsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      return;
    }

    const buyerProfile = buildBuyerProfilePayload({
      values: buyerDetails,
      fallbackEmail: session.user.email ?? null,
    });

    setStartingPayment(true);

    try {
      const res = await fetch("/api/stripe/create-payment-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: selectedItems,
          couponCode: coupon?.code ?? null,
          customerEmail: buyerProfile.email || session.user.email || undefined,
          buyerProfile,
          persistProfileDefaults: true,
        }),
      });

      if (!res.ok) {
        let message = "Failed to initialize payment.";
        try {
          const data = (await res.json()) as { error?: string };
          if (typeof data?.error === "string" && data.error.trim()) {
            message = data.error;
          }
        } catch {
          // ignore parse failure
        }

        setCheckoutInitError(message);
        return;
      }

      const data = (await res.json()) as {
        clientSecret: string;
        orderId: string;
      };

      if (!data.clientSecret) {
        setCheckoutInitError("Failed to initialize payment.");
        return;
      }

      setPendingPaymentItems(selectedItems);
      setPendingPaymentCoupon(coupon);
      setPaymentCustomerEmail(
        buyerProfile.email || session.user.email || undefined,
      );

      setClientSecret(data.clientSecret);
      setShowPayment(true);
    } catch {
      setCheckoutInitError("Failed to initialize payment.");
    } finally {
      setStartingPayment(false);
    }
  }

  function handleSuccess() {
    const keysToRemove = Array.from(
      new Set(pendingPaymentItems.map((item) => item.key)),
    );

    if (keysToRemove.length > 0) {
      for (const key of keysToRemove) {
        removeItem(key);
      }
    } else {
      clear();
    }

    setPendingPaymentItems([]);
    setPendingPaymentCoupon(undefined);
    setPaymentCustomerEmail(undefined);
    setShowPayment(false);
    setShowSuccess(true);
  }

  function updateBuyerField<K extends keyof BuyerDetailsFormValues>(
    field: K,
    value: BuyerDetailsFormValues[K],
  ) {
    setBuyerDetails((prev) => ({ ...prev, [field]: value }));
    setCheckoutInitError("");
    setBuyerErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto w-full max-w-[1232px] px-4 py-10">
        <h1 className="mb-6 text-center text-2xl font-extrabold uppercase tracking-tight text-neutral-0 lg:text-4xl">
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
      <h1 className="mb-8 text-center text-2xl font-extrabold uppercase italic leading-[90%] tracking-[-0.8px] text-neutral-0 sm:text-3xl lg:mb-14 lg:text-[40px]">
        CHECKOUT
      </h1>

      <div className="grid gap-6 sm:gap-10 lg:grid-cols-[1fr_380px] lg:gap-18">
        <section className="space-y-6">
          <div className="mb-6 flex items-center justify-between px-1">
            <label className="flex select-none items-center gap-3 text-neutral-0">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="size-6 rounded-md accent-primary-952"
                aria-label="Select all"
              />
              <span className="text-lg tracking-[-0.36px]">
                {selectedCount}/{items.length} Items Selected
              </span>
            </label>

            <button
              onClick={() => clear()}
              className="cursor-pointer text-neutral-300 transition hover:text-neutral-0"
            >
              Clear Cart
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/12">
            {items.map((item, index) => (
              <div
                key={item.key}
                className={`relative flex flex-wrap items-center gap-6 ${
                  index ? "border-t border-white/12" : ""
                }`}
              >
                <div className="relative aspect-[121/108] w-[165.815px] overflow-hidden">
                  <Image
                    src={item.image || "/dummy/event.png"}
                    alt=""
                    fill
                    sizes="165.815px"
                    className="object-cover"
                  />
                  <button
                    aria-label={
                      selected[item.key] ? "Deselect item" : "Select item"
                    }
                    aria-pressed={!!selected[item.key]}
                    onClick={() => toggleOne(item.key)}
                    className="absolute left-3 top-3 grid size-6 place-items-center rounded-md bg-white text-neutral-900 cursor-pointer"
                  >
                    {selected[item.key] ? (
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

                <div className="my-auto min-w-0 pl-4">
                  <h3 className="text-sm font-bold leading-[90%] tracking-[-0.32px] text-white md:text-base">
                    {item.ticketLabel}
                  </h3>
                  <p className="mt-[6px] text-sm font-semibold italic leading-[90%] tracking-[-0.32px] text-white md:text-base">
                    {fmtItem(item.unitPrice, item.currency)}
                  </p>
                  <p className="mt-[6px] text-xs text-neutral-400">
                    (Includes fees)
                  </p>
                </div>

                <div className="ml-auto self-end flex items-center justify-end gap-6 py-4 pr-4 sm:py-6 sm:pr-6 md:flex-col md:items-end md:justify-center">
                  <div className="flex items-center gap-[10px] rounded-full bg-white p-2 text-neutral-950">
                    <button
                      aria-label="Decrease quantity"
                      onClick={() =>
                        setQty(item.key, Math.max(0, item.qty - 1))
                      }
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
                    <span className="text-center">{item.qty}</span>
                    <button
                      aria-label="Increase quantity"
                      onClick={() => setQty(item.key, item.qty + 1)}
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

                  <button
                    aria-label="Remove item"
                    onClick={() => removeItem(item.key)}
                    className="absolute right-3 top-3 cursor-pointer text-2xl leading-none text-white/90 hover:text-white sm:right-6 sm:top-6"
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

          <div ref={buyerDetailsRef}>
            <CheckoutBuyerDetailsCard
              requiredFields={requiredBuyerFields}
              values={buyerDetails}
              errors={buyerErrors}
              isAuthenticated={sessionStatus === "authenticated"}
              isProfileLoading={profileQuery.isLoading}
              hasAnyValidationError={hasAnyBuyerValidationError}
              onChange={updateBuyerField}
            />
          </div>
        </section>

        <aside className="h-max rounded-2xl bg-neutral-900 py-4">
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
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                🎟️
              </span>

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

          <div className="mx-2 rounded-xl bg-neutral-800 p-4 pb-8 text-base">
            <h4 className="mb-4 text-lg leading-[80%] tracking-[-0.36px]">
              Price Details
            </h4>

            <p className="mb-8 text-base leading-[80%] tracking-[-0.36px]">
              {selectedItems.reduce((count, item) => count + item.qty, 0)}{" "}
              Ticket
              {selectedItems.reduce((count, item) => count + item.qty, 0) === 1
                ? ""
                : "s"}
            </p>

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
            {checkoutInitError ? (
              <div className="mt-6 rounded-xl border border-error-500/20 bg-error-500/10 px-4 py-3 text-sm text-error-200">
                {checkoutInitError}
              </div>
            ) : null}

            {sessionStatus === "unauthenticated" ? (
              <Button
                onClick={() =>
                  void signIn(undefined, { callbackUrl: "/checkout" })
                }
                className="mt-6 w-full rounded-xl font-regular"
                size="lg"
                variant="brand"
              >
                Sign in to Continue
              </Button>
            ) : (
              <Button
                onClick={startPayment}
                className="mt-6 w-full rounded-xl font-regular"
                size="lg"
                variant="brand"
                disabled={
                  selectedItems.length === 0 ||
                  sessionStatus === "loading" ||
                  startingPayment
                }
              >
                {startingPayment
                  ? "Preparing payment..."
                  : selectedItems.length === 0
                    ? "Select Tickets"
                    : "Place Order"}{" "}
                &nbsp;
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
            )}
          </div>
        </aside>
      </div>

      {clientSecret && (
        <PaymentModal
          clientSecret={clientSecret}
          open={showPayment}
          onClose={() => setShowPayment(false)}
          onSuccess={handleSuccess}
          currencyCode={currencyCode}
          customerEmail={paymentCustomerEmail}
          items={pendingPaymentItems}
          coupon={pendingPaymentCoupon}
        />
      )}

      <SuccessModal open={showSuccess} onClose={() => setShowSuccess(false)} />
    </main>
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
    <div className="mt-1 flex items-center justify-between text-base tracking-[-0.36px] leading-[80%]">
      <span className={labelClass}>{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}
