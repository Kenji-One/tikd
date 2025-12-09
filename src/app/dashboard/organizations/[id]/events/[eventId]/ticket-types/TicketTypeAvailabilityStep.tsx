// src/app/dashboard/organizations/[id]/events/[eventId]/ticket-types/TicketTypeAvailabilityStep.tsx
"use client";

import type { TicketTypeFormValues, TicketAvailabilityStatus } from "./types";
import type { UseFormRegister, UseFormSetValue } from "react-hook-form";
import type { ReactNode } from "react";

import clsx from "clsx";
import { Lock } from "lucide-react";

type Props = {
  register: UseFormRegister<TicketTypeFormValues>;
  setValue: UseFormSetValue<TicketTypeFormValues>;
  // values coming from parent (watch)
  unlimitedQuantity: boolean;
  totalQuantity: number | null;
  minPerOrder: number | null;
  maxPerOrder: number | null;
  availabilityStatus: TicketAvailabilityStatus;
  accessMode: TicketTypeFormValues["accessMode"];
  onPrev: () => void;
  onNext: () => void;
};

const STATUS_OPTIONS: {
  value: TicketAvailabilityStatus;
  label: string;
  description: string;
}[] = [
  {
    value: "on_sale",
    label: "On sale",
    description: "Visible on the event page and purchasable at checkout.",
  },
  {
    value: "scheduled",
    label: "Scheduled",
    description: "Not on sale yet – useful when setting things up in advance.",
  },
  {
    value: "paused",
    label: "Paused",
    description: "Hidden from checkout, but kept for later use.",
  },
  {
    value: "sale_ended",
    label: "Sale ended",
    description: "No longer available to purchase.",
  },
];

/* ------------------------------------------------------------------ */
/*  Shared UI bits for quantity pills                                 */
/* ------------------------------------------------------------------ */

const quantityShellClasses =
  "flex min-h-[32px] items-center justify-center rounded-lg bg-neutral-900 px-4 py-2";

const quantitySideButtonBase =
  "flex h-6 w-6 items-center justify-center rounded-full border text-[14px] font-semibold leading-none transition-colors";

type QuantityPillProps = {
  label: string;
  valueNode: ReactNode;
  isMinusInactive: boolean;
  onMinus: () => void;
  minusAriaLabel: string;
  onPlus: () => void;
  plusAriaLabel: string;
};

