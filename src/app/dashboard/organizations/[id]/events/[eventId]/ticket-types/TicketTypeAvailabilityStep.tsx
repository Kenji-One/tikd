// src/app/dashboard/organizations/[id]/events/[eventId]/ticket-types/TicketTypeAvailabilityStep.tsx
"use client";

import type { TicketTypeFormValues, TicketAvailabilityStatus } from "./types";
import type { UseFormRegister, UseFormSetValue } from "react-hook-form";
import { useState, useRef, type ReactNode } from "react";

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
  salesEndAt: string | null;
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
      <p className="text-center font-medium capitalize text-neutral-0">
        {label}
      </p>

      <div className={quantityShellClasses}>
        <div className="flex w-full items-center justify-between gap-2">
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
/*  Status dropdown (Current Status pill)                             */
/* ------------------------------------------------------------------ */

type StatusDropdownProps = {
  value: TicketAvailabilityStatus;
  onChange: (value: TicketAvailabilityStatus) => void;
};

function StatusDropdown({ value, onChange }: StatusDropdownProps) {
  const [open, setOpen] = useState(false);
  const active =
    STATUS_OPTIONS.find((opt) => opt.value === value) ?? STATUS_OPTIONS[0];

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex min-w-[122px] items-center justify-between rounded-lg border border-primary-400/70 bg-neutral-900 px-4 py-2 font-medium text-neutral-0 hover:border-primary-300"
      >
        <span>{active.label}</span>
        <span className="text-[11px] text-neutral-400">▾</span>
      </button>

      {open && (
        <div className="absolute left-1/2 z-30 mt-2 w-32 -translate-x-1/2 rounded-xl border border-neutral-800 bg-neutral-950/95 overflow-hidden backdrop-blur-sm">
          <div className="max-h-64 overflow-y-auto overflow-x-hidden">
            {STATUS_OPTIONS.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={clsx(
                    "flex w-full items-center px-4 py-2 text-left transition-colors",
                    isSelected
                      ? "bg-neutral-800 text-neutral-0 font-semibold"
                      : "text-neutral-200 hover:bg-neutral-800/80"
                  )}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helper for schedule heading                                       */
/* ------------------------------------------------------------------ */

function formatScheduleHeading(raw: string | null | undefined): string {
  if (!raw) return "Scheduled change";

  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return "Scheduled change";

  const now = new Date();

  const isSameDay = dt.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = dt.toDateString() === tomorrow.toDateString();

  const time = dt.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (isSameDay) return `Later today at ${time}`;
  if (isTomorrow) return `Tomorrow at ${time}`;

  const date = dt.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${date} at ${time}`;
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

type PickerCapableInput = HTMLInputElement & {
  showPicker?: () => void;
};

export default function TicketTypeAvailabilityStep({
  register,
  setValue,
  unlimitedQuantity,
  totalQuantity,
  minPerOrder,
  maxPerOrder,
  availabilityStatus,
  accessMode,
  salesEndAt,
  onPrev,
  onNext,
}: Props) {
  const isPasswordProtected = accessMode === "password";

  const hasNoMinimum = minPerOrder == null;
  const isMaxUnlimited = maxPerOrder == null;

  const currentStatusMeta =
    STATUS_OPTIONS.find((s) => s.value === availabilityStatus) ??
    STATUS_OPTIONS[0];

  const hasSchedule = !!salesEndAt;

  // hidden datetime-local input (for RHF) + ref so "Edit date" can open it
  const scheduleInputRef = useRef<HTMLInputElement | null>(null);

  const { ref: salesEndAtRef, ...salesEndAtField } = register("salesEndAt");

  /* ---------- keep numeric fields registered (hidden) ---------- */

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

      {/* Quantities */}
      <div className="space-y-2">
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
                setValue("unlimitedQuantity", true, { shouldDirty: true });
                setValue("totalQuantity", null, { shouldDirty: true });
              } else {
                setValue("totalQuantity", current - 1, {
                  shouldDirty: true,
                });
              }
            }}
            plusAriaLabel="Increase total tickets"
            onPlus={() => {
              if (unlimitedQuantity) {
                setValue("unlimitedQuantity", false, { shouldDirty: true });
                setValue("totalQuantity", 1, { shouldDirty: true });
              } else {
                const current = totalQuantity ?? 0;
                setValue("totalQuantity", current + 1, {
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
                setValue("minPerOrder", null, { shouldDirty: true });
              } else {
                setValue("minPerOrder", current - 1, {
                  shouldDirty: true,
                });
              }
            }}
            plusAriaLabel="Increase minimum tickets per order"
            onPlus={() => {
              if (hasNoMinimum) {
                setValue("minPerOrder", 1, { shouldDirty: true });
              } else {
                const current = minPerOrder ?? 0;
                setValue("minPerOrder", current + 1, {
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
                setValue("maxPerOrder", null, { shouldDirty: true });
              } else {
                setValue("maxPerOrder", current - 1, {
                  shouldDirty: true,
                });
              }
            }}
            plusAriaLabel="Increase maximum tickets per order"
            onPlus={() => {
              if (isMaxUnlimited) {
                setValue("maxPerOrder", 10, { shouldDirty: true });
              } else {
                const current = maxPerOrder ?? 0;
                setValue("maxPerOrder", current + 1, {
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
          If you would like to protect this ticket type with a password, check
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
              "flex w-full items-center justify-between rounded-full border px-5 py-3 text-[14px] transition-colors sm:max-w-md cursor-pointer",
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

      {/* Availability timeline (Status & schedule) */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-neutral-0">
            Availability Timeline
          </h3>
          <p className="leading-snug text-neutral-500">
            Change the availability status of your ticket as it is displayed on
            the event page. You can also add a time when you’d like the ticket
            availability to change.
          </p>
          <p className="mt-3 text-neutral-300">
            Current status:{" "}
            <span className="font-medium text-neutral-0">
              {currentStatusMeta.label}
            </span>
          </p>
        </div>

        {/* Hidden datetime-local registered for salesEndAt */}
        <input
          type="datetime-local"
          className="sr-only"
          {...salesEndAtField}
          ref={(el) => {
            salesEndAtRef(el);
            scheduleInputRef.current = el;
          }}
        />

        <div className="relative mx-auto flex max-w-[227px] flex-col items-stretch gap-6 mt-8">
          {/* vertical line */}
          <div className="pointer-events-none absolute left-1/2 top-[92px] bottom-[92px] -z-10 -translate-x-1/2">
            <div className="mx-auto h-full w-[2px] bg-gradient-to-b from-primary-500/60 via-primary-500/20 to-primary-500/0" />
          </div>

          {/* Current status card */}
          <div className="rounded-xl border border-primary-500/70 bg-neutral-950/70 px-6 py-5 shadow-[0_0_0_1px_rgba(88,28,135,0.4)]">
            <p className="text-center text-[14px] font-semibold text-neutral-0">
              Current Status
            </p>
            <div className="mt-4 flex justify-center">
              <StatusDropdown
                value={availabilityStatus}
                onChange={(next) =>
                  setValue("availabilityStatus", next, { shouldDirty: true })
                }
              />
            </div>
          </div>

          {/* Plus button */}
          <div className="flex justify-center">
            <button
              type="button"
              disabled={hasSchedule}
              onClick={() => {
                if (hasSchedule) return;
                const base = new Date();
                base.setHours(base.getHours() + 1);
                const local = new Date(
                  base.getTime() - base.getTimezoneOffset() * 60000
                )
                  .toISOString()
                  .slice(0, 16);

                setValue("salesEndAt", local, { shouldDirty: true });
              }}
              className={clsx(
                "flex h-9 w-9 items-center justify-center rounded-full bg-primary-500 text-[20px] font-semibold text-white shadow-[0_0_0_4px_rgba(88,28,135,0.5)] transition-transform",
                hasSchedule && "cursor-not-allowed opacity-35 shadow-none"
              )}
            >
              +
            </button>
          </div>

          {/* Scheduled change card (single, mapped to salesEndAt) */}
          {hasSchedule && (
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 px-6 py-5 shadow-[0_0_0_1px_rgba(0,0,0,0.6)]">
              <p className="text-center text-[14px] font-semibold text-neutral-0">
                {formatScheduleHeading(salesEndAt)}
              </p>
              <p className="mt-1 text-center text-[12px] text-neutral-400">
                status will change to:
              </p>

              <div className="mt-4 flex justify-center">
                <div className="flex min-w-[122px] items-center justify-between rounded-lg border border-primary-400/70 bg-neutral-900 px-4 py-2 font-medium text-neutral-0 hover:border-primary-300">
                  Sale ended
                </div>
              </div>

              <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={() => {
                    const input = scheduleInputRef.current;
                    if (!input) return;

                    const pickerInput: PickerCapableInput = input;
                    if (typeof pickerInput.showPicker === "function") {
                      pickerInput.showPicker();
                    } else {
                      input.focus();
                      input.click();
                    }
                  }}
                  className="flex items-center gap-2 rounded-full border border-primary-500/70 bg-neutral-900 px-4 py-2 text-[13px] font-medium text-neutral-0 hover:bg-neutral-800"
                >
                  Edit date
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setValue("salesEndAt", null, { shouldDirty: true })
                  }
                  className="flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900 px-4 py-2 text-[13px] text-neutral-200 hover:border-red-500 hover:text-red-300"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
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
