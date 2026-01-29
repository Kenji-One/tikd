// src/app/dashboard/events/[eventId]/ticket-types/page.tsx
"use client";

import {
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
  Fragment,
  type SVGProps,
  type ComponentType,
} from "react";
import { useParams } from "next/navigation";
import {
  Search,
  Plus,
  Ticket,
  EllipsisVertical,
  X,
  GripVertical,
} from "lucide-react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import clsx from "clsx";

import type {
  TicketAvailabilityStatus,
  TicketTypeApi,
  TicketTypeRow,
  TicketTypeFormValues,
} from "./types";
import TicketTypeGeneralStep from "./TicketTypeGeneralStep";
import TicketTypeAvailabilityStep from "./TicketTypeAvailabilityStep";
import TicketTypeCheckoutStep from "./TicketTypeCheckoutStep";
import TicketTypeDesignStep from "./TicketTypeDesignStep";
import { fetchEventById, type EventWithMeta } from "@/lib/api/events";
import { Button } from "@/components/ui/Button";
import { RowCard, RowCardStat } from "@/components/ui/RowCard";

type RouteParams = {
  eventId: string;
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
    status: (api.availabilityStatus ?? "on_sale") as TicketAvailabilityStatus,
  };
}

function humanizeStatus(value?: string) {
  if (!value) return "Unknown";
  return value.replaceAll("_", " ");
}

/**
 * Reorder `full` list using a drag/drop that occurred inside `visible`.
 * Keeps all "hidden" (non-visible) items in their original relative positions.
 */
function reorderFullByVisibleDrag<T extends { id: string }>(args: {
  full: T[];
  visible: T[];
  activeId: string;
  overId: string;
  edge: "before" | "after";
}): T[] {
  const { full, visible, activeId, overId, edge } = args;

  if (activeId === overId) return full;

  const activeInVisible = visible.findIndex((x) => x.id === activeId);
  const overInVisible = visible.findIndex((x) => x.id === overId);
  if (activeInVisible === -1 || overInVisible === -1) return full;

  const activeIndexInFull = full.findIndex((x) => x.id === activeId);
  if (activeIndexInFull === -1) return full;

  const activeItem = full[activeIndexInFull];

  // remove active first
  const withoutActive = full.filter((x) => x.id !== activeId);

  const overIndex = withoutActive.findIndex((x) => x.id === overId);
  if (overIndex === -1) return full;

  let insertAt = edge === "after" ? overIndex + 1 : overIndex;
  if (insertAt < 0) insertAt = 0;
  if (insertAt > withoutActive.length) insertAt = withoutActive.length;

  const next = withoutActive.slice();
  next.splice(insertAt, 0, activeItem);
  return next;
}

/* ========================= TicketTypeWizard ======================== */

type TicketTypeWizardProps = {
  eventId: string;
  event?: EventWithMeta;
  onCancel: () => void;
  onCreated: () => void;
};

