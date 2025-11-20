// src/components/bits/InviteTeamModal.tsx
"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import {
  X,
  Mail,
  ShieldCheck,
  Megaphone,
  ScanLine,
  Users as UsersIcon,
  Clock3,
  Calendar as CalendarIcon,
  Check,
  Loader2,
} from "lucide-react";
import ShineCard from "./ShineCard";

/* ----------------------------- Types ----------------------------- */
export type Role = "admin" | "promoter" | "scanner" | "collaborator";
export type InvitePayload = {
  email: string;
  role: Role;
  temporaryAccess: boolean;
  expiresAt?: string;
  /** Whether the member gets access to existing and/or future events */
  applyTo?: { existing: boolean; future: boolean };
};

type Props = {
  open: boolean;
  onClose: () => void;
  onInvite: (payload: InvitePayload) => void;
  isSubmitting?: boolean;
};

/* ----------------------------- Helpers --------------------------- */
function validateEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}
function prettyDate(d?: string) {
  if (!d) return "";
  return new Date(d).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ROLE_ICONS: Record<Role, ReactNode> = {
  admin: <ShieldCheck className="h-5 w-5" />,
  promoter: <Megaphone className="h-5 w-5" />,
  scanner: <ScanLine className="h-5 w-5" />,
  collaborator: <UsersIcon className="h-5 w-5" />,
};

/* --------------------------- a11y focus trap --------------------- */
function useFocusTrap(
  active: boolean,
  containerRef: { current: HTMLElement | null }
) {
  useEffect(() => {
    if (!active || !containerRef.current) return;
    const el = containerRef.current;
    const qs = 'a,button,input,textarea,select,[tabindex]:not([tabindex="-1"])';
    const nodes = Array.from(el.querySelectorAll<HTMLElement>(qs)).filter(
      (n) => !n.hasAttribute("disabled")
    );
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      if (document.activeElement === last && !e.shiftKey) {
        e.preventDefault();
        first?.focus();
      } else if (document.activeElement === first && e.shiftKey) {
        e.preventDefault();
        last?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    first?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [active, containerRef]);
}

/* -------------------------- Stepper (clean + bounded) ------------ */
function Stepper({
  step,
  labels,
}: {
  step: 1 | 2 | 3;
  labels: [string, string, string];
}) {
  const progressPct = step === 1 ? 0 : step === 2 ? 50 : 100;
  const DOT_RADIUS_PX = 14;

  return (
    <div className="relative px-6 pt-5 pb-2">
      <div className="relative">
        <div
          className="h-px bg-white/10"
          style={{ marginLeft: DOT_RADIUS_PX, marginRight: DOT_RADIUS_PX }}
          aria-hidden="true"
        />
        <div
          className="absolute left-0 right-0 top-1/2 -translate-y-1/2"
          aria-hidden="true"
          style={{ paddingLeft: DOT_RADIUS_PX, paddingRight: DOT_RADIUS_PX }}
        >
          <div
            className="h-[2px] rounded bg-[linear-gradient(90deg,theme(colors.primary.600),theme(colors.primary.400))] transition-[width] duration-300 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <ol className="mt-3 grid grid-cols-3 items-start">
        {labels.map((label, i) => {
          const idx = (i + 1) as 1 | 2 | 3;
          const active = step === idx;
          const done = step > idx;
          return (
            <li key={label} className="flex flex-col items-center">
              <div
                className={clsx(
                  "relative z-[1] grid size-7 place-items-center rounded-full border text-[12px] font-medium",
                  done
                    ? "border-primary-700 bg-primary-700 text-white"
                    : active
                      ? "border-primary-600 bg-neutral-950 text-primary-200 ring-2 ring-primary-700/35"
                      : "border-white/15 bg-neutral-900 text-neutral-300"
                )}
                aria-current={active ? "step" : undefined}
                title={label}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : idx}
              </div>
              <div
                className={clsx(
                  "mt-2 text-sm leading-tight text-center",
                  active
                    ? "text-neutral-0"
                    : done
                      ? "text-neutral-200"
                      : "text-neutral-400"
                )}
              >
                {label}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ------------------------------ Modal ---------------------------- */
export default function InviteTeamModal({
  open,
  onClose,
  onInvite,
  isSubmitting,
}: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [role, setRole] = useState<Role>("collaborator");
  const [email, setEmail] = useState("");
  const [temporary, setTemporary] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string>("");

  // Apply to which events?
  const [applyExisting, setApplyExisting] = useState(true);
  const [applyFuture, setApplyFuture] = useState(true);

  const overlayRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap(open, panelRef);

  // Reset most fields when the modal closes
  useEffect(() => {
    if (!open) {
      setStep(1);
      setRole("collaborator");
      setEmail("");
      setTemporary(false);
      setExpiresAt("");
    }
  }, [open]);

  // Ensure both checkboxes are checked whenever the modal opens
  useEffect(() => {
    if (open) {
      setApplyExisting(true);
      setApplyFuture(true);
    }
  }, [open]);

  if (!open) return null;

  const emailValid = validateEmail(email);
  const canSubmit =
    step === 3 && emailValid && (!temporary || Boolean(expiresAt));

  const next = () => setStep((s) => (s < 3 ? ((s + 1) as 1 | 2 | 3) : s));
  const back = () => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s));
  const submit = () =>
    onInvite({
      email: email.trim(),
      role,
      temporaryAccess: temporary,
      expiresAt: temporary ? expiresAt || undefined : undefined,
      applyTo: { existing: applyExisting, future: applyFuture },
    });

  return (
    <div
      ref={overlayRef}
      className={clsx(
        "fixed inset-0 z-50 grid place-items-center p-3 md:p-6",
        "backdrop-blur-sm bg-black/80"
      )}
      aria-modal="true"
      role="dialog"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <ShineCard
        className="w-full max-w-2xl shadow-2xl shadow-black/40"
        surfaceClassName={clsx(
          "backdrop-blur-xl",
          "bg-[linear-gradient(180deg,rgba(12,12,20,0.92),rgba(18,18,32,0.92))]",
          "before:pointer-events-none before:absolute before:inset-0 before:rounded-2xl before:bg-[radial-gradient(600px_300px_at_50%_-10%,rgba(154,70,255,0.08),transparent)] before:opacity-100"
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 pt-6 pb-4">
          <div>
            <h3 className="text-xl font-semibold">Add team member</h3>
            <p className="mt-1 text-sm text-neutral-300">
              Invite an admin, promoter, scanner, or collaborator to this event.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-neutral-300 hover:bg-white/5 hover:text-neutral-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Stepper */}
        <Stepper step={step} labels={["Choose role", "Add email", "Apply"]} />

        {/* Body */}
        <div className="grid gap-4 p-4 md:grid-cols-[1fr_240px]">
          <div className="min-w-0">
            {step === 1 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(
                  ["admin", "promoter", "scanner", "collaborator"] as Role[]
                ).map((r) => {
                  const active = role === r;
                  return (
                    <button
                      key={r}
                      onClick={() => setRole(r)}
                      data-active={active}
                      className={clsx(
                        "group relative flex flex-col min-h-[120px] items-start gap-3 rounded-lg p-3 text-left",
                        "ring-1 ring-inset transition",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
                        active
                          ? "bg-neutral-950/80 ring-primary-700/50"
                          : "bg-neutral-950/60 ring-white/10 hover:ring-primary-700/40"
                      )}
                    >
                      {/* icon chip */}
                      <div className="mt-0.5 shrink-0 grid size-10 place-items-center rounded-md bg-neutral-900 ring-1 ring-inset ring-white/10 group-data-[active=true]:bg-primary-900/30 text-primary-300">
                        {ROLE_ICONS[r]}
                      </div>

                      {/* text */}
                      <div className="space-y-1">
                        <div className="text-[14px] leading-tight capitalize">
                          {r}
                        </div>
                        <div className="text-sm leading-snug text-neutral-300">
                          {r === "admin" && "Full control for this event"}
                          {r === "promoter" &&
                            "Access to promo tools & sales metrics"}
                          {r === "scanner" &&
                            "Check-in (QR) tools at the door only"}
                          {r === "collaborator" &&
                            "Basic collaboration (limited actions)"}
                        </div>
                      </div>

                      {/* active glow */}
                      <span
                        className={clsx(
                          "pointer-events-none absolute inset-0 rounded-lg",
                          active
                            ? "ring-1 ring-primary-700/40 shadow-[0_0_0_1px_rgba(154,70,255,0.25)_inset]"
                            : ""
                        )}
                        aria-hidden="true"
                      />
                    </button>
                  );
                })}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <label
                  htmlFor="invite-email"
                  className="block text-sm text-neutral-300"
                >
                  Email address
                </label>
                <input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && emailValid) next();
                  }}
                  placeholder="name@example.com"
                  className={clsx(
                    "w-full rounded-lg border bg-neutral-900/80 px-4 py-3 outline-none ring-0 placeholder:text-neutral-500",
                    "focus-visible:ring-1 focus-visible:ring-primary-500",
                    email.length
                      ? emailValid
                        ? "border-white/10"
                        : "border-error-600/50"
                      : "border-white/10"
                  )}
                  autoComplete="email"
                  inputMode="email"
                />
                {!!email.length && !emailValid && (
                  <p className="text-xs text-error-300">
                    Please enter a valid email.
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs text-neutral-400">
                  <Mail className="h-4 w-4" />
                  An invitation email will be sent immediately.
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                {/* Temporary access */}
                <div className="rounded-lg border border-white/10 bg-neutral-900/50 p-4">
                  <label className="group flex items-center gap-3 rounded-lg border border-white/10 bg-neutral-900/50 p-3 hover:border-primary-700/40 focus-within:ring-1 focus-within:ring-primary-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={temporary}
                      onChange={(e) => setTemporary(e.target.checked)}
                      className="peer sr-only"
                    />

                    <span className="inline-flex items-center gap-2 text-sm">
                      <Clock3 className="h-4 w-4 opacity-80" />
                      Temporary access
                    </span>

                    {/* Indicator: note peer-checked classes on the sibling container */}
                    <span
                      aria-hidden="true"
                      className={clsx(
                        "ml-auto grid size-5 place-items-center rounded-[6px] bg-neutral-950 ring-1 ring-inset ring-white/15 transition",
                        "peer-checked:bg-primary-900/25 peer-checked:ring-primary-500",
                        // animate the inner svg from this container
                        "[&>svg]:opacity-0 [&>svg]:scale-75 [&>svg]:-rotate-6",
                        "peer-checked:[&>svg]:opacity-100 peer-checked:[&>svg]:scale-100 peer-checked:[&>svg]:rotate-0"
                      )}
                    >
                      <Check className="h-3.5 w-3.5 text-primary-400 transition-all duration-200 ease-out" />
                    </span>
                  </label>

                  {temporary && (
                    <div className="mt-3">
                      <label
                        htmlFor="expires"
                        className="block text-sm text-neutral-300"
                      >
                        Expires at
                      </label>

                      <div className="mt-2 relative">
                        <CalendarIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400/80" />
                        <input
                          id="expires"
                          type="datetime-local"
                          value={expiresAt}
                          onChange={(e) => setExpiresAt(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && canSubmit) submit();
                          }}
                          className="
                            w-full rounded-lg border border-white/10 bg-neutral-900/80 pl-11 pr-12 py-3 outline-none ring-0
                            focus-visible:ring-1 focus-visible:ring-primary-500
                            appearance-none
                            [&::-webkit-calendar-picker-indicator]:hidden
                            [&::-webkit-clear-button]:hidden
                            [&::-webkit-inner-spin-button]:hidden
                            [&::-webkit-datetime-edit]:text-neutral-0
                          "
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const el = document.getElementById(
                              "expires"
                            ) as HTMLInputElement | null;

                            if (el) {
                              const withPicker = el as HTMLInputElement & {
                                showPicker?: () => void;
                              };
                              if (typeof withPicker.showPicker === "function") {
                                withPicker.showPicker();
                              } else {
                                el.focus();
                              }
                            }
                          }}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 grid size-8 place-items-center rounded-md bg-neutral-950 ring-1 ring-inset ring-white/10 hover:ring-primary-700/40"
                          aria-label="Open date & time picker"
                          title="Open date & time picker"
                        >
                          <CalendarIcon className="h-[18px] w-[18px] text-neutral-100" />
                        </button>
                      </div>

                      <p className="mt-2 text-xs text-neutral-400">
                        After this time the membership automatically becomes{" "}
                        <em>expired</em>.
                      </p>
                    </div>
                  )}
                </div>

                {/* Apply to events? */}
                <section className="space-y-3">
                  <h4 className="text-base font-semibold text-neutral-100">
                    Apply to events?
                  </h4>
                  <p className="text-sm text-neutral-400">
                    If you uncheck, the invited member will only be added to the
                    organization and won&apos;t have access to its events.
                  </p>

                  <p className="mt-3 text-sm text-neutral-300">
                    Automatically apply to this organization&apos;s:
                  </p>

                  <div className="mt-2 space-y-3">
                    {/* Existing events */}
                    <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-neutral-950/50 p-3 hover:border-primary-700/40 focus-within:ring-1 focus-within:ring-primary-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={applyExisting}
                        onChange={(e) => setApplyExisting(e.target.checked)}
                        className="peer sr-only"
                      />
                      <span
                        className={clsx(
                          "grid size-5 place-items-center rounded-[6px] bg-neutral-950 ring-1 ring-inset ring-white/15 transition",
                          "peer-checked:bg-primary-900/25 peer-checked:ring-primary-500",
                          "[&>svg]:opacity-0 [&>svg]:scale-75 [&>svg]:-rotate-6",
                          "peer-checked:[&>svg]:opacity-100 peer-checked:[&>svg]:scale-100 peer-checked:[&>svg]:rotate-0"
                        )}
                      >
                        <Check className="h-3.5 w-3.5 text-primary-400 transition-all duration-200 ease-out" />
                      </span>
                      <span className="text-sm">Existing events</span>
                    </label>

                    {/* Newly created events */}
                    <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-neutral-950/50 p-3 hover:border-primary-700/40 focus-within:ring-1 focus-within:ring-primary-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={applyFuture}
                        onChange={(e) => setApplyFuture(e.target.checked)}
                        className="peer sr-only"
                      />
                      <span
                        className={clsx(
                          "grid size-5 place-items-center rounded-[6px] bg-neutral-950 ring-1 ring-inset ring-white/15 transition",
                          "peer-checked:bg-primary-900/25 peer-checked:ring-primary-500",
                          "[&>svg]:opacity-0 [&>svg]:scale-75 [&>svg]:-rotate-6",
                          "peer-checked:[&>svg]:opacity-100 peer-checked:[&>svg]:scale-100 peer-checked:[&>svg]:rotate-0"
                        )}
                      >
                        <Check className="h-3.5 w-3.5 text-primary-400 transition-all duration-200 ease-out" />
                      </span>
                      <span className="text-sm">Newly created events</span>
                    </label>
                  </div>
                </section>

                {/* compact mobile summary */}
                <div className="md:hidden rounded-lg border border-white/10 bg-neutral-900/40 p-4">
                  <h4 className="text-sm font-semibold text-neutral-100">
                    Invite Summary
                  </h4>
                  <div className="mt-3 space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="text-primary-300">{ROLE_ICONS[role]}</div>
                      <div className="capitalize">{role}</div>
                    </div>
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="h-4 w-4 text-neutral-400" />
                      <span className="truncate" title={email || "—"}>
                        {email || "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock3 className="h-4 w-4 text-neutral-400" />
                      {temporary ? (
                        <span className="truncate">
                          Until {expiresAt ? prettyDate(expiresAt) : "—"}
                        </span>
                      ) : (
                        <span>Permanent</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Live Summary (desktop) */}
          <aside className="hidden rounded-lg border border-white/10 bg-neutral-950/50 p-4 md:block self-start">
            <h4 className="text-sm font-semibold text-neutral-100">
              Invite Summary
            </h4>
            <div className="mt-3 space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="text-primary-300">{ROLE_ICONS[role]}</div>
                <div className="capitalize">{role}</div>
              </div>
              <div className="flex items-center gap-2 truncate">
                <Mail className="h-4 w-4 text-neutral-400" />
                <span className="truncate" title={email || "—"}>
                  {email || "—"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-neutral-400" />
                {temporary ? (
                  <span className="truncate">
                    Until {expiresAt ? prettyDate(expiresAt) : "—"}
                  </span>
                ) : (
                  <span>Permanent</span>
                )}
              </div>
            </div>
          </aside>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-white/10 px-6 py-4">
          <button
            className="rounded-full px-3 py-2 text-sm text-neutral-300 hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            onClick={onClose}
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                className="rounded-full border border-white/10 bg-neutral-900 px-4 py-2 text-sm hover:border-primary-700/40 hover:bg-primary-900/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                onClick={back}
              >
                Back
              </button>
            )}
            {step < 3 ? (
              <button
                className="relative inline-flex items-center justify-center overflow-hidden rounded-full bg-primary-700 px-4 py-2 text-sm font-medium text-white ring-1 ring-primary-600/60 hover:bg-primary-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:transition-transform before:duration-700 hover:before:translate-x-full disabled:opacity-60"
                onClick={next}
                disabled={step === 2 && !emailValid}
              >
                Next
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={!canSubmit || isSubmitting}
                className={clsx(
                  "relative inline-flex items-center justify-center overflow-hidden rounded-full bg-primary-700 px-5 py-2 text-sm font-medium text-white ring-1 ring-primary-600/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:transition-transform before:duration-700 hover:before:translate-x-full",
                  (!canSubmit || isSubmitting) &&
                    "opacity-60 cursor-not-allowed"
                )}
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending…
                  </span>
                ) : (
                  "Invite"
                )}
              </button>
            )}
          </div>
        </div>
      </ShineCard>
    </div>
  );
}
