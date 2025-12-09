// src/app/dashboard/organizations/[id]/events/[eventId]/ticket-types/TicketTypeAvailabilityStep.tsx
"use client";

import type { TicketTypeFormValues, TicketAvailabilityStatus } from "./types";
import type { UseFormRegister, UseFormSetValue } from "react-hook-form";

import clsx from "clsx";
import { Ticket, Globe2 } from "lucide-react";

type Props = {
  register: UseFormRegister<TicketTypeFormValues>;
  setValue: UseFormSetValue<TicketTypeFormValues>;
  unlimitedQuantity: boolean;
  minPerOrder: number | null;
  maxPerOrder: number | null;
  availabilityStatus: TicketAvailabilityStatus;
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

export default function TicketTypeAvailabilityStep({
  register,
  setValue,
  unlimitedQuantity,
  minPerOrder,
  maxPerOrder,
  availabilityStatus,
  onPrev,
  onNext,
}: Props) {
  // Pills – tall, soft radius, dark surface like Figma.
  const quantityShellClasses =
    "flex items-center justify-between gap-4 rounded-[22px] border border-neutral-800 bg-neutral-900/90 px-5 py-4 shadow-[0_0_0_1px_rgba(0,0,0,0.35)]";

  // The “checkbox” ∞ chips on the right.
  const unlimitedToggleBase =
    "flex h-8 w-8 items-center justify-center rounded-[12px] border text-[15px] font-semibold leading-none transition-colors";

  const currentStatus = STATUS_OPTIONS.find(
    (s) => s.value === availabilityStatus
  );

  return (
    <div className="space-y-8">
      {/* Intro text */}
      <p className="text-[13px] leading-snug text-neutral-300">
        Control how many tickets can be sold, who can access them, and how this
        ticket is displayed on your event page.
      </p>

      {/* Quantities row */}
      <div className="grid gap-5 sm:grid-cols-3">
        {/* Total tickets */}
        <div className="space-y-3">
          <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-neutral-0">
            Total Number of Tickets
          </p>
          <div className={quantityShellClasses}>
            <div className="flex items-center gap-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-neutral-800 text-[11px] text-neutral-0">
                <Ticket className="h-4 w-4" />
              </span>
              {unlimitedQuantity ? (
                <span className="text-[14px] font-semibold text-success-400">
                  Unlimited
                </span>
              ) : (
                <input
                  {...register("totalQuantity", { valueAsNumber: true })}
                  type="number"
                  min={0}
                  inputMode="numeric"
                  className="w-24 bg-transparent text-[14px] text-neutral-0 placeholder:text-neutral-500 focus:outline-none"
                  placeholder="0"
                />
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                const next = !unlimitedQuantity;
                setValue("unlimitedQuantity", next, { shouldDirty: true });
                if (next) {
                  setValue("totalQuantity", null, { shouldDirty: true });
                } else {
                  setValue("totalQuantity", 0 as any, { shouldDirty: true });
                }
              }}
              className={clsx(
                unlimitedToggleBase,
                unlimitedQuantity
                  ? "border-primary-500 bg-primary-500 text-neutral-950 shadow-[0_0_0_1px_rgba(154,70,255,0.7)]"
                  : "border-neutral-700 bg-neutral-950 text-neutral-500"
              )}
              aria-label="Toggle unlimited total quantity"
            >
              ∞
            </button>
          </div>
        </div>

        {/* Min per order */}
        <div className="space-y-3">
          <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-neutral-0">
            Minimum Tickets Per Order
          </p>
          {(() => {
            const hasNoMinimum = minPerOrder == null;
            return (
              <div className={quantityShellClasses}>
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-neutral-800 text-[11px] text-neutral-0">
                    <Ticket className="h-4 w-4" />
                  </span>
                  {hasNoMinimum ? (
                    <span className="text-[14px] font-semibold text-success-400">
                      No minimum
                    </span>
                  ) : (
                    <input
                      {...register("minPerOrder", { valueAsNumber: true })}
                      type="number"
                      min={0}
                      inputMode="numeric"
                      className="w-24 bg-transparent text-[14px] text-neutral-0 placeholder:text-neutral-500 focus:outline-none"
                      placeholder="0"
                    />
                  )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setValue("minPerOrder", hasNoMinimum ? 1 : null, {
                      shouldDirty: true,
                    })
                  }
                  className={clsx(
                    unlimitedToggleBase,
                    hasNoMinimum
                      ? "border-primary-500 bg-primary-500 text-neutral-950 shadow-[0_0_0_1px_rgba(154,70,255,0.7)]"
                      : "border-neutral-700 bg-neutral-950 text-neutral-500"
                  )}
                  aria-label="Toggle minimum tickets per order"
                >
                  ∞
                </button>
              </div>
            );
          })()}
        </div>

        {/* Max per order */}
        <div className="space-y-3">
          <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-neutral-0">
            Maximum Tickets Per Order
          </p>
          {(() => {
            const isUnlimited = maxPerOrder == null;
            return (
              <div className={quantityShellClasses}>
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-neutral-800 text-[11px] text-neutral-0">
                    <Ticket className="h-4 w-4" />
                  </span>
                  {isUnlimited ? (
                    <span className="text-[14px] font-semibold text-success-400">
                      No limit
                    </span>
                  ) : (
                    <input
                      {...register("maxPerOrder", { valueAsNumber: true })}
                      type="number"
                      min={0}
                      inputMode="numeric"
                      className="w-24 bg-transparent text-[14px] text-neutral-0 placeholder:text-neutral-500 focus:outline-none"
                      placeholder="0"
                    />
                  )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setValue("maxPerOrder", isUnlimited ? 10 : null, {
                      shouldDirty: true,
                    })
                  }
                  className={clsx(
                    unlimitedToggleBase,
                    isUnlimited
                      ? "border-primary-500 bg-primary-500 text-neutral-950 shadow-[0_0_0_1px_rgba(154,70,255,0.7)]"
                      : "border-neutral-700 bg-neutral-950 text-neutral-500"
                  )}
                  aria-label="Toggle maximum tickets per order"
                >
                  ∞
                </button>
              </div>
            );
          })()}
        </div>
      </div>

      <p className="text-[13px] text-neutral-500">
        Use the checkboxes to remove limits (∞) for each field.
      </p>

      {/* Access section */}
      <div className="space-y-4">
        <h3 className="text-[15px] font-semibold text-neutral-0">Access</h3>
        <p className="max-w-xl text-[13px] leading-relaxed text-neutral-300">
          Optionally protect this ticket with a password or keep it available to
          anyone who visits your event page.
        </p>

        <div className="grid gap-5 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1.1fr)]">
          {/* Password field */}
          <div className="space-y-2">
            <p className="text-[13px] font-medium text-neutral-0">Password</p>
            <div className="relative">
              <input
                {...register("password")}
                type="text"
                placeholder="Leave empty for no password"
                className="w-full rounded-[999px] border border-neutral-800 bg-neutral-900 px-5 py-3.5 text-[14px] text-neutral-0 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/70"
              />
            </div>
            <p className="mt-1 text-[12px] leading-snug text-neutral-500">
              Share this password only with people who should see this ticket.
            </p>
          </div>

          {/* Who can access */}
          <div className="space-y-2">
            <p className="text-[13px] font-medium text-neutral-0">
              Who can access
            </p>
            <div className="relative">
              <select
                {...register("accessMode")}
                className="w-full appearance-none rounded-[999px] border border-neutral-800 bg-neutral-900 pl-11 pr-9 py-3.5 text-[14px] text-neutral-0 focus:outline-none focus:ring-2 focus:ring-primary-500/70"
              >
                <option value="public">Anyone</option>
                <option value="password">Only people with the password</option>
              </select>
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300">
                <Globe2 className="h-4 w-4" />
              </span>
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[11px] text-neutral-400">
                ▾
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Status & schedule (this was already close to Figma) */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-neutral-0">
            Status &amp; schedule
          </h3>
          <p className="text-[12px] leading-snug text-neutral-400">
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
                  "flex h-full flex-col items-start rounded-2xl border px-4 py-3.5 text-left transition-colors",
                  isActive
                    ? "border-primary-500 bg-primary-950"
                    : "border-neutral-800 bg-neutral-900 hover:border-primary-500/70"
                )}
              >
                <span className="text-[13px] font-semibold text-neutral-0">
                  {option.label}
                </span>
                <span className="mt-1 text-[11px] leading-snug text-neutral-400">
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
              className="w-full rounded-[999px] border border-neutral-800 bg-neutral-900 px-4 py-3 text-[13px] text-neutral-0 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/70"
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
