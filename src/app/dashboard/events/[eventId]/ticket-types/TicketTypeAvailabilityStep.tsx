// src/app/dashboard/organizations/[id]/events/[eventId]/ticket-types/TicketTypeAvailabilityStep.tsx
"use client";

import type { TicketTypeFormValues, TicketAvailabilityStatus } from "./types";
import type { UseFormRegister, UseFormSetValue } from "react-hook-form";
import { useRef, useState } from "react";

import clsx from "clsx";
import {
  ChevronDown,
  Globe,
  Link2,
  Lock,
  Ticket,
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
} from "lucide-react";

import Checkbox from "@/components/ui/Checkbox";

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
/*  Quantity cards (Figma-style, compact)                             */
/* ------------------------------------------------------------------ */

function NumberField(props: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  const { value, onChange, disabled, ariaLabel } = props;

  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      step={1}
      value={Number.isFinite(value) ? value : 0}
      disabled={disabled}
      aria-label={ariaLabel}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      name={ariaLabel.replace(/\s+/g, "-").toLowerCase()}
      onChange={(e) => {
        const raw = e.target.value;
        const n = raw === "" ? 0 : Number(raw);
        onChange(Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0);
      }}
      className={clsx(
        "w-full bg-transparent outline-none border-none focus:ring-0 pl-0",
        "text-[14px] font-semibold tracking-[-0.02em]",
        disabled ? "text-neutral-600" : "text-neutral-100",
        "[appearance:textfield]",
        "[&::-webkit-outer-spin-button]:appearance-none",
        "[&::-webkit-inner-spin-button]:appearance-none",
      )}
    />
  );
}

