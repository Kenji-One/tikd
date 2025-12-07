// src/app/dashboard/organizations/[id]/events/[eventId]/ticket-types/TicketTypeGeneralStep.tsx
"use client";

import type { TicketTypeFormValues } from "./types";
import type { UseFormRegister } from "react-hook-form";

import Toggle from "@/components/ui/Toggle";

type Props = {
  register: UseFormRegister<TicketTypeFormValues>;
  price: number;
  isFree: boolean;
  feeMode: TicketTypeFormValues["feeMode"];
  onFeeModeChange: (mode: TicketTypeFormValues["feeMode"]) => void;
  onPriceStep: (delta: number) => void;
  onNext: () => void;
  isSubmitting: boolean;
};

const PRICE_STEP = 0.5;

export default function TicketTypeGeneralStep({
  register,
  price,
  isFree,
  feeMode,
  onFeeModeChange,
  onPriceStep,
  onNext,
  isSubmitting,
}: Props) {
  return (
    <div className="space-y-6">
      {/* Name + Description */}
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-neutral-0">
            Name<span className="ml-1 text-error-400">*</span>
          </label>
          <input
            {...register("name", { required: true })}
            type="text"
            placeholder="Enter name"
            className="w-full rounded-2xl border border-white/10 bg-[#171726] px-3 py-2.5 text-xs text-neutral-0 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/70"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-semibold text-neutral-0">
            Description
          </label>
          <textarea
            {...register("description")}
            rows={3}
            placeholder="Write description"
            className="w-full resize-none rounded-2xl border border-white/10 bg-[#171726] px-3 py-2.5 text-xs text-neutral-0 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/70"
          />
        </div>
      </div>

      {/* Price block */}
      <div className="space-y-4">
        <div className="space-y-1 text-left">
          <p className="text-sm font-semibold text-neutral-0">Price</p>
          <p className="text-[11px] text-neutral-400">
            Choose whether this ticket is free or paid. Adjust the price and how
            fees are handled.
          </p>
        </div>

        <div className="flex justify-start">
          <div className="inline-flex items-center gap-3 rounded-full bg-[#171726] px-4 py-2.5 shadow-[0_14px_35px_rgba(0,0,0,0.65)]">
            <button
              type="button"
              onClick={() => onPriceStep(-PRICE_STEP)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#11111A] text-lg leading-none text-neutral-100 hover:bg-[#181824]"
            >
              –
            </button>

            <div className="min-w-[80px] text-center text-base font-semibold text-neutral-0">
              {isFree ? "Free" : `$${Number(price || 0).toFixed(2)}`}
            </div>

            <button
              type="button"
              onClick={() => onPriceStep(PRICE_STEP)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-lg leading-none text-white shadow-[0_0_0_6px_rgba(133,92,255,0.4)] hover:bg-primary-500"
            >
              +
            </button>
          </div>
        </div>

        {/* Fee mode toggles (paid only) */}
        {!isFree && (
          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-neutral-0">
                  Pass on the fees of the customer
                </p>
                <p className="max-w-md text-[11px] text-neutral-400">
                  Learn more about the cost of service, connection &amp;
                  processing fees.
                </p>
              </div>
              <Toggle
                size="sm"
                checked={feeMode === "pass_on"}
                onCheckedChange={() => onFeeModeChange("pass_on")}
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-neutral-0">
                  Abort the fees in the ticket price
                </p>
                <p className="max-w-md text-[11px] text-neutral-400">
                  Lorem consectetur adipiscing elit, sed do ei.
                </p>
              </div>
              <Toggle
                size="sm"
                checked={feeMode === "absorb"}
                onCheckedChange={() => onFeeModeChange("absorb")}
              />
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-end pt-2">
        <button
          type="button"
          onClick={onNext}
          disabled={isSubmitting}
          className="rounded-full bg-primary-600 px-6 py-2 text-xs font-medium text-white hover:bg-primary-500 disabled:opacity-60"
        >
          Next
        </button>
      </div>
    </div>
  );
}
