/* ------------------------------------------------------------------ */
/*  src/app/dashboard/friends/FriendsClient.tsx                       */
/* ------------------------------------------------------------------ */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import {
  Users,
  Users2,
  Search,
  MoreVertical,
  Trash2,
  Phone,
  Mail,
  Instagram,
  ChevronLeft,
  ChevronRight,
  X,
  Send,
  UserPlus,
  Check,
  Clock,
  UserX,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import GridListToggle from "@/components/ui/GridListToggle";
import { Button } from "@/components/ui/Button";
import { Tilt3d } from "@/components/ui/Tilt3d";

/* ------------------------------ Types ------------------------------ */
type Friend = {
  id: string; // other user id
  friendshipId: string;

  name: string;
  role: string;
  company: string;
  companyHref?: string;

  phone: string;
  email: string;

  /** ✅ NEW */
  instagram?: string;

  avatarUrl?: string;
  createdAt?: string | null;
};

type AddCandidate = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
};

type FriendRequest = {
  id: string; // request id
  fromUserId: string;
  name: string;
  avatarUrl?: string;
  createdAt?: string | null;
};

/* ---------------------------- Helpers ------------------------------ */
const EMPTY_FRIENDS: Friend[] = [];
const EMPTY_REQUESTS: FriendRequest[] = [];
const EMPTY_CANDIDATES: AddCandidate[] = [];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function getErrorMessage(err: unknown, fallback = "Something went wrong.") {
  if (err instanceof Error) return err.message || fallback;
  if (typeof err === "string") return err || fallback;
  if (isRecord(err)) {
    const msg = err.message;
    if (typeof msg === "string" && msg) return msg;
  }
  return fallback;
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
    let body: unknown = null;

    try {
      body = await res.json();
    } catch {
      // ignore
    }

    let msg: string | null = null;

    if (isRecord(body)) {
      const err = body.error;
      const m = body.message;
      if (typeof err === "string" && err) msg = err;
      else if (typeof m === "string" && m) msg = m;
    } else if (typeof body === "string" && body) {
      msg = body;
    }

    throw new Error(msg || `Request failed (${res.status})`);
  }

  return res.json() as Promise<T>;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function initialsFromName(name: string) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return "FR";

  const a = parts[0]?.[0] ?? "";
  const b = (parts.length > 1 ? parts[1]?.[0] : parts[0]?.[1]) ?? "";
  const two = `${a}${b}`.toUpperCase();
  return two || "FR";
}

function formatRelative(iso?: string | null) {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";

  const now = Date.now();
  const diff = Math.max(0, now - t);

  const sec = Math.floor(diff / 1000);
  if (sec < 10) return "just now";
  if (sec < 60) return `${sec}s ago`;

  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;

  const day = Math.floor(hr / 24);
  if (day === 1) return "yesterday";
  return `${day} days ago`;
}

/** ✅ Instagram helpers */
function cleanInstagramValue(v?: string | null) {
  return String(v ?? "").trim();
}

function instagramDisplay(v?: string | null) {
  const raw = cleanInstagramValue(v);
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  const handle = raw.replace(/^@/, "").trim();
  if (!handle) return "";
  return `@${handle}`;
}

function instagramHref(v?: string | null) {
  const raw = cleanInstagramValue(v);
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  const handle = raw.replace(/^@/, "").trim();
  if (!handle) return "";
  return `https://instagram.com/${handle}`;
}

/* ------------------------ Friends UI pieces ------------------------ */
function FriendActionsMenu({
  onRemove,
  containerClassName,
}: {
  onRemove: () => void;
  containerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

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

    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("touchstart", onDown);

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  return (
    <div className={clsx("relative", containerClassName)}>
      <button
        ref={btnRef}
        type="button"
        aria-label="More actions"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "inline-flex h-8 w-8 items-center justify-center rounded-full",
          "bg-white/5 text-neutral-200 hover:bg-white/10",
          "border border-white/10",
          "opacity-90 hover:opacity-100",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
        )}
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open ? (
        <div
          ref={panelRef}
          className={clsx(
            "absolute right-0 top-[calc(100%+10px)] z-[70] w-[190px]",
            "overflow-hidden rounded-lg border border-white/10 bg-neutral-950/95",
            "shadow-[0_18px_70px_rgba(0,0,0,0.60)] backdrop-blur-[10px]",
          )}
        >
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onRemove();
            }}
            className={clsx(
              "w-full px-3 py-2.5 text-left",
              "flex items-center gap-2",
              "text-[12px] font-semibold",
              "text-red-300 hover:text-red-200",
              "hover:bg-red-500/10",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 cursor-pointer",
            )}
          >
            <Trash2 className="h-4 w-4" />
            Remove Friend
          </button>
        </div>
      ) : null}
    </div>
  );
}

