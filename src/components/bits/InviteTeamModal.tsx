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
  Sparkles,
  Lock,
  Link2,
  Ticket,
  UserCog,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

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

const ROLE_META: Record<
  Role,
  {
    title: string;
    blurb: string;
    hint: string;
    bullets: { icon: ReactNode; text: string }[];
  }
> = {
  admin: {
    title: "Admin",
    blurb: "Full control for this organization",
    hint: "Best for owners / managers",
    bullets: [
      { icon: <UserCog className="h-4 w-4" />, text: "Manage members & roles" },
      { icon: <Lock className="h-4 w-4" />, text: "Edit settings & billing" },
      { icon: <Ticket className="h-4 w-4" />, text: "Full event permissions" },
    ],
  },
  promoter: {
    title: "Promoter",
    blurb: "Promo tools, links & sales insights",
    hint: "Best for marketing",
    bullets: [
      { icon: <Link2 className="h-4 w-4" />, text: "Create tracking links" },
      { icon: <Ticket className="h-4 w-4" />, text: "See ticket performance" },
      { icon: <UsersIcon className="h-4 w-4" />, text: "No admin privileges" },
    ],
  },
  scanner: {
    title: "Scanner",
    blurb: "Door check-in only (QR tools)",
    hint: "Best for entry team",
    bullets: [
      { icon: <ScanLine className="h-4 w-4" />, text: "Check-in guests" },
      { icon: <Lock className="h-4 w-4" />, text: "No access to settings" },
      { icon: <UsersIcon className="h-4 w-4" />, text: "Limited event views" },
    ],
  },
  collaborator: {
    title: "Collaborator",
    blurb: "Basic collaboration (limited actions)",
    hint: "Best for helpers",
    bullets: [
      { icon: <UsersIcon className="h-4 w-4" />, text: "Help manage tasks" },
      { icon: <Ticket className="h-4 w-4" />, text: "View event content" },
      { icon: <Lock className="h-4 w-4" />, text: "No critical controls" },
    ],
  },
};

const ROLE_ORDER: Role[] = ["admin", "promoter", "scanner", "collaborator"];

