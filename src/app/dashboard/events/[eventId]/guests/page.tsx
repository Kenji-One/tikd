"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useParams } from "next/navigation";
import clsx from "clsx";
import {
  Search,
  MoreVertical,
  Instagram,
  Check,
  Clock,
  UserPlus,
  X,
  Send,
  Mail,
  Phone,
  Loader2,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

/* ----------------------------- Fetch helpers ----------------------------- */
function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const j: unknown = await res.json();
      const obj = asRecord(j);
      const err = obj && typeof obj.error === "string" ? obj.error : undefined;
      const message =
        obj && typeof obj.message === "string" ? obj.message : undefined;
      msg = err || message || msg;
    } catch {
      // ignore
    }

    throw new Error(msg);
  }

  return (await res.json()) as T;
}

function getErrorMessage(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

/* ----------------------------- Types ----------------------------- */
type GuestsView = "guest" | "order";
type GuestStatus = "checked_in" | "pending_arrival";

type GuestRow = {
  id: string;

  // Shared
  orderNumber: string; // "#1527"
  fullName: string;
  handle?: string; // "@byoussefi"
  igFollowers?: number; // 131
  gender?: "Male" | "Female";
  age?: number;
  phone?: string;
  email?: string;

  amount: number; // total paid
  ticketType: string; // pill label
  status: GuestStatus;

  // Order view extras
  referrer?: string;
  quantity?: number;
  dateTimeISO?: string; // includes date + time

  // meta
  source: "ticket" | "manual";
  canRemove?: boolean;
};

type ManualGuestPayload = {
  fullName: string;
  email?: string;
  phone?: string;
};

/* ---------------------------- Helpers ---------------------------- */
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function initialsFromName(name: string) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return "GU";

  const a = parts[0]?.[0] ?? "";
  const b = (parts.length > 1 ? parts[1]?.[0] : parts[0]?.[1]) ?? "";
  const two = `${a}${b}`.toUpperCase();
  return two || "GU";
}

function fmtUsd(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function fmtNum(n: number) {
  return n.toLocaleString(undefined);
}

function prettyDateTime(d?: string) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function useFluidTabIndicator(
  containerRef: { current: HTMLElement | null },
  indicatorRef: { current: HTMLElement | null },
  tab: string,
) {
  useLayoutEffect(() => {
    const c = containerRef.current;
    const i = indicatorRef.current;
    if (!c || !i) return;
    const active = c.querySelector<HTMLButtonElement>(`[data-tab="${tab}"]`);
    if (!active) return;
    const { offsetLeft, offsetWidth } = active;
    i.style.transform = `translateX(${offsetLeft}px)`;
    i.style.width = `${offsetWidth}px`;
  }, [containerRef, indicatorRef, tab]);
}

function normalizeEmail(s: string) {
  return s.trim().toLowerCase();
}

function normalizePhone(s: string) {
  // keep leading +, strip other non-digits
  const trimmed = s.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^\d]/g, "");
  return hasPlus ? `+${digits}` : digits;
}

function isEmailLike(s: string) {
  const v = s.trim();
  if (!v.includes("@")) return false;
  // intentionally simple + safe
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function isPhoneLike(s: string) {
  const digits = normalizePhone(s).replace(/^\+/, "");
  // allow 7..15 digits-ish
  return digits.length >= 7 && digits.length <= 15;
}

function guessNameFromEmail(email: string) {
  const local = email.split("@")[0] || "Guest";
  const cleaned = local.replace(/[._-]+/g, " ").trim();
  const capped = cleaned
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return capped || "Guest";
}

/* ----------------------------- UI bits --------------------------- */
const ICON_BTN_40 = clsx(
  "inline-flex h-10 w-10 items-center justify-center rounded-full",
  "border border-white/10 bg-white/5 text-neutral-200 hover:bg-white/10",
  "opacity-90 hover:opacity-100",
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
);

function StatusPill({ status }: { status: GuestStatus }) {
  const map: Record<GuestStatus, string> = {
    checked_in:
      "bg-success-900/35 text-success-300 ring-success-700/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
    pending_arrival:
      "bg-white/8 text-neutral-200 ring-white/14 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
  };

  const label = status === "checked_in" ? "Checked-In" : "Pending Arrival";

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1",
        "text-[13px] font-semibold ring-1 ring-inset whitespace-nowrap",
        map[status],
      )}
    >
      {status === "checked_in" ? (
        <Check className="h-4 w-4 shrink-0" />
      ) : (
        <Clock className="h-4 w-4 shrink-0" />
      )}
      <span className="leading-none">{label}</span>
    </span>
  );
}

function TicketPill({ label }: { label: string }) {
  return (
    <span
      className={clsx(
        "inline-flex max-w-full min-w-0 items-center rounded-md px-2.5 py-1.5",
        "text-[13px] font-semibold ring-1 ring-inset",
        "bg-[#428BFF]/10 text-[#A9C9FF] ring-[#428BFF]/22",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
        "overflow-hidden whitespace-nowrap",
      )}
      title={label}
    >
      <span className="truncate">{label}</span>
    </span>
  );
}