function FriendsCard({
  friend,
  dense = false,
  onRemove,
}: {
  friend: Friend;
  dense?: boolean;
  onRemove?: (id: string) => void;
}) {
  const badge = initialsFromName(friend.name);
  const igText = instagramDisplay(friend.instagram);
  const igUrl = instagramHref(friend.instagram);

  return (
    <Tilt3d
      maxDeg={4}
      perspective={900}
      liftPx={2}
      className={clsx("group relative w-full", "will-change-transform")}
    >
      <div
        className={clsx(
          "relative overflow-hidden rounded-[12px] border border-white/10",
          "bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))]",
          "transition-[box-shadow,border-color,filter] duration-200",
          "group-hover:border-primary-500 group-hover:shadow-[0_22px_70px_rgba(0,0,0,0.55)]",
        )}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-100"
          style={{
            background:
              "radial-gradient(620px 260px at 30% -10%, rgba(154,70,255,0.14), transparent 60%), radial-gradient(520px 240px at 100% 18%, rgba(66,139,255,0.08), transparent 62%)",
          }}
        />

        <div
          className="relative"
          style={{
            transform:
              "rotateX(var(--tikd-tilt-rx-inv)) rotateY(var(--tikd-tilt-ry-inv)) translateZ(0.1px)",
            transformStyle: "preserve-3d",
            backfaceVisibility: "hidden",
            WebkitFontSmoothing: "antialiased",
          }}
        >
          <FriendActionsMenu
            containerClassName="!absolute right-3 top-3 z-10"
            onRemove={() => onRemove?.(friend.id)}
          />

          <div className={clsx("p-4", dense ? "pb-3" : "pb-4")}>
            <div className={clsx("mx-auto flex w-full flex-col items-center")}>
              <div className="relative">
                <div
                  className={clsx(
                    "relative overflow-hidden",
                    "h-[58px] w-[58px] rounded-lg",
                  )}
                  style={{
                    transform: "translateZ(0.1px)",
                    backfaceVisibility: "hidden",
                  }}
                >
                  {friend.avatarUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={friend.avatarUrl}
                        alt={friend.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[16px] font-semibold text-neutral-200">
                      {badge}
                    </div>
                  )}
                </div>

                <div
                  className={clsx(
                    "absolute -right-2 -bottom-2",
                    "h-7 w-7 rounded-[10px]",
                    "border border-white/10",
                    "bg-primary-500/90",
                    "shadow-[0_12px_30px_rgba(154,70,255,0.25)]",
                    "flex items-center justify-center",
                  )}
                  style={{
                    transform: "translateZ(0.1px)",
                    backfaceVisibility: "hidden",
                  }}
                >
                  <span className="text-[11px] font-extrabold tracking-[-0.2px] text-neutral-0">
                    {badge}
                  </span>
                </div>
              </div>

              <div
                className="mt-3 text-center"
                style={{
                  transform: "translateZ(0.1px)",
                  backfaceVisibility: "hidden",
                }}
              >
                <div className="font-semibold tracking-[-0.25px] text-neutral-50">
                  {friend.name}
                </div>
                <div className="mt-1 text-[12px] text-neutral-400">
                  {friend.role}{" "}
                  <Link
                    href={friend.companyHref || "#"}
                    className="font-semibold text-primary-300 hover:text-primary-200"
                  >
                    {friend.company}
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-4 h-px w-full bg-white/10" />

            <div
              className="mt-4 space-y-2.5"
              style={{
                transform: "translateZ(0.1px)",
                backfaceVisibility: "hidden",
              }}
            >
              <div className="flex items-center gap-3">
                <span
                  className={clsx(
                    "inline-flex h-7 w-7 items-center justify-center rounded-md",
                    "bg-primary-500/15 text-primary-300",
                    "ring-1 ring-primary-500/20",
                  )}
                >
                  <Phone className="h-4 w-4" />
                </span>
                <span className="text-[12px] font-medium text-neutral-100">
                  {friend.phone || "—"}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={clsx(
                    "inline-flex h-7 w-7 items-center justify-center rounded-md",
                    "bg-primary-500/15 text-primary-300",
                    "ring-1 ring-primary-500/20",
                  )}
                >
                  <Mail className="h-4 w-4" />
                </span>
                <span className="text-[12px] font-medium text-neutral-100">
                  {friend.email || "—"}
                </span>
              </div>

              {/* ✅ NEW: Instagram under Email */}
              <div className="flex items-center gap-3">
                <span
                  className={clsx(
                    "inline-flex h-7 w-7 items-center justify-center rounded-md",
                    "bg-primary-500/15 text-primary-300",
                    "ring-1 ring-primary-500/20",
                  )}
                >
                  <Instagram className="h-4 w-4" />
                </span>

                {igText ? (
                  <a
                    href={igUrl || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className={clsx(
                      "text-[12px] font-medium text-neutral-100",
                      "hover:text-primary-200",
                      "truncate",
                    )}
                    title={igText}
                  >
                    {igText}
                  </a>
                ) : (
                  <span className="text-[12px] font-medium text-neutral-100">
                    —
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Tilt3d>
  );
}

function FriendsRow({
  friend,
  onRemove,
}: {
  friend: Friend;
  onRemove?: (id: string) => void;
}) {
  const badge = initialsFromName(friend.name);
  const igText = instagramDisplay(friend.instagram);
  const igUrl = instagramHref(friend.instagram);

  return (
    <div
      className={clsx(
        "flex items-center justify-between gap-4",
        "rounded-[12px] border border-white/10 bg-white/5 px-4 py-3",
        "hover:bg-white/7 transition-colors",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative">
          <div className="h-10 w-10 overflow-hidden rounded-[10px] bg-white/5 ring-1 ring-white/10">
            {friend.avatarUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={friend.avatarUrl}
                  alt={friend.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[12px] font-bold text-neutral-200">
                {badge}
              </div>
            )}
          </div>
          <div className="absolute -right-2 -bottom-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary-500/90 text-[10px] font-extrabold text-neutral-0 ring-1 ring-white/10">
            {badge}
          </div>
        </div>

        <div className="min-w-0 space-y-0.5">
          <div className="truncate text-[13px] font-semibold text-neutral-50">
            {friend.name}
          </div>
          <div className="truncate text-[12px] text-neutral-400">
            {friend.role}{" "}
            <span className="font-semibold text-primary-300">
              {friend.company}
            </span>
          </div>
        </div>
      </div>

      <div className="hidden items-center gap-6 md:flex">
        <div className="flex items-center gap-2 text-[12px] text-neutral-200">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary-500/15 text-primary-300 ring-1 ring-primary-500/20">
            <Phone className="h-4 w-4" />
          </span>
          {friend.phone || "—"}
        </div>

        <div className="flex items-center gap-2 text-[12px] text-neutral-200">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary-500/15 text-primary-300 ring-1 ring-primary-500/20">
            <Mail className="h-4 w-4" />
          </span>
          {friend.email || "—"}
        </div>

        {/* ✅ NEW: Instagram in list view (desktop) */}
        <div className="flex items-center gap-2 text-[12px] text-neutral-200">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary-500/15 text-primary-300 ring-1 ring-primary-500/20">
            <Instagram className="h-4 w-4" />
          </span>
          {igText ? (
            <a
              href={igUrl || "#"}
              target="_blank"
              rel="noreferrer"
              className="hover:text-primary-200"
              title={igText}
            >
              {igText}
            </a>
          ) : (
            "—"
          )}
        </div>
      </div>

      <FriendActionsMenu onRemove={() => onRemove?.(friend.id)} />
    </div>
  );
}

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
        <ChevronLeft className="h-4 w-4" />
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
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ---------------------------- Add Friend ---------------------------- */
function AddFriendModal({
  open,
  onClose,
  onSend,
}: {
  open: boolean;
  onClose: () => void;
  onSend: (selected: AddCandidate[]) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<AddCandidate[]>([]);
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const panelRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const lastActiveElRef = useRef<HTMLElement | null>(null);

  const qTrim = query.trim();
  const hasSearch = qTrim.length > 0;

  // ✅ Only fetch when user is actually searching (no default suggestions).
  const candidatesQ = useQuery({
    queryKey: ["friends-candidates", hasSearch ? qTrim : "", open],
    enabled: open && hasSearch,
    queryFn: async () => {
      const url = `/api/friends/candidates?q=${encodeURIComponent(qTrim)}`;
      return fetchJSON<AddCandidate[]>(url);
    },
  });

  const candidates = candidatesQ.data ?? EMPTY_CANDIDATES;

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

  const selectedIds = useMemo(() => selected.map((s) => s.id), [selected]);

  const results = useMemo(() => {
    // Show results excluding already selected users
    if (!hasSearch) return EMPTY_CANDIDATES;
    return candidates.filter((c) => !selectedIds.includes(c.id));
  }, [candidates, selectedIds, hasSearch]);

  const canSend = selected.length > 0;

  function togglePick(candidate: AddCandidate) {
    setSent(false);
    setErrorMsg("");
    setSelected((prev) =>
      prev.some((p) => p.id === candidate.id) ? prev : [...prev, candidate],
    );
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  function removePick(id: string) {
    setSent(false);
    setErrorMsg("");
    setSelected((prev) => prev.filter((x) => x.id !== id));
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  async function sendNow() {
    if (!canSend) return;
    setErrorMsg("");

    try {
      await onSend(selected);
      setSent(true);
      setSelected([]);
      setQuery("");
    } catch (e: unknown) {
      setErrorMsg(getErrorMessage(e, "Failed to send requests."));
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center px-3 py-6"
      role="dialog"
      aria-modal="true"
      aria-label="Add friends"
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
                Add Friends
              </div>
              <div className="mt-1 text-[12px] text-neutral-400">
                Search by email or phone, pick multiple, then send a request.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className={clsx(
              "inline-flex h-10 w-10 items-center justify-center rounded-full",
              "border border-white/10 bg-white/5 text-neutral-200 hover:bg-white/10",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
            )}
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
              Search by Email / Phone Number
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
                    const name = c.name ?? "Selected";
                    const badge = initialsFromName(name);

                    return (
                      <span
                        key={c.id}
                        className={clsx(
                          "inline-flex items-center gap-2 rounded-full",
                          "border border-white/10 bg-white/5 px-1 py-1",
                          "text-[12px] font-semibold text-neutral-100",
                        )}
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
                        <span className="max-w-[180px] truncate">{name}</span>
                        <button
                          type="button"
                          onClick={() => removePick(c.id)}
                          aria-label={`Remove ${name}`}
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
                      placeholder="Type email, phone, or name…"
                      className={clsx(
                        "h-10 w-full rounded-lg bg-transparent",
                        "pl-10 pr-4 text-[12px] text-neutral-100",
                        "placeholder:text-neutral-500",
                        "outline-none border-none focus:ring-1 focus:ring-primary-500",
                      )}
                    />
                  </div>
                </div>

                <div className="mt-2 text-[11px] text-neutral-500">
                  Tip: you can add multiple friends before sending.
                </div>
              </div>

              <div className="flex justify-stretch md:justify-end">
                <button
                  type="button"
                  onClick={sendNow}
                  disabled={!canSend}
                  className={clsx(
                    "w-full md:w-auto",
                    "inline-flex h-[52px] items-center justify-center gap-2 rounded-xl px-5",
                    "border border-white/10",
                    canSend
                      ? "bg-[linear-gradient(90deg,rgba(134,0,238,0.35),rgba(154,70,255,0.55),rgba(170,115,255,0.35))] text-neutral-0 shadow-[0_18px_54px_rgba(154,81,255,0.22)]"
                      : "bg-white/5 text-neutral-400 opacity-70",
                    "transition-[transform,filter,box-shadow] duration-200",
                    canSend &&
                      "hover:filter hover:brightness-[1.06] active:scale-[0.99]",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
                  )}
                >
                  <span className="text-[13px] font-semibold tracking-[-0.2px]">
                    Send Request
                  </span>
                  <Send className="h-4 w-4" />
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
                Requests sent.
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

          {/* ✅ Results section ONLY when searching (no default suggestions) */}
          {hasSearch ? (
            <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              <div
                className={clsx(
                  "flex items-center justify-between px-4 py-3 md:px-5",
                  "border-b border-white/10",
                )}
              >
                <div className="text-[13px] font-semibold text-neutral-200">
                  Results
                </div>
                <div className="text-[11px] text-neutral-500">
                  {candidatesQ.isLoading
                    ? "Searching…"
                    : `${results.length} result${results.length === 1 ? "" : "s"}`}
                </div>
              </div>

              <div className="max-h-[340px] overflow-auto p-2 no-scrollbar md:max-h-[420px]">
                {candidatesQ.isLoading ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                    <div
                      className={clsx(
                        "inline-flex h-12 w-12 items-center justify-center rounded-2xl",
                        "bg-primary-500/12 text-primary-200 ring-1 ring-primary-500/18",
                      )}
                    >
                      <Users className="h-5 w-5" />
                    </div>
                    <div className="text-[13px] font-semibold text-neutral-100">
                      Searching…
                    </div>
                    <div className="text-[12px] text-neutral-500">
                      Looking up users matching your query.
                    </div>
                  </div>
                ) : results.length ? (
                  <div className="space-y-2">
                    {results.map((c) => {
                      const badge = initialsFromName(c.name);

                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => togglePick(c)}
                          className={clsx(
                            "w-full text-left",
                            "flex items-center gap-3 rounded-2xl px-3 py-3",
                            "border border-white/10 bg-neutral-950/25 hover:bg-neutral-900/35",
                            "transition-colors",
                            "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
                          )}
                        >
                          <div className="relative">
                            <div className="h-11 w-11 overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/10">
                              {c.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={c.avatarUrl}
                                  alt={c.name}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[12px] font-extrabold text-neutral-200">
                                  {badge}
                                </div>
                              )}
                            </div>
                            <div className="absolute -right-1.5 -bottom-1.5 flex h-6 w-6 items-center justify-center rounded-xl bg-primary-500/90 text-[10px] font-extrabold text-neutral-0 ring-1 ring-white/10">
                              {badge}
                            </div>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="truncate font-semibold text-neutral-0">
                              {c.name}
                            </div>
                            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-neutral-400">
                              <span className="inline-flex items-center gap-2">
                                <Mail className="h-4 w-4 text-primary-300" />
                                <span className="truncate">{c.email}</span>
                              </span>
                              {c.phone ? (
                                <span className="inline-flex items-center gap-2">
                                  <Phone className="h-4 w-4 text-primary-300" />
                                  <span className="truncate">{c.phone}</span>
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <span
                            className={clsx(
                              "inline-flex h-9 items-center justify-center rounded-xl px-3",
                              "border border-white/10 bg-white/5 text-[12px] font-semibold",
                              "text-neutral-100 hover:border-primary-500/40",
                            )}
                          >
                            Add
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                    <div
                      className={clsx(
                        "inline-flex h-12 w-12 items-center justify-center rounded-2xl",
                        "bg-primary-500/12 text-primary-200 ring-1 ring-primary-500/18",
                      )}
                    >
                      <Users className="h-5 w-5" />
                    </div>
                    <div className="text-[13px] font-semibold text-neutral-100">
                      No matches found
                    </div>
                    <div className="text-[12px] text-neutral-500">
                      Try searching by email, phone, or name.
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}

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

/* ------------------------------ Page ------------------------------- */
export default function FriendsClient() {
  const qc = useQueryClient();

  const [friendsQuery, setFriendsQuery] = useState("");
  const [friendsView, setFriendsView] = useState<"grid" | "list">("grid");
  const [friendsPage, setFriendsPage] = useState(1);

  const [addOpen, setAddOpen] = useState(false);

  const [requestsOpen, setRequestsOpen] = useState(false);
  const requestsBtnRef = useRef<HTMLButtonElement | null>(null);
  const requestsPanelRef = useRef<HTMLDivElement | null>(null);

  const friendsQ = useQuery({
    queryKey: ["friends"],
    queryFn: () => fetchJSON<Friend[]>("/api/friends"),
  });

  const requestsQ = useQuery({
    queryKey: ["friend-requests"],
    queryFn: () => fetchJSON<FriendRequest[]>("/api/friends/requests"),
  });

  const removeMut = useMutation({
    mutationFn: (friendUserId: string) =>
      fetchJSON<{ ok: true }>(`/api/friends/${friendUserId}`, {
        method: "DELETE",
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["friends"] });
    },
  });

  const sendMut = useMutation({
    mutationFn: (toUserIds: string[]) =>
      fetchJSON<{ ok: true; created: string[]; skipped: unknown[] }>(
        "/api/friends/requests",
        { method: "POST", body: JSON.stringify({ toUserIds }) },
      ),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["friend-requests"] });
      await qc.invalidateQueries({ queryKey: ["friends"] });
    },
  });

  const acceptMut = useMutation({
    mutationFn: (requestId: string) =>
      fetchJSON<{ ok: true }>(`/api/friends/requests/${requestId}/accept`, {
        method: "POST",
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["friend-requests"] });
      await qc.invalidateQueries({ queryKey: ["friends"] });
    },
  });

  const declineMut = useMutation({
    mutationFn: (requestId: string) =>
      fetchJSON<{ ok: true }>(`/api/friends/requests/${requestId}/decline`, {
        method: "POST",
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["friend-requests"] });
    },
  });

  useEffect(() => {
    if (!requestsOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setRequestsOpen(false);
    };

    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node | null;
      if (!t) return;

      const btn = requestsBtnRef.current;
      const panel = requestsPanelRef.current;

      if (btn?.contains(t) || panel?.contains(t)) return;
      setRequestsOpen(false);
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("touchstart", onDown);

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("touchstart", onDown);
    };
  }, [requestsOpen]);

  function removeFriend(id: string) {
    removeMut.mutate(id);
  }

  function acceptRequest(requestId: string) {
    acceptMut.mutate(requestId);
  }

  function declineRequest(requestId: string) {
    declineMut.mutate(requestId);
  }

  const friends = friendsQ.data ?? EMPTY_FRIENDS;
  const requestsRaw = requestsQ.data ?? EMPTY_REQUESTS;

  const requests = useMemo(() => {
    return requestsRaw.map((r) => ({
      ...r,
      createdLabel: formatRelative(r.createdAt),
    }));
  }, [requestsRaw]);

  const friendsPageSize = 10;

  const friendsFiltered = useMemo(() => {
    const q = friendsQuery.trim().toLowerCase();
    if (!q) return friends;

    return friends.filter((f) => {
      const hay =
        `${f.name} ${f.role} ${f.company} ${f.email} ${f.phone} ${f.instagram ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [friendsQuery, friends]);

  const friendsTotal = friendsFiltered.length;
  const friendsTotalPages = Math.max(
    1,
    Math.ceil(friendsTotal / friendsPageSize),
  );

  useEffect(() => {
    setFriendsPage(1);
  }, [friendsQuery]);

  useEffect(() => {
    setFriendsPage((p) => clamp(p, 1, friendsTotalPages));
  }, [friendsTotalPages]);

  const friendsPageSafe = clamp(friendsPage, 1, friendsTotalPages);

  const friendsSlice = useMemo(() => {
    const start = (friendsPageSafe - 1) * friendsPageSize;
    return friendsFiltered.slice(start, start + friendsPageSize);
  }, [friendsFiltered, friendsPageSafe]);

  const friendsShowingLabel = useMemo(() => {
    if (!friendsTotal) return "Showing 0-0 from 0 data";
    const start = (friendsPageSafe - 1) * friendsPageSize + 1;
    const end = Math.min(friendsTotal, start + friendsPageSize - 1);
    return `Showing ${start}-${end} from ${friendsTotal} data`;
  }, [friendsTotal, friendsPageSafe]);

  const hasPending = requests.length > 0;

  return (
    <div className="relative overflow-hidden bg-neutral-950 text-neutral-0">
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
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-base font-semibold tracking-[0.18em] text-neutral-300">
                  FRIENDS
                </div>
                <div className="mt-1 text-neutral-400">
                  Manage your friends and contacts
                </div>
              </div>

              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
                <div
                  className={clsx(
                    "relative w-full sm:w-[420px]",
                    "rounded-lg border border-white/10 h-10",
                    "bg-[#121420]",
                    "shadow-[0_12px_34px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)]",
                    "hover:bg-white/5 hover:border-white/14",
                    "focus-within:border-primary-500/70 focus-within:ring-2 focus-within:ring-primary-500/20",
                  )}
                >
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-300" />
                  <input
                    value={friendsQuery}
                    onChange={(e) => setFriendsQuery(e.target.value)}
                    placeholder="Search here"
                    className={clsx(
                      "h-10 w-full rounded-lg bg-transparent",
                      "pl-10 pr-4 text-[12px] text-neutral-100",
                      "placeholder:text-neutral-500",
                      "outline-none border-none focus:ring-1 focus:ring-primary-500",
                    )}
                  />
                </div>

                <GridListToggle
                  value={friendsView}
                  onChange={(v) => setFriendsView(v)}
                  ariaLabel="Friends view toggle"
                />

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setAddOpen(true)}
                    type="button"
                    variant="primary"
                    icon={<Users className="h-4 w-4" />}
                    animation
                  >
                    Add Friend
                  </Button>

                  <div className="relative">
                    <button
                      ref={requestsBtnRef}
                      type="button"
                      onClick={() => setRequestsOpen((v) => !v)}
                      aria-label="Friend requests"
                      aria-expanded={requestsOpen}
                      className={clsx(
                        "relative inline-flex h-10 w-10 items-center justify-center rounded-lg",
                        "border border-white/10 cursor-pointer",
                        requestsOpen
                          ? "bg-primary-500/15 text-primary-200 ring-1 ring-primary-500/20"
                          : clsx(
                              "bg-[#121420] text-neutral-200 hover:bg-white/5 hover:border-white/14",
                              "shadow-[0_12px_34px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)]",
                            ),
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
                      )}
                    >
                      <Users2 className="h-4 w-4" />

                      {hasPending ? (
                        <span
                          className={clsx(
                            "absolute right-2 top-2 h-2 w-2 rounded-full",
                            "bg-red-500 ring-2 ring-neutral-950",
                          )}
                        />
                      ) : null}
                    </button>

                    {requestsOpen ? (
                      <div
                        ref={requestsPanelRef}
                        className={clsx(
                          "absolute right-0 top-[calc(100%+10px)] z-[60] w-[360px]",
                          "overflow-hidden rounded-2xl border border-white/10 bg-neutral-950/90",
                          "shadow-[0_24px_90px_rgba(0,0,0,0.65)] backdrop-blur-[10px]",
                        )}
                      >
                        <div className="border-b border-white/10 px-4 py-3">
                          <div className="text-[12px] font-semibold tracking-[0.18em] text-neutral-300">
                            FRIEND REQUESTS
                          </div>
                        </div>

                        {requestsQ.isLoading ? (
                          <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
                            <div
                              className={clsx(
                                "inline-flex h-10 w-10 items-center justify-center rounded-xl",
                                "bg-white/5 text-neutral-200 ring-1 ring-white/10",
                              )}
                            >
                              <Users2 className="h-5 w-5" />
                            </div>
                            <div className="text-[13px] font-semibold text-neutral-100">
                              Loading requests…
                            </div>
                            <div className="text-[12px] text-neutral-500">
                              Checking your inbox.
                            </div>
                          </div>
                        ) : requests.length === 0 ? (
                          <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
                            <div
                              className={clsx(
                                "inline-flex h-10 w-10 items-center justify-center rounded-xl",
                                "bg-white/5 text-neutral-200 ring-1 ring-white/10",
                              )}
                            >
                              <Users2 className="h-5 w-5" />
                            </div>
                            <div className="text-[13px] font-semibold text-neutral-100">
                              No pending friend requests
                            </div>
                            <div className="text-[12px] text-neutral-500">
                              You’re all caught up.
                            </div>
                          </div>
                        ) : (
                          <div className="max-h-[420px] overflow-auto p-2 no-scrollbar">
                            <div className="space-y-2">
                              {requests.map((r) => {
                                const badge = initialsFromName(r.name);
                                const pendingAny =
                                  acceptMut.isPending || declineMut.isPending;

                                return (
                                  <div
                                    key={r.id}
                                    className={clsx(
                                      "flex items-start gap-3 rounded-xl",
                                      "border border-white/10 bg-white/5 px-3 py-3",
                                      "hover:bg-white/7 transition-colors",
                                    )}
                                  >
                                    <div className="relative">
                                      <div className="h-12 w-12 overflow-hidden rounded-lg">
                                        {r.avatarUrl ? (
                                          <>
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                              src={r.avatarUrl}
                                              alt={r.name}
                                              className="h-full w-full object-cover"
                                              loading="lazy"
                                            />
                                          </>
                                        ) : (
                                          <div className="flex h-full w-full items-center justify-center text-[12px] font-extrabold text-neutral-200">
                                            {badge}
                                          </div>
                                        )}
                                      </div>
                                      <div className="absolute -right-1.5 -bottom-1.5 flex h-6 w-6 items-center justify-center rounded-xl bg-primary-500/90 text-[10px] font-extrabold text-neutral-0 ring-1 ring-white/10">
                                        {badge}
                                      </div>
                                    </div>

                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="truncate font-semibold text-neutral-0">
                                          {r.name}
                                        </div>
                                        <div className="inline-flex items-center gap-1 text-[11px] text-neutral-500">
                                          <Clock className="h-3.5 w-3.5" />
                                          {formatRelative(r.createdAt)}
                                        </div>
                                      </div>
                                      <div className="mt-1 text-[12px] text-neutral-400">
                                        Wants to be your friend
                                      </div>

                                      <div className="mt-3 flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => acceptRequest(r.id)}
                                          disabled={pendingAny}
                                          className={clsx(
                                            "inline-flex h-7 flex-1 items-center justify-center gap-2 rounded-lg px-3",
                                            "border border-white/10 bg-primary-500/15 text-primary-200",
                                            "hover:bg-primary-500/20 transition-colors",
                                            "disabled:opacity-60",
                                            "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
                                          )}
                                        >
                                          <Check className="h-4 w-4" />
                                          <span className="text-[11px] font-semibold">
                                            Accept
                                          </span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => declineRequest(r.id)}
                                          disabled={pendingAny}
                                          className={clsx(
                                            "inline-flex h-7 flex-1 items-center justify-center gap-2 rounded-lg px-3",
                                            "border border-white/10 bg-white/5 text-neutral-200",
                                            "hover:bg-white/10 transition-colors",
                                            "disabled:opacity-60",
                                            "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
                                          )}
                                        >
                                          <UserX className="h-4 w-4" />
                                          <span className="text-[11px] font-semibold">
                                            Decline
                                          </span>
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4">
              {friendsQ.isLoading ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                  <div
                    className={clsx(
                      "inline-flex h-12 w-12 items-center justify-center rounded-2xl",
                      "bg-primary-500/12 text-primary-200 ring-1 ring-primary-500/18",
                    )}
                  >
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="text-[13px] font-semibold text-neutral-100">
                    Loading friends…
                  </div>
                  <div className="text-[12px] text-neutral-500">
                    Syncing your contacts list.
                  </div>
                </div>
              ) : friendsFiltered.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                  <div
                    className={clsx(
                      "inline-flex h-12 w-12 items-center justify-center rounded-2xl",
                      "bg-primary-500/12 text-primary-200 ring-1 ring-primary-500/18",
                    )}
                  >
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="text-[13px] font-semibold text-neutral-100">
                    No friends found
                  </div>
                  <div className="text-[12px] text-neutral-500">
                    Try searching, or add a new friend.
                  </div>
                </div>
              ) : friendsView === "grid" ? (
                <div
                  className={clsx(
                    "grid gap-4",
                    "grid-cols-[repeat(auto-fill,minmax(240px,1fr))]",
                  )}
                >
                  {friendsSlice.map((f) => (
                    <FriendsCard
                      key={f.friendshipId}
                      friend={f}
                      onRemove={removeFriend}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {friendsSlice.map((f) => (
                    <FriendsRow
                      key={f.friendshipId}
                      friend={f}
                      onRemove={removeFriend}
                    />
                  ))}
                </div>
              )}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-[12px] text-neutral-300">
                  {friendsShowingLabel}
                </div>
                <Pagination
                  page={friendsPageSafe}
                  totalPages={friendsTotalPages}
                  onPage={setFriendsPage}
                />
              </div>
            </div>
          </div>
        </section>
      </section>

      <AddFriendModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSend={async (sel) => {
          const toUserIds = sel.map((s) => s.id);
          if (!toUserIds.length) return;
          await sendMut.mutateAsync(toUserIds);
        }}
      />
    </div>
  );
}