function QuantityCard(props: {
  title: string;
  Icon: React.ReactNode;
  isUnlimited: boolean;
  value: number;
  onUnlimitedChange: (next: boolean) => void;
  onValueChange: (next: number) => void;
  unlimitedAriaLabel: string;
  valueAriaLabel: string;
}) {
  const {
    title,
    Icon,
    isUnlimited,
    value,
    onUnlimitedChange,
    onValueChange,
    unlimitedAriaLabel,
    valueAriaLabel,
  } = props;

  return (
    <div className="space-y-2">
      <p className="font-semibold text-neutral-0">{title}</p>

      <div
        className={clsx(
          "flex items-center justify-between gap-3",
          "h-[44px] rounded-lg px-4",
          "border border-white/10 bg-white/5",
          "transition-[border-color,box-shadow] duration-150",
          // ✅ card highlight when any inner input is focused
          "focus-within:border-primary-500/70 focus-within:ring-2 focus-within:ring-primary-500/35",
        )}
      >
        {/* ✅ icon slot supports raw <svg /> now */}
        <span className="inline-flex h-6 w-6 items-center justify-center text-neutral-200 [&_svg]:h-5 [&_svg]:w-5">
          {Icon}
        </span>

        <div className="flex-1">
          {isUnlimited ? (
            <span className="text-success-500">Unlimited</span>
          ) : (
            <NumberField
              value={value}
              disabled={false}
              ariaLabel={valueAriaLabel}
              onChange={onValueChange}
            />
          )}
        </div>

        <div className="grid h-5 w-5 shrink-0 place-items-center">
          <Checkbox
            size="sm"
            checked={isUnlimited}
            onCheckedChange={onUnlimitedChange}
            aria-label={unlimitedAriaLabel}
            className="!h-5 !w-5"
          />
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
        <div className="absolute left-1/2 z-30 mt-2 w-32 -translate-x-1/2 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950/95 backdrop-blur-sm">
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
                      ? "bg-neutral-800 font-semibold text-neutral-0"
                      : "text-neutral-200 hover:bg-neutral-800/80",
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
/*  Ticket Accessibility (NEW)                                        */
/* ------------------------------------------------------------------ */

type WhoAccessValue = "anyone" | "restricted";

const ACCESS_OPTIONS: Array<{
  value: WhoAccessValue;
  label: "Anyone" | "Restricted";
  description: string;
  Icon: typeof Globe;
}> = [
  {
    value: "anyone",
    label: "Anyone",
    description:
      "This ticket will be publicly visible and available for purchase on the event page",
    Icon: Globe,
  },
  {
    value: "restricted",
    label: "Restricted",
    description:
      "Only individuals with the direct link can view and purchase this ticket",
    Icon: Link2,
  },
];

function AccessDropdown(props: {
  value: WhoAccessValue;
  onChange: (v: WhoAccessValue) => void;
  disabled?: boolean;
}) {
  const { value, onChange, disabled = false } = props;
  const [open, setOpen] = useState(false);

  const active =
    ACCESS_OPTIONS.find((o) => o.value === value) ?? ACCESS_OPTIONS[0];
  const ActiveIcon = active.Icon;

  return (
    <div className="space-y-2">
      <p className="text-[13px] font-medium text-neutral-200">Who can access</p>

      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            setOpen((p) => !p);
          }}
          className={clsx(
            "flex w-full items-center justify-between rounded-lg border px-4 py-3 text-[14px] transition-colors",
            "bg-neutral-950/35 backdrop-blur-xl",
            disabled
              ? "cursor-not-allowed border-white/10 opacity-70"
              : "cursor-pointer border-white/10 hover:border-primary-500/40",
          )}
        >
          <span className="inline-flex items-center gap-3 text-neutral-0">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5">
              <ActiveIcon className="h-4 w-4 text-neutral-200" />
            </span>
            <span className="font-medium">{active.label}</span>
          </span>

          <ChevronDown
            className={clsx(
              "h-4 w-4 text-neutral-400 transition-transform",
              open && "rotate-180",
              disabled && "opacity-60",
            )}
          />
        </button>

        {open && !disabled && (
          <div className="absolute left-0 right-0 z-40 mt-2 overflow-hidden rounded-xl border border-white/10 bg-neutral-950/95 backdrop-blur-xl">
            {ACCESS_OPTIONS.map((opt) => {
              const selected = opt.value === value;
              const Ico = opt.Icon;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={clsx(
                    "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                    selected
                      ? "bg-white/8 text-neutral-0"
                      : "text-neutral-200 hover:bg-white/6",
                  )}
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                    <Ico className="h-4 w-4 text-neutral-200" />
                  </span>
                  <span className="font-medium">{opt.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-[13px] leading-snug text-neutral-400">
        {active.description}
      </p>
    </div>
  );
}

function PasswordPanel(props: {
  register: UseFormRegister<TicketTypeFormValues>;
  onSubmitClick: () => void;
  saved: boolean;
}) {
  const { register, onSubmitClick, saved } = props;
  const [show, setShow] = useState(false);

  return (
    <div
      className={clsx(
        "mx-auto mt-4 w-full max-w-[340px]",
        "overflow-hidden rounded-xl border border-white/10 bg-neutral-950/35 p-6 backdrop-blur-xl",
      )}
    >
      <div className="mx-auto flex w-full max-w-[420px] flex-col items-center text-center">
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5">
          <Lock className="h-5 w-5 text-neutral-200" />
        </div>

        <p className="text-[16px] font-semibold text-neutral-0">Set Password</p>
        <p className="mt-1 text-[12px] leading-snug text-neutral-400">
          Add a password to limit access to this ticket.
        </p>

        <div className="mt-4 w-full space-y-3">
          <div className="relative">
            <input
              {...register("password")}
              type={show ? "text" : "password"}
              placeholder="Enter Password"
              className={clsx(
                "h-11 w-full rounded-lg border border-white/10 bg-neutral-950/35 px-4 pr-11 text-[13px] text-neutral-0",
                "placeholder:text-neutral-600 outline-none",
                "focus:ring-2 focus:ring-primary-500/45 focus:border-primary-500/50",
              )}
            />

            <button
              type="button"
              aria-label={show ? "Hide password" : "Show password"}
              onClick={() => setShow((v) => !v)}
              className={clsx(
                "absolute right-2 top-1/2 -translate-y-1/2",
                "inline-flex h-9 w-9 items-center justify-center rounded-md",
                "text-neutral-300 hover:text-neutral-0",
                "hover:bg-white/5 transition-colors",
              )}
            >
              {show ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={onSubmitClick}
            className={clsx(
              "h-11 w-full rounded-lg border border-[#FFFFFF14] bg-primary-500 text-[13px] font-semibold text-white",
              "transition-colors hover:bg-primary-400",
            )}
          >
            {saved ? "Saved" : "Submit"}
          </button>
        </div>
      </div>
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
  const accessRaw = String(accessMode ?? "public");
  const isPasswordRequired = accessRaw === "password";
  const isRestricted = accessRaw === "restricted" || isPasswordRequired;

  const whoCanAccess: WhoAccessValue = isRestricted ? "restricted" : "anyone";

  const [savedPulse, setSavedPulse] = useState(false);

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

  const setAccessMode = (mode: string) => {
    setValue("accessMode", mode as any, { shouldDirty: true });
  };

  return (
    <div className="space-y-6">
      {hiddenNumericInputs}

      {/* Intro text */}
      <p className="leading-snug text-neutral-300">
        Set a total number of tickets for this ticket type.
      </p>

      {/* Quantities (compact) */}
      <div className="space-y-3">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {/* Total */}
          <QuantityCard
            title="Total Number Of Tickets"
            Icon={
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M14.6667 7.1665C14.94 7.1665 15.1667 6.93984 15.1667 6.6665V5.99984C15.1667 3.05984 14.2733 2.1665 11.3333 2.1665H7.16668V3.6665C7.16668 3.93984 6.94001 4.1665 6.66668 4.1665C6.39334 4.1665 6.16668 3.93984 6.16668 3.6665V2.1665H4.66668C1.72668 2.1665 0.833344 3.05984 0.833344 5.99984V6.33317C0.833344 6.6065 1.06001 6.83317 1.33334 6.83317C1.97334 6.83317 2.50001 7.35984 2.50001 7.99984C2.50001 8.63984 1.97334 9.1665 1.33334 9.1665C1.06001 9.1665 0.833344 9.39317 0.833344 9.6665V9.99984C0.833344 12.9398 1.72668 13.8332 4.66668 13.8332H6.16668V12.3332C6.16668 12.0598 6.39334 11.8332 6.66668 11.8332C6.94001 11.8332 7.16668 12.0598 7.16668 12.3332V13.8332H11.3333C14.2733 13.8332 15.1667 12.9398 15.1667 9.99984C15.1667 9.7265 14.94 9.49984 14.6667 9.49984C14.0267 9.49984 13.5 8.97317 13.5 8.33317C13.5 7.69317 14.0267 7.1665 14.6667 7.1665ZM7.16668 9.4465C7.16668 9.71984 6.94001 9.9465 6.66668 9.9465C6.39334 9.9465 6.16668 9.71984 6.16668 9.4465V6.55317C6.16668 6.27984 6.39334 6.05317 6.66668 6.05317C6.94001 6.05317 7.16668 6.27984 7.16668 6.55317V9.4465Z"
                  fill="white"
                />
              </svg>
            }
            isUnlimited={unlimitedQuantity}
            value={totalQuantity ?? 0}
            unlimitedAriaLabel="Set total tickets to unlimited"
            valueAriaLabel="Total tickets"
            onUnlimitedChange={(next) => {
              if (next) {
                setValue("unlimitedQuantity", true, { shouldDirty: true });
                setValue("totalQuantity", null, { shouldDirty: true });
              } else {
                setValue("unlimitedQuantity", false, { shouldDirty: true });
                setValue("totalQuantity", totalQuantity ?? 0, {
                  shouldDirty: true,
                });
              }
            }}
            onValueChange={(next) => {
              if (unlimitedQuantity) {
                setValue("unlimitedQuantity", false, { shouldDirty: true });
              }
              setValue("totalQuantity", next, { shouldDirty: true });
            }}
          />

          {/* Min */}
          <QuantityCard
            title="Minimum Tickets Per Order"
            Icon={
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12.6667 5.3335C13.7712 5.3335 14.6667 4.43807 14.6667 3.3335C14.6667 2.22893 13.7712 1.3335 12.6667 1.3335C11.5621 1.3335 10.6667 2.22893 10.6667 3.3335C10.6667 4.43807 11.5621 5.3335 12.6667 5.3335Z"
                  fill="white"
                />
                <path
                  d="M14 6.93333V10.9867C14 11.08 13.9933 11.1733 13.9867 11.26C13.98 11.34 13.9733 11.4133 13.96 11.4933C13.9533 11.5733 13.94 11.6533 13.9267 11.7267C13.6933 13.34 12.6667 14.36 11.06 14.5933C10.9867 14.6067 10.9067 14.62 10.8267 14.6267C10.7467 14.64 10.6733 14.6467 10.5933 14.6533C10.5067 14.66 10.4133 14.6667 10.32 14.6667H5.01334C4.92001 14.6667 4.82668 14.66 4.74001 14.6533C4.66001 14.6467 4.58668 14.64 4.50668 14.6267C4.42668 14.62 4.34668 14.6067 4.27334 14.5933C2.66668 14.36 1.64001 13.34 1.40668 11.7267C1.39334 11.6533 1.38001 11.5733 1.37334 11.4933C1.36001 11.4133 1.35334 11.34 1.34668 11.26C1.34001 11.1733 1.33334 11.08 1.33334 10.9867V5.68C1.33334 5.58667 1.34001 5.49333 1.34668 5.40667C1.35334 5.32667 1.36001 5.25333 1.37334 5.17333C1.38001 5.09333 1.39334 5.01333 1.40668 4.94C1.64001 3.32667 2.66668 2.30667 4.27334 2.07333C4.34668 2.06 4.42668 2.04667 4.50668 2.04C4.58668 2.02667 4.66001 2.02 4.74001 2.01333C4.82668 2.00667 4.92001 2 5.01334 2H9.06668C9.49334 2 9.80001 2.38667 9.72001 2.8C9.72001 2.81333 9.71334 2.82667 9.71334 2.84C9.70001 2.90667 9.69334 2.97333 9.68001 3.04667C9.65334 3.32667 9.66668 3.62667 9.72668 3.93333C9.74668 4.01333 9.76001 4.08 9.78668 4.15333C9.84001 4.37333 9.92668 4.58 10.04 4.77333C10.08 4.85333 10.1333 4.93333 10.18 5.00667C10.4 5.32667 10.6733 5.6 10.9933 5.82C11.0667 5.86667 11.1467 5.92 11.2267 5.96C11.42 6.07333 11.6267 6.16 11.8467 6.21333C11.92 6.24 11.9867 6.25333 12.0667 6.27333C12.3733 6.33333 12.6733 6.34667 12.9533 6.32C13.0267 6.30667 13.0933 6.3 13.16 6.28667C13.1733 6.28667 13.1867 6.28 13.2 6.28C13.6133 6.2 14 6.50667 14 6.93333Z"
                  fill="white"
                />
              </svg>
            }
            isUnlimited={hasNoMinimum}
            value={minPerOrder ?? 0}
            unlimitedAriaLabel="Set minimum tickets per order to unlimited"
            valueAriaLabel="Minimum tickets per order"
            onUnlimitedChange={(next) => {
              if (next) {
                setValue("minPerOrder", null, { shouldDirty: true });
              } else {
                setValue("minPerOrder", minPerOrder ?? 0, {
                  shouldDirty: true,
                });
              }
            }}
            onValueChange={(next) =>
              setValue("minPerOrder", next, { shouldDirty: true })
            }
          />

          {/* Max */}
          <QuantityCard
            title="Maximum Tickets Per Order"
            Icon={
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M9.033 13.4399C8.85967 13.5133 8.673 13.5799 8.473 13.6466L7.41967 13.9933C4.773 14.8466 3.37967 14.1333 2.51967 11.4866L1.66634 8.85328C0.813004 6.20661 1.51967 4.80661 4.16634 3.95328L5.193 3.61328C5.06634 3.93328 4.95967 4.29995 4.85967 4.71328L4.20634 7.50661C3.473 10.6466 4.54634 12.3799 7.68634 13.1266L8.80634 13.3933C8.87967 13.4133 8.95967 13.4266 9.033 13.4399Z"
                  fill="white"
                />
                <path
                  d="M11.4472 2.13984L10.3338 1.87984C8.10716 1.35318 6.78049 1.78651 6.00049 3.39984C5.80049 3.80651 5.64049 4.29984 5.50716 4.86651L4.85382 7.65984C4.20049 10.4465 5.06049 11.8198 7.84049 12.4798L8.96049 12.7465C9.34716 12.8398 9.70716 12.8998 10.0405 12.9265C12.1205 13.1265 13.2272 12.1532 13.7872 9.74651L14.4405 6.95984C15.0938 4.17318 14.2405 2.79318 11.4472 2.13984Z"
                  fill="white"
                />
              </svg>
            }
            isUnlimited={isMaxUnlimited}
            value={maxPerOrder ?? 0}
            unlimitedAriaLabel="Set maximum tickets per order to unlimited"
            valueAriaLabel="Maximum tickets per order"
            onUnlimitedChange={(next) => {
              if (next) {
                setValue("maxPerOrder", null, { shouldDirty: true });
              } else {
                setValue("maxPerOrder", maxPerOrder ?? 0, {
                  shouldDirty: true,
                });
              }
            }}
            onValueChange={(next) =>
              setValue("maxPerOrder", next, { shouldDirty: true })
            }
          />
        </div>

        <p className="text-[16px] leading-snug text-neutral-500">
          Ticking the box will make number{" "}
          <span className="font-semibold text-neutral-200">Unlimited</span>
        </p>
      </div>

      {/* Ticket Accessibility */}
      <div className="space-y-4">
        <h3 className="text-[15px] font-semibold text-neutral-0">
          Ticket Accessibility
        </h3>
        <p className="max-w-2xl text-[13px] leading-relaxed text-neutral-300">
          Control who can view and purchase this ticket by selecting its
          accessibility settings
        </p>

        {/* keep fields registered for RHF */}
        <input type="hidden" {...register("accessMode")} />
        <input type="hidden" {...register("password")} />

        <div className="overflow-hidden rounded-xl border border-white/10 bg-neutral-950/35 backdrop-blur-xl">
          <div className="p-5">
            <AccessDropdown
              value={whoCanAccess}
              disabled={isPasswordRequired}
              onChange={(v) => {
                if (isPasswordRequired) return;

                if (v === "anyone") {
                  setAccessMode("public");
                  setValue("password", "", { shouldDirty: true });
                } else {
                  setAccessMode("restricted");
                }
              }}
            />

            <div className="my-5 h-px w-full bg-white/10" />

            <div className="space-y-2">
              <p className="text-[13px] font-medium text-neutral-200">
                Additional Security
              </p>

              <Checkbox
                size="sm"
                checked={isPasswordRequired}
                onCheckedChange={(next) => {
                  if (next) {
                    setAccessMode("password");
                  } else {
                    setValue("password", "", { shouldDirty: true });
                    setAccessMode("restricted");
                  }
                }}
                label={
                  <span className="text-[13px] text-neutral-300">
                    Password Required
                  </span>
                }
              />

              {isPasswordRequired && (
                <PasswordPanel
                  register={register}
                  saved={savedPulse}
                  onSubmitClick={() => {
                    setSavedPulse(true);
                    window.setTimeout(() => setSavedPulse(false), 900);
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Availability timeline */}
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

        <div className="relative mx-auto mt-8 flex max-w-[227px] flex-col items-stretch gap-6">
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
                  base.getTime() - base.getTimezoneOffset() * 60000,
                )
                  .toISOString()
                  .slice(0, 16);

                setValue("salesEndAt", local, { shouldDirty: true });
              }}
              className={clsx(
                "flex h-9 w-9 items-center justify-center rounded-full bg-primary-500 text-[20px] font-semibold text-white shadow-[0_0_0_4px_rgba(88,28,135,0.5)] transition-transform",
                hasSchedule && "cursor-not-allowed opacity-35 shadow-none",
              )}
            >
              +
            </button>
          </div>

          {/* Scheduled change card */}
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
