// src/app/dashboard/organizations/[id]/events/[eventId]/ticket-types/TicketTypeAvailabilityStep.tsx
"use client";

import { useState } from "react";
import type { TicketTypeFormValues, TicketAvailabilityStatus } from "./types";
import type { UseFormRegister, UseFormSetValue } from "react-hook-form";

import clsx from "clsx";
import { X, Ticket, Plus, Lock, Globe2 } from "lucide-react";

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
  const [isStatusEditorOpen, setIsStatusEditorOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Intro text */}
      <p className="text-[11px] text-neutral-300">
        Set a total number of tickets for this ticket type.
      </p>

      {/* Quantities row */}
      <div className="grid gap-3 sm:grid-cols-3">
        {/* Total tickets */}
        <div className="space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-neutral-200">
            Total Number of Tickets
          </p>
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#161627] px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-xl bg-[#23233a] text-[10px] text-neutral-100">
                <Ticket className="h-3 w-3" />
              </span>
              {unlimitedQuantity ? (
                <span className="text-xs font-semibold text-emerald-400">
                  Unlimited
                </span>
              ) : (
                <input
                  {...register("totalQuantity", {
                    valueAsNumber: true,
                  })}
                  type="number"
                  min={0}
                  className="w-16 bg-transparent text-xs text-neutral-0 placeholder:text-neutral-500 focus:outline-none"
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
                  setValue("totalQuantity", 0, { shouldDirty: true });
                }
              }}
              className={clsx(
                "flex h-4 w-4 items-center justify-center rounded-[5px] border text-[9px] font-semibold transition-colors",
                unlimitedQuantity
                  ? "border-primary-500 bg-primary-500 text-neutral-950"
                  : "border-white/25 bg-transparent text-transparent"
              )}
            >
              ✓
            </button>
          </div>
        </div>

        {/* Min per order */}
        <div className="space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-neutral-200">
            Minimum Tickets Per Order
          </p>
          {(() => {
            const isUnlimited = minPerOrder == null;
            return (
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#161627] px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-xl bg-[#23233a] text-[10px] text-neutral-100">
                    <Ticket className="h-3 w-3" />
                  </span>
                  {isUnlimited ? (
                    <span className="text-xs font-semibold text-emerald-400">
                      Unlimited
                    </span>
                  ) : (
                    <input
                      {...register("minPerOrder", { valueAsNumber: true })}
                      type="number"
                      min={0}
                      className="w-16 bg-transparent text-xs text-neutral-0 placeholder:text-neutral-500 focus:outline-none"
                    />
                  )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setValue("minPerOrder", isUnlimited ? 1 : null, {
                      shouldDirty: true,
                    })
                  }
                  className={clsx(
                    "flex h-4 w-4 items-center justify-center rounded-[5px] border text-[9px] font-semibold transition-colors",
                    isUnlimited
                      ? "border-primary-500 bg-primary-500 text-neutral-950"
                      : "border-white/25 bg-transparent text-transparent"
                  )}
                >
                  ✓
                </button>
              </div>
            );
          })()}
        </div>

        {/* Max per order */}
        <div className="space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-neutral-200">
            Maximum Tickets Per Order
          </p>
          {(() => {
            const isUnlimited = maxPerOrder == null;
            return (
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#161627] px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-xl bg-[#23233a] text-[10px] text-neutral-100">
                    <Ticket className="h-3 w-3" />
                  </span>
                  {isUnlimited ? (
                    <span className="text-xs font-semibold text-emerald-400">
                      Unlimited
                    </span>
                  ) : (
                    <input
                      {...register("maxPerOrder", { valueAsNumber: true })}
                      type="number"
                      min={0}
                      className="w-16 bg-transparent text-xs text-neutral-0 placeholder:text-neutral-500 focus:outline-none"
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
                    "flex h-4 w-4 items-center justify-center rounded-[5px] border text-[9px] font-semibold transition-colors",
                    isUnlimited
                      ? "border-primary-500 bg-primary-500 text-neutral-950"
                      : "border-white/25 bg-transparent text-transparent"
                  )}
                >
                  ✓
                </button>
              </div>
            );
          })()}
        </div>
      </div>

      <p className="text-[10px] text-neutral-500">
        Ticking the box will make number Unlimited
      </p>

      {/* Access section */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-neutral-0">Access</h3>
        <p className="text-[10px] text-neutral-400">
          If you would like to protect this ticket type with a password, check
          this mark and create a password. There will be a place on your event
          page for your customers to enter the password.
        </p>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)]">
          <div className="space-y-1">
            <p className="text-[10px] text-neutral-200">Password</p>
            <div className="relative">
              <input
                {...register("password")}
                type="text"
                placeholder="Enter Password"
                className="w-full rounded-2xl border border-white/10 bg-[#181828] px-3 py-2.5 pr-16 text-xs text-neutral-0 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/70"
              />
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center gap-1.5">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/25 text-[9px] text-neutral-300">
                  ●
                </span>
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-semibold text-neutral-950">
                  ✓
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] text-neutral-200">Who can access</p>
            <div className="relative">
              <select
                {...register("accessMode")}
                className="w-full appearance-none rounded-2xl border border-white/10 bg-[#181828] px-9 py-2.5 pr-9 text-xs text-neutral-0 focus:outline-none focus:ring-2 focus:ring-primary-500/70"
              >
                <option value="public">Anyone</option>
                <option value="password">Only people with the password</option>
              </select>
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-300">
                <Globe2 className="h-3.5 w-3.5" />
              </span>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-neutral-400">
                ▾
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Availability timeline */}
      <div className="space-y-3">
        <div className="space-y-1">
          <h3 className="text-xs font-semibold text-neutral-0">
            Availability timeline
          </h3>
          <p className="text-[10px] text-neutral-400">
            Change the availability status of your ticket as it is displayed on
            the event page. You can adjust this at any time if you need to
            change the ticket availability.
          </p>
        </div>

        {/* Timeline nodes */}
        <div className="mt-3 flex items-center gap-3">
          {/* Initial status lock */}
          <button
            type="button"
            className="flex flex-col items-center gap-1 text-neutral-0"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-primary-600 shadow-[0_0_20px_rgba(133,0,255,0.4)]">
              <Lock className="h-3.5 w-3.5" />
            </span>
          </button>

          <div className="h-px flex-1 bg-neutral-600" />

          {/* Add node 1 */}
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-white shadow-[0_0_22px_rgba(133,0,255,0.8)]"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>

          <div className="h-px flex-1 bg-neutral-600" />

          {/* Current status node */}
          <button
            type="button"
            onClick={() => setIsStatusEditorOpen(true)}
            className="flex flex-col items-center gap-1 text-neutral-0"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-primary-600 shadow-[0_0_20px_rgba(133,0,255,0.4)]">
              <Ticket className="h-3.5 w-3.5" />
            </span>
          </button>

          <div className="h-px flex-1 bg-neutral-600" />

          {/* Add node 2 */}
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-white shadow-[0_0_22px_rgba(133,0,255,0.8)]"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Labels under timeline */}
        <div className="mt-3 flex items-start justify-between gap-4 text-[10px] text-neutral-200">
          <div className="flex-1 text-left">
            <p className="font-medium text-neutral-0">Initial Status</p>
          </div>
          <div className="flex-1 text-center">
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
          <div className="flex-1" />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onPrev}
          className="rounded-full bg-neutral-50 px-6 py-1.5 text-xs font-medium text-neutral-950 hover:bg-white"
        >
          Go back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="rounded-full bg-primary-600 px-7 py-1.5 text-xs font-semibold text-white hover:bg-primary-500"
        >
          Next
        </button>
      </div>

      {/* Current status editor (opens from timeline) */}
      {isStatusEditorOpen && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-[#070713] px-4 py-4 shadow-[0_14px_35px_rgba(0,0,0,0.7)] sm:px-5 sm:py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-neutral-0">
                Current Status
              </p>
              <p className="mt-1 text-[10px] text-neutral-400">
                Update how this ticket is currently displayed on your event
                page.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsStatusEditorOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-[#151526] text-neutral-300 hover:text-neutral-50"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="block text-[10px] text-neutral-300">
                Status
              </label>
              <select
                {...register("availabilityStatus")}
                className="w-full rounded-2xl border border-white/10 bg-[#181828] px-3 py-2.5 text-xs text-neutral-0 focus:outline-none focus:ring-2 focus:ring-primary-500/70"
              >
                <option value="on_sale">On sale</option>
                <option value="scheduled">Scheduled</option>
                <option value="paused">Paused</option>
                <option value="sale_ended">Sale ended</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] text-neutral-300">Date</label>
              <input
                {...register("salesEndAt")}
                type="datetime-local"
                className="w-full rounded-2xl border border-white/10 bg-[#181828] px-3 py-2.5 text-xs text-neutral-0 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/70"
              />
              <p className="mt-1 text-[9px] text-neutral-500">
                Optional: choose when this status should take effect.
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end">
            <button
              type="button"
              onClick={() => setIsStatusEditorOpen(false)}
              className="rounded-full bg-primary-600 px-5 py-1.5 text-xs font-semibold text-white hover:bg-primary-500"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