/* ---------------------------- Add Guest Modal ---------------------------- */

type ChipGuest = {
  key: string; // stable unique key in UI
  label: string; // what we show on chip
  payload: ManualGuestPayload; // what we send to API
};

function AddGuestModal({
  open,
  onClose,
  eventId,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  eventId: string;
  onAdded: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ChipGuest[]>([]);
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const panelRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const lastActiveElRef = useRef<HTMLElement | null>(null);

  const canSend = selected.length > 0;

  useEffect(() => {
    if (!open) return;

    lastActiveElRef.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";

    const t = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = "";
      lastActiveElRef.current?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();

      if (e.key === "Tab") {
        const root = panelRef.current;
        if (!root) return;
        const focusable = Array.from(
          root.querySelectorAll<HTMLElement>(
            'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((el) => !el.hasAttribute("disabled") && !el.ariaDisabled);

        if (!focusable.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        const active = document.activeElement as HTMLElement | null;

        if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelected([]);
      setSent(false);
      setErrorMsg("");
    }
  }, [open]);

  function addFromInput(raw: string) {
    const v = raw.trim();
    if (!v) return;

    setSent(false);
    setErrorMsg("");

    let payload: ManualGuestPayload;
    let key: string;
    let label: string;

    if (isEmailLike(v)) {
      const email = normalizeEmail(v);
      payload = { fullName: guessNameFromEmail(email), email };
      key = `email:${email}`;
      label = email;
    } else if (isPhoneLike(v)) {
      const phone = normalizePhone(v);
      payload = { fullName: "Guest", phone };
      key = `phone:${phone}`;
      label = phone;
    } else {
      // treat as name
      const name = v.replace(/\s+/g, " ").trim();
      if (name.length < 2) {
        setErrorMsg("Please enter a valid email, phone number, or full name.");
        return;
      }
      payload = { fullName: name };
      key = `name:${name.toLowerCase()}`;
      label = name;
    }

    setSelected((prev) => {
      if (prev.some((x) => x.key === key)) return prev;
      return [...prev, { key, label, payload }];
    });

    setQuery("");
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  function removePick(key: string) {
    setSent(false);
    setErrorMsg("");
    setSelected((prev) => prev.filter((x) => x.key !== key));
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  const addMutation = useMutation({
    mutationFn: async (guests: ManualGuestPayload[]) => {
      return fetchJSON<{ ok: true }>(`/api/events/${eventId}/guests`, {
        method: "POST",
        body: JSON.stringify({ guests }),
      });
    },
    onSuccess: () => {
      setSent(true);
      setSelected([]);
      setQuery("");
      onAdded();
    },
    onError: (e: unknown) => {
      setErrorMsg(getErrorMessage(e, "Failed to add guests."));
    },
  });

  async function sendNow() {
    if (!canSend || addMutation.isPending) return;
    setErrorMsg("");

    const guests = selected.map((s) => s.payload);
    if (!guests.length) return;

    addMutation.mutate(guests);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center px-3 py-6"
      role="dialog"
      aria-modal="true"
      aria-label="Add guests"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={clsx(
          "absolute inset-0",
          "bg-black/60",
          "backdrop-blur-[10px]",
        )}
      />

      <div
        ref={panelRef}
        className={clsx(
          "relative w-full max-w-[780px] overflow-hidden rounded-2xl",
          "border border-white/10 bg-neutral-950/80",
          "shadow-[0_30px_120px_rgba(0,0,0,0.75)]",
        )}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-100"
          style={{
            background:
              "radial-gradient(1100px 520px at 18% -10%, rgba(154,70,255,0.20), transparent 60%), radial-gradient(900px 520px at 100% 20%, rgba(66,139,255,0.10), transparent 62%), linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
          }}
        />

        <div className="relative flex items-center justify-between p-5">
          <div className="flex items-center gap-3">
            <div
              className={clsx(
                "inline-flex h-10 w-10 items-center justify-center rounded-xl",
                "bg-primary-500/15 text-primary-200 ring-1 ring-primary-500/20",
              )}
            >
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[16px] font-semibold tracking-[-0.2px] text-neutral-0">
                Add Guests
              </div>
              <div className="mt-1 text-[12px] text-neutral-400">
                Enter email, phone, or name — press Enter to add — then submit
                all at once.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className={ICON_BTN_40}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative px-5 pb-5 md:pb-6">
          <div
            className={clsx(
              "rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5",
              "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
            )}
          >
            <div className="text-[12px] font-medium text-neutral-300">
              Email / Phone / Name
            </div>

            <div className="mt-2 grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
              <div
                className={clsx(
                  "min-h-[52px] w-full rounded-xl border border-white/10 bg-neutral-950/35 px-3 py-2",
                  "focus-within:ring-2 focus-within:ring-primary-500/35",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  {selected.map((c) => {
                    const label = c.label;
                    const badge = initialsFromName(c.payload.fullName || label);

                    return (
                      <span
                        key={c.key}
                        className={clsx(
                          "inline-flex items-center gap-2 rounded-full",
                          "border border-white/10 bg-white/5 px-1 py-1",
                          "text-[12px] font-semibold text-neutral-100",
                        )}
                        title={label}
                      >
                        <span
                          className={clsx(
                            "inline-flex h-6 w-6 items-center justify-center rounded-full",
                            "bg-primary-500/20 text-primary-200 ring-1 ring-primary-500/20",
                            "text-[11px] font-extrabold",
                          )}
                        >
                          {badge}
                        </span>

                        <span className="max-w-[220px] truncate">{label}</span>

                        {c.key.startsWith("email:") ? (
                          <Mail className="h-4 w-4 text-primary-300/80" />
                        ) : c.key.startsWith("phone:") ? (
                          <Phone className="h-4 w-4 text-primary-300/80" />
                        ) : null}

                        <button
                          type="button"
                          onClick={() => removePick(c.key)}
                          aria-label={`Remove ${label}`}
                          className={clsx(
                            "inline-flex h-6 w-6 items-center justify-center rounded-full",
                            "bg-white/0 text-neutral-300 hover:bg-white/10 hover:text-neutral-0",
                            "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
                          )}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    );
                  })}

                  <div
                    className={clsx(
                      "relative w-full",
                      "min-w-[220px] flex-1",
                      "rounded-lg border border-white/10 bg-white/5 h-10",
                    )}
                  >
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-300" />
                    <input
                      ref={inputRef}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addFromInput(query);
                        }
                      }}
                      placeholder="Type email, phone, or name…"
                      className={clsx(
                        "h-10 w-full rounded-lg bg-transparent",
                        "pl-10 pr-4 text-[12px] text-neutral-100",
                        "placeholder:text-neutral-500",
                        "outline-none border-none focus:ring-1 focus:ring-primary-500",
                      )}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => addFromInput(query)}
                    disabled={!query.trim()}
                    className={clsx(
                      "inline-flex h-10 items-center justify-center rounded-lg px-3",
                      "border border-white/10 text-[12px] font-semibold",
                      query.trim()
                        ? "bg-white/5 text-neutral-100 hover:bg-white/10"
                        : "bg-white/5 text-neutral-500 opacity-60 cursor-not-allowed",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
                    )}
                    aria-label="Add typed guest"
                    title="Add"
                  >
                    Add
                  </button>
                </div>

                <div className="mt-2 text-[11px] text-neutral-500">
                  Tip: press <span className="text-neutral-300">Enter</span> to
                  add each guest. No suggestions are shown here.
                </div>
              </div>

              <div className="flex justify-stretch md:justify-end">
                <button
                  type="button"
                  onClick={sendNow}
                  disabled={!canSend || addMutation.isPending}
                  className={clsx(
                    "w-full md:w-auto",
                    "inline-flex h-[52px] items-center justify-center gap-2 rounded-xl px-5",
                    "border border-white/10",
                    canSend && !addMutation.isPending
                      ? "bg-[linear-gradient(90deg,rgba(134,0,238,0.35),rgba(154,70,255,0.55),rgba(170,115,255,0.35))] text-neutral-0 shadow-[0_18px_54px_rgba(154,81,255,0.22)]"
                      : "bg-white/5 text-neutral-400 opacity-70",
                    "transition-[transform,filter,box-shadow] duration-200",
                    canSend &&
                      !addMutation.isPending &&
                      "hover:filter hover:brightness-[1.06] active:scale-[0.99]",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
                  )}
                >
                  <span className="text-[13px] font-semibold tracking-[-0.2px]">
                    {addMutation.isPending ? "Adding…" : "Add Guests"}
                  </span>
                  {addMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {sent ? (
              <div
                className={clsx(
                  "mt-3 rounded-xl border border-success-700/30 bg-success-900/25 px-3 py-2",
                  "text-[12px] text-success-300",
                )}
              >
                Guests added.
              </div>
            ) : null}

            {errorMsg ? (
              <div
                className={clsx(
                  "mt-3 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2",
                  "text-[12px] text-red-200",
                )}
              >
                {errorMsg}
              </div>
            ) : null}
          </div>

          {/* ✅ Removed "Results / Suggestions" completely */}

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className={clsx(
                "inline-flex h-10 items-center justify-center rounded-xl px-4",
                "border border-white/10 bg-white/5 text-[12px] font-semibold text-neutral-200",
                "hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
              )}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------- Actions menu (3 dots) --------------------- */
function GuestActionsMenu({
  guest,
  onMarkCheckedIn,
  onMarkPending,
  onRemove,
}: {
  guest: GuestRow;
  onMarkCheckedIn: () => void;
  onMarkPending: () => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    maxHeight: number;
  } | null>(null);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node | null;
      if (!t) return;

      const btn = btnRef.current;
      const panel = panelRef.current;
      if (btn?.contains(t) || panel?.contains(t)) return;

      setOpen(false);
    };

    const reposition = () => {
      const btn = btnRef.current;
      if (!btn) return;

      const r = btn.getBoundingClientRect();
      const PANEL_W = 240;
      const PAD = 12;

      const maxHeight = Math.max(200, window.innerHeight - PAD * 2);

      let left = r.right - PANEL_W;
      left = Math.max(PAD, Math.min(left, window.innerWidth - PANEL_W - PAD));

      const belowTop = r.bottom + 10;

      setPos({ top: belowTop, left, maxHeight });

      requestAnimationFrame(() => {
        const panel = panelRef.current;
        const hRaw = panel?.offsetHeight ?? 0;
        const h = Math.min(hRaw, maxHeight);
        const maxBottom = window.innerHeight - PAD;

        const belowFits = belowTop + h <= maxBottom;
        const aboveTop = r.top - 10 - h;
        const aboveFits = aboveTop >= PAD;

        let top = belowTop;

        if (belowFits) top = belowTop;
        else if (aboveFits) top = aboveTop;
        else top = PAD;

        top = Math.max(PAD, Math.min(top, maxBottom - h));

        setPos({ top, left, maxHeight });
      });
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("touchstart", onDown);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    reposition();

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("touchstart", onDown);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open]);

  const canRemove = Boolean(guest.canRemove);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        aria-label="Edit guest"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={ICON_BTN_40}
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && typeof document !== "undefined" && pos
        ? createPortal(
            <div
              ref={panelRef}
              style={{ top: pos.top, left: pos.left, maxHeight: pos.maxHeight }}
              className={clsx(
                "fixed z-[9999] w-[240px]",
                "overflow-hidden rounded-xl border border-white/10 bg-neutral-950/95",
                "shadow-[0_18px_70px_rgba(0,0,0,0.60)] backdrop-blur-[10px]",
              )}
            >
              <div className="px-3 py-2.5 border-b border-white/10">
                <div className="text-[12px] font-semibold text-neutral-200">
                  Guest Actions
                </div>
                <div className="mt-0.5 text-[11px] text-neutral-500">
                  Order{" "}
                  <span className="text-neutral-300 font-semibold">
                    {guest.orderNumber}
                  </span>{" "}
                  •{" "}
                  <span className="text-neutral-300 font-semibold">
                    {guest.source === "ticket" ? "Ticket Buyer" : "Manual"}
                  </span>
                </div>
              </div>

              <div className="max-h-[calc(100vh-160px)] overflow-y-auto">
                <div className="p-2 space-y-1">
                  {guest.status !== "checked_in" ? (
                    <button
                      type="button"
                      onClick={() => {
                        onMarkCheckedIn();
                        setOpen(false);
                      }}
                      className={clsx(
                        "w-full px-2.5 py-2 rounded-lg text-left",
                        "flex items-center gap-2",
                        "border border-white/10 bg-white/5 text-neutral-200 hover:bg-white/10",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
                      )}
                    >
                      <span className="text-[12px] font-semibold">
                        Mark Checked-In
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        onMarkPending();
                        setOpen(false);
                      }}
                      className={clsx(
                        "w-full px-2.5 py-2 rounded-lg text-left",
                        "flex items-center gap-2",
                        "border border-white/10 bg-white/5 text-neutral-200 hover:bg-white/10",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
                      )}
                    >
                      <span className="text-[12px] font-semibold">
                        Mark Pending Arrival
                      </span>
                    </button>
                  )}
                </div>

                <div className="border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      if (!canRemove) return;
                      onRemove();
                      setOpen(false);
                    }}
                    disabled={!canRemove}
                    className={clsx(
                      "w-full px-3 py-2.5 text-left",
                      "flex items-center gap-2",
                      "text-[12px] font-semibold",
                      canRemove
                        ? "text-red-300 hover:text-red-200 hover:bg-red-500/10 cursor-pointer"
                        : "text-neutral-500 cursor-not-allowed",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
                    )}
                    title={
                      canRemove
                        ? "Remove manual guest"
                        : "Ticket buyers can't be removed here"
                    }
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

/* ------------------------------ Pagination ------------------------ */
function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  const visible = useMemo(() => {
    const max = Math.min(totalPages, 4);
    return Array.from({ length: max }).map((_, i) => i + 1);
  }, [totalPages]);

  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-1">
      <button
        type="button"
        onClick={() => onPage(clamp(page - 1, 1, totalPages))}
        disabled={page <= 1}
        className={clsx(
          "inline-flex h-8 w-8 items-center justify-center rounded-md",
          "border border-white/10 bg-white/5 text-neutral-100",
          "hover:border-primary-500 disabled:opacity-40 disabled:hover:bg-white/5",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
        )}
        aria-label="Previous page"
      >
        ‹
      </button>

      {visible.map((p) => {
        const active = p === page;
        return (
          <button
            key={p}
            type="button"
            onClick={() => onPage(p)}
            className={clsx(
              "inline-flex h-8 w-8 items-center justify-center rounded-md text-[12px] font-semibold",
              "transition-colors",
              active
                ? "bg-primary-500 text-neutral-0"
                : "bg-white/0 text-neutral-200 hover:bg-white/10 hover:border-white/20",
            )}
            aria-current={active ? "page" : undefined}
          >
            {p}
          </button>
        );
      })}

      <button
        type="button"
        onClick={() => onPage(clamp(page + 1, 1, totalPages))}
        disabled={page >= totalPages}
        className={clsx(
          "inline-flex h-8 w-8 items-center justify-center rounded-md",
          "border border-white/10 bg-white/5 text-neutral-100",
          "hover:border-primary-500 disabled:opacity-40 disabled:hover:bg-white/5",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
        )}
        aria-label="Next page"
      >
        ›
      </button>
    </div>
  );
}

/* ------------------------------ Page ------------------------------ */
export default function GuestsPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params?.eventId;

  const qc = useQueryClient();

  const [view, setView] = useState<GuestsView>("guest");
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const tabBarRef = useRef<HTMLDivElement | null>(null);
  const indicatorRef = useRef<HTMLSpanElement | null>(null);
  useFluidTabIndicator(tabBarRef, indicatorRef, view);

  const guestsQ = useQuery({
    queryKey: ["event-guests", eventId],
    enabled: Boolean(eventId),
    queryFn: async () => {
      return fetchJSON<GuestRow[]>(`/api/events/${eventId}/guests`);
    },
  });

  const guests = guestsQ.data ?? [];

  const updateStatusMutation = useMutation({
    mutationFn: async (p: { guestId: string; status: GuestStatus }) => {
      return fetchJSON<{ ok: true }>(
        `/api/events/${eventId}/guests/${p.guestId}`,
        { method: "PATCH", body: JSON.stringify({ status: p.status }) },
      );
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["event-guests", eventId] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (guestId: string) => {
      return fetchJSON<{ ok: true }>(
        `/api/events/${eventId}/guests/${guestId}`,
        {
          method: "DELETE",
        },
      );
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["event-guests", eventId] });
    },
  });

  /* ------------------------------------------------------------------
     ✅ Real responsive table (NO horizontal scroll)
  ------------------------------------------------------------------ */
  const GRID_GUEST =
    "md:grid md:items-center md:gap-4 " +
    "md:[grid-template-columns:88px_minmax(0,2.6fr)_minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1.2fr)_72px] " +
    "lg:[grid-template-columns:88px_minmax(0,2.4fr)_88px_60px_minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1.2fr)_72px] " +
    "xl:[grid-template-columns:88px_minmax(0,2.2fr)_88px_60px_minmax(0,1.7fr)_minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1.2fr)_72px]";

  const GRID_ORDER =
    "md:grid md:items-center md:gap-4 " +
    "md:[grid-template-columns:88px_minmax(0,2.7fr)_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1.2fr)_72px] " +
    "lg:[grid-template-columns:88px_minmax(0,2.2fr)_minmax(0,1.8fr)_80px_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1.2fr)_72px] " +
    "xl:[grid-template-columns:88px_minmax(0,2.0fr)_88px_minmax(0,1.8fr)_80px_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1.2fr)_72px]";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return guests;

    return guests.filter((g) => {
      const hay = [
        g.orderNumber,
        g.fullName,
        g.handle ?? "",
        g.email ?? "",
        g.phone ?? "",
        g.ticketType,
        g.referrer ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [query, guests]);

  /* --------------------------- Pagination --------------------------- */
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setPage(1);
  }, [query, view]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setPage((p) => clamp(p, 1, totalPages));
  }, [totalPages]);

  const pageSafe = clamp(page, 1, totalPages);
  const slice = useMemo(() => {
    const start = (pageSafe - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageSafe]);

  const showingLabel = useMemo(() => {
    if (!total) return "Showing 0-0 from 0 data";
    const start = (pageSafe - 1) * pageSize + 1;
    const end = Math.min(total, start + pageSize - 1);
    return `Showing ${start}-${end} from ${total} data`;
  }, [total, pageSafe]);

  const isLoading = guestsQ.isLoading;

  return (
    <div className="relative overflow-hidden bg-neutral-950 text-neutral-0 px-4 md:px-6 lg:px-8">
      <AddGuestModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        eventId={eventId}
        onAdded={() => {
          qc.invalidateQueries({ queryKey: ["event-guests", eventId] });
        }}
      />

      <section className="pb-16">
        <section
          className={clsx(
            "mt-4 overflow-hidden rounded-2xl border border-white/10",
            "bg-neutral-950/70 shadow-[0_18px_60px_rgba(0,0,0,0.55)]",
          )}
        >
          <div
            className={clsx(
              "relative p-4 md:p-5",
              "bg-[radial-gradient(900px_320px_at_25%_0%,rgba(154,70,255,0.10),transparent_60%),radial-gradient(900px_320px_at_90%_110%,rgba(66,139,255,0.08),transparent_55%)]",
            )}
          >
            {/* Header */}
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-base font-semibold tracking-[0.18em] text-neutral-300 uppercase">
                  Guests
                </div>
                <div className="mt-1 text-neutral-400">
                  View attendees, check them in, and inspect their orders.
                </div>
              </div>

              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
                <div
                  className={clsx(
                    "relative w-full sm:w-[420px]",
                    "rounded-lg border border-white/10 bg-white/5 h-10",
                  )}
                >
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-300" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search here"
                    className={clsx(
                      "h-10 w-full rounded-lg bg-transparent",
                      "pl-10 pr-4 text-[12px] text-neutral-100",
                      "placeholder:text-neutral-500",
                      "outline-none border-none focus:ring-1 focus:ring-primary-500",
                    )}
                    aria-label="Search guests"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    icon={<UserPlus className="h-4 w-4" />}
                    onClick={() => setAddOpen(true)}
                    animation
                  >
                    Add Guest
                  </Button>
                </div>
              </div>
            </div>

            {/* Toggle */}
            <div className="mb-4 flex items-center justify-between gap-3">
              <div
                ref={tabBarRef}
                className="relative inline-flex rounded-full border border-white/10 bg-neutral-950"
              >
                <button
                  data-tab="guest"
                  className={clsx(
                    "relative z-10 rounded-full px-4 py-2 text-[12px] font-semibold",
                    view === "guest"
                      ? "text-neutral-0"
                      : "text-neutral-300 hover:text-neutral-0",
                  )}
                  onClick={() => setView("guest")}
                  type="button"
                >
                  Guest Info
                </button>

                <button
                  data-tab="order"
                  className={clsx(
                    "relative z-10 rounded-full px-4 py-2 text-[12px] font-semibold",
                    view === "order"
                      ? "text-neutral-0"
                      : "text-neutral-300 hover:text-neutral-0",
                  )}
                  onClick={() => setView("order")}
                  type="button"
                >
                  Order Info
                </button>

                <span
                  ref={indicatorRef}
                  className="absolute left-0 top-0 h-full w-0 rounded-full bg-white/10 ring-1 ring-inset ring-white/15 transition-[transform,width] duration-200 ease-out"
                  aria-hidden="true"
                />
              </div>

              <div className="hidden md:inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-neutral-300">
                <span className="text-neutral-400">Guests:</span>{" "}
                <span className="font-semibold text-neutral-100">{total}</span>
              </div>
            </div>

            {/* Column header */}
            <div
              className={clsx(
                "hidden md:block mt-3",
                "rounded-[12px] border border-white/10 bg-white/5 px-4 py-2.5",
                "text-[13px] font-semibold text-neutral-300",
              )}
            >
              <div className={view === "guest" ? GRID_GUEST : GRID_ORDER}>
                {/* Shared */}
                <div>Order</div>
                <div>Name</div>

                {view === "guest" ? (
                  <>
                    <div className="hidden lg:block">Gender</div>
                    <div className="hidden lg:block">Age</div>
                    <div className="hidden xl:block">Contact Info</div>
                    <div>Amount</div>
                    <div>Ticket Type</div>
                    <div>Status</div>
                    <div className="text-right">Edit</div>
                  </>
                ) : (
                  <>
                    <div className="hidden xl:block">Gender</div>
                    <div className="hidden lg:block">Referrer</div>
                    <div className="hidden lg:block">Quantity</div>
                    <div>Amount</div>
                    <div>Date</div>
                    <div>Status</div>
                    <div className="text-right">Edit</div>
                  </>
                )}
              </div>
            </div>

            {/* List */}
            <div className="mt-3">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-[88px] rounded-[12px]" />
                  ))}
                </div>
              ) : slice.length ? (
                <div className="space-y-3">
                  {slice.map((g) => {
                    const badge = initialsFromName(g.fullName);
                    const followersLabel =
                      typeof g.igFollowers === "number"
                        ? fmtNum(g.igFollowers)
                        : "—";

                    return (
                      <div
                        key={g.id}
                        className={clsx(
                          "relative rounded-[12px] border border-white/10 bg-white/5 px-4 py-3",
                          "hover:bg-white/7 transition-colors",
                        )}
                      >
                        {/* Desktop row */}
                        <div className="hidden md:block">
                          <div
                            className={
                              view === "guest" ? GRID_GUEST : GRID_ORDER
                            }
                          >
                            {/* Order */}
                            <div className="text-[13px] font-semibold text-neutral-100">
                              {g.orderNumber}
                            </div>

                            {/* Name */}
                            <div className="min-w-0">
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="relative shrink-0">
                                  <div className="h-10 w-10 overflow-hidden rounded-full bg-white/5 ring-1 ring-white/10">
                                    <div className="flex h-full w-full items-center justify-center text-[13px] font-extrabold text-neutral-200">
                                      {badge}
                                    </div>
                                  </div>

                                  <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-[7px]">
                                    <span
                                      className={clsx(
                                        "tikd-chip tikd-chip-primary rounded-md",
                                        "px-1 py-[3px] text-[9px] font-semibold leading-none",
                                        "gap-1",
                                      )}
                                      title={`${followersLabel} Instagram followers`}
                                    >
                                      <Instagram className="h-2.5 w-2.5 text-primary-200" />
                                      <span className="tabular-nums text-neutral-0/95">
                                        {followersLabel}
                                      </span>
                                    </span>
                                  </div>
                                </div>

                                <div className="min-w-0">
                                  <div className="truncate text-[14px] font-semibold text-neutral-0">
                                    {g.fullName}
                                  </div>
                                  <div className="truncate text-[13px] text-neutral-500">
                                    {g.handle ?? "—"}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {view === "guest" ? (
                              <>
                                {/* Gender (lg+) */}
                                <div className="hidden lg:block text-[13px] text-neutral-200">
                                  <span className="font-semibold text-neutral-100">
                                    {g.gender ?? "—"}
                                  </span>
                                </div>

                                {/* Age (lg+) */}
                                <div className="hidden lg:block text-[13px] text-neutral-200">
                                  <span className="font-semibold text-neutral-100">
                                    {typeof g.age === "number" ? g.age : "—"}
                                  </span>
                                </div>

                                {/* Contact (xl+) */}
                                <div className="hidden xl:block min-w-0">
                                  <div className="truncate text-[13px] font-semibold text-neutral-100">
                                    {g.phone ?? "—"}
                                  </div>
                                  <div className="truncate text-[13px] text-neutral-500">
                                    {g.email ?? "—"}
                                  </div>
                                </div>

                                {/* Amount */}
                                <div className="text-[13px] text-neutral-200">
                                  <span className="font-semibold text-neutral-100">
                                    {fmtUsd(g.amount)}
                                  </span>
                                </div>

                                {/* Ticket */}
                                <div className="min-w-0">
                                  <TicketPill label={g.ticketType} />
                                </div>

                                {/* Status */}
                                <div className="min-w-0">
                                  <StatusPill status={g.status} />
                                </div>

                                {/* Edit */}
                                <div className="flex justify-end">
                                  <GuestActionsMenu
                                    guest={g}
                                    onMarkCheckedIn={() =>
                                      updateStatusMutation.mutate({
                                        guestId: g.id,
                                        status: "checked_in",
                                      })
                                    }
                                    onMarkPending={() =>
                                      updateStatusMutation.mutate({
                                        guestId: g.id,
                                        status: "pending_arrival",
                                      })
                                    }
                                    onRemove={() => removeMutation.mutate(g.id)}
                                  />
                                </div>
                              </>
                            ) : (
                              <>
                                {/* Gender (xl+) */}
                                <div className="hidden xl:block text-[13px] text-neutral-200">
                                  <span className="font-semibold text-neutral-100">
                                    {g.gender ?? "—"}
                                  </span>
                                </div>

                                {/* Referrer (lg+) */}
                                <div className="hidden lg:block min-w-0 text-[13px] text-neutral-200">
                                  <span className="truncate block font-semibold text-neutral-100">
                                    {g.referrer ?? "—"}
                                  </span>
                                </div>

                                {/* Quantity (lg+) */}
                                <div className="hidden lg:block text-[13px] text-neutral-200">
                                  <span className="font-semibold text-neutral-100">
                                    {typeof g.quantity === "number"
                                      ? g.quantity
                                      : "—"}
                                  </span>
                                </div>

                                {/* Amount */}
                                <div className="text-[13px] text-neutral-200">
                                  <span className="font-semibold text-neutral-100">
                                    {fmtUsd(g.amount)}
                                  </span>
                                </div>

                                {/* Date */}
                                <div className="min-w-0 text-[13px] text-neutral-400">
                                  <span className="truncate block">
                                    {prettyDateTime(g.dateTimeISO)}
                                  </span>
                                </div>

                                {/* Status */}
                                <div className="min-w-0">
                                  <StatusPill status={g.status} />
                                </div>

                                {/* Edit */}
                                <div className="flex justify-end">
                                  <GuestActionsMenu
                                    guest={g}
                                    onMarkCheckedIn={() =>
                                      updateStatusMutation.mutate({
                                        guestId: g.id,
                                        status: "checked_in",
                                      })
                                    }
                                    onMarkPending={() =>
                                      updateStatusMutation.mutate({
                                        guestId: g.id,
                                        status: "pending_arrival",
                                      })
                                    }
                                    onRemove={() => removeMutation.mutate(g.id)}
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Mobile stacked */}
                        <div className="md:hidden">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="min-w-[52px]">
                                <div className="h-10 w-10 overflow-hidden rounded-[10px] bg-white/5 ring-1 ring-white/10">
                                  <div className="flex h-full w-full items-center justify-center text-[13px] font-extrabold text-neutral-200">
                                    {badge}
                                  </div>
                                </div>

                                <div className="mt-1 flex items-center justify-center gap-1 text-[11px] text-neutral-500">
                                  <Instagram className="h-3.5 w-3.5" />
                                  <span className="font-semibold text-neutral-400">
                                    {followersLabel}
                                  </span>
                                </div>
                              </div>

                              <div className="min-w-0">
                                <div className="truncate text-[14px] font-semibold text-neutral-0">
                                  {g.fullName}
                                </div>
                                <div className="truncate text-[13px] text-neutral-500">
                                  {g.handle ?? "—"} •{" "}
                                  <span className="text-neutral-400">
                                    {g.orderNumber}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <StatusPill status={g.status} />
                              <GuestActionsMenu
                                guest={g}
                                onMarkCheckedIn={() =>
                                  updateStatusMutation.mutate({
                                    guestId: g.id,
                                    status: "checked_in",
                                  })
                                }
                                onMarkPending={() =>
                                  updateStatusMutation.mutate({
                                    guestId: g.id,
                                    status: "pending_arrival",
                                  })
                                }
                                onRemove={() => removeMutation.mutate(g.id)}
                              />
                            </div>
                          </div>

                          <div className="mt-3 grid gap-2">
                            {view === "guest" ? (
                              <>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="rounded-xl border border-white/10 bg-neutral-950/30 px-3 py-2">
                                    <div className="text-[11px] text-neutral-500">
                                      Gender
                                    </div>
                                    <div className="mt-1 text-[13px] font-semibold text-neutral-100">
                                      {g.gender ?? "—"}
                                    </div>
                                  </div>

                                  <div className="rounded-xl border border-white/10 bg-neutral-950/30 px-3 py-2">
                                    <div className="text-[11px] text-neutral-500">
                                      Age
                                    </div>
                                    <div className="mt-1 text-[13px] font-semibold text-neutral-100">
                                      {typeof g.age === "number" ? g.age : "—"}
                                    </div>
                                  </div>
                                </div>

                                <div className="rounded-xl border border-white/10 bg-neutral-950/30 px-3 py-2">
                                  <div className="text-[11px] text-neutral-500">
                                    Contact Info
                                  </div>
                                  <div className="mt-1 text-[13px] font-semibold text-neutral-100">
                                    {g.phone ?? "—"}
                                  </div>
                                  <div className="mt-0.5 text-[12px] text-neutral-500">
                                    {g.email ?? "—"}
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div className="rounded-xl border border-white/10 bg-neutral-950/30 px-3 py-2">
                                    <div className="text-[11px] text-neutral-500">
                                      Amount
                                    </div>
                                    <div className="mt-1 text-[13px] font-semibold text-neutral-100">
                                      {fmtUsd(g.amount)}
                                    </div>
                                  </div>

                                  <div className="rounded-xl border border-white/10 bg-neutral-950/30 px-3 py-2">
                                    <div className="text-[11px] text-neutral-500">
                                      Ticket Type
                                    </div>
                                    <div className="mt-1">
                                      <TicketPill label={g.ticketType} />
                                    </div>
                                  </div>
                                </div>

                                <div className="rounded-xl border border-white/10 bg-neutral-950/30 px-3 py-2">
                                  <div className="text-[11px] text-neutral-500">
                                    Status
                                  </div>
                                  <div className="mt-1">
                                    <StatusPill status={g.status} />
                                  </div>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="rounded-xl border border-white/10 bg-neutral-950/30 px-3 py-2">
                                    <div className="text-[11px] text-neutral-500">
                                      Gender
                                    </div>
                                    <div className="mt-1 text-[13px] font-semibold text-neutral-100">
                                      {g.gender ?? "—"}
                                    </div>
                                  </div>

                                  <div className="rounded-xl border border-white/10 bg-neutral-950/30 px-3 py-2">
                                    <div className="text-[11px] text-neutral-500">
                                      Quantity
                                    </div>
                                    <div className="mt-1 text-[13px] font-semibold text-neutral-100">
                                      {typeof g.quantity === "number"
                                        ? g.quantity
                                        : "—"}
                                    </div>
                                  </div>
                                </div>

                                <div className="rounded-xl border border-white/10 bg-neutral-950/30 px-3 py-2">
                                  <div className="text-[11px] text-neutral-500">
                                    Referrer
                                  </div>
                                  <div className="mt-1 text-[13px] font-semibold text-neutral-100">
                                    {g.referrer ?? "—"}
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div className="rounded-xl border border-white/10 bg-neutral-950/30 px-3 py-2">
                                    <div className="text-[11px] text-neutral-500">
                                      Amount
                                    </div>
                                    <div className="mt-1 text-[13px] font-semibold text-neutral-100">
                                      {fmtUsd(g.amount)}
                                    </div>
                                  </div>

                                  <div className="rounded-xl border border-white/10 bg-neutral-950/30 px-3 py-2">
                                    <div className="text-[11px] text-neutral-500">
                                      Date
                                    </div>
                                    <div className="mt-1 text-[13px] font-semibold text-neutral-100">
                                      {prettyDateTime(g.dateTimeISO)}
                                    </div>
                                  </div>
                                </div>

                                <div className="rounded-xl border border-white/10 bg-neutral-950/30 px-3 py-2">
                                  <div className="text-[11px] text-neutral-500">
                                    Status
                                  </div>
                                  <div className="mt-1">
                                    <StatusPill status={g.status} />
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-[12px] text-neutral-300">
                      {showingLabel}
                    </div>
                    <Pagination
                      page={pageSafe}
                      totalPages={totalPages}
                      onPage={setPage}
                    />
                  </div>
                </div>
              ) : (
                <div
                  className={clsx(
                    "rounded-2xl border border-white/10 bg-white/5 px-4 py-12",
                    "text-center",
                  )}
                >
                  <div className="text-[13px] font-semibold text-neutral-100">
                    No guests found
                  </div>
                  <div className="mt-1 text-[12px] text-neutral-500">
                    Try a different search.
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}
