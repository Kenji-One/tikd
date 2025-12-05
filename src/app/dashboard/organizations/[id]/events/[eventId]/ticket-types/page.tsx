// src/app/dashboard/organizations/[id]/events/[eventId]/ticket-types/page.tsx
"use client";

import { useMemo, useState, type SVGProps, type ReactNode } from "react";
import { useParams } from "next/navigation";
import {
  Search,
  Plus,
  Ticket,
  EllipsisVertical,
  ArrowLeft,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import clsx from "clsx";

type RouteParams = {
  id: string;
  eventId: string;
};

/* ---------------------------- API shapes ---------------------------- */

type TicketAvailabilityStatus =
  | "scheduled"
  | "on_sale"
  | "paused"
  | "sale_ended";

type TicketTypeApi = {
  _id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  isFree: boolean;
  totalQuantity: number | null;
  soldCount?: number;
  availabilityStatus: TicketAvailabilityStatus;
};

type TicketTypeRow = {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  sold: number;
  capacity: number | null;
  status: TicketAvailabilityStatus;
};

/* --------------------------- Form types ---------------------------- */

type TicketTypeFormValues = {
  // General
  name: string;
  description: string;
  isFree: boolean;
  price: number;
  currency: string;
  feeMode: "pass_on" | "absorb";

  // Availability
  totalQuantity: number | null;
  unlimitedQuantity: boolean;
  minPerOrder: number | null;
  maxPerOrder: number | null;
  availabilityStatus: TicketAvailabilityStatus;
  salesStartAt: string | null;
  salesEndAt: string | null;
  accessMode: "public" | "password";
  password: string;

  // Checkout
  requireFullName: boolean;
  requirePhone: boolean;
  requireGender: boolean;
  requireDob: boolean;
  subjectToApproval: boolean;
  addBuyerDetailsToOrder: boolean;
  addPurchasedTicketsToAttendeesCount: boolean;

  // Design
  layout: "horizontal" | "vertical" | "down" | "up";
  brandColor: string;
  logoUrl: string;
  backgroundUrl: string;
  footerText: string;
};

/* ----------------------------- Helpers ----------------------------- */

function mapApiToRow(api: TicketTypeApi): TicketTypeRow {
  return {
    id: api._id,
    name: api.name,
    description: api.description ?? "",
    price: api.price,
    currency: api.currency,
    sold: api.soldCount ?? 0,
    capacity: api.totalQuantity,
    status: api.availabilityStatus,
  };
}

/* ========================= TicketTypeWizard ======================== */

type TicketTypeWizardProps = {
  eventId: string;
  onCancel: () => void;
  onCreated: () => void;
};

function TicketTypeWizard({
  eventId,
  onCancel,
  onCreated,
}: TicketTypeWizardProps) {
  const [activeStep, setActiveStep] = useState<0 | 1 | 2 | 3>(0);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<TicketTypeFormValues>({
    defaultValues: {
      name: "",
      description: "",
      isFree: true,
      price: 0,
      currency: "USD",
      feeMode: "pass_on",

      totalQuantity: null,
      unlimitedQuantity: true,
      minPerOrder: null,
      maxPerOrder: null,
      availabilityStatus: "on_sale",
      salesStartAt: null,
      salesEndAt: null,
      accessMode: "public",
      password: "",

      requireFullName: true,
      requirePhone: false,
      requireGender: false,
      requireDob: false,
      subjectToApproval: false,
      addBuyerDetailsToOrder: true,
      addPurchasedTicketsToAttendeesCount: true,

      layout: "horizontal",
      brandColor: "#9a46ff",
      logoUrl: "",
      backgroundUrl: "",
      footerText: "",
    },
  });

  const price = watch("price");
  const isFree = watch("isFree");
  const brandColor = watch("brandColor");
  const layout = watch("layout");
  const name = watch("name");

  const buyerTotal = useMemo(
    () => (isFree ? 0 : Math.max(0, Number.isFinite(price) ? price : 0)),
    [isFree, price]
  );

  type StepId = "general" | "availability" | "checkout" | "design";

  type StepDef = {
    id: StepId;
    label: string;
    icon: (props: SVGProps<SVGSVGElement>) => ReactNode;
  };

  const steps: StepDef[] = [
    {
      id: "general",
      label: "General",
      icon: (props) => (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          {...props}
        >
          <path
            d="M14.6667 7.1665C14.94 7.1665 15.1667 6.93984 15.1667 6.6665V5.99984C15.1667 3.05984 14.2734 2.1665 11.3334 2.1665H7.16671V3.6665C7.16671 3.93984 6.94004 4.1665 6.66671 4.1665C6.39337 4.1665 6.16671 3.93984 6.16671 3.6665V2.1665H4.66671C1.72671 2.1665 0.833374 3.05984 0.833374 5.99984V6.33317C0.833374 6.6065 1.06004 6.83317 1.33337 6.83317C1.97337 6.83317 2.50004 7.35984 2.50004 7.99984C2.50004 8.63984 1.97337 9.1665 1.33337 9.1665C1.06004 9.1665 0.833374 9.39317 0.833374 9.6665V9.99984C0.833374 12.9398 1.72671 13.8332 4.66671 13.8332H6.16671V12.3332C6.16671 12.0598 6.39337 11.8332 6.66671 11.8332C6.94004 11.8332 7.16671 12.0598 7.16671 12.3332V13.8332H11.3334C14.2734 13.8332 15.1667 12.9398 15.1667 9.99984C15.1667 9.7265 14.94 9.49984 14.6667 9.49984C14.0267 9.49984 13.5 8.97317 13.5 8.33317C13.5 7.69317 14.0267 7.1665 14.6667 7.1665ZM7.16671 9.4465C7.16671 9.71984 6.94004 9.9465 6.66671 9.9465C6.39337 9.9465 6.16671 9.71984 6.16671 9.4465V6.55317C6.16671 6.27984 6.39337 6.05317 6.66671 6.05317C6.94004 6.05317 7.16671 6.27984 7.16671 6.55317V9.4465Z"
            fill="currentColor"
          />
        </svg>
      ),
    },
    {
      id: "availability",
      label: "Availability",
      icon: (props) => (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          {...props}
        >
          <path
            d="M7.33335 13.2668V2.7335C7.33335 1.7335 6.90669 1.3335 5.84669 1.3335H3.15335C2.09335 1.3335 1.66669 1.7335 1.66669 2.7335V13.2668C1.66669 14.2668 2.09335 14.6668 3.15335 14.6668H5.84669C6.90669 14.6668 7.33335 14.2668 7.33335 13.2668Z"
            fill="currentColor"
          />
          <path
            d="M14.3334 7.26683V2.7335C14.3334 1.7335 13.9067 1.3335 12.8467 1.3335H10.1534C9.09335 1.3335 8.66669 1.7335 8.66669 2.7335V7.26683C8.66669 8.26683 9.09335 8.66683 10.1534 8.66683H12.8467C13.9067 8.66683 14.3334 8.26683 14.3334 7.26683Z"
            fill="currentColor"
          />
          <path
            d="M14.3334 13.2667V11.4C14.3334 10.4 13.9067 10 12.8467 10H10.1534C9.09335 10 8.66669 10.4 8.66669 11.4V13.2667C8.66669 14.2667 9.09335 14.6667 10.1534 14.6667H12.8467C13.9067 14.6667 14.3334 14.2667 14.3334 13.2667Z"
            fill="currentColor"
          />
        </svg>
      ),
    },
    {
      id: "checkout",
      label: "Checkout",
      icon: (props) => (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          {...props}
        >
          <path
            d="M14.3 9.0931V9.75977C14.3 9.93977 14.16 10.0864 13.9733 10.0931H13C12.6467 10.0931 12.3267 9.8331 12.3 9.48643C12.28 9.27977 12.36 9.08643 12.4933 8.9531C12.6133 8.82643 12.78 8.75977 12.96 8.75977H13.9667C14.16 8.76643 14.3 8.9131 14.3 9.0931Z"
            fill="currentColor"
          />
          <path
            d="M11.9934 8.45993C11.66 8.78659 11.5 9.27326 11.6334 9.77993C11.8067 10.3999 12.4134 10.7933 13.0534 10.7933H13.6334C14 10.7933 14.3 11.0933 14.3 11.4599V11.5866C14.3 12.9666 13.1734 14.0933 11.7934 14.0933H4.14003C2.76003 14.0933 1.63336 12.9666 1.63336 11.5866V7.09993C1.63336 6.27993 2.0267 5.55326 2.63336 5.09993C3.05336 4.77993 3.57336 4.59326 4.14003 4.59326H11.7934C13.1734 4.59326 14.3 5.71993 14.3 7.09993V7.39326C14.3 7.75993 14 8.05993 13.6334 8.05993H12.9534C12.58 8.05993 12.24 8.20659 11.9934 8.45993Z"
            fill="currentColor"
          />
          <path
            d="M10.8 3.2135C10.98 3.3935 10.8267 3.6735 10.5734 3.6735L5.45335 3.66683C5.16002 3.66683 5.00669 3.30683 5.22002 3.10016L6.30002 2.0135C7.21335 1.10683 8.69335 1.10683 9.60669 2.0135L10.7734 3.1935C10.78 3.20016 10.7934 3.20683 10.8 3.2135Z"
            fill="currentColor"
          />
        </svg>
      ),
    },
    {
      id: "design",
      label: "Design",
      icon: (props) => (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          {...props}
        >
          <path
            d="M12.74 4.98015L10.3933 2.63349C8.28664 0.533487 7.17997 1.30682 5.84664 2.63349L2.0733 6.40682C1.30664 7.17349 0.886638 7.66682 0.733304 8.21349C0.733304 8.22015 0.726638 8.22015 0.726638 8.22015C0.726638 8.22682 0.726638 8.22682 0.726638 8.22682C0.726638 8.23349 0.726638 8.23349 0.726638 8.23349V8.25349C0.453304 9.22682 1.1733 10.0535 2.0733 10.9535L4.42664 13.2935C5.26664 14.1402 5.94664 14.6668 6.69997 14.6668C7.4533 14.6668 8.09997 14.1602 8.96664 13.2935L12.74 9.52682C13.0666 9.19349 13.3066 8.92015 13.4933 8.66015C13.4933 8.65349 13.4933 8.65349 13.4933 8.65349C13.4933 8.65349 13.4933 8.65349 13.5 8.65349C14.3533 7.46015 14.1266 6.36015 12.74 4.98015ZM12.0533 7.58015H12.0466C11.8466 7.53349 11.64 7.49349 11.4333 7.45349C11.42 7.45349 11.4066 7.44682 11.3866 7.44682C10.92 7.36015 10.4466 7.28682 9.96664 7.22682H9.93997C9.45997 7.16682 8.9733 7.12015 8.48664 7.09349H8.4333C8.00664 7.06682 7.5733 7.05349 7.14664 7.05349C6.62664 7.05349 6.10664 7.08015 5.5933 7.11349C5.50664 7.12015 5.42664 7.12682 5.34664 7.13349C4.95997 7.16015 4.5733 7.20015 4.1933 7.24682C4.08664 7.26015 3.98664 7.27349 3.88664 7.28682C3.49997 7.34682 3.11997 7.40682 2.73997 7.48015C2.6533 7.50015 2.5733 7.51349 2.48664 7.52682C2.4533 7.53349 2.4133 7.54015 2.37997 7.54682C2.49997 7.41349 2.63997 7.27349 2.7933 7.12015L6.55997 3.35349C7.7733 2.15349 8.18664 1.86682 9.67997 3.35349L12.02 5.70015C12.38 6.05349 12.62 6.35349 12.7666 6.61349C12.7666 6.61349 12.7666 6.62015 12.7733 6.62015C13.0533 7.10682 12.6 7.68682 12.0533 7.58015Z"
            fill="currentColor"
          />
          <path
            d="M13.9667 11.2465C13.7133 10.9332 13.4933 10.6665 13 10.6665C12.5067 10.6665 12.2867 10.9332 12.04 11.2465C11.5067 11.9065 11.2667 12.6265 11.3533 13.3198C11.4533 14.1132 12.1333 14.6665 13 14.6665C13.8667 14.6665 14.5467 14.1132 14.6467 13.3132C14.7333 12.6198 14.5 11.9065 13.9667 11.2465Z"
            fill="currentColor"
          />
        </svg>
      ),
    },
  ];
  const goNext = () => setActiveStep((s) => (s < 3 ? ((s + 1) as any) : s));
  const goPrev = () => setActiveStep((s) => (s > 0 ? ((s - 1) as any) : s));

  async function onSubmit(values: TicketTypeFormValues) {
    setServerError(null);

    const payload = {
      name: values.name,
      description: values.description || "",
      price: values.isFree ? 0 : values.price,
      currency: values.currency,
      feeMode: values.feeMode,
      isFree: values.isFree,
      totalQuantity: values.unlimitedQuantity ? null : values.totalQuantity,
      minPerOrder: values.minPerOrder,
      maxPerOrder: values.maxPerOrder,
      availabilityStatus: values.availabilityStatus,
      salesStartAt: values.salesStartAt,
      salesEndAt: values.salesEndAt,
      accessMode: values.accessMode,
      password: values.accessMode === "password" ? values.password : "",
      checkout: {
        requireFullName: values.requireFullName,
        requirePhone: values.requirePhone,
        requireGender: values.requireGender,
        requireDob: values.requireDob,
        subjectToApproval: values.subjectToApproval,
        addBuyerDetailsToOrder: values.addBuyerDetailsToOrder,
        addPurchasedTicketsToAttendeesCount:
          values.addPurchasedTicketsToAttendeesCount,
      },
      design: {
        layout: values.layout,
        brandColor: values.brandColor,
        logoUrl: values.logoUrl,
        backgroundUrl: values.backgroundUrl,
        footerText: values.footerText,
      },
    };

    const res = await fetch(`/api/events/${eventId}/ticket-types`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      setServerError(text || "Failed to save ticket type.");
      return;
    }

    onCreated();
  }

  /* ---------------------------- Step UIs ---------------------------- */

  const generalStep = (
    <div className="space-y-6">
      <div className="rounded-card border border-white/8 bg-neutral-948/90 p-6 shadow-[0_18px_45px_rgba(0,0,0,0.7)]">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-medium text-neutral-100">
              Name<span className="text-error-400">*</span>
            </label>
            <input
              {...register("name", { required: true })}
              type="text"
              placeholder="Early Bird, General Admission, VIP Table…"
              className="w-full rounded-xl border border-white/10 bg-neutral-950 px-3.5 py-2.5 text-xs text-neutral-0 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-primary-600"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-neutral-100">
              Description &amp; details
            </label>
            <textarea
              {...register("description")}
              rows={4}
              placeholder="What does this ticket include? Any limitations or special instructions."
              className="w-full resize-none rounded-xl border border-white/10 bg-neutral-950 px-3.5 py-2.5 text-xs text-neutral-0 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-primary-600"
            />
          </div>
        </div>

        <div className="mt-6 h-px w-full bg-white/5" />

        <div className="mt-6 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-neutral-100">Price</p>
              <p className="text-[11px] text-neutral-400">
                Set this ticket as free or paid. Fees can be passed on to the
                buyer or absorbed.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-full bg-neutral-950 px-2 py-1">
              <button
                type="button"
                onClick={() => setValue("isFree", true)}
                className={clsx(
                  "rounded-full px-3 py-1 text-[11px] font-medium",
                  watch("isFree")
                    ? "bg-primary-600 text-white"
                    : "text-neutral-300 hover:text-neutral-0"
                )}
              >
                Free
              </button>
              <button
                type="button"
                onClick={() => setValue("isFree", false)}
                className={clsx(
                  "rounded-full px-3 py-1 text-[11px] font-medium",
                  !watch("isFree")
                    ? "bg-primary-600 text-white"
                    : "text-neutral-300 hover:text-neutral-0"
                )}
              >
                Paid
              </button>
            </div>
          </div>

          {!isFree && (
            <div className="flex flex-wrap items-center gap-4">
              <div className="inline-flex items-center gap-1 rounded-full bg-neutral-950 px-4 py-2">
                <span className="text-sm text-neutral-0">$</span>
                <input
                  {...register("price", { valueAsNumber: true })}
                  type="number"
                  min={0}
                  step="0.01"
                  className="w-24 border-none bg-transparent text-sm text-neutral-0 focus:outline-none focus:ring-0"
                />
                <span className="ml-2 text-[11px] text-neutral-400">
                  {watch("currency")}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-[11px] text-neutral-300">
                <label className="inline-flex items-center gap-2">
                  <input
                    {...register("feeMode")}
                    type="radio"
                    value="pass_on"
                    className="h-3 w-3 rounded border-white/20 bg-neutral-950 text-primary-600 focus:ring-primary-600"
                  />
                  <span>Pass on the fees to the customer</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    {...register("feeMode")}
                    type="radio"
                    value="absorb"
                    className="h-3 w-3 rounded border-white/20 bg-neutral-950 text-primary-600 focus:ring-primary-600"
                  />
                  <span>Absorb fees into ticket price</span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Buyer total bar */}
      <div className="sticky bottom-4 flex items-center justify-between rounded-full bg-neutral-948/95 px-4 py-2 shadow-[0_18px_45px_rgba(0,0,0,0.8)] backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-3 py-1">
            <span className="text-[11px] text-neutral-400">Buyer total</span>
            <span className="text-xs font-semibold text-neutral-0">
              ${buyerTotal.toFixed(2)}
            </span>
          </div>
          <p className="hidden text-[11px] text-neutral-400 md:block">
            Including ticket price and any applicable fees.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeStep > 0 && (
            <button
              type="button"
              onClick={goPrev}
              className="rounded-full px-3 py-1.5 text-[11px] font-medium text-neutral-200 hover:bg-neutral-900"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={goNext}
            className="rounded-full bg-primary-600 px-4 py-1.5 text-[11px] font-medium text-white hover:bg-primary-500"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );

  const availabilityStep = (
    <div className="space-y-6">
      <div className="rounded-card border border-white/8 bg-neutral-948/90 p-6 shadow-[0_18px_45px_rgba(0,0,0,0.7)]">
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-medium text-neutral-100">Quantities</p>
            <p className="text-[11px] text-neutral-400">
              Set limits on number of tickets available and how many a single
              order can contain.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <label className="block text-[11px] text-neutral-300">
                Total number of tickets
              </label>
              <div className="flex items-center gap-2">
                <input
                  {...register("totalQuantity", { valueAsNumber: true })}
                  disabled={watch("unlimitedQuantity")}
                  type="number"
                  min={0}
                  className="w-full rounded-xl border border-white/10 bg-neutral-950 px-3 py-2 text-xs text-neutral-0 placeholder:text-neutral-500 disabled:cursor-not-allowed disabled:opacity-40"
                />
                <button
                  type="button"
                  onClick={() =>
                    setValue("unlimitedQuantity", !watch("unlimitedQuantity"))
                  }
                  className={clsx(
                    "whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-medium",
                    watch("unlimitedQuantity")
                      ? "bg-primary-600 text-white"
                      : "bg-neutral-900 text-neutral-200"
                  )}
                >
                  {watch("unlimitedQuantity") ? "Unlimited" : "Set limit"}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] text-neutral-300">
                Minimum tickets per order
              </label>
              <input
                {...register("minPerOrder", { valueAsNumber: true })}
                type="number"
                min={0}
                className="w-full rounded-xl border border-white/10 bg-neutral-950 px-3 py-2 text-xs text-neutral-0 placeholder:text-neutral-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] text-neutral-300">
                Maximum tickets per order
              </label>
              <input
                {...register("maxPerOrder", { valueAsNumber: true })}
                type="number"
                min={0}
                className="w-full rounded-xl border border-white/10 bg-neutral-950 px-3 py-2 text-xs text-neutral-0 placeholder:text-neutral-500"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 h-px w-full bg-white/5" />

        <div className="mt-6 space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-neutral-100">
              Access control
            </p>
            <p className="text-[11px] text-neutral-400">
              Protect this ticket with a password or keep it open to everyone.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 text-[11px] text-neutral-300">
              <input
                {...register("accessMode")}
                type="radio"
                value="public"
                className="h-3 w-3 rounded border-white/20 bg-neutral-950 text-primary-600 focus:ring-primary-600"
              />
              <span>Anyone can access</span>
            </label>
            <label className="inline-flex items-center gap-2 text-[11px] text-neutral-300">
              <input
                {...register("accessMode")}
                type="radio"
                value="password"
                className="h-3 w-3 rounded border-white/20 bg-neutral-950 text-primary-600 focus:ring-primary-600"
              />
              <span>Require password</span>
            </label>
          </div>

          {watch("accessMode") === "password" && (
            <div className="space-y-1">
              <label className="block text-[11px] text-neutral-300">
                Password
              </label>
              <input
                {...register("password")}
                type="text"
                className="w-full rounded-xl border border-white/10 bg-neutral-950 px-3 py-2 text-xs text-neutral-0 placeholder:text-neutral-500"
                placeholder="Enter password attendees must use"
              />
            </div>
          )}
        </div>

        <div className="mt-6 h-px w-full bg-white/5" />

        <div className="mt-6 space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-neutral-100">
              Availability timeline
            </p>
            <p className="text-[11px] text-neutral-400">
              Control when this ticket is on sale and what its current status
              should be.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-neutral-300">
            {(["scheduled", "on_sale", "paused", "sale_ended"] as const).map(
              (value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setValue("availabilityStatus", value)}
                  className={clsx(
                    "rounded-full px-3 py-1 capitalize",
                    watch("availabilityStatus") === value
                      ? "bg-primary-600 text-white"
                      : "bg-neutral-900 text-neutral-200"
                  )}
                >
                  {value.replace("_", " ")}
                </button>
              )
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="block text-[11px] text-neutral-300">
                Sales start
              </label>
              <input
                {...register("salesStartAt")}
                type="datetime-local"
                className="w-full rounded-xl border border-white/10 bg-neutral-950 px-3 py-2 text-xs text-neutral-0 placeholder:text-neutral-500"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] text-neutral-300">
                Sales end
              </label>
              <input
                {...register("salesEndAt")}
                type="datetime-local"
                className="w-full rounded-xl border border-white/10 bg-neutral-950 px-3 py-2 text-xs text-neutral-0 placeholder:text-neutral-500"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={goPrev}
          className="rounded-full px-3 py-1.5 text-[11px] font-medium text-neutral-200 hover:bg-neutral-900"
        >
          Back
        </button>
        <button
          type="button"
          onClick={goNext}
          className="rounded-full bg-primary-600 px-4 py-1.5 text-[11px] font-medium text-white hover:bg-primary-500"
        >
          Next
        </button>
      </div>
    </div>
  );

  const checkoutStep = (
    <div className="space-y-6">
      <div className="rounded-card border border-white/8 bg-neutral-948/90 p-6 shadow-[0_18px_45px_rgba(0,0,0,0.7)]">
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-neutral-100">
              Checkout requirements
            </p>
            <p className="text-[11px] text-neutral-400">
              Choose which attendee details you collect at checkout.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="inline-flex items-center justify-between gap-3 rounded-xl bg-neutral-950 px-3 py-2 text-xs text-neutral-100">
              <span>Buyer full name</span>
              <input
                {...register("requireFullName")}
                type="checkbox"
                className="h-4 w-7 rounded-full border-white/20 bg-neutral-900 text-primary-600 focus:ring-primary-600"
              />
            </label>

            <label className="inline-flex items-center justify-between gap-3 rounded-xl bg-neutral-950 px-3 py-2 text-xs text-neutral-100">
              <span>Phone number</span>
              <input
                {...register("requirePhone")}
                type="checkbox"
                className="h-4 w-7 rounded-full border-white/20 bg-neutral-900 text-primary-600 focus:ring-primary-600"
              />
            </label>

            <label className="inline-flex items-center justify-between gap-3 rounded-xl bg-neutral-950 px-3 py-2 text-xs text-neutral-100">
              <span>Gender</span>
              <input
                {...register("requireGender")}
                type="checkbox"
                className="h-4 w-7 rounded-full border-white/20 bg-neutral-900 text-primary-600 focus:ring-primary-600"
              />
            </label>

            <label className="inline-flex items-center justify-between gap-3 rounded-xl bg-neutral-950 px-3 py-2 text-xs text-neutral-100">
              <span>Date of birth</span>
              <input
                {...register("requireDob")}
                type="checkbox"
                className="h-4 w-7 rounded-full border-white/20 bg-neutral-900 text-primary-600 focus:ring-primary-600"
              />
            </label>
          </div>

          <div className="mt-4 space-y-2">
            <label className="inline-flex items-center gap-2 text-[11px] text-neutral-200">
              <input
                {...register("subjectToApproval")}
                type="checkbox"
                className="h-3 w-3 rounded border-white/20 bg-neutral-950 text-primary-600 focus:ring-primary-600"
              />
              <span>
                Subject orders to approval before tickets are released
              </span>
            </label>
            <label className="inline-flex items-center gap-2 text-[11px] text-neutral-200">
              <input
                {...register("addBuyerDetailsToOrder")}
                type="checkbox"
                className="h-3 w-3 rounded border-white/20 bg-neutral-950 text-primary-600 focus:ring-primary-600"
              />
              <span>Include buyer details on the ticket list</span>
            </label>
            <label className="inline-flex items-center gap-2 text-[11px] text-neutral-200">
              <input
                {...register("addPurchasedTicketsToAttendeesCount")}
                type="checkbox"
                className="h-3 w-3 rounded border-white/20 bg-neutral-950 text-primary-600 focus:ring-primary-600"
              />
              <span>Count purchased tickets towards attendee total</span>
            </label>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={goPrev}
          className="rounded-full px-3 py-1.5 text-[11px] font-medium text-neutral-200 hover:bg-neutral-900"
        >
          Back
        </button>
        <button
          type="button"
          onClick={goNext}
          className="rounded-full bg-primary-600 px-4 py-1.5 text-[11px] font-medium text-white hover:bg-primary-500"
        >
          Next
        </button>
      </div>
    </div>
  );

  const designStep = (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="rounded-card border border-white/8 bg-neutral-948/90 p-6 shadow-[0_18px_45px_rgba(0,0,0,0.7)]">
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-neutral-100">
                Customize ticket layout
              </p>
              <p className="text-[11px] text-neutral-400">
                Choose how your ticket appears in the app and on PDFs.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {(["horizontal", "vertical", "down", "up"] as const).map(
                (value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setValue("layout", value)}
                    className={clsx(
                      "flex flex-1 min-w-[120px] items-center justify-center rounded-xl border px-3 py-2 text-[11px] capitalize",
                      layout === value
                        ? "border-primary-600 bg-primary-950/40 text-neutral-0"
                        : "border-white/10 bg-neutral-950 text-neutral-300"
                    )}
                  >
                    {value.replace("_", " ")} layout
                  </button>
                )
              )}
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="block text-[11px] text-neutral-300">
                  Brand color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    {...register("brandColor")}
                    type="text"
                    className="w-full rounded-xl border border-white/10 bg-neutral-950 px-3 py-2 text-xs text-neutral-0 placeholder:text-neutral-500"
                  />
                  <input
                    type="color"
                    value={brandColor}
                    onChange={(e) => setValue("brandColor", e.target.value)}
                    className="h-9 w-9 cursor-pointer rounded-lg border border-white/20 bg-neutral-900"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] text-neutral-300">
                  Footer text
                </label>
                <input
                  {...register("footerText")}
                  type="text"
                  placeholder="Bottom line on the ticket"
                  className="w-full rounded-xl border border-white/10 bg-neutral-950 px-3 py-2 text-xs text-neutral-0 placeholder:text-neutral-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] text-neutral-300">
                  Logo URL
                </label>
                <input
                  {...register("logoUrl")}
                  type="text"
                  placeholder="https://…"
                  className="w-full rounded-xl border border-white/10 bg-neutral-950 px-3 py-2 text-xs text-neutral-0 placeholder:text-neutral-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] text-neutral-300">
                  Background image URL
                </label>
                <input
                  {...register("backgroundUrl")}
                  type="text"
                  placeholder="https://…"
                  className="w-full rounded-xl border border-white/10 bg-neutral-950 px-3 py-2 text-xs text-neutral-0 placeholder:text-neutral-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Ticket preview */}
        <div className="rounded-card border border-white/8 bg-neutral-948/90 p-6 shadow-[0_18px_45px_rgba(0,0,0,0.7)]">
          <p className="mb-3 text-xs font-medium text-neutral-100">
            Ticket preview
          </p>
          <div className="flex items-center justify-center">
            <div
              className="relative w-full max-w-xs rounded-[24px] border border-white/10 p-4 text-[10px] text-neutral-50"
              style={{ background: brandColor }}
            >
              <div className="mb-3 flex items-center justify-between text-[9px]">
                <span className="rounded-full bg-black/25 px-2 py-0.5 uppercase tracking-[0.08em]">
                  Tikd • {layout}
                </span>
                <span className="text-[8px] opacity-80">
                  {new Date().getFullYear()}
                </span>
              </div>

              <p className="mb-1 text-[11px] font-semibold">
                {name || "Ticket name"}
              </p>
              <p className="mb-3 text-[9px] opacity-85">
                Admits one • {buyerTotal === 0 ? "Free" : `$${buyerTotal}`}
              </p>

              <div className="mb-4 space-y-1 text-[8px] opacity-85">
                <p>Date: TBD</p>
                <p>Time: TBD</p>
                <p>Venue: Your event location</p>
              </div>

              <div className="mt-2 h-[26px] w-full rounded bg-black/25" />

              <div className="mt-2 h-[18px] w-full rounded bg-black/35" />
            </div>
          </div>
        </div>
      </div>

      {serverError && <p className="text-xs text-error-400">{serverError}</p>}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={goPrev}
          className="rounded-full px-3 py-1.5 text-[11px] font-medium text-neutral-200 hover:bg-neutral-900"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-full bg-primary-600 px-4 py-1.5 text-[11px] font-medium text-white hover:bg-primary-500 disabled:opacity-50"
        >
          {isSubmitting ? "Saving…" : "Save ticket type"}
        </button>
      </div>
    </div>
  );

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-8 pb-10 pt-2"
      noValidate
    >
      {/* Top row: back button + step counter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-sm text-neutral-300 hover:text-neutral-0 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to ticket types</span>
        </button>

        <div className="ml-auto text-sm font-medium text-neutral-400">
          Step {activeStep + 1} of {steps.length}
        </div>
      </div>

      {/* Stepper header – full-width timeline with circles */}
      <div className="flex w-full items-center justify-between gap-4">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isActive = activeStep === idx;
          const isCompleted = activeStep > idx;
          const isLast = idx === steps.length - 1;

          return (
            <div
              key={step.id}
              className="flex flex-1 items-start gap-4 last:flex-none"
            >
              {/* Circle + label */}
              <button
                type="button"
                onClick={() => setActiveStep(idx as any)}
                className="flex flex-col items-center gap-3 outline-none"
              >
                <div
                  className={clsx(
                    "flex h-12 w-12 items-center justify-center rounded-full border-1 transition-all duration-200",
                    "shadow-[0_14px_35px_rgba(0,0,0,0.7)]",
                    isActive
                      ? " bg-primary-600 shadow-[0_0_40px_rgba(133,0,255,0.65)]"
                      : isCompleted
                        ? "border-primary-600 bg-neutral-0"
                        : "border-neutral-700 bg-neutral-0"
                  )}
                >
                  <Icon
                    className={clsx(
                      "h-5 w-5 transition-colors duration-200",
                      isActive
                        ? "text-neutral-0"
                        : isCompleted
                          ? "text-primary-600"
                          : "text-neutral-500"
                    )}
                  />
                </div>

                <span
                  className={clsx(
                    "text-sm font-medium tracking-[0.01em]",
                    isActive
                      ? "text-neutral-0"
                      : isCompleted
                        ? "text-neutral-100"
                        : "text-neutral-300"
                  )}
                >
                  {step.label}
                </span>
              </button>

              {/* Connector line to next step */}
              {!isLast && (
                <div className="flex-1 mt-6">
                  <div
                    className={clsx(
                      "h-px w-full",
                      isCompleted ? "bg-primary-500" : "bg-neutral-500"
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Step body */}
      {activeStep === 0 && generalStep}
      {activeStep === 1 && availabilityStep}
      {activeStep === 2 && checkoutStep}
      {activeStep === 3 && designStep}
    </form>
  );
}

/* ========================== Page component ========================= */

export default function TicketTypesPage() {
  const params = useParams<RouteParams>();
  const eventId = params?.eventId;

  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"list" | "create">("list");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["ticket-types", eventId],
    enabled: Boolean(eventId),
    queryFn: async (): Promise<TicketTypeRow[]> => {
      const res = await fetch(`/api/events/${eventId}/ticket-types`);
      if (!res.ok) {
        throw new Error("Failed to load ticket types");
      }
      const json = (await res.json()) as TicketTypeApi[];
      return json.map(mapApiToRow);
    },
  });

  const filtered = useMemo(() => {
    const list = data ?? [];
    if (!query.trim()) return list;
    return list.filter((t) =>
      t.name.toLowerCase().includes(query.toLowerCase())
    );
  }, [data, query]);

  if (!eventId) {
    return (
      <div className="text-xs text-error-400">
        Missing event id in route params.
      </div>
    );
  }

  if (mode === "create") {
    return (
      <div className="space-y-4">
        <header className="space-y-1">
          <h2 className="text-sm font-semibold text-neutral-0">
            New Ticket Type
          </h2>
          <p className="text-xs text-neutral-400">
            Configure pricing, availability, checkout requirements and ticket
            design for this event.
          </p>
        </header>

        <TicketTypeWizard
          eventId={eventId}
          onCancel={() => setMode("list")}
          onCreated={async () => {
            await refetch();
            setMode("list");
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-0">Ticket types</h2>
          <p className="mt-1 text-xs text-neutral-400">
            Configure pricing, capacity and status for each ticket.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMode("create")}
          className="inline-flex items-center gap-2 rounded-full bg-primary-600 px-4 py-2 text-xs font-medium text-white shadow-[0_0_0_1px_rgba(255,255,255,0.10)] hover:bg-primary-500"
        >
          <Plus className="h-4 w-4" />
          <span>New ticket type</span>
        </button>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="search"
            placeholder="Search tickets…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-full border border-white/10 bg-neutral-950 px-9 py-2 text-xs text-neutral-0 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <p className="text-[11px] text-neutral-400">
          {filtered.length} ticket type{filtered.length === 1 ? "" : "s"}
        </p>
      </div>

      {isLoading && (
        <div className="rounded-card border border-white/8 bg-neutral-948/90 px-6 py-8 text-center text-xs text-neutral-300">
          Loading ticket types…
        </div>
      )}

      {isError && !isLoading && (
        <div className="rounded-card border border-error-600/40 bg-error-950/60 px-6 py-8 text-center text-xs text-error-200">
          Failed to load ticket types. Please refresh the page.
        </div>
      )}

      {!isLoading && !isError && filtered.length === 0 ? (
        <div className="rounded-card border border-dashed border-white/10 bg-neutral-950/80 px-6 py-10 text-center text-sm text-neutral-300">
          No ticket types yet. Start by creating a ticket above.
        </div>
      ) : null}

      {!isLoading && !isError && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-4 rounded-card border border-white/8 bg-neutral-948/90 px-5 py-4 shadow-[0_18px_45px_rgba(0,0,0,0.7)]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary-900/70 text-primary-200">
                  <Ticket className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-0">
                    {t.name}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-neutral-400">
                    {t.description}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 text-xs text-neutral-200">
                <div className="text-right">
                  <p className="text-[11px] text-neutral-500">Price</p>
                  <p className="font-medium">
                    {t.price === 0
                      ? "Free"
                      : `$${t.price.toFixed(2)} ${t.currency}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-neutral-500">Sold</p>
                  <p className="font-medium">
                    {t.sold}
                    {t.capacity != null ? `/${t.capacity}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-neutral-500">Status</p>
                  <span
                    className={clsx(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
                      t.status === "on_sale"
                        ? "border border-success-700/40 bg-success-900/40 text-success-300"
                        : t.status === "sale_ended"
                          ? "border border-white/10 bg-neutral-900 text-neutral-200"
                          : "border border-warning-700/40 bg-warning-900/40 text-warning-200"
                    )}
                  >
                    {t.status.replace("_", " ")}
                  </span>
                </div>
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-neutral-950 text-neutral-300 hover:border-primary-500 hover:text-primary-200"
                >
                  <EllipsisVertical className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
