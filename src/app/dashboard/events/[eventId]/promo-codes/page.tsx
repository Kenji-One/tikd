// src/app/dashboard/organizations/[id]/events/[eventId]/promo-codes/page.tsx
"use client";

import { useMemo, useState, type SVGProps, type ComponentType } from "react";
import { useParams } from "next/navigation";
import {
  Search,
  Plus,
  Percent,
  KeyRound,
  CalendarClock,
  ListChecks,
  X,
  Ticket,
} from "lucide-react";

import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import clsx from "clsx";

type RouteParams = {
  id: string;
  eventId: string;
};

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
  if (promo.kind === "special_access") {
    return "Special access";
  }

  if (!promo.discountMode || promo.discountValue == null) {
    return "Discount";
  }

  if (promo.discountMode === "percentage") {
    return `${promo.discountValue}% off`;
  }

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
  {
    id: "general",
    label: "General",
    icon: (props) => <Percent {...props} />,
  },
  {
    id: "type",
    label: "Promo type",
    icon: (props) => <KeyRound {...props} />,
  },
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

const stepTitles = [
  "Create promo code",
  "Promo code type",
  "Set availability",
  "Choose where this code applies",
] as const;

type PromoCodeWizardProps = {
  eventId: string;
  onCancel: () => void;
  onCreated: () => void;
};

