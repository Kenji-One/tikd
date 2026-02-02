// src/app/dashboard/organizations/[id]/events/[eventId]/ticket-types/TicketTypeGeneralStep.tsx
"use client";

import { useEffect, useRef, useState } from "react";
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

function clampToMoney(n: number) {
  if (!Number.isFinite(n)) return 0;
  const safe = Math.max(0, n);
  return Math.round(safe * 100) / 100;
}

function normalizeDraft(raw: string) {
  // allow digits + dot/comma; keep it friendly while typing
  return raw.replace(/[^\d.,]/g, "");
}

function draftToNumberOrNull(draft: string) {
  const t = draft.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return clampToMoney(n);
}

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
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [draftPrice, setDraftPrice] = useState<string>("");

  const inputRef = useRef<HTMLInputElement>(null);
  const prevEditingRef = useRef(false);

  useEffect(() => {
    // focus when we enter edit mode
    if (!prevEditingRef.current && isEditingPrice) {
      // next tick to ensure input is mounted
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
    prevEditingRef.current = isEditingPrice;
  }, [isEditingPrice]);

  // keep draft in sync if parent price changes while not editing
  useEffect(() => {
    if (isEditingPrice) return;
    setDraftPrice(isFree ? "" : String(clampToMoney(price)));
  }, [isEditingPrice, isFree, price]);

  function setAbsolutePrice(nextAbs: number) {
    const next = clampToMoney(nextAbs);
    const curr = clampToMoney(price);
    const delta = next - curr;
    if (delta !== 0) onPriceStep(delta);
  }

  function switchToEdit() {
    setIsEditingPrice(true);
    // If "Free", start empty so user can type immediately
    setDraftPrice(isFree ? "" : String(clampToMoney(price)));
  }

  function commitDraft() {
    const parsed = draftToNumberOrNull(draftPrice);

    // Empty/invalid or <= 0 => Free
    if (parsed === null || parsed <= 0) {
      if (price !== 0) setAbsolutePrice(0);
      setIsEditingPrice(false);
      setDraftPrice("");
      return;
    }

    setAbsolutePrice(parsed);
    setIsEditingPrice(false);
    setDraftPrice(String(parsed));
  }

  function cancelEdit() {
    setIsEditingPrice(false);
    setDraftPrice(isFree ? "" : String(clampToMoney(price)));
  }

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
              disabled={isEditingPrice}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#11111A] text-lg leading-none text-neutral-100 hover:bg-[#181824] disabled:opacity-60"
            >
              –
            </button>

            {/* Clickable Free/Price -> becomes editable */}
            <div className="min-w-[120px] text-center">
              {!isEditingPrice ? (
                <button
                  type="button"
                  onClick={switchToEdit}
                  className="inline-flex h-8 min-w-[120px] items-center justify-center rounded-full px-3 text-base font-semibold text-neutral-0 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-primary-500/50 cursor-text"
                  aria-label="Edit ticket price"
                  title="Click to type a price"
                >
                  {isFree ? "Free" : `$${clampToMoney(price).toFixed(2)}`}
                </button>
              ) : (
                <input
                  ref={inputRef}
                  value={draftPrice}
                  onChange={(e) => {
                    const next = normalizeDraft(e.target.value);

                    // If they delete the number -> go back to "Free" immediately
                    if (next.trim() === "") {
                      if (price !== 0) setAbsolutePrice(0);
                      setDraftPrice("");
                      setIsEditingPrice(false);
                      return;
                    }

                    setDraftPrice(next);
                  }}
                  onBlur={commitDraft}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitDraft();
                    }
                    if (e.key === "Escape") {
                      e.preventDefault();
                      cancelEdit();
                    }
                  }}
                  inputMode="decimal"
                  placeholder="0"
                  className="h-8 w-[120px] rounded-full bg-[#11111A] px-3 text-center text-base font-semibold text-neutral-0 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/70"
                  aria-label="Ticket price"
                />
              )}
            </div>

            <button
              type="button"
              onClick={() => onPriceStep(PRICE_STEP)}
              disabled={isEditingPrice}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-lg leading-none text-white shadow-[0_0_0_6px_rgba(133,92,255,0.4)] hover:bg-primary-500 cursor-pointer disabled:opacity-60"
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