/* --------------------------- a11y focus trap --------------------- */
function useFocusTrap(
  active: boolean,
  containerRef: { current: HTMLElement | null },
) {
  useEffect(() => {
    if (!active || !containerRef.current) return;

    const el = containerRef.current;
    const qs = 'a,button,input,textarea,select,[tabindex]:not([tabindex="-1"])';
    const nodes = Array.from(el.querySelectorAll<HTMLElement>(qs)).filter(
      (n) => !n.hasAttribute("disabled"),
    );

    const first = nodes[0];
    const last = nodes[nodes.length - 1];

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      if (!nodes.length) return;

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

/* -------------------------- Stepper ------------------------------ */
function WizardStepper({ step }: { step: 1 | 2 | 3 }) {
  const steps = [
    { label: "Choose role", icon: ShieldCheck },
    { label: "Add email", icon: Mail },
    { label: "Apply", icon: Check },
  ] as const;

  return (
    <div className="flex w-full items-center justify-between gap-3">
      {steps.map((s, idx) => {
        const Icon = s.icon;
        const n = (idx + 1) as 1 | 2 | 3;
        const isActive = step === n;
        const isDone = step > n;
        const isLast = idx === steps.length - 1;

        return (
          <div
            key={s.label}
            className="flex flex-1 items-start gap-3 last:flex-none"
          >
            <div className="flex flex-col items-center gap-2">
              <div
                className={clsx(
                  "flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-200",
                  isActive
                    ? "border-transparent bg-primary-600 shadow-[0_0_28px_rgba(133,0,255,0.55)]"
                    : isDone
                      ? "border-primary-600 bg-neutral-0"
                      : "border-neutral-700 bg-neutral-0",
                )}
                aria-current={isActive ? "step" : undefined}
                title={s.label}
              >
                {isDone ? (
                  <Check className="h-4 w-4 text-primary-600" />
                ) : (
                  <Icon
                    className={clsx(
                      "h-4 w-4 transition-colors duration-200",
                      isActive ? "text-neutral-0" : "text-neutral-500",
                    )}
                  />
                )}
              </div>

              <span
                className={clsx(
                  "font-medium tracking-[0.01em] text-[12px] text-center",
                  isActive
                    ? "text-neutral-0"
                    : isDone
                      ? "text-neutral-100"
                      : "text-neutral-300",
                )}
              >
                {s.label}
              </span>
            </div>

            {!isLast && (
              <div className="mt-4 flex-1">
                <div className="h-px w-full bg-neutral-700" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* --------------------------- Summary Block ------------------------ */
function SummaryCard({
  role,
  email,
  temporary,
  expiresAt,
}: {
  role: Role;
  email: string;
  temporary: boolean;
  expiresAt: string;
}) {
  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-2xl border border-white/10",
        "bg-white/5 p-4",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-100"
        style={{
          background:
            "radial-gradient(900px 240px at 18% -40%, rgba(154,70,255,0.16), transparent 62%), radial-gradient(700px 240px at 92% 110%, rgba(66,139,255,0.10), transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
        }}
      />

      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div
              className={clsx(
                "inline-flex h-9 w-9 items-center justify-center rounded-xl",
                "bg-primary-500/15 text-primary-200 ring-1 ring-primary-500/20",
              )}
            >
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[13px] font-semibold text-neutral-0">
                Invite Summary
              </div>
              <div className="mt-0.5 text-[12px] text-neutral-400">
                Review details before sending.
              </div>
            </div>
          </div>

          <span className="hidden sm:inline-flex rounded-full border border-white/10 bg-neutral-950/40 px-3 py-1 text-[11px] font-semibold text-neutral-200">
            {ROLE_META[role].title}
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-neutral-950/35 p-3">
            <div className="flex items-center gap-2 text-[12px] text-neutral-400">
              <span className="text-primary-300">{ROLE_ICONS[role]}</span>
              Role
            </div>
            <div className="mt-2 text-[13px] font-semibold text-neutral-0">
              {ROLE_META[role].title}
            </div>
            <div className="mt-1 text-[12px] text-neutral-500">
              {ROLE_META[role].hint}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-neutral-950/35 p-3">
            <div className="flex items-center gap-2 text-[12px] text-neutral-400">
              <Mail className="h-4 w-4 text-neutral-500" />
              Email
            </div>
            <div
              className="mt-2 truncate text-[13px] font-semibold text-neutral-0"
              title={email || "—"}
            >
              {email || "—"}
            </div>
            <div className="mt-1 text-[12px] text-neutral-500">
              Invite link sent via email
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-neutral-950/35 p-3">
            <div className="flex items-center gap-2 text-[12px] text-neutral-400">
              <Clock3 className="h-4 w-4 text-neutral-500" />
              Access
            </div>
            <div className="mt-2 text-[13px] font-semibold text-neutral-0">
              {temporary ? "Temporary" : "Permanent"}
            </div>
            <div className="mt-1 text-[12px] text-neutral-500">
              {temporary
                ? expiresAt
                  ? `Until ${prettyDate(expiresAt)}`
                  : "—"
                : "No expiration"}
            </div>
          </div>
        </div>
      </div>
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

  // ESC + scroll lock
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const title =
    step === 1 ? "Choose a role" : step === 2 ? "Add email" : "Apply & invite";
  const subtitle =
    step === 1
      ? "Pick the permissions level. You can change it later."
      : step === 2
        ? "We’ll send an invitation link immediately."
        : "Set access duration and how it applies to events.";

  // ✅ IMPORTANT: keep hooks stable.
  // No hooks are declared after an early return anymore.

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className={clsx(
        "fixed inset-0 z-50 overflow-y-auto",
        "bg-black/60 backdrop-blur-sm",
      )}
      aria-modal="true"
      role="dialog"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="flex min-h-full items-start justify-center px-3 py-10">
        <div
          ref={panelRef}
          className={clsx(
            "w-full max-w-[860px] rounded-3xl border border-white/10 bg-neutral-950",
            "shadow-[0_30px_120px_rgba(0,0,0,0.75)]",
          )}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (step < 3) next();
              else submit();
            }}
            className="flex flex-col gap-5 px-6 py-5"
            noValidate
          >
            <WizardStepper step={step} />

            {/* Title + close */}
            <div className="mt-1 flex items-start justify-between gap-3">
              <div>
                <h2 className="mt-1 text-lg font-semibold text-neutral-0">
                  {title}
                </h2>
                <p className="mt-1 text-[12px] text-neutral-400">{subtitle}</p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#181828] text-neutral-400 hover:text-neutral-50"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* ✅ Summary full-width on top */}
            <SummaryCard
              role={role}
              email={email}
              temporary={temporary}
              expiresAt={expiresAt}
            />

            {/* Body */}
            <div className="min-w-0">
              {step === 1 && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-neutral-950/40 p-3">
                    <div className="text-[12px] text-neutral-500">
                      Quick guide:{" "}
                      <span className="text-neutral-300">
                        Admin = everything. Promoter = marketing & sales.
                        Scanner = check-ins only. Collaborator = basic help.
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {ROLE_ORDER.map((r) => {
                      const meta = ROLE_META[r];
                      const active = role === r;

                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRole(r)}
                          className={clsx(
                            "group relative overflow-hidden rounded-2xl p-4 text-left",
                            "border transition-all duration-200",
                            "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
                            active
                              ? "border-primary-600/35 bg-primary-950/20 shadow-[0_14px_44px_rgba(154,70,255,0.07)]"
                              : "border-white/10 bg-white/5 hover:bg-white/7",
                          )}
                        >
                          {/* subtle active wash */}
                          <div
                            aria-hidden="true"
                            className={clsx(
                              "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200",
                              active && "opacity-100",
                            )}
                            style={{
                              background:
                                "radial-gradient(520px 180px at 78% 0%, rgba(154,70,255,0.12), transparent 60%), radial-gradient(520px 220px at 18% 120%, rgba(66,139,255,0.07), transparent 58%)",
                            }}
                          />

                          <div className="relative flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <div
                                className={clsx(
                                  "grid size-11 place-items-center rounded-2xl",
                                  active
                                    ? "bg-primary-500/15 text-primary-200 ring-1 ring-primary-500/25"
                                    : "bg-neutral-950/40 text-primary-300 ring-1 ring-white/10",
                                )}
                              >
                                {ROLE_ICONS[r]}
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <div className="text-[15px] font-semibold text-neutral-0">
                                    {meta.title}
                                  </div>
                                  <span
                                    className={clsx(
                                      "rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-opacity",
                                      active
                                        ? "border-primary-500/20 bg-primary-900/15 text-primary-200 opacity-100"
                                        : "border-transparent bg-transparent text-transparent opacity-0",
                                    )}
                                    aria-hidden={!active}
                                  >
                                    Selected
                                  </span>
                                </div>

                                <div className="mt-1 text-[13px] leading-snug text-neutral-400">
                                  {meta.blurb}
                                </div>

                                <div className="mt-3 grid gap-2">
                                  {meta.bullets.map((b, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-center gap-2 text-[12px] text-neutral-500"
                                    >
                                      <span className="text-neutral-600">
                                        {b.icon}
                                      </span>
                                      <span className="text-neutral-400">
                                        {b.text}
                                      </span>
                                    </div>
                                  ))}
                                </div>

                                <div className="mt-3 text-[12px] text-neutral-500">
                                  {meta.hint}
                                </div>
                              </div>
                            </div>

                            {/* radio */}
                            <span
                              aria-hidden="true"
                              className={clsx(
                                "mt-1 grid size-6 place-items-center rounded-full border",
                                active
                                  ? "border-primary-500 bg-primary-600 shadow-[0_0_18px_rgba(133,0,255,0.45)]"
                                  : "border-white/15 bg-transparent",
                              )}
                            >
                              <span
                                className={clsx(
                                  "h-2.5 w-2.5 rounded-full bg-white transition-opacity",
                                  active ? "opacity-100" : "opacity-0",
                                )}
                              />
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-3">
                  <label
                    htmlFor="invite-email"
                    className="block text-[12px] font-semibold text-neutral-200"
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
                      "h-11 w-full rounded-xl border bg-neutral-950 px-4 text-[13px] text-neutral-0",
                      "placeholder:text-neutral-600 outline-none",
                      email.length
                        ? emailValid
                          ? "border-white/10 focus:ring-1 focus:ring-primary-500"
                          : "border-error-600/60 focus:ring-1 focus:ring-error-500"
                        : "border-white/10 focus:ring-1 focus:ring-primary-500",
                    )}
                    autoComplete="email"
                    inputMode="email"
                  />

                  {!!email.length && !emailValid && (
                    <p className="text-xs text-error-300">
                      Please enter a valid email.
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <Mail className="h-4 w-4" />
                    An invitation email will be sent immediately.
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  {/* Temporary access */}
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <label className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-neutral-950/50 p-3 hover:border-primary-700/40 focus-within:ring-1 focus-within:ring-primary-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={temporary}
                        onChange={(e) => setTemporary(e.target.checked)}
                        className="peer sr-only"
                      />

                      <span className="inline-flex items-center gap-2 text-sm text-neutral-100">
                        <Clock3 className="h-4 w-4 opacity-80" />
                        Temporary access
                      </span>

                      <span
                        aria-hidden="true"
                        className={clsx(
                          "ml-auto grid size-5 place-items-center rounded-[6px] bg-neutral-950 ring-1 ring-inset ring-white/15 transition",
                          "peer-checked:bg-primary-900/25 peer-checked:ring-primary-500",
                          "[&>svg]:opacity-0 [&>svg]:scale-75 [&>svg]:-rotate-6",
                          "peer-checked:[&>svg]:opacity-100 peer-checked:[&>svg]:scale-100 peer-checked:[&>svg]:rotate-0",
                        )}
                      >
                        <Check className="h-3.5 w-3.5 text-primary-400 transition-all duration-200 ease-out" />
                      </span>
                    </label>

                    {temporary && (
                      <div className="mt-4">
                        <label
                          htmlFor="expires"
                          className="block text-[12px] font-semibold text-neutral-200"
                        >
                          Expires at
                        </label>

                        <div className="mt-2 relative">
                          <CalendarIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-500" />
                          <input
                            id="expires"
                            type="datetime-local"
                            value={expiresAt}
                            onChange={(e) => setExpiresAt(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && canSubmit) submit();
                            }}
                            className={clsx(
                              "h-11 w-full rounded-xl border bg-neutral-950 pl-11 pr-12 text-[13px] text-neutral-0 outline-none",
                              "border-white/10 focus:ring-1 focus:ring-primary-500",
                              "appearance-none",
                              "[&::-webkit-calendar-picker-indicator]:hidden",
                              "[&::-webkit-clear-button]:hidden",
                              "[&::-webkit-inner-spin-button]:hidden",
                              "[&::-webkit-datetime-edit]:text-neutral-0",
                            )}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const el = document.getElementById(
                                "expires",
                              ) as HTMLInputElement | null;
                              if (!el) return;

                              const withPicker = el as HTMLInputElement & {
                                showPicker?: () => void;
                              };
                              if (typeof withPicker.showPicker === "function")
                                withPicker.showPicker();
                              else el.focus();
                            }}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 grid size-8 place-items-center rounded-lg bg-white/5 ring-1 ring-inset ring-white/10 hover:ring-primary-700/40"
                            aria-label="Open date & time picker"
                            title="Open date & time picker"
                          >
                            <CalendarIcon className="h-[18px] w-[18px] text-neutral-100" />
                          </button>
                        </div>

                        <p className="mt-2 text-xs text-neutral-500">
                          After this time the membership automatically becomes{" "}
                          <em>expired</em>.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Apply to events? */}
                  <section className="space-y-3">
                    <h4 className="text-base font-semibold text-neutral-0">
                      Apply to events?
                    </h4>
                    <p className="text-sm text-neutral-500">
                      If you uncheck, the invited member will only be added to
                      the organization and won&apos;t have access to its events.
                    </p>

                    <p className="mt-3 text-sm text-neutral-300">
                      Automatically apply to this organization&apos;s:
                    </p>

                    <div className="mt-2 space-y-3">
                      <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-neutral-950/50 p-3 hover:border-primary-700/40 focus-within:ring-1 focus-within:ring-primary-500 cursor-pointer">
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
                            "peer-checked:[&>svg]:opacity-100 peer-checked:[&>svg]:scale-100 peer-checked:[&>svg]:rotate-0",
                          )}
                        >
                          <Check className="h-3.5 w-3.5 text-primary-400 transition-all duration-200 ease-out" />
                        </span>
                        <span className="text-sm text-neutral-100">
                          Existing events
                        </span>
                      </label>

                      <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-neutral-950/50 p-3 hover:border-primary-700/40 focus-within:ring-1 focus-within:ring-primary-500 cursor-pointer">
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
                            "peer-checked:[&>svg]:opacity-100 peer-checked:[&>svg]:scale-100 peer-checked:[&>svg]:rotate-0",
                          )}
                        >
                          <Check className="h-3.5 w-3.5 text-primary-400 transition-all duration-200 ease-out" />
                        </span>
                        <span className="text-sm text-neutral-100">
                          Newly created events
                        </span>
                      </label>
                    </div>
                  </section>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <Button
                type="button"
                variant="secondary"
                onClick={step === 1 ? onClose : back}
                disabled={!!isSubmitting}
              >
                {step === 1 ? "Cancel" : "Back"}
              </Button>

              {step < 3 ? (
                <Button
                  type="button"
                  onClick={next}
                  animation
                  disabled={step === 2 && !emailValid}
                >
                  Next
                </Button>
              ) : (
                <button
                  type="button"
                  onClick={submit}
                  disabled={!canSubmit || isSubmitting}
                  className={clsx(
                    "relative inline-flex items-center justify-center overflow-hidden rounded-full bg-primary-700 px-5 py-2 text-sm font-medium text-white ring-1 ring-primary-600/60",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
                    "before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:transition-transform before:duration-700 hover:before:translate-x-full",
                    (!canSubmit || isSubmitting) &&
                      "opacity-60 cursor-not-allowed",
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
          </form>
        </div>
      </div>
    </div>
  );
}