function QuantityPill({
  label,
  valueNode,
  isMinusInactive,
  onMinus,
  minusAriaLabel,
  onPlus,
  plusAriaLabel,
}: QuantityPillProps) {
  return (
    <div className="space-y-2">
      <p className="font-medium capitalize text-neutral-0 text-center">
        {label}
      </p>

      <div className={quantityShellClasses}>
        <div className="flex items-center gap-2 justify-between w-full">
          {/* MINUS */}
          <button
            type="button"
            onClick={onMinus}
            aria-label={minusAriaLabel}
            className={clsx(
              quantitySideButtonBase,
              isMinusInactive
                ? "border-none text-neutral-600 cursor-default"
                : "border-none text-neutral-200 hover:text-neutral-950 hover:bg-primary-500 cursor-pointer"
            )}
          >
            –
          </button>

          {/* Center value */}
          <div className="text-center">{valueNode}</div>

          {/* PLUS */}
          <button
            type="button"
            onClick={onPlus}
            aria-label={plusAriaLabel}
            className={clsx(
              quantitySideButtonBase,
              "border-primary-500 bg-primary-500 text-neutral-950 shadow-[0_0_0_1px_rgba(154,70,255,0.7)] hover:bg-primary-400 cursor-pointer"
            )}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export default function TicketTypeAvailabilityStep({
  register,
  setValue,
  unlimitedQuantity,
  totalQuantity,
  minPerOrder,
  maxPerOrder,
  availabilityStatus,
  accessMode,
  onPrev,
  onNext,
}: Props) {
  const currentStatus = STATUS_OPTIONS.find(
    (s) => s.value === availabilityStatus
  );

  const isPasswordProtected = accessMode === "password";

  const hasNoMinimum = minPerOrder == null;
  const isMaxUnlimited = maxPerOrder == null;

  /* ---------- keep numeric fields registered (hidden) ---------- */

  // These stay in sync via setValue; we don't show real inputs in the pills.
  const hiddenNumericInputs = (
    <>
      <input
        type="hidden"
        {...register("totalQuantity", { valueAsNumber: true })}
      />
      <input
        type="hidden"
        {...register("minPerOrder", { valueAsNumber: true })}
      />
      <input
        type="hidden"
        {...register("maxPerOrder", { valueAsNumber: true })}
      />
    </>
  );

  /* ---------- value nodes for pills ---------- */

  const totalValueNode = unlimitedQuantity ? (
    <span className="inline-block text-center text-[14px] font-semibold text-success-400">
      Unlimited
    </span>
  ) : (
    <span className="inline-block text-center text-[14px] font-semibold text-neutral-0">
      {totalQuantity ?? 0}
    </span>
  );

  const minValueNode = hasNoMinimum ? (
    <span className="inline-block text-center text-[14px] font-semibold text-success-400">
      Unlimited
    </span>
  ) : (
    <span className="inline-block text-center text-[14px] font-semibold text-neutral-0">
      {minPerOrder ?? 0}
    </span>
  );

  const maxValueNode = isMaxUnlimited ? (
    <span className="inline-block text-center text-[14px] font-semibold text-success-400">
      Unlimited
    </span>
  ) : (
    <span className="inline-block text-center text-[14px] font-semibold text-neutral-0">
      {maxPerOrder ?? 0}
    </span>
  );

  return (
    <div className="space-y-6">
      {hiddenNumericInputs}

      {/* Intro text */}
      <p className="leading-snug text-neutral-300">
        Set a total number of tickets for this ticket type.
      </p>
      <div className="space-y-2">
        {/* Quantities row – fits modal: 1 col → 2 cols (md) → 3 cols (xl) */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {/* Total tickets */}
          <QuantityPill
            label="Total Number of Tickets"
            valueNode={totalValueNode}
            isMinusInactive={unlimitedQuantity}
            minusAriaLabel="Decrease total tickets"
            onMinus={() => {
              if (unlimitedQuantity) return;

              const current = totalQuantity ?? 1;
              if (current <= 1) {
                // Go back to Unlimited
                setValue("unlimitedQuantity", true, { shouldDirty: true });
                setValue("totalQuantity", null as any, { shouldDirty: true });
              } else {
                setValue("totalQuantity", (current - 1) as any, {
                  shouldDirty: true,
                });
              }
            }}
            plusAriaLabel="Increase total tickets"
            onPlus={() => {
              if (unlimitedQuantity) {
                // From Unlimited -> start at 1
                setValue("unlimitedQuantity", false, { shouldDirty: true });
                setValue("totalQuantity", 1 as any, { shouldDirty: true });
              } else {
                const current = totalQuantity ?? 0;
                setValue("totalQuantity", (current + 1) as any, {
                  shouldDirty: true,
                });
              }
            }}
          />

          {/* Min per order */}
          <QuantityPill
            label="Min Tickets Per Order"
            valueNode={minValueNode}
            isMinusInactive={hasNoMinimum}
            minusAriaLabel="Decrease minimum tickets per order"
            onMinus={() => {
              if (hasNoMinimum) return;

              const current = minPerOrder ?? 1;
              if (current <= 1) {
                // Back to Unlimited / no minimum
                setValue("minPerOrder", null, { shouldDirty: true });
              } else {
                setValue("minPerOrder", (current - 1) as any, {
                  shouldDirty: true,
                });
              }
            }}
            plusAriaLabel="Increase minimum tickets per order"
            onPlus={() => {
              if (hasNoMinimum) {
                // From Unlimited -> start at 1
                setValue("minPerOrder", 1 as any, { shouldDirty: true });
              } else {
                const current = minPerOrder ?? 0;
                setValue("minPerOrder", (current + 1) as any, {
                  shouldDirty: true,
                });
              }
            }}
          />

          {/* Max per order */}
          <QuantityPill
            label="Max Tickets Per Order"
            valueNode={maxValueNode}
            isMinusInactive={isMaxUnlimited}
            minusAriaLabel="Decrease maximum tickets per order"
            onMinus={() => {
              if (isMaxUnlimited) return;

              const current = maxPerOrder ?? 1;
              if (current <= 1) {
                // Back to Unlimited / no max
                setValue("maxPerOrder", null, { shouldDirty: true });
              } else {
                setValue("maxPerOrder", (current - 1) as any, {
                  shouldDirty: true,
                });
              }
            }}
            plusAriaLabel="Increase maximum tickets per order"
            onPlus={() => {
              if (isMaxUnlimited) {
                // From Unlimited -> start at 10 (default cap)
                setValue("maxPerOrder", 10 as any, { shouldDirty: true });
              } else {
                const current = maxPerOrder ?? 0;
                setValue("maxPerOrder", (current + 1) as any, {
                  shouldDirty: true,
                });
              }
            }}
          />
        </div>

        <p className="text-neutral-500">
          Use the + / – controls to switch between{" "}
          <span className="font-medium text-neutral-100">Unlimited</span> and a
          specific number for each field.
        </p>
      </div>

      {/* Passwords / Access section */}
      <div className="space-y-4">
        <h3 className="text-[15px] font-semibold text-neutral-0">Passwords</h3>
        <p className="max-w-2xl text-[13px] leading-relaxed text-neutral-300">
          If you would like to protect this ticket type with a password, Check
          the mark and create a password. There will be a place on your event
          page for your customers to enter the password. Share the password link
          directly to send your event page with the ticket type already
          unlocked.
        </p>

        {/* keep field registered for RHF */}
        <input type="hidden" {...register("accessMode")} />

        <div className="space-y-3">
          {/* Main “Protect with password” pill */}
          <button
            type="button"
            onClick={() => {
              if (isPasswordProtected) {
                setValue("accessMode", "public", { shouldDirty: true });
                setValue("password", "", { shouldDirty: true });
              } else {
                setValue("accessMode", "password", { shouldDirty: true });
              }
            }}
            className={clsx(
              "flex w-full items-center justify-between rounded-full border px-5 py-3 transition-colors sm:max-w-md cursor-pointer",
              isPasswordProtected
                ? "border-primary-500 bg-primary-950/60 text-neutral-0 shadow-[0_0_0_1px_rgba(154,70,255,0.6)]"
                : "border-neutral-700 bg-neutral-900 text-neutral-100 hover:border-primary-500/70"
            )}
          >
            <span className="inline-flex items-center gap-3">
              <span
                className={clsx(
                  "flex h-8 w-8 items-center justify-center rounded-full border text-[13px]",
                  isPasswordProtected
                    ? "border-primary-500 bg-primary-500/15 text-primary-300"
                    : "border-neutral-600 bg-neutral-950 text-neutral-300"
                )}
              >
                <Lock className="h-4 w-4" />
              </span>
              <span className="font-medium">
                {isPasswordProtected
                  ? "Password enabled"
                  : "Protect with password"}
              </span>
            </span>

            <span
              className={clsx(
                "flex h-7 w-16 items-center justify-center rounded-full text-[11px] font-semibold",
                isPasswordProtected
                  ? "bg-primary-500 text-neutral-950"
                  : "bg-neutral-800 text-neutral-300"
              )}
            >
              {isPasswordProtected ? "On" : "Off"}
            </span>
          </button>

          {/* Password editor appears only when enabled */}
          {isPasswordProtected && (
            <div className="space-y-2 sm:max-w-md">
              <label className="block font-medium text-neutral-200">
                Password
              </label>
              <input
                {...register("password")}
                type="text"
                placeholder="Enter password"
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-6 py-2 text-[14px] text-neutral-0 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/70"
              />
              <p className="text-xs leading-snug text-neutral-500">
                Share this password only with people who should see this ticket.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Status & schedule */}
      <div className="space-y-3">
        <div className="space-y-1">
          <h3 className="font-medium text-neutral-0">Status &amp; schedule</h3>
          <p className="leading-snug text-neutral-400">
            Choose how this ticket is currently displayed on your event page.
          </p>
          {currentStatus && (
            <p className="text-[12px] text-neutral-500">
              Current status:{" "}
              <span className="font-medium text-neutral-0">
                {currentStatus.label}
              </span>
            </p>
          )}
        </div>

        {/* Keep the field registered for React Hook Form */}
        <input type="hidden" {...register("availabilityStatus")} />

        <div className="grid gap-3 sm:grid-cols-4">
          {STATUS_OPTIONS.map((option) => {
            const isActive = option.value === availabilityStatus;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  setValue("availabilityStatus", option.value, {
                    shouldDirty: true,
                  })
                }
                className={clsx(
                  "flex h-full flex-col items-start rounded-lg border p-3 text-left transition-colors",
                  isActive
                    ? "border-primary-500 bg-primary-950"
                    : "border-neutral-800 bg-neutral-900 hover:border-primary-500/70"
                )}
              >
                <span className="font-medium text-neutral-0">
                  {option.label}
                </span>
                <span className="mt-1 text-xs] leading-snug text-neutral-500">
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>

        <div className="pt-2 sm:max-w-xs">
          <div className="space-y-1">
            <label className="block text-[11px] text-neutral-200">
              Stop selling at (optional)
            </label>
            <input
              {...register("salesEndAt")}
              type="datetime-local"
              className="w-full rounded-full border border-neutral-800 bg-neutral-900 px-4 py-3 text-[13px] text-neutral-0 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/70"
            />
            <p className="mt-1 text-[11px] text-neutral-500">
              Leave empty if the ticket should stay on this status until you
              change it manually.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-end gap-4">
        <button
          type="button"
          onClick={onPrev}
          className="cursor-pointer rounded-full bg-neutral-50 px-7 py-2.5 text-[13px] font-medium text-neutral-950 hover:bg-white"
        >
          Go back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="cursor-pointer rounded-full border border-[#FFFFFF1A] bg-primary-500 px-7 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-primary-400"
        >
          Next
        </button>
      </div>
    </div>
  );
}
