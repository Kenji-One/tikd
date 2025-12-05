// src/app/dashboard/organizations/[id]/events/[eventId]/ticket-types/page.tsx
"use client";

import { useMemo, useState, type SVGProps, type ComponentType } from "react";
import { useParams } from "next/navigation";
import {
  Search,
  Plus,
  Ticket,
  EllipsisVertical,
  ArrowLeft,
  Layers,
  Clock4,
  CreditCard,
  Palette,
  X,
} from "lucide-react";

import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import clsx from "clsx";

import Toggle from "@/components/ui/Toggle";

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

  // Checkout (mirrors design)
  requireFullName: boolean;
  requireEmail: boolean;
  requirePhone: boolean;
  requireFacebook: boolean;
  requireInstagram: boolean;
  requireGender: boolean;
  requireDob: boolean;
  requireAge: boolean;
  subjectToApproval: boolean;
  addBuyerDetailsToOrder: boolean; // "Merge buyer details"
  addPurchasedTicketsToAttendeesCount: boolean;
  enableEmailAttachments: boolean;

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
  const [isStatusEditorOpen, setIsStatusEditorOpen] = useState(false);

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

      // checkout defaults like in design
      requireFullName: true,
      requireEmail: true,
      requirePhone: false,
      requireFacebook: false,
      requireInstagram: false,
      requireGender: false,
      requireDob: false,
      requireAge: false,
      subjectToApproval: false,
      addBuyerDetailsToOrder: false,
      addPurchasedTicketsToAttendeesCount: false,
      enableEmailAttachments: true,

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
  const feeMode = watch("feeMode");
  const name = watch("name");
  const unlimitedQuantity = watch("unlimitedQuantity");
  const minPerOrder = watch("minPerOrder");
  const maxPerOrder = watch("maxPerOrder");
  const availabilityStatus = watch("availabilityStatus");

  // checkout watches
  const requireFullName = watch("requireFullName");
  const requireEmail = watch("requireEmail");
  const requirePhone = watch("requirePhone");
  const requireFacebook = watch("requireFacebook");
  const requireInstagram = watch("requireInstagram");
  const requireGender = watch("requireGender");
  const requireDob = watch("requireDob");
  const requireAge = watch("requireAge");
  const subjectToApproval = watch("subjectToApproval");
  const addBuyerDetailsToOrder = watch("addBuyerDetailsToOrder");
  const addPurchasedTicketsToAttendeesCount = watch(
    "addPurchasedTicketsToAttendeesCount"
  );
  const enableEmailAttachments = watch("enableEmailAttachments");

  const [showBreakdown, setShowBreakdown] = useState(false);

  const PRICE_STEP = 0.5;

  const handlePriceStep = (delta: number) => {
    const current = Number.isFinite(price as number) ? Number(price) : 0;
    let next = current + delta;
    if (next < 0) next = 0;

    // round to cents
    next = Math.round(next * 100) / 100;

    setValue("price", next, { shouldDirty: true });
    setValue("isFree", next === 0, { shouldDirty: true });
  };

  const { serviceFee, buyerTotal } = useMemo(() => {
    if (isFree) {
      return { serviceFee: 0, buyerTotal: 0 };
    }

    const basePrice = Number.isFinite(price as number) ? Number(price) : 0;

    // Placeholder fee model – replace with real rules later
    const fee = basePrice > 0 ? basePrice * 0.06 + 0.2 : 0;
    const total = feeMode === "pass_on" ? basePrice + fee : basePrice;

    return {
      serviceFee: Math.max(0, Math.round(fee * 100) / 100),
      buyerTotal: Math.max(0, Math.round(total * 100) / 100),
    };
  }, [isFree, price, feeMode]);

  type StepId = "general" | "availability" | "checkout" | "design";

  type StepDef = {
    id: StepId;
    label: string;
    icon: ComponentType<SVGProps<SVGSVGElement>>;
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

    const isFreeFlag = !values.price || values.price <= 0;

    const payload = {
      name: values.name,
      description: values.description || "",
      price: isFreeFlag ? 0 : values.price,
      currency: values.currency,
      feeMode: values.feeMode,
      isFree: isFreeFlag,
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
        requireEmail: values.requireEmail,
        requirePhone: values.requirePhone,
        requireFacebook: values.requireFacebook,
        requireInstagram: values.requireInstagram,
        requireGender: values.requireGender,
        requireDob: values.requireDob,
        requireAge: values.requireAge,
        subjectToApproval: values.subjectToApproval,
        addBuyerDetailsToOrder: values.addBuyerDetailsToOrder,
        addPurchasedTicketsToAttendeesCount:
          values.addPurchasedTicketsToAttendeesCount,
        enableEmailAttachments: values.enableEmailAttachments,
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
      <div className="rounded-3xl border border-white/8 bg-neutral-950/95 px-6 py-6 md:px-8 md:py-8 shadow-[0_18px_45px_rgba(0,0,0,0.7)]">
        {/* Name + Description */}
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-neutral-0">
              Name<span className="ml-1 text-error-400">*</span>
            </label>
            <input
              {...register("name", { required: true })}
              type="text"
              placeholder="Enter name"
              className="w-full rounded-2xl border border-white/10 bg-[#171726] px-4 py-3 text-sm text-neutral-0 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/70"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-neutral-0">
              Description
            </label>
            <textarea
              {...register("description")}
              rows={4}
              placeholder="Write description"
              className="w-full resize-none rounded-2xl border border-white/10 bg-[#171726] px-4 py-3 text-sm text-neutral-0 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/70"
            />
          </div>
        </div>

        {/* Divider */}
        <div className="mt-8 h-px w-full bg-white/5" />

        {/* Price section */}
        <div className="mt-8 space-y-6">
          <div className="space-y-1 text-center">
            <p className="text-base font-semibold text-neutral-0">Price</p>
            <p className="text-xs text-neutral-400">
              Choose whether this ticket is free or paid. Adjust the price and
              how fees are handled.
            </p>
          </div>

          {/* Price pill with – / + */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-4 rounded-full bg-[#171726] px-5 py-2.5 shadow-[0_18px_45px_rgba(0,0,0,0.65)]">
              <button
                type="button"
                onClick={() => handlePriceStep(-PRICE_STEP)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#11111A] text-xl leading-none text-neutral-100 hover:bg-[#181824]"
              >
                –
              </button>

              <div className="min-w-[96px] text-center text-lg font-semibold text-neutral-0">
                {isFree ? "Free" : `$${Number(price || 0).toFixed(2)}`}
              </div>

              <button
                type="button"
                onClick={() => handlePriceStep(PRICE_STEP)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-xl leading-none text-white shadow-[0_0_0_8px_rgba(133,92,255,0.4)] hover:bg-primary-500"
              >
                +
              </button>
            </div>
          </div>

          {/* Fee mode toggles (only when paid) */}
          {!isFree && (
            <div className="mt-6 space-y-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <p className="text-base font-semibold text-neutral-0">
                    Pass on the fees to the customer
                  </p>
                  <p className="max-w-md text-sm text-neutral-400">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                  </p>
                </div>
                <Toggle
                  size="md"
                  checked={feeMode === "pass_on"}
                  onCheckedChange={() => setValue("feeMode", "pass_on")}
                />
              </div>

              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <p className="text-base font-semibold text-neutral-0">
                    Absorb the fees into the ticket price
                  </p>
                  <p className="max-w-md text-sm text-neutral-400">
                    Lorem consectetur adipiscing elit, sed do ei.
                  </p>
                </div>
                <Toggle
                  size="md"
                  checked={feeMode === "absorb"}
                  onCheckedChange={() => setValue("feeMode", "absorb")}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Step navigation for general step */}
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={goNext}
          className="rounded-full bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-500"
        >
          Next
        </button>
      </div>
    </div>
  );

  const availabilityStep = (
    <div className="space-y-6">
      {/* Main availability card */}
      <div className="rounded-3xl border border-white/8 bg-neutral-950/95 px-6 py-6 md:px-8 md:py-8 shadow-[0_18px_45px_rgba(0,0,0,0.7)]">
        {/* Header */}
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-neutral-0">Quantities</h2>
          <p className="text-sm text-neutral-400">
            Set a total number of tickets for this ticket type.
          </p>
        </div>

        {/* Three quantity cards in a row */}
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {/* Total number of tickets */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-neutral-200">
              Total Number of Tickets
            </p>
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#181828] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-[#23233a] text-xs text-neutral-100">
                  <Ticket className="h-3.5 w-3.5" />
                </span>
                <input
                  {...register("totalQuantity", { valueAsNumber: true })}
                  type="number"
                  min={0}
                  disabled={unlimitedQuantity}
                  className="w-20 bg-transparent text-sm text-neutral-0 placeholder:text-neutral-500 focus:outline-none"
                />
              </div>

              {/* small square checkbox – toggles unlimited capacity */}
              <button
                type="button"
                onClick={() =>
                  setValue("unlimitedQuantity", !unlimitedQuantity)
                }
                className={clsx(
                  "flex h-5 w-5 items-center justify-center rounded-[6px] border text-[10px] font-semibold transition-colors",
                  unlimitedQuantity
                    ? "border-primary-500 bg-primary-500 text-neutral-950"
                    : "border-white/20 bg-transparent text-transparent"
                )}
              >
                ✓
              </button>
            </div>
          </div>

          {/* Minimum tickets per order */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-neutral-200">
              Minimum Tickets Per Order
            </p>
            {(() => {
              const isUnlimited = minPerOrder == null;
              return (
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#181828] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-[#23233a] text-xs text-neutral-100">
                      <Ticket className="h-3.5 w-3.5" />
                    </span>
                    {isUnlimited ? (
                      <span className="text-sm font-semibold text-success-500">
                        Unlimited
                      </span>
                    ) : (
                      <input
                        {...register("minPerOrder", { valueAsNumber: true })}
                        type="number"
                        min={0}
                        className="w-20 bg-transparent text-sm text-neutral-0 placeholder:text-neutral-500 focus:outline-none"
                      />
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setValue("minPerOrder", isUnlimited ? 1 : null)
                    }
                    className={clsx(
                      "flex h-5 w-5 items-center justify-center rounded-[6px] border text-[10px] font-semibold transition-colors",
                      isUnlimited
                        ? "border-primary-500 bg-primary-500 text-neutral-950"
                        : "border-white/20 bg-transparent text-transparent"
                    )}
                  >
                    ✓
                  </button>
                </div>
              );
            })()}
          </div>

          {/* Maximum tickets per order */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-neutral-200">
              Maximum Tickets Per Order
            </p>
            {(() => {
              const isUnlimited = maxPerOrder == null;
              return (
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#181828] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-[#23233a] text-xs text-neutral-100">
                      <Ticket className="h-3.5 w-3.5" />
                    </span>
                    {isUnlimited ? (
                      <span className="text-sm font-semibold text-success-500">
                        Unlimited
                      </span>
                    ) : (
                      <input
                        {...register("maxPerOrder", { valueAsNumber: true })}
                        type="number"
                        min={0}
                        className="w-20 bg-transparent text-sm text-neutral-0 placeholder:text-neutral-500 focus:outline-none"
                      />
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setValue("maxPerOrder", isUnlimited ? 10 : null)
                    }
                    className={clsx(
                      "flex h-5 w-5 items-center justify-center rounded-[6px] border text-[10px] font-semibold transition-colors",
                      isUnlimited
                        ? "border-primary-500 bg-primary-500 text-neutral-950"
                        : "border-white/20 bg-transparent text-transparent"
                    )}
                  >
                    ✓
                  </button>
                </div>
              );
            })()}
          </div>
        </div>

        <p className="mt-3 text-[11px] text-neutral-500">
          Ticking the box will make number Unlimited
        </p>

        {/* Password section */}
        <div className="mt-8 space-y-3">
          <h3 className="text-sm font-semibold text-neutral-0">Password</h3>
          <p className="text-[11px] text-neutral-400">
            If you would like to protect this ticket type with a password, check
            the mark and create a password. There will be a place on your event
            page for your customers to enter the password. Share the password
            link directly to send your event page with the ticket type already
            unlocked.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)]">
            {/* Password input pill */}
            <div className="space-y-1">
              <p className="text-[11px] text-neutral-200">Password</p>
              <div className="relative">
                <input
                  {...register("password")}
                  type="text"
                  placeholder="Enter Password"
                  className="w-full rounded-2xl border border-white/10 bg-[#181828] px-4 py-3 pr-20 text-sm text-neutral-0 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/70"
                />
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/25 text-[10px] text-neutral-300">
                    ●
                  </span>
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-success-500 text-[11px] font-semibold text-neutral-950">
                    ✓
                  </span>
                </div>
              </div>
            </div>

            {/* Who can access select */}
            <div className="space-y-1">
              <p className="text-[11px] text-neutral-200">Who can access</p>
              <div className="relative">
                <select
                  {...register("accessMode")}
                  className="w-full appearance-none rounded-2xl border border-white/10 bg-[#181828] px-4 py-3 pr-10 text-sm text-neutral-0 focus:outline-none focus:ring-2 focus:ring-primary-500/70"
                >
                  <option value="public">Anyone</option>
                  <option value="password">
                    Only people with the password
                  </option>
                </select>
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400">
                  ▾
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Divider line */}
        <div className="mt-8 h-px w-full bg-white/5" />

        {/* Availability timeline */}
        <div className="mt-6 space-y-4">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-neutral-0">
              Availability Timeline
            </h3>
            <p className="text-[11px] text-neutral-400">
              Change the availability status of your ticket as it is displayed
              on the event page. You can also add a time you would like to
              change the ticket availability.
            </p>
          </div>

          {/* plus — line — plus row */}
          <div className="mt-4 flex items-center gap-6">
            {/* initial status + node */}
            <button
              type="button"
              className="flex flex-col items-center gap-2 text-neutral-0"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-neutral-0 shadow-[0_0_26px_rgba(133,0,255,0.8)]">
                <Plus className="h-4 w-4" />
              </span>
            </button>

            <div className="h-px flex-1 bg-neutral-600" />

            {/* current status + node */}
            <button
              type="button"
              onClick={() => setIsStatusEditorOpen(true)}
              className="flex flex-col items-center gap-2 text-neutral-0"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-neutral-0 shadow-[0_0_26px_rgba(133,0,255,0.8)]">
                <Plus className="h-4 w-4" />
              </span>
            </button>
          </div>

          {/* labels below timeline */}
          <div className="mt-3 flex items-start justify-between gap-6 text-[11px] text-neutral-200">
            <div className="flex-1">
              <p className="font-medium text-neutral-0">Initial Status</p>
            </div>
            <div className="flex flex-1 justify-end">
              <div className="text-right">
                <p className="font-medium text-neutral-0">Current Status</p>
                <p className="mt-1 text-neutral-400 capitalize">
                  {availabilityStatus === "on_sale"
                    ? "On sale"
                    : availabilityStatus === "sale_ended"
                      ? "Sale ended"
                      : availabilityStatus === "paused"
                        ? "Paused"
                        : "Scheduled"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Go back / Next inside the card */}
        <div className="mt-8 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={goPrev}
            className="rounded-full bg-neutral-50 px-6 py-2 text-sm font-medium text-neutral-900 hover:bg-white"
          >
            Go back
          </button>
          <button
            type="button"
            onClick={goNext}
            className="rounded-full bg-primary-600 px-7 py-2 text-sm font-semibold text-white hover:bg-primary-500"
          >
            Next
          </button>
        </div>
      </div>

      {/* Current Status bottom card (opened from timeline) */}
      {isStatusEditorOpen && (
        <div className="rounded-3xl border border-white/8 bg-neutral-950/95 px-6 py-6 md:px-8 md:py-8 shadow-[0_18px_45px_rgba(0,0,0,0.7)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-lg font-semibold text-neutral-0">
                Current Status
              </p>
              <p className="mt-1 text-[11px] text-neutral-400">
                Update how this ticket is currently displayed on your event
                page.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsStatusEditorOpen(false)}
              className="text-xs text-neutral-400 hover:text-neutral-100"
            >
              Close
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="block text-[11px] text-neutral-300">
                Status
              </label>
              <select
                {...register("availabilityStatus")}
                className="w-full rounded-2xl border border-white/10 bg-[#181828] px-4 py-3 text-sm text-neutral-0 focus:outline-none focus:ring-2 focus:ring-primary-500/70"
              >
                <option value="on_sale">On sale</option>
                <option value="scheduled">Scheduled</option>
                <option value="paused">Paused</option>
                <option value="sale_ended">Sale ended</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] text-neutral-300">Date</label>
              <input
                {...register("salesEndAt")}
                type="datetime-local"
                className="w-full rounded-2xl border border-white/10 bg-[#181828] px-4 py-3 text-sm text-neutral-0 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/70"
              />
              <p className="mt-1 text-[10px] text-neutral-500">
                Optional: choose when this status should take effect.
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end">
            <button
              type="button"
              onClick={() => setIsStatusEditorOpen(false)}
              className="rounded-full bg-primary-600 px-6 py-2 text-sm font-semibold text-white hover:bg-primary-500"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );

  /* ----------------------- NEW CHECKOUT STEP ----------------------- */

  const checkoutStep = (
    <div className="pb-16">
      <div className="mx-auto w-full max-w-xl rounded-[32px] border border-white/8 bg-neutral-950 px-6 py-6 md:px-10 md:py-8 shadow-[0_18px_45px_rgba(0,0,0,0.8)]">
        {/* Top heading */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-neutral-0">
            Checkout Requirments
          </h2>
          <p className="text-sm leading-relaxed text-neutral-300">
            Customize the checkout process by collecting the client details that
            best suit your needs. The more data collected – the more diverse
            your dashboard analytics become
          </p>
        </div>

        {/* First block – basic attendee details */}
        <div className="mt-8 space-y-1">
          {/* Name */}
          <div className="flex items-center justify-between py-2">
            <span className="text-base text-neutral-0">Name</span>
            <Toggle
              size="md"
              checked={requireFullName}
              onCheckedChange={(val) =>
                setValue("requireFullName", Boolean(val))
              }
            />
          </div>

          {/* Email */}
          <div className="flex items-center justify-between py-2">
            <span className="text-base text-neutral-0">Email</span>
            <Toggle
              size="md"
              checked={requireEmail}
              onCheckedChange={(val) => setValue("requireEmail", Boolean(val))}
            />
          </div>

          {/* Phone */}
          <div className="flex items-center justify-between py-2">
            <span className="text-base text-neutral-0">Phone number</span>
            <Toggle
              size="md"
              checked={requirePhone}
              onCheckedChange={(val) => setValue("requirePhone", Boolean(val))}
            />
          </div>

          {/* Facebook */}
          <div className="flex items-center justify-between py-2">
            <span className="text-base text-neutral-0">Link to Facebook</span>
            <Toggle
              size="md"
              checked={requireFacebook}
              onCheckedChange={(val) =>
                setValue("requireFacebook", Boolean(val))
              }
            />
          </div>

          {/* Instagram */}
          <div className="flex items-center justify-between py-2">
            <span className="text-base text-neutral-0">Instagram Profile</span>
            <Toggle
              size="md"
              checked={requireInstagram}
              onCheckedChange={(val) =>
                setValue("requireInstagram", Boolean(val))
              }
            />
          </div>

          {/* Gender */}
          <div className="flex items-center justify-between py-2">
            <span className="text-base text-neutral-0">Gender</span>
            <Toggle
              size="md"
              checked={requireGender}
              onCheckedChange={(val) => setValue("requireGender", Boolean(val))}
            />
          </div>

          {/* DOB */}
          <div className="flex items-center justify-between py-2">
            <span className="text-base text-neutral-0">Date of birth</span>
            <Toggle
              size="md"
              checked={requireDob}
              onCheckedChange={(val) => setValue("requireDob", Boolean(val))}
            />
          </div>

          {/* Age */}
          <div className="flex items-center justify-between py-2">
            <span className="text-base text-neutral-0">Age</span>
            <Toggle
              size="md"
              checked={requireAge}
              onCheckedChange={(val) => setValue("requireAge", Boolean(val))}
            />
          </div>

          {/* Add your field row */}
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#11111b] px-4 py-3">
            <span className="text-sm text-neutral-0">Add your field</span>
            <button
              type="button"
              className="rounded-full border border-white/30 px-6 py-1.5 text-sm font-medium text-neutral-0 hover:border-primary-500"
            >
              Setup
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-8 h-px w-full bg-white/10" />

        {/* Second header – Checkout Requirments (again, like design) */}
        <div className="mt-6">
          <h3 className="text-xl font-semibold text-neutral-0">
            Checkout Requirments
          </h3>

          <div className="mt-5 space-y-1">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-neutral-0">
                Merge buyer details
              </span>
              <Toggle
                size="md"
                checked={addBuyerDetailsToOrder}
                onCheckedChange={(val) =>
                  setValue("addBuyerDetailsToOrder", Boolean(val))
                }
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-neutral-0">
                Subject to approval
              </span>
              <Toggle
                size="md"
                checked={subjectToApproval}
                onCheckedChange={(val) =>
                  setValue("subjectToApproval", Boolean(val))
                }
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-neutral-0">
                Add purchased tickets to attendees count
              </span>
              <Toggle
                size="md"
                checked={addPurchasedTicketsToAttendeesCount}
                onCheckedChange={(val) =>
                  setValue("addPurchasedTicketsToAttendeesCount", Boolean(val))
                }
              />
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-8 h-px w-full bg-white/10" />

        {/* Additional fee */}
        <div className="mt-6">
          <h3 className="text-xl font-semibold text-neutral-0">
            Additional fee
          </h3>
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#11111b] px-4 py-3">
            <span className="text-sm text-neutral-0">Add additional fee</span>
            <button
              type="button"
              className="rounded-full border border-white/30 px-6 py-1.5 text-sm font-medium text-neutral-0 hover:border-primary-500"
            >
              Setup
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-8 h-px w-full bg-white/10" />

        {/* Custom fields */}
        <div className="mt-6">
          <h3 className="text-xl font-semibold text-neutral-0">
            Custom Fields
          </h3>
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#11111b] px-4 py-3">
            <span className="text-sm text-neutral-0">Add Fields</span>
            <button
              type="button"
              className="rounded-full border border-white/30 px-6 py-1.5 text-sm font-medium text-neutral-0 hover:border-primary-500"
            >
              Setup
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-8 h-px w-full bg-white/10" />

        {/* Email attachments */}
        <div className="mt-6 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-neutral-0">
                Email Attachments
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-neutral-300">
                Include files in email confirmations sent with a ticket purchase
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setValue("enableEmailAttachments", !enableEmailAttachments)
              }
              className={clsx(
                "mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full border text-neutral-300 transition-colors",
                enableEmailAttachments
                  ? "border-white/40 hover:border-primary-500 hover:text-primary-200"
                  : "border-white/10 text-neutral-600 hover:border-white/30"
              )}
              title={
                enableEmailAttachments ? "Disable attachments" : "Enable again"
              }
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div
            className={clsx(
              "flex items-center justify-between rounded-2xl px-4 py-3",
              enableEmailAttachments ? "bg-[#11111b]" : "bg-[#090912]"
            )}
          >
            <span
              className={clsx(
                "text-sm",
                enableEmailAttachments ? "text-neutral-0" : "text-neutral-500"
              )}
            >
              Add Files
            </span>
            <button
              type="button"
              className={clsx(
                "rounded-full border px-6 py-1.5 text-sm font-medium",
                enableEmailAttachments
                  ? "border-white/30 text-neutral-0 hover:border-primary-500"
                  : "border-white/10 text-neutral-500"
              )}
            >
              Setup
            </button>
          </div>
        </div>

        {/* Go back / Next buttons at bottom of card */}
        <div className="mt-10 flex flex-wrap items-center justify-end gap-4">
          <button
            type="button"
            onClick={goPrev}
            className="rounded-full bg-neutral-50 px-7 py-2 text-sm font-medium text-neutral-950 hover:bg-white"
          >
            Go back
          </button>
          <button
            type="button"
            onClick={goNext}
            className="rounded-full bg-primary-600 px-8 py-2 text-sm font-semibold text-white hover:bg-primary-500"
          >
            Next
          </button>
        </div>
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
                      "flex min-w-[120px] flex-1 items-center justify-center rounded-xl border px-3 py-2 text-[11px] capitalize",
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

      <div className="flex items-center justify-start">
        <button
          type="button"
          onClick={goPrev}
          className="rounded-full px-3 py-1.5 text-[11px] font-medium text-neutral-200 hover:bg-neutral-900"
        >
          Back
        </button>
      </div>
    </div>
  );

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-8 pb-10 pt-6 max-w-4xl mx-auto"
      noValidate
    >
      {/* Top row: back button + step counter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-neutral-300 hover:text-neutral-0"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to ticket types</span>
        </button>

        <div className="ml-auto text-sm font-medium text-neutral-400">
          Step {activeStep + 1} of {steps.length}
        </div>
      </div>

      {/* Stepper header */}
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
                    "flex h-12 w-12 items-center justify-center rounded-full border transition-all duration-200",
                    "shadow-[0_14px_35px_rgba(0,0,0,0.7)]",
                    isActive
                      ? "border-transparent bg-primary-600 shadow-[0_0_40px_rgba(133,0,255,0.65)]"
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
                <div className="mt-6 flex-1">
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

      {/* Fixed bottom Buyer total + Save bar */}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center">
        <div className="pointer-events-auto flex w-full max-w-4xl items-center gap-3 rounded-full bg-[#05050A]/95 px-2 py-2 shadow-[0_22px_60px_rgba(0,0,0,0.85)] backdrop-blur">
          {/* Buyer total pill + breakdown */}
          <div className="relative flex-1">
            {showBreakdown && !isFree && (
              <div className="absolute bottom-full left-0 mb-3 w-full rounded-3xl border border-primary-400/70 bg-[#05050A] px-5 py-4 text-sm text-neutral-100 shadow-[0_22px_60px_rgba(0,0,0,0.95)]">
                <div className="flex items-center justify-between py-1">
                  <span className="text-neutral-200">Ticket price</span>
                  <span className="font-semibold">
                    ${Number(price || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-neutral-200">
                    Service fee (non-refundable)
                  </span>
                  <span className="font-semibold">
                    ${serviceFee.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => !isFree && setShowBreakdown((v) => !v)}
              className={clsx(
                "flex w-full items-center justify-between rounded-full px-5 py-2.5 text-sm",
                "bg-[#171726] text-neutral-0",
                isFree && "opacity-70"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#232332] text-xs text-neutral-100">
                  {showBreakdown && !isFree ? "˄" : "˅"}
                </span>
                <span className="font-medium">Buyer total</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">
                  ${buyerTotal.toFixed(2)}
                </span>
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-200 text-[10px] font-semibold text-neutral-900">
                  i
                </span>
              </div>
            </button>
          </div>

          {/* Save button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex min-w-[140px] items-center justify-center rounded-full bg-primary-600 px-8 py-2.5 text-sm font-semibold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.06)] transition-colors hover:bg-primary-500 disabled:opacity-50"
          >
            {isSubmitting ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
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
