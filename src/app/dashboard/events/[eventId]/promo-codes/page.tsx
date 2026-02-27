// src/app/dashboard/events/[eventId]/promo-codes/page.tsx
"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type SVGProps,
} from "react";
import { useParams } from "next/navigation";
import {
  Search,
  Plus,
  Percent,
  KeyRound,
  CalendarClock,
  ListChecks,
  X,
  EllipsisVertical,
  Pencil,
  Trash2,
} from "lucide-react";

import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import clsx from "clsx";
import { Button } from "@/components/ui/Button";
import { RowCard, RowCardStat } from "@/components/ui/RowCard";

/* ---------------------------- API shapes ---------------------------- */

type PromoCodeKind = "discount" | "special_access";
type PromoDiscountMode = "percentage" | "amount";

type PromoCodeApi = {
  _id: string;
  organizationId: string;
  eventId: string;
  createdByUserId: string;
  name: string;
  description?: string;
  code: string;
  kind: PromoCodeKind;
  discountMode?: PromoDiscountMode | null;
  discountValue?: number | null;
  overallItems?: number | null;
  maxUses?: number | null;
  usesCount: number;
  isActive: boolean;
  validFrom?: string | null;
  validUntil?: string | null;
  applicableTicketTypeIds: string[];
  createdAt: string;
  updatedAt: string;
};

type PromoCodeRow = {
  id: string;
  title: string;
  code: string;
  description: string;
  discount: string;
  uses: number;
  maxUses?: number | null;
  active: boolean;
};

type TicketTypeApi = {
  _id: string;
  name: string;
  price: number;
  currency: string;
};

type TicketTypeOption = {
  _id: string;
  name: string;
  price: number;
  currency: string;
};

/* ----------------------------- Helpers ----------------------------- */

function formatDiscountLabel(promo: PromoCodeApi): string {
  if (promo.kind === "special_access") return "Special access";
  if (!promo.discountMode || promo.discountValue == null) return "Discount";
  if (promo.discountMode === "percentage") return `${promo.discountValue}% off`;
  return `$${promo.discountValue.toFixed(2)} off`;
}

function mapApiToRow(api: PromoCodeApi): PromoCodeRow {
  return {
    id: api._id,
    title: api.name,
    code: api.code,
    description: api.description ?? "",
    discount: formatDiscountLabel(api),
    uses: api.usesCount ?? 0,
    maxUses: api.maxUses ?? null,
    active: api.isActive,
  };
}

// Convert ISO string -> datetime-local value "YYYY-MM-DDTHH:mm" in local time
function toDatetimeLocalValue(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function coerceParamToString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value;
  if (Array.isArray(value) && typeof value[0] === "string" && value[0].trim()) {
    return value[0];
  }
  return null;
}

/* ========================= Form value types ========================= */

type PromoCodeFormValues = {
  name: string;
  description: string;
  code: string;

  kind: PromoCodeKind;

  discountMode: PromoDiscountMode;
  discountValue: number | null;

  overallItems: number | null;

  maxUses: number | null;
  isActive: boolean;

  validFrom: string | null; // datetime-local string
  validUntil: string | null;

  applicableTicketTypeIds: string[];
};

/* ======================= PromoCodeWizard ======================= */

type StepId = "general" | "type" | "schedule" | "applicability";