function PromoCodeWizard({
  eventId,
  onCancel,
  onCreated,
}: PromoCodeWizardProps) {
  const [activeStep, setActiveStep] = useState<0 | 1 | 2 | 3>(0);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<PromoCodeFormValues>({
    defaultValues: {
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
    },
  });

  const kind = watch("kind");
  const discountMode = watch("discountMode");
  const applicableTicketTypeIds = watch("applicableTicketTypeIds");

  // Fetch ticket types for applicability step
  const { data: ticketTypes } = useQuery<TicketTypeOption[]>({
    queryKey: ["promo-ticket-types", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/ticket-types`);
      if (!res.ok) {
        throw new Error("Failed to load ticket types");
      }

      const json = (await res.json()) as TicketTypeApi[];

      return json.map((t) => ({
        _id: t._id,
        name: t.name,
        price: t.price,
        currency: t.currency,
      }));
    },
  });

  const toggleTicket = (id: string) => {
    const current = applicableTicketTypeIds || [];
    if (current.includes(id)) {
      setValue(
        "applicableTicketTypeIds",
        current.filter((x) => x !== id),
        { shouldDirty: true }
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

    const res = await fetch(`/api/events/${eventId}/promo-codes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      setServerError(text || "Failed to create promo code. Please try again.");
      return;
    }

    onCreated();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-5 px-6 py-5"
      noValidate
    >
      {/* Stepper header */}
      <div className="flex w-full items-center justify-between gap-3">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isActive = activeStep === idx;
          const isCompleted = activeStep > idx;
          const isLast = idx === steps.length - 1;

          return (
            <div
              key={step.id}
              className="flex flex-1 items-start gap-3 last:flex-none"
            >
              <button
                type="button"
                onClick={() => setActiveStep(idx as 0 | 1 | 2 | 3)}
                className="flex flex-col items-center gap-2 outline-none"
              >
                <div
                  className={clsx(
                    "flex h-9 w-9 items-center justify-center rounded-full border  transition-all duration-200",
                    isActive
                      ? "border-transparent bg-primary-600 shadow-[0_0_28px_rgba(133,0,255,0.65)]"
                      : isCompleted
                        ? "border-primary-600 bg-neutral-0"
                        : "border-neutral-700 bg-neutral-0"
                  )}
                >
                  <Icon
                    className={clsx(
                      "h-4 w-4 transition-colors duration-200",
                      isActive
                        ? "text-neutral-0"
                        : isCompleted
                          ? "text-primary-600"
                          : "text-neutral-500"
                    )}
                  />
                </div>
                <span
                  className={clsx(
                    "font-medium tracking-[0.01em] text-[11px] transition-colors duration-200",
                    isActive
                      ? "text-neutral-0"
                      : isCompleted
                        ? "text-neutral-0"
                        : "text-neutral-300"
                  )}
                >
                  {step.label}
                </span>
              </button>
              {!isLast && (
                <div className="mt-4 flex-1">
                  <div className="h-px w-full bg-neutral-700" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal title + close */}
      <div className="mt-1 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-neutral-0">
            {stepTitles[activeStep]}
          </h2>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-neutral-400 hover:text-neutral-50 cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Step bodies */}
      <div className="mt-1 space-y-6">
        {/* Step 0: General */}
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

        {/* Step 1: Type / discount */}
        {activeStep === 1 && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              {/* Discount card */}
              <button
                type="button"
                onClick={() =>
                  setValue("kind", "discount", { shouldDirty: true })
                }
                className={clsx(
                  "flex flex-col items-center gap-3 rounded-lg border px-4 py-4 text-center transition-all bg-neutral-900",
                  kind === "discount"
                    ? "border-success-500 "
                    : "border-white/10 hover:border-white/30"
                )}
              >
                <span
                  className={clsx(
                    "flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-0 ",
                    kind === "discount"
                      ? "text-success-500"
                      : "text-neutral-400"
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

              {/* Special access card */}
              <button
                type="button"
                onClick={() =>
                  setValue("kind", "special_access", { shouldDirty: true })
                }
                className={clsx(
                  "flex flex-col items-center gap-3 rounded-lg border px-4 py-4 text-center transition-all bg-neutral-900",
                  kind === "special_access"
                    ? "border-success-500 "
                    : "border-white/10 hover:border-white/30"
                )}
              >
                <span
                  className={clsx(
                    "flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-0 ",
                    kind === "special_access"
                      ? "text-success-500"
                      : "text-neutral-400"
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
                      valueAsNumber: true,
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
                  {...register("overallItems", { valueAsNumber: true })}
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
                {...register("maxUses", { valueAsNumber: true })}
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

        {/* Step 2: Schedule */}
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

        {/* Step 3: Applicability */}
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
                              : "border-white/20 bg-[#171826]"
                          )}
                        >
                          <span
                            className={clsx(
                              "absolute left-[3px] h-3.5 w-3.5 rounded-full bg-white transition-transform",
                              checked && "translate-x-4"
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

export default function PromoCodesPage() {
  const params = useParams<RouteParams>();
  const eventId = params?.eventId;

  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"list" | "create">("list");

  const {
    data: promos,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["promo-codes", eventId],
    enabled: Boolean(eventId),
    queryFn: async (): Promise<PromoCodeRow[]> => {
      const res = await fetch(`/api/events/${eventId}/promo-codes`);
      if (!res.ok) {
        throw new Error("Failed to load promo codes");
      }
      const json = (await res.json()) as PromoCodeApi[];
      return json.map(mapApiToRow);
    },
  });

  const filtered = useMemo(() => {
    const list = promos ?? [];
    if (!query.trim()) return list;
    return list.filter((p) =>
      p.code.toLowerCase().includes(query.toLowerCase())
    );
  }, [promos, query]);

  if (!eventId) {
    return (
      <div className=" text-error-400">Missing event id in route params.</div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-neutral-0">Promo codes</h2>
          <p className="mt-1 text-neutral-500">
            Create discount and access codes for early birds, partners and VIPs.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMode("create")}
          className="inline-flex items-center gap-2 rounded-full bg-primary-600 px-4 py-2  font-medium text-white shadow-[0_0_0_1px_rgba(255,255,255,0.10)] hover:bg-primary-500"
        >
          <Plus className="h-4 w-4" />
          <span>New promo code</span>
        </button>
      </header>

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
            className="w-full rounded-full border border-white/10 bg-neutral-950 px-9 py-2  text-neutral-0 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <p className="text-[11px] text-neutral-400">
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
          {filtered.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-4 rounded-card border border-white/8 bg-neutral-948/90 px-5 py-4 shadow-[0_18px_45px_rgba(0,0,0,0.7)]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary-900/70 text-primary-200">
                  <Ticket className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-0">
                    {p.title}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-neutral-400">
                    {p.description}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6  text-neutral-200">
                <div className="text-right">
                  <p className="text-[11px] text-neutral-500">Code</p>
                  <p className="font-medium">{p.code}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-neutral-500">
                    Discount / type
                  </p>
                  <p className="font-medium">{p.discount}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-neutral-500">Uses</p>
                  <p className="font-medium">
                    {p.uses}
                    {p.maxUses != null ? ` / ${p.maxUses}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-neutral-500">Status</p>
                  <span
                    className={clsx(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                      p.active
                        ? "border border-success-700/40 bg-success-900/40 text-success-300"
                        : "border border-white/10 bg-neutral-900 text-neutral-200"
                    )}
                  >
                    {p.active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal overlay for creation */}
      {mode === "create" && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
          <div className="flex min-h-full items-start justify-center px-3 py-10">
            <div className="w-full max-w-[550px] rounded-3xl border border-white/10 bg-neutral-950">
              <PromoCodeWizard
                eventId={eventId}
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
