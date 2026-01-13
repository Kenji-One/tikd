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
          <label className="block font-medium text-neutral-0">
            Name<span className="ml-1 text-error-400">*</span>
          </label>
          <input
            {...register("name", { required: true })}
            type="text"
            placeholder="Enter name"
            className="w-full rounded-lg bg-neutral-900 border-none px-4 py-2 text-neutral-0 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/70"
          />
        </div>

        <div className="space-y-2">
          <label className="block font-medium text-neutral-0">
            Description
          </label>
          <textarea
            {...register("description")}
            rows={3}
            placeholder="Write description"
            className="w-full resize-none rounded-lg bg-neutral-900 border-none px-4 py-2 text-neutral-0 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/70"
          />
        </div>
      </div>

      {/* Price block */}
      <div className="space-y-4">
        <div className="space-y-1 text-left">
          <p className="text-lg font-semibold text-neutral-0">Price</p>
          <p className="text-neutral-500">
            Choose whether this ticket is free or paid. Adjust the price and how
            fees are handled.
          </p>
        </div>

        <div className="flex justify-center">
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
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-lg leading-none text-white shadow-[0_0_0_6px_rgba(133,92,255,0.4)] hover:bg-primary-500 cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
              >
                <path
                  d="M8 4C8.13261 4 8.25979 4.05268 8.35355 4.14645C8.44732 4.24021 8.5 4.36739 8.5 4.5V7.5H11.5C11.6326 7.5 11.7598 7.55268 11.8536 7.64645C11.9473 7.74021 12 7.86739 12 8C12 8.13261 11.9473 8.25979 11.8536 8.35355C11.7598 8.44732 11.6326 8.5 11.5 8.5H8.5V11.5C8.5 11.6326 8.44732 11.7598 8.35355 11.8536C8.25979 11.9473 8.13261 12 8 12C7.86739 12 7.74021 11.9473 7.64645 11.8536C7.55268 11.7598 7.5 11.6326 7.5 11.5V8.5H4.5C4.36739 8.5 4.24021 8.44732 4.14645 8.35355C4.05268 8.25979 4 8.13261 4 8C4 7.86739 4.05268 7.74021 4.14645 7.64645C4.24021 7.55268 4.36739 7.5 4.5 7.5H7.5V4.5C7.5 4.36739 7.55268 4.24021 7.64645 4.14645C7.74021 4.05268 7.86739 4 8 4Z"
                  fill="white"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Fee mode toggles (paid only) */}
        {!isFree && (
          <div className="space-y-3 mt-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-lg font-semibold text-neutral-0">
                  Pass on the fees of the customer
                </p>
                <p className="max-w-md text-neutral-500">
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
                <p className="text-lg font-semibold text-neutral-0">
                  Abort the fees in the ticket price
                </p>
                <p className="max-w-md text-neutral-500">
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
          className="rounded-full bg-primary-500 border border-[#FFFFFF1A] px-6 py-3 text-white font-medium hover:bg-primary-400 disabled:opacity-60 cursor-pointer transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}