type StepDef = {
  id: StepId;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const steps: StepDef[] = [
  { id: "general", label: "General", icon: (props) => <Percent {...props} /> },
  { id: "type", label: "Promo type", icon: (props) => <KeyRound {...props} /> },
  {
    id: "schedule",
    label: "Schedule",
    icon: (props) => <CalendarClock {...props} />,
  },
  {
    id: "applicability",
    label: "Applicability",
    icon: (props) => <ListChecks {...props} />,
  },
];

type PromoCodeWizardProps = {
  eventId: string;
  mode: "create" | "edit";
  promoId?: string;
  initial?: PromoCodeApi;
  onCancel: () => void;
  onDone: () => void;
};

function PromoCodeWizard({
  eventId,
  mode,
  promoId,
  initial,
  onCancel,
  onDone,
}: PromoCodeWizardProps) {
  const [activeStep, setActiveStep] = useState<0 | 1 | 2 | 3>(0);
  const [serverError, setServerError] = useState<string | null>(null);

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

  const defaultValues: PromoCodeFormValues = useMemo(() => {
    if (!initial) {
      return {
        name: "",
        description: "",
        code: "",
        kind: "discount",
        discountMode: "percentage",
        discountValue: 20,
        overallItems: null,
        maxUses: null,
        isActive: true,
        validFrom: null,
        validUntil: null,
        applicableTicketTypeIds: [],
      };
    }

    return {
      name: initial.name ?? "",
      description: initial.description ?? "",
      code: initial.code ?? "",
      kind: initial.kind ?? "discount",
      discountMode: (initial.discountMode ?? "percentage") as PromoDiscountMode,
      discountValue:
        typeof initial.discountValue === "number"
          ? initial.discountValue
          : null,
      overallItems:
        typeof initial.overallItems === "number" ? initial.overallItems : null,
      maxUses: typeof initial.maxUses === "number" ? initial.maxUses : null,
      isActive: Boolean(initial.isActive),
      validFrom: toDatetimeLocalValue(initial.validFrom),
      validUntil: toDatetimeLocalValue(initial.validUntil),
      applicableTicketTypeIds: Array.isArray(initial.applicableTicketTypeIds)
        ? initial.applicableTicketTypeIds
        : [],
    };
  }, [initial]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<PromoCodeFormValues>({
    defaultValues,
  });

  useEffect(() => {
    const v = defaultValues;
    setValue("name", v.name, { shouldDirty: false });
    setValue("description", v.description, { shouldDirty: false });
    setValue("code", v.code, { shouldDirty: false });
    setValue("kind", v.kind, { shouldDirty: false });
    setValue("discountMode", v.discountMode, { shouldDirty: false });
    setValue("discountValue", v.discountValue, { shouldDirty: false });
    setValue("overallItems", v.overallItems, { shouldDirty: false });
    setValue("maxUses", v.maxUses, { shouldDirty: false });
    setValue("isActive", v.isActive, { shouldDirty: false });
    setValue("validFrom", v.validFrom, { shouldDirty: false });
    setValue("validUntil", v.validUntil, { shouldDirty: false });
    setValue("applicableTicketTypeIds", v.applicableTicketTypeIds, {
      shouldDirty: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValues]);

  const kind = watch("kind");
  const discountMode = watch("discountMode");
  const applicableTicketTypeIds = watch("applicableTicketTypeIds");

  const titles =
    mode === "edit"
      ? ([
          "Edit promo code",
          "Promo code type",
          "Set availability",
          "Choose where this code applies",
        ] as const)
      : ([
          "Create promo code",
          "Promo code type",
          "Set availability",
          "Choose where this code applies",
        ] as const);

  const { data: ticketTypes } = useQuery<TicketTypeOption[]>({
    queryKey: ["promo-ticket-types", eventId],
    enabled: Boolean(eventId),
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/ticket-types`);
      if (!res.ok) throw new Error("Failed to load ticket types");
      const json = (await res.json()) as TicketTypeApi[];
      return json.map((t) => ({
        _id: t._id,
        name: t.name,
        price: t.price,
        currency: t.currency,
      }));
    },
    staleTime: 60_000,
  });

  const toggleTicket = (id: string) => {
    const current = applicableTicketTypeIds || [];
    if (current.includes(id)) {
      setValue(
        "applicableTicketTypeIds",
        current.filter((x) => x !== id),
        { shouldDirty: true },
      );
    } else {
      setValue("applicableTicketTypeIds", [...current, id], {
        shouldDirty: true,
      });
    }
  };

  const goNext = () =>
    setActiveStep((s) => (s < 3 ? ((s + 1) as 0 | 1 | 2 | 3) : s));
  const goPrev = () =>
    setActiveStep((s) => (s > 0 ? ((s - 1) as 0 | 1 | 2 | 3) : s));

  async function onSubmit(values: PromoCodeFormValues) {
    setServerError(null);

    const payload = {
      name: values.name,
      description: values.description || "",
      code: values.code,

      kind: values.kind,
      discountMode: values.kind === "discount" ? values.discountMode : null,
      discountValue: values.kind === "discount" ? values.discountValue : null,

      overallItems:
        values.kind === "special_access" ? values.overallItems : null,

      maxUses: values.maxUses ?? null,
      isActive: values.isActive,

      validFrom: values.validFrom,
      validUntil: values.validUntil,

      applicableTicketTypeIds: values.applicableTicketTypeIds ?? [],
    };

    const isEdit = mode === "edit";
    const url = isEdit
      ? `/api/events/${eventId}/promo-codes/${promoId ?? ""}`
      : `/api/events/${eventId}/promo-codes`;

    const method: "POST" | "PATCH" = isEdit ? "PATCH" : "POST";

    if (isEdit && !promoId) {
      setServerError("Missing promo id for edit.");
      return;
    }

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      setServerError(text || "Failed to save promo code. Please try again.");
      return;
    }

    onDone();
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
      {/* Stepper header */}
      <div className="-mx-6">
        <div
          className={clsx(
            "tikd-ttw-stepper",
            stepBurst && "tikd-ttw-stepper--burst",
          )}
        >
          <div className="tikd-ttw-stepperInner px-8 py-4">
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

      {/* Title + close */}
      <div className="mt-1 flex items-start justify-between gap-3">
        <div>
          <h2 className="mt-1 text-lg font-semibold text-neutral-0">
            {titles[activeStep]}
          </h2>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#181828] text-neutral-400 hover:text-neutral-50 cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Bodies */}
      <div className="mt-1 space-y-6">
        {activeStep === 0 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block font-medium text-neutral-0">
                Promo code title
              </label>
              <input
                type="text"
                placeholder="Early bird – 20% off"
                {...register("name")}
                className="w-full rounded-lg border border-white/10 bg-[#0F1018] px-4 py-2  text-neutral-0 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <div className="space-y-2">
              <label className="block font-medium text-neutral-0">
                Promo code
              </label>
              <input
                type="text"
                placeholder="EARLYBIRD20"
                {...register("code")}
                className="w-full rounded-lg border border-white/10 bg-[#0F1018] px-4 py-2  text-neutral-0 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <p className="pt-1 text-[11px] text-neutral-500">
                This is what guests will type at checkout.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block font-medium text-neutral-0">
                Internal description (optional)
              </label>
              <textarea
                rows={2}
                placeholder="For early supporters and partners…"
                {...register("description")}
                className="w-full resize-none rounded-lg border border-white/10 bg-[#0F1018] px-4 py-2  text-neutral-0 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <div className="mt-8 flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={onCancel}
                className="cursor-pointer rounded-full bg-neutral-50 px-7 py-2.5 text-[13px] font-medium text-neutral-950 hover:bg-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={goNext}
                className="cursor-pointer rounded-full border border-[#FFFFFF1A] bg-primary-500 px-7 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-primary-400"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {activeStep === 1 && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  setValue("kind", "discount", { shouldDirty: true })
                }
                className={clsx(
                  "flex flex-col items-center gap-3 rounded-lg border px-4 py-4 text-center transition-all bg-neutral-900",
                  kind === "discount"
                    ? "border-primary-500"
                    : "border-white/10 hover:border-white/30",
                )}
              >
                <span
                  className={clsx(
                    "flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-0",
                    kind === "discount"
                      ? "text-primary-500"
                      : "text-neutral-400",
                  )}
                >
                  <Percent className="h-4 w-4" />
                </span>
                <div className="flex flex-col items-center gap-1">
                  <span className=" font-semibold text-neutral-0">
                    Discount
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    Apply a percentage or fixed amount off eligible tickets.
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  setValue("kind", "special_access", { shouldDirty: true })
                }
                className={clsx(
                  "flex flex-col items-center gap-3 rounded-lg border px-4 py-4 text-center transition-all bg-neutral-900",
                  kind === "special_access"
                    ? "border-primary-500"
                    : "border-white/10 hover:border-white/30",
                )}
              >
                <span
                  className={clsx(
                    "flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-0",
                    kind === "special_access"
                      ? "text-primary-500"
                      : "text-neutral-400",
                  )}
                >
                  <KeyRound className="h-4 w-4" />
                </span>
                <div className="flex flex-col items-center gap-1">
                  <span className=" font-semibold text-neutral-0">
                    Special access
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    Unlock hidden tickets or limited items for selected guests.
                  </span>
                </div>
              </button>
            </div>

            {kind === "discount" && (
              <div className="grid grid-cols-[2fr,1.2fr] gap-3">
                <div className="space-y-1.5">
                  <label className="block font-medium text-neutral-100">
                    Discount amount
                  </label>
                  <input
                    type="number"
                    step={discountMode === "amount" ? 0.5 : 1}
                    min={0}
                    {...register("discountValue", {
                      setValueAs: (v) => (v === "" ? null : Number(v)),
                    })}
                    className="w-full rounded-lg border border-white/10 bg-neutral-900 px-4 py-2 text-neutral-0 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder={discountMode === "percentage" ? "20" : "5"}
                  />
                  <p className="pt-1 text-[11px] text-neutral-500">
                    {discountMode === "percentage"
                      ? "Percentage off the total of applicable tickets."
                      : "Fixed amount off the total of applicable tickets."}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block font-medium text-neutral-100">
                    Percentage or dollar amount
                  </label>
                  <div className="relative">
                    <select
                      {...register("discountMode")}
                      className="w-full appearance-none rounded-lg border border-white/10 bg-neutral-900 px-4 py-2 text-neutral-0 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    >
                      <option value="percentage">Percentage</option>
                      <option value="amount">Dollar amount</option>
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500">
                      ▾
                    </span>
                  </div>
                </div>
              </div>
            )}

            {kind === "special_access" && (
              <div className="space-y-1.5">
                <label className="block font-medium text-neutral-100">
                  Overall items obtained
                </label>
                <input
                  type="number"
                  min={1}
                  {...register("overallItems", {
                    setValueAs: (v) => (v === "" ? null : Number(v)),
                  })}
                  placeholder="e.g. 2"
                  className="w-full rounded-lg border border-white/10 bg-neutral-900 px-4 py-2 text-neutral-0 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <p className="pt-1 text-[11px] text-neutral-500">
                  Optional: limit how many items someone can unlock with this
                  code.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block font-medium text-neutral-100">
                Maximum uses
              </label>
              <input
                type="number"
                min={1}
                {...register("maxUses", {
                  setValueAs: (v) => (v === "" ? null : Number(v)),
                })}
                placeholder="Unlimited"
                className="w-full rounded-lg border border-white/10 bg-neutral-900 px-4 py-2 text-neutral-0 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <p className="pt-1 text-[11px] text-neutral-500">
                Leave empty for unlimited redemptions.
              </p>
            </div>

            <div className="mt-8 flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={goPrev}
                className="cursor-pointer rounded-full bg-neutral-50 px-7 py-2.5 text-[13px] font-medium text-neutral-950 hover:bg-white"
              >
                Go back
              </button>
              <button
                type="button"
                onClick={goNext}
                className="cursor-pointer rounded-full border border-[#FFFFFF1A] bg-primary-500 px-7 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-primary-400"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {activeStep === 2 && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="block font-medium text-neutral-100">
                  Available from
                </label>
                <input
                  type="datetime-local"
                  {...register("validFrom")}
                  className="w-full rounded-lg border border-white/10 bg-neutral-900 px-4 py-2 text-neutral-0 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div className="space-y-2">
                <label className="block font-medium text-neutral-100">
                  Expires at
                </label>
                <input
                  type="datetime-local"
                  {...register("validUntil")}
                  className="w-full rounded-lg border border-white/10 bg-neutral-900 px-4 py-2 text-neutral-0 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="mt-8 flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={goPrev}
                className="cursor-pointer rounded-full bg-neutral-50 px-7 py-2.5 text-[13px] font-medium text-neutral-950 hover:bg-white"
              >
                Go back
              </button>
              <button
                type="button"
                onClick={goNext}
                className="cursor-pointer rounded-full border border-[#FFFFFF1A] bg-primary-500 px-7 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-primary-400"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {activeStep === 3 && (
          <div className="space-y-5">
            <div className="rounded-lg border border-white/10 bg-neutral-900">
              <div className="border-b border-white/10 px-4 py-3 font-medium text-neutral-200">
                Per sale
              </div>
              <div className="divide-y divide-white/8">
                {ticketTypes && ticketTypes.length > 0 ? (
                  ticketTypes.map((t) => {
                    const checked =
                      applicableTicketTypeIds?.includes(t._id) ?? false;
                    return (
                      <button
                        key={t._id}
                        type="button"
                        onClick={() => toggleTicket(t._id)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left "
                      >
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-neutral-0">
                            {t.name}
                          </span>
                          <span className="text-[11px] text-neutral-500">
                            ${t.price.toFixed(2)} {t.currency}
                          </span>
                        </div>
                        <div
                          className={clsx(
                            "relative inline-flex h-5 w-9 items-center rounded-full border transition-colors",
                            checked
                              ? "border-primary-500 bg-primary-600"
                              : "border-white/20 bg-[#171826]",
                          )}
                        >
                          <span
                            className={clsx(
                              "absolute left-[3px] h-3.5 w-3.5 rounded-full bg-white transition-transform",
                              checked && "translate-x-4",
                            )}
                          />
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="px-4 py-4 text-[11px] text-neutral-400">
                    No ticket types yet. This code will be ready, and you can
                    attach tickets later.
                  </div>
                )}
              </div>
            </div>

            {serverError && (
              <p className="text-[11px] text-error-400">{serverError}</p>
            )}

            <div className="mt-6 flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={goPrev}
                disabled={isSubmitting}
                className="rounded-full bg-white px-6 py-3 font-medium text-neutral-950 hover:bg-neutral-100 cursor-pointer"
              >
                Go back
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-full bg-primary-500 border border-[#FFFFFF1A] px-6 py-3 text-white font-medium hover:bg-primary-400 disabled:opacity-60 cursor-pointer transition-colors"
              >
                {isSubmitting ? "Saving…" : "Complete"}
              </button>
            </div>
          </div>
        )}
      </div>
    </form>
  );
}

/* ========================== Page component ========================= */

type ModeState =
  | { kind: "list" }
  | { kind: "create" }
  | { kind: "edit"; promoId: string };

type ConfirmState =
  | { open: false }
  | { open: true; promoId: string; title: string };

export default function PromoCodesPage() {
  const params = useParams() as Record<string, unknown>;
  const eventId = useMemo(() => coerceParamToString(params.eventId), [params]);

  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<ModeState>({ kind: "list" });

  // dots menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [confirm, setConfirm] = useState<ConfirmState>({ open: false });

  // modal shells for click-outside
  const wizardShellRef = useRef<HTMLDivElement | null>(null);
  const confirmShellRef = useRef<HTMLDivElement | null>(null);

  // close dots menu on outside click (same pattern as ticket-types page)
  useEffect(() => {
    if (!openMenuId) return;

    const onDown = (e: MouseEvent | PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest?.("[data-pc-menu-root]")) return;
      setOpenMenuId(null);
    };

    window.addEventListener("pointerdown", onDown, { passive: true });
    return () => window.removeEventListener("pointerdown", onDown);
  }, [openMenuId]);

  const {
    data: promosApi,
    isLoading,
    isError,
    refetch,
  } = useQuery<PromoCodeApi[]>({
    queryKey: ["promo-codes", eventId],
    enabled: Boolean(eventId),
    queryFn: async (): Promise<PromoCodeApi[]> => {
      if (!eventId) return [];
      const res = await fetch(`/api/events/${eventId}/promo-codes`);
      if (!res.ok) throw new Error("Failed to load promo codes");
      return (await res.json()) as PromoCodeApi[];
    },
    staleTime: 60_000,
  });

  const rows = useMemo(() => (promosApi ?? []).map(mapApiToRow), [promosApi]);

  const apiById = useMemo(() => {
    const m = new Map<string, PromoCodeApi>();
    for (const p of promosApi ?? []) m.set(p._id, p);
    return m;
  }, [promosApi]);

  const filtered = useMemo(() => {
    const list = rows;
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter((p) => p.code.toLowerCase().includes(q));
  }, [rows, query]);

  const closeModal = () => setMode({ kind: "list" });

  const onOverlayPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const shell = wizardShellRef.current;
    const target = e.target as Node | null;

    if (!shell || !target) {
      closeModal();
      return;
    }
    if (!shell.contains(target)) closeModal();
  };

  const doDelete = useCallback(
    async (promoId: string) => {
      if (!eventId) return;

      const res = await fetch(`/api/events/${eventId}/promo-codes/${promoId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        console.error("Failed to delete promo code", await res.text());
        return;
      }

      await refetch();
    },
    [eventId, refetch],
  );

  const editInitial =
    mode.kind === "edit" ? apiById.get(mode.promoId) : undefined;

  return (
    <div className="space-y-6">
      {!eventId && (
        <div className="text-error-400">Missing event id in route params.</div>
      )}

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-neutral-0">Promo codes</h2>
          <p className="mt-1 text-neutral-500">
            Create discount and access codes for early birds, partners and VIPs.
          </p>
        </div>

        <Button
          type="button"
          aria-label="Create promo code"
          onClick={() => setMode({ kind: "create" })}
          animation={true}
          disabled={!eventId}
        >
          <Plus className="h-4 w-4" />
          Create Promo Code
        </Button>
      </header>

      {!eventId ? null : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full max-w-xs">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="search"
                placeholder="Search promo codes…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-full border border-white/10 bg-neutral-950 px-9 py-2 text-neutral-0 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <p className="text-[12px] text-neutral-400">
              {filtered?.length ?? 0} promo code
              {filtered && filtered.length === 1 ? "" : "s"}
            </p>
          </div>

          {isLoading && (
            <div className="rounded-card border border-white/8 bg-neutral-948/90 px-6 py-8 text-center  text-neutral-300">
              Loading promo codes…
            </div>
          )}

          {isError && !isLoading && (
            <div className="rounded-card border border-error-600/40 bg-error-950/60 px-6 py-8 text-center  text-error-200">
              Failed to load promo codes. Please refresh the page.
            </div>
          )}

          {!isLoading && !isError && (filtered?.length ?? 0) === 0 && (
            <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-white/10 bg-neutral-950/80 px-6 py-12 text-center">
              <Percent className="mb-3 h-7 w-7 text-neutral-500" />
              <p className="text-sm font-medium text-neutral-0">
                No promo codes yet
              </p>
              <p className="mt-1 max-w-md  text-neutral-400">
                Create your first code to reward loyal guests or unlock hidden
                ticket types.
              </p>
            </div>
          )}

          {!isLoading && !isError && filtered && filtered.length > 0 && (
            <div className="space-y-3">
              {filtered.map((p) => {
                const isMenuOpen = openMenuId === p.id;

                return (
                  <div key={p.id} className="relative overflow-visible">
                    <RowCard
                      className="overflow-visible"
                      icon={<Percent className="h-5 w-5" />}
                      title={p.title}
                      description={p.description}
                      meta={
                        <>
                          <RowCardStat label="Code" value={p.code} />
                          <RowCardStat
                            label="Discount / type"
                            value={p.discount}
                          />
                          <RowCardStat
                            label="Uses"
                            value={`${p.uses}${p.maxUses != null ? ` / ${p.maxUses}` : ""}`}
                          />
                          <div className="min-w-[110px] text-right">
                            <div className="text-[11px] text-neutral-500">
                              Status
                            </div>
                            <span
                              className={clsx(
                                "mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                                p.active
                                  ? "border border-primary-700/40 bg-primary-900/30 text-primary-300"
                                  : "border border-white/10 bg-neutral-900 text-neutral-200",
                              )}
                            >
                              {p.active ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </>
                      }
                      actions={
                        <div className="relative" data-pc-menu-root>
                          {/* ✅ Ticket-types style dots button */}
                          <button
                            type="button"
                            aria-haspopup="menu"
                            aria-expanded={isMenuOpen}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setOpenMenuId((prev) =>
                                prev === p.id ? null : p.id,
                              );
                            }}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full cursor-pointer border border-white/10 bg-neutral-950 text-neutral-300 transition-colors hover:border-primary-500 hover:text-primary-200"
                          >
                            <EllipsisVertical className="h-4 w-4" />
                          </button>

                          {isMenuOpen && (
                            <div
                              role="menu"
                              aria-label="Promo code actions"
                              className={clsx(
                                "absolute right-0 z-50 mt-2 w-[170px] overflow-hidden rounded-2xl",
                                "border border-white/10 bg-neutral-950/95 backdrop-blur-xl",
                                "shadow-[0_18px_55px_rgba(0,0,0,0.65)]",
                              )}
                            >
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setMode({ kind: "edit", promoId: p.id });
                                }}
                                className={clsx(
                                  "flex w-full items-center gap-2 px-4 py-3 text-left",
                                  "text-[13px] text-neutral-100 hover:bg-white/6 transition-colors cursor-pointer",
                                )}
                              >
                                <Pencil className="h-4 w-4 text-neutral-200" />
                                Edit
                              </button>

                              <div className="h-px w-full bg-white/10" />

                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setConfirm({
                                    open: true,
                                    promoId: p.id,
                                    title: p.title,
                                  });
                                }}
                                className={clsx(
                                  "flex w-full items-center gap-2 px-4 py-3 text-left",
                                  "text-[13px] text-error-200 hover:bg-error-950/40 transition-colors cursor-pointer",
                                )}
                              >
                                <Trash2 className="h-4 w-4 text-error-200" />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      }
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Create/Edit modal */}
          {(mode.kind === "create" || mode.kind === "edit") && (
            <div
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              role="dialog"
              aria-modal="true"
              onPointerDown={onOverlayPointerDown}
            >
              <div className="h-full overflow-y-auto">
                <div className="flex min-h-full items-start justify-center px-3 py-10">
                  <div
                    ref={wizardShellRef}
                    className="tikd-ttw-modalShell w-full max-w-[550px] overflow-hidden rounded-3xl border border-white/10 bg-neutral-950"
                  >
                    <PromoCodeWizard
                      eventId={eventId}
                      mode={mode.kind === "edit" ? "edit" : "create"}
                      promoId={mode.kind === "edit" ? mode.promoId : undefined}
                      initial={mode.kind === "edit" ? editInitial : undefined}
                      onCancel={closeModal}
                      onDone={async () => {
                        await refetch();
                        closeModal();
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Delete confirm */}
          {confirm.open && (
            <div
              className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
              role="dialog"
              aria-modal="true"
              aria-label="Delete promo code"
              onPointerDownCapture={(e) => {
                const t = e.target as HTMLElement | null;
                if (!t) return;
                if (!t.closest(".tikd-pc-del-shell"))
                  setConfirm({ open: false });
              }}
            >
              <div
                ref={confirmShellRef}
                className={clsx(
                  "tikd-pc-del-shell w-full max-w-[520px] rounded-3xl border border-white/10 bg-neutral-950",
                  "shadow-[0_28px_90px_rgba(0,0,0,0.72)]",
                )}
              >
                <div className="flex items-start justify-between gap-3 px-6 pt-6">
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-0">
                      Delete promo code?
                    </h3>
                    <p className="mt-1 text-sm text-neutral-400">
                      This will permanently remove{" "}
                      <span className="font-semibold text-neutral-100">
                        {confirm.title}
                      </span>
                      . Guests will no longer be able to use it.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setConfirm({ open: false })}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-[#181828] text-neutral-400 hover:text-neutral-50 cursor-pointer transition-colors outline-none"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-5 px-6 pb-6">
                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setConfirm({ open: false })}
                      className={clsx(
                        "h-11 rounded-full px-6 text-sm font-semibold",
                        "border border-white/10 bg-neutral-900 text-neutral-100 hover:bg-neutral-800/80",
                        "transition-colors cursor-pointer",
                      )}
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        const promoId = confirm.promoId;
                        setConfirm({ open: false });
                        await doDelete(promoId);
                      }}
                      className={clsx(
                        "h-11 rounded-full px-6 text-sm font-semibold",
                        "border border-error-600/35 bg-error-950/55 text-error-200",
                        "hover:bg-error-950/70 hover:border-error-500/45",
                        "transition-colors cursor-pointer",
                      )}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