function TicketTypeWizard({
  eventId,
  event,
  onCancel,
  onCreated,
}: TicketTypeWizardProps) {
  const [activeStep, setActiveStep] = useState<0 | 1 | 2 | 3>(0);
  const [serverError, setServerError] = useState<string | null>(null);

  // tiny “nova” burst for step clicks (pure UX candy)
  const [stepBurst, setStepBurst] = useState(false);
  const burstTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (burstTimerRef.current) window.clearTimeout(burstTimerRef.current);
    };
  }, []);

  const triggerStepBurst = useCallback(() => {
    setStepBurst(true);
    if (burstTimerRef.current) window.clearTimeout(burstTimerRef.current);
    burstTimerRef.current = window.setTimeout(() => setStepBurst(false), 260);
  }, []);

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

      watermarkEnabled: true,
      eventInfoEnabled: true,
      logoEnabled: false,
      qrSize: 0,
      qrBorderRadius: 0,
    },
  });

  const price = watch("price");
  const isFree = watch("isFree");
  const brandColor = watch("brandColor");
  const layout = watch("layout");
  const feeMode = watch("feeMode");
  const name = watch("name");
  const unlimitedQuantity = watch("unlimitedQuantity");
  const totalQuantity = watch("totalQuantity");
  const minPerOrder = watch("minPerOrder");
  const maxPerOrder = watch("maxPerOrder");
  const availabilityStatus = watch("availabilityStatus");
  const accessMode = watch("accessMode");
  const salesEndAt = watch("salesEndAt");
  const qrSize = watch("qrSize");
  const qrBorderRadius = watch("qrBorderRadius");
  const footerText = watch("footerText");

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
    "addPurchasedTicketsToAttendeesCount",
  );
  const enableEmailAttachments = watch("enableEmailAttachments");
  const watermarkEnabled = watch("watermarkEnabled");
  const eventInfoEnabled = watch("eventInfoEnabled");
  const logoEnabled = watch("logoEnabled");

  const logoUrl = watch("logoUrl");
  const backgroundUrl = watch("backgroundUrl");

  const handlePriceStep = (delta: number) => {
    const current = Number.isFinite(price as number) ? Number(price) : 0;
    let next = current + delta;
    if (next < 0) next = 0;
    next = Math.round(next * 100) / 100;

    setValue("price", next, { shouldDirty: true });
    setValue("isFree", next === 0, { shouldDirty: true });
  };

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

  const stepTitles = [
    "Create Ticket Type",
    "Quantities",
    "Checkout Requirments",
    "Customize the way your ticket looks",
  ] as const;

  const goNext = () =>
    setActiveStep((s) => (s < 3 ? ((s + 1) as 0 | 1 | 2 | 3) : s));
  const goPrev = () =>
    setActiveStep((s) => (s > 0 ? ((s - 1) as 0 | 1 | 2 | 3) : s));

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
        watermarkEnabled: values.watermarkEnabled,
        eventInfoEnabled: values.eventInfoEnabled,
        logoEnabled: values.logoEnabled,
        qrSize: values.qrSize,
        qrBorderRadius: values.qrBorderRadius,
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

  const activeLeftExpr =
    steps.length === 1
      ? "50%"
      : `calc(${activeStep / (steps.length - 1)} * (100% - 50px) + 20px)`;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-5 px-6 pb-5"
      noValidate
    >
      {/* Galaxy stepper header (on-brand, subtle, no “cheap neon circle”) */}
      <div className="-mx-6">
        <div
          className={clsx(
            "tikd-ttw-stepper",
            stepBurst && "tikd-ttw-stepper--burst",
          )}
        >
          <div className="tikd-ttw-stepperInner px-8 py-4">
            {/* active aura (slides smoothly to the active step) */}
            <div className="pointer-events-none absolute inset-0 z-0">
              <div
                style={{ left: activeLeftExpr }}
                className={clsx(
                  "absolute top-[34px] -translate-x-1/2 -translate-y-1/2",
                  "transition-[left,opacity,transform] duration-500",
                  "ease-[cubic-bezier(0.2,0.85,0.2,1)]",
                )}
              >
                <div className="tikd-ttw-aura" />
              </div>
            </div>

            {/* dots + connectors */}
            <div className="relative z-10 flex w-full items-center">
              {steps.map((step, idx) => {
                const Icon = step.icon;
                const isActive = activeStep === idx;
                const isCompleted = activeStep > idx;

                return (
                  <Fragment key={step.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveStep(idx as 0 | 1 | 2 | 3);
                        triggerStepBurst();
                      }}
                      className={clsx(
                        "group relative z-10 flex items-center justify-center outline-none",
                        "h-10 w-10 rounded-full",
                        isActive
                          ? "tikd-ttw-dot tikd-ttw-dot--active"
                          : isCompleted
                            ? "tikd-ttw-dot tikd-ttw-dot--done"
                            : "tikd-ttw-dot",
                      )}
                      aria-current={isActive ? "step" : undefined}
                    >
                      <Icon
                        className={clsx(
                          "relative transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
                          isActive ? "h-4 w-4" : "h-[14px] w-[14px]",
                          isActive
                            ? "text-neutral-0"
                            : isCompleted
                              ? "text-primary-600"
                              : "text-neutral-500",
                        )}
                      />
                    </button>

                    {idx < steps.length - 1 && (
                      <div className="flex-1 px-1.5">
                        <div
                          className={clsx(
                            "h-px w-full",
                            activeStep > idx
                              ? "bg-primary-600/45"
                              : "bg-white/10",
                          )}
                        />
                      </div>
                    )}
                  </Fragment>
                );
              })}
            </div>

            {/* labels row (keeps perfect alignment to centers) */}
            <div className="relative mt-2 h-6">
              {steps.map((step, idx) => {
                const isActive = activeStep === idx;
                const isCompleted = activeStep > idx;

                const leftExpr =
                  steps.length === 1
                    ? "50%"
                    : `calc(${idx / (steps.length - 1)} * (100% - 40px) + 20px)`;

                return (
                  <button
                    key={`${step.id}-label`}
                    type="button"
                    onClick={() => {
                      setActiveStep(idx as 0 | 1 | 2 | 3);
                      triggerStepBurst();
                    }}
                    style={{ left: leftExpr }}
                    className={clsx(
                      "absolute top-0 -translate-x-1/2 text-center font-medium tracking-[0.01em] outline-none",
                      "w-[92px]",
                      isActive
                        ? "text-neutral-0"
                        : isCompleted
                          ? "text-neutral-100"
                          : "text-neutral-300",
                    )}
                  >
                    {step.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modal title + close */}
      <div className="mt-1 flex items-start justify-between gap-3">
        <div>
          <h2 className="mt-1 text-lg font-semibold text-neutral-0">
            {stepTitles[activeStep]}
          </h2>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#181828] text-neutral-400 hover:text-neutral-50"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Step body */}
      <div className="mt-1 space-y-6">
        {activeStep === 0 && (
          <TicketTypeGeneralStep
            register={register}
            price={Number(price || 0)}
            isFree={!!isFree}
            feeMode={feeMode}
            onFeeModeChange={(mode) =>
              setValue("feeMode", mode, { shouldDirty: true })
            }
            onPriceStep={handlePriceStep}
            onNext={goNext}
            isSubmitting={isSubmitting}
          />
        )}
        {activeStep === 1 && (
          <TicketTypeAvailabilityStep
            register={register}
            setValue={setValue}
            unlimitedQuantity={!!unlimitedQuantity}
            totalQuantity={totalQuantity}
            minPerOrder={minPerOrder}
            maxPerOrder={maxPerOrder}
            availabilityStatus={availabilityStatus as TicketAvailabilityStatus}
            accessMode={accessMode as TicketTypeFormValues["accessMode"]}
            salesEndAt={salesEndAt}
            onPrev={goPrev}
            onNext={goNext}
          />
        )}
        {activeStep === 2 && (
          <TicketTypeCheckoutStep
            requireFullName={!!requireFullName}
            requireEmail={!!requireEmail}
            requirePhone={!!requirePhone}
            requireFacebook={!!requireFacebook}
            requireInstagram={!!requireInstagram}
            requireGender={!!requireGender}
            requireDob={!!requireDob}
            requireAge={!!requireAge}
            subjectToApproval={!!subjectToApproval}
            addBuyerDetailsToOrder={!!addBuyerDetailsToOrder}
            addPurchasedTicketsToAttendeesCount={
              !!addPurchasedTicketsToAttendeesCount
            }
            enableEmailAttachments={!!enableEmailAttachments}
            setValue={setValue}
            onPrev={goPrev}
            onNext={goNext}
          />
        )}
        {activeStep === 3 && (
          <TicketTypeDesignStep
            register={register}
            setValue={setValue}
            layout={layout}
            watermarkEnabled={!!watermarkEnabled}
            eventInfoEnabled={!!eventInfoEnabled}
            logoEnabled={!!logoEnabled}
            brandColor={brandColor}
            qrSize={qrSize}
            qrBorderRadius={qrBorderRadius}
            footerText={footerText || ""}
            name={name}
            logoUrl={logoUrl}
            backgroundUrl={backgroundUrl}
            eventTitle={event?.title}
            eventDate={event?.date}
            eventLocation={event?.location}
            eventImageUrl={event?.image}
            serverError={serverError}
            onPrev={goPrev}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </form>
  );
}

/* ========================== Page component ========================= */

export default function TicketTypesPage() {
  const params = useParams<RouteParams>();
  const eventId = params?.eventId;

  const queryClient = useQueryClient();

  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"list" | "create">("list");

  // local order state (this is what the user is reordering)
  const [ordered, setOrdered] = useState<TicketTypeRow[]>([]);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dropEdge, setDropEdge] = useState<"before" | "after">("before");

  const listRootRef = useRef<HTMLDivElement | null>(null);

  const dragActiveIdRef = useRef<string | null>(null);
  const dropEdgeRef = useRef<"before" | "after">("before");
  const dragOverIdRef = useRef<string | null>(null);
  const isPointerDraggingRef = useRef(false);

  // pointer capture reliability
  const dragHandleElRef = useRef<HTMLElement | null>(null);
  const pointerIdRef = useRef<number | null>(null);

  // keep latest lists for drag handlers
  const orderedRef = useRef<TicketTypeRow[]>([]);
  const visibleRef = useRef<TicketTypeRow[]>([]);

  // call persistOrder from handlers (avoid stale closures)
  const persistOrderRef = useRef<
    ((next: TicketTypeRow[], prev: TicketTypeRow[]) => Promise<void>) | null
  >(null);

  // drag listeners attached only during active drag (fixes “first load” issue)
  const dragListenersRef = useRef<{
    attached: boolean;
    onMove?: (ev: PointerEvent) => void;
    onUp?: (ev: PointerEvent) => void;
    onCancel?: (ev: PointerEvent) => void;
    onBlur?: () => void;
    onVis?: () => void;
  }>({ attached: false });

  // Fetch ticket types
  const {
    data: ticketTypes,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["ticket-types", eventId],
    enabled: Boolean(eventId),
    staleTime: 30_000,
    queryFn: async (): Promise<TicketTypeRow[]> => {
      const res = await fetch(`/api/events/${eventId}/ticket-types`);
      if (!res.ok) {
        throw new Error("Failed to load ticket types");
      }
      const json = (await res.json()) as TicketTypeApi[];
      return json.map(mapApiToRow);
    },
  });

  // Keep ordered list in sync with server data (but don't fight the user mid-drag)
  useEffect(() => {
    if (!ticketTypes) return;
    if (isPointerDraggingRef.current) return;
    setOrdered(ticketTypes);
  }, [ticketTypes]);

  // Fetch event so design preview can use real event data
  const { data: event } = useQuery<EventWithMeta>({
    queryKey: ["event", eventId],
    queryFn: () => fetchEventById(eventId!),
    enabled: !!eventId,
    staleTime: 30_000,
  });

  const visible = useMemo(() => {
    const list = ordered ?? [];
    if (!query.trim()) return list;
    return list.filter((t) =>
      t.name.toLowerCase().includes(query.toLowerCase()),
    );
  }, [ordered, query]);

  orderedRef.current = ordered;
  visibleRef.current = visible;

  async function persistOrder(next: TicketTypeRow[], prev: TicketTypeRow[]) {
    if (!eventId) return;

    setIsSavingOrder(true);

    // Optimistically update react-query cache too
    queryClient.setQueryData(["ticket-types", eventId], next);

    try {
      const res = await fetch(`/api/events/${eventId}/ticket-types`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: next.map((x) => x.id) }),
      });

      if (!res.ok) {
        // rollback
        setOrdered(prev);
        queryClient.setQueryData(["ticket-types", eventId], prev);
      }
    } finally {
      setIsSavingOrder(false);
    }
  }

  persistOrderRef.current = persistOrder;

  const detachDragListeners = useCallback(() => {
    const d = dragListenersRef.current;
    if (!d.attached) return;

    if (d.onMove) window.removeEventListener("pointermove", d.onMove);
    if (d.onUp) window.removeEventListener("pointerup", d.onUp);
    if (d.onCancel) window.removeEventListener("pointercancel", d.onCancel);
    if (d.onBlur) window.removeEventListener("blur", d.onBlur);
    if (d.onVis) document.removeEventListener("visibilitychange", d.onVis);

    dragListenersRef.current = { attached: false };
  }, []);

  const stopPointerDrag = useCallback(() => {
    isPointerDraggingRef.current = false;

    // release pointer capture (best-effort)
    try {
      if (dragHandleElRef.current && pointerIdRef.current != null) {
        dragHandleElRef.current.releasePointerCapture(pointerIdRef.current);
      }
    } catch {
      // ignore
    }

    dragHandleElRef.current = null;
    pointerIdRef.current = null;

    dragActiveIdRef.current = null;
    dragOverIdRef.current = null;
    dropEdgeRef.current = "before";

    setDraggingId(null);
    setDragOverId(null);
    setDropEdge("before");

    document.body.style.userSelect = "";

    document.body.style.webkitUserSelect = "";
    document.body.style.cursor = "";

    detachDragListeners();
  }, [detachDragListeners]);

  // extra safety: cleanup on unmount
  useEffect(() => {
    return () => {
      stopPointerDrag();
    };
  }, [stopPointerDrag]);

  const pickNearestRow = useCallback((clientY: number, activeId: string) => {
    const root = listRootRef.current;
    if (!root) return null;

    const nodes = Array.from(
      root.querySelectorAll<HTMLElement>("[data-ticket-row-id]"),
    ).filter((n) => {
      const id = n.dataset.ticketRowId;
      return Boolean(id) && id !== activeId;
    });

    if (nodes.length === 0) return null;

    let best: {
      node: HTMLElement;
      dist: number;
      edge: "before" | "after";
    } | null = null;

    for (const node of nodes) {
      const rect = node.getBoundingClientRect();

      const clampedY = Math.max(rect.top, Math.min(clientY, rect.bottom));
      const dist = Math.abs(clientY - clampedY);

      let edge: "before" | "after" = "before";
      if (clientY < rect.top) edge = "before";
      else if (clientY > rect.bottom) edge = "after";
      else edge = clientY > rect.top + rect.height / 2 ? "after" : "before";

      if (!best || dist < best.dist) {
        best = { node, dist, edge };
      }
    }

    if (!best) return null;

    const overId = best.node.dataset.ticketRowId;
    if (!overId) return null;

    return { overId, edge: best.edge };
  }, []);

  const attachDragListeners = useCallback(() => {
    const d = dragListenersRef.current;
    if (d.attached) return;

    const onMove = (ev: PointerEvent) => {
      if (!isPointerDraggingRef.current) return;
      ev.preventDefault();

      const activeId = dragActiveIdRef.current;
      if (!activeId) return;

      let overId: string | null = null;
      let edge: "before" | "after" = "before";

      const el = document.elementFromPoint(
        ev.clientX,
        ev.clientY,
      ) as HTMLElement | null;

      const row = el?.closest?.("[data-ticket-row-id]") as HTMLElement | null;

      if (row) {
        const rid = row.dataset.ticketRowId || null;
        if (rid && rid !== activeId) {
          const rect = row.getBoundingClientRect();
          const isAfter = ev.clientY > rect.top + rect.height / 2;
          overId = rid;
          edge = isAfter ? "after" : "before";
        }
      }

      if (!overId) {
        const picked = pickNearestRow(ev.clientY, activeId);
        if (picked) {
          overId = picked.overId;
          edge = picked.edge;
        }
      }

      if (!overId || overId === activeId) {
        if (dragOverIdRef.current !== null) {
          dragOverIdRef.current = null;
          setDragOverId(null);
        }
        return;
      }

      const changedId = dragOverIdRef.current !== overId;
      const changedEdge = dropEdgeRef.current !== edge;

      dragOverIdRef.current = overId;
      dropEdgeRef.current = edge;

      if (changedId) setDragOverId(overId);
      if (changedEdge) setDropEdge(edge);
    };

    const onEnd = (ev: PointerEvent) => {
      if (!isPointerDraggingRef.current) return;
      ev.preventDefault();

      const activeId = dragActiveIdRef.current;
      const overId = dragOverIdRef.current;
      const edge = dropEdgeRef.current;

      // cleanup FIRST
      stopPointerDrag();

      if (!activeId || !overId || activeId === overId) return;

      const prev = orderedRef.current;

      const next = reorderFullByVisibleDrag({
        full: prev,
        visible: visibleRef.current,
        activeId,
        overId,
        edge,
      });

      if (next === prev) return;

      setOrdered(next);
      void persistOrderRef.current?.(next, prev);
    };

    const onBlur = () => stopPointerDrag();
    const onVis = () => {
      if (document.hidden) stopPointerDrag();
    };

    // Attach now (during drag), not on mount
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onEnd, { passive: false });
    window.addEventListener("pointercancel", onEnd, { passive: false });
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVis);

    dragListenersRef.current = {
      attached: true,
      onMove,
      onUp: onEnd,
      onCancel: onEnd,
      onBlur,
      onVis,
    };
  }, [pickNearestRow, stopPointerDrag]);

  function startPointerDrag(
    e: React.PointerEvent<HTMLButtonElement>,
    id: string,
  ) {
    if (e.pointerType === "mouse" && e.button !== 0) return;

    e.preventDefault();
    e.stopPropagation();

    // reset any stuck state
    stopPointerDrag();

    isPointerDraggingRef.current = true;
    dragActiveIdRef.current = id;

    dragOverIdRef.current = null;
    dropEdgeRef.current = "before";

    setDraggingId(id);
    setDragOverId(null);
    setDropEdge("before");

    // pointer capture for reliability
    dragHandleElRef.current = e.currentTarget;
    pointerIdRef.current = e.pointerId;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    // Attach listeners RIGHT NOW (this is the fix)
    attachDragListeners();

    // no text selection while dragging
    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";
    document.body.style.cursor = "grabbing";
  }

  if (!eventId) {
    return (
      <div className=" text-error-400">Missing event id in route params.</div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-neutral-0">Ticket types</h2>
          <p className="mt-1  text-neutral-500">
            Configure pricing, capacity and status for each ticket.
          </p>
        </div>

        <Button
          type="button"
          aria-label="Create ticket type"
          onClick={() => setMode("create")}
          animation={true}
        >
          <Plus className="h-4 w-4" />
          New ticket type
        </Button>
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
            className="w-full rounded-full border border-white/10 bg-neutral-950 px-9 py-2  text-neutral-0 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div className="flex items-center gap-3">
          {isSavingOrder ? (
            <span className="text-[12px] text-neutral-400">Saving order…</span>
          ) : null}

          <p className=" text-neutral-400">
            {visible?.length ?? 0} ticket type
            {visible && visible.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="rounded-card border border-white/8 bg-neutral-948/90 px-6 py-8 text-center  text-neutral-300">
          Loading ticket types…
        </div>
      )}

      {isError && !isLoading && (
        <div className="rounded-card border border-error-600/40 bg-error-950/60 px-6 py-8 text-center  text-error-200">
          Failed to load ticket types. Please refresh the page.
        </div>
      )}

      {!isLoading && !isError && (visible?.length ?? 0) === 0 ? (
        <div className="rounded-card border border-dashed border-white/10 bg-neutral-950/80 px-6 py-10 text-center text-neutral-300">
          No ticket types yet. Start by creating a ticket above.
        </div>
      ) : null}

      {!isLoading && !isError && visible && visible.length > 0 && (
        <div ref={listRootRef} className="space-y-3">
          {visible.map((t, idx) => {
            const rawStatus = (t?.status as unknown as string) ?? "";
            const safeStatus = rawStatus || "unknown";
            const isDragging = draggingId === t.id;
            const isOver =
              !!draggingId && draggingId !== t.id && dragOverId === t.id;

            const rowKey = `${t?.id ?? "no-id"}-${idx}`;

            return (
              <div
                key={rowKey}
                data-ticket-row-id={t.id}
                className={clsx(
                  "relative rounded-lg select-none",
                  isOver && "z-[2]",
                )}
              >
                {isOver ? (
                  <div
                    className="pointer-events-none absolute left-3 right-3 z-[3]"
                    style={
                      dropEdge === "before" ? { top: -10 } : { bottom: -10 }
                    }
                  >
                    <div
                      className="relative h-[3px] rounded-full"
                      style={{
                        background:
                          "linear-gradient(90deg, rgba(154,70,255,0), rgba(154,70,255,0.95), rgba(154,70,255,0))",
                        boxShadow: "0 0 22px rgba(154,70,255,0.45)",
                      }}
                    >
                      <div
                        className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-500"
                        style={{ boxShadow: "0 0 16px rgba(154,70,255,0.8)" }}
                      />
                    </div>
                  </div>
                ) : null}

                <RowCard
                  className={clsx(
                    isOver && "ring-2 ring-primary-500/25 bg-primary-950/10",
                    isDragging && "opacity-50",
                  )}
                  leading={
                    <button
                      type="button"
                      aria-label="Reorder ticket type"
                      onPointerDown={(e) => startPointerDrag(e, t.id)}
                      className={clsx(
                        "inline-flex h-10 w-7 items-center justify-center rounded-md touch-none",
                        "text-neutral-500 hover:text-neutral-200",
                        "border border-transparent hover:border-white/10",
                        "bg-transparent hover:bg-neutral-900/30",
                        isDragging ? "cursor-grabbing" : "cursor-grab",
                      )}
                      title="Drag to reorder"
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>
                  }
                  icon={<Ticket className="h-5 w-5" />}
                  title={t.name}
                  description={t.description}
                  meta={
                    <>
                      <RowCardStat
                        label="Price"
                        value={
                          t.price === 0
                            ? "Free"
                            : `$${t.price.toFixed(2)} ${t.currency}`
                        }
                      />

                      <RowCardStat
                        label="Sold"
                        value={`${t.sold}${t.capacity != null ? `/${t.capacity}` : ""}`}
                      />

                      <div className="min-w-[110px] text-right">
                        <div className="text-[11px] text-neutral-500">
                          Status
                        </div>
                        <span
                          className={clsx(
                            "mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
                            safeStatus === "on_sale"
                              ? "border border-success-700/40 bg-success-900/40 text-success-300"
                              : safeStatus === "sale_ended"
                                ? "border border-white/10 bg-neutral-900 text-neutral-200"
                                : safeStatus === "scheduled"
                                  ? "border border-warning-700/40 bg-warning-900/40 text-warning-200"
                                  : "border border-white/10 bg-neutral-900 text-neutral-200",
                          )}
                        >
                          {humanizeStatus(safeStatus)}
                        </span>
                      </div>
                    </>
                  }
                  actions={
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-neutral-950 text-neutral-300 transition-colors hover:border-primary-500 hover:text-primary-200"
                    >
                      <EllipsisVertical className="h-4 w-4" />
                    </button>
                  }
                />
              </div>
            );
          })}
        </div>
      )}

      {mode === "create" && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
          <div className="flex min-h-full items-start justify-center px-3 py-10">
            <div className="tikd-ttw-modalShell w-full max-w-[664px] overflow-hidden rounded-3xl border border-white/10 bg-neutral-950">
              <TicketTypeWizard
                eventId={eventId}
                event={event}
                onCancel={() => setMode("list")}
                onCreated={async () => {
                  await refetch();
                  setMode("list");
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
