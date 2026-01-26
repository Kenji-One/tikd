/* ------------------------------------------------------------------ */
/*  src/components/dashboard/tables/TrackingLinksTable.tsx            */
/* ------------------------------------------------------------------ */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ChevronDown, Check, Plus, Pencil, X, Trash2 } from "lucide-react";
import SortArrowsIcon from "@/components/ui/SortArrowsIcon";
import CopyButton from "@/components/ui/CopyButton";
import LabelledInput from "@/components/ui/LabelledInput";
import { Button } from "@/components/ui/Button";

/* ------------------------------- Types ------------------------------ */
type Status = "Active" | "Paused" | "Disabled";
type LinkType = "Event" | "Promo" | "Other";

type Row = {
  id: string;
  name: string;
  url: string; // path-only label (e.g., "/Tweets/32u8cxjh/")
  views: number;
  ticketsSold: number;
  revenue: number; // USD number
  type: LinkType;
  status: Status;
  created: string; // "Sep 19, 2025 4:12 PM" style
};

/* ----------------------------- Mock Data --------------------------- */
const INITIAL_ROWS: Row[] = new Array(7).fill(0).map((_, i) => ({
  id: `row-${i}`,
  name: "Tracking Link Name",
  url: `/Tweets/${(Math.random() + 1).toString(36).slice(2, 8)}/`,
  views: 2384,
  ticketsSold: 18 + i * 3,
  revenue: 1000 + i * 37,
  type: "Event",
  status: i % 2 ? "Active" : "Paused",
  created: `Sep 19, 2025 ${3 + (i % 3)}:${String(12 + i).padStart(2, "0")} PM`,
}));

/* ----------------------------- Helpers ----------------------------- */
type SortKey =
  | "views"
  | "ticketsSold"
  | "revenue"
  | "created"
  | "name"
  | "status";
type SortDir = "asc" | "desc";

const parseDate = (d: string) => Date.parse(d) || 0;

function formatCreated(d: Date) {
  // "Sep 19, 2025 3:24 PM" style
  const date = d.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${date} ${time}`;
}

function formatCreatedParts(label: string) {
  const ms = Date.parse(String(label || ""));
  if (!Number.isFinite(ms)) return { date: label, time: "" };
  const d = new Date(ms);
  const date = d.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return { date, time };
}

function makeId(prefix = "row") {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now()
    .toString(36)
    .slice(2, 8)}`;
}

function normalizePathInput(inputRaw: string) {
  const input = String(inputRaw || "").trim();
  if (!input) return "";

  // If they paste a full URL, try to extract pathname
  if (/^https?:\/\//i.test(input)) {
    try {
      const u = new URL(input);
      const p = u.pathname || "/";
      const withSlash = p.startsWith("/") ? p : `/${p}`;
      return withSlash.endsWith("/") ? withSlash : `${withSlash}/`;
    } catch {
      // fallthrough
    }
  }

  // treat as path
  const withLeading = input.startsWith("/") ? input : `/${input}`;
  return withLeading.endsWith("/") ? withLeading : `${withLeading}/`;
}

/* Tiny Twitter glyph matching table size */
function TwitterIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={clsx("opacity-80", className)}
    >
      <path
        fill="currentColor"
        d="M21.5 6.2c-.7.3-1.4.5-2.2.6.8-.5 1.4-1.2 1.7-2.1-.7.4-1.6.8-2.4.9A3.7 3.7 0 0 0 12 8.2c0 .3 0 .7.1 1A10.4 10.4 0 0 1 3.3 5a3.8 3.8 0 0 0 1.2 5 3.6 3.6 0 0 1-1.7-.5v.1c0 1.8 1.3 3.4 3 3.7a3.8 3.8 0 0 1-1.7.1 3.8 3.8 0 0 0 3.5 2.6 7.4 7.4 0 0 1-5.5 1.5A10.4 10.4 0 0 0 8.2 19c6.8 0 10.6-5.8 10.6-10.8v-.5c.7-.5 1.4-1.2 1.7-1.9z"
      />
    </svg>
  );
}

function Chip({
  children,
  color = "primary",
}: {
  children: React.ReactNode;
  color?: "primary" | "success" | "warning";
}) {
  const cls =
    color === "success"
      ? "bg-success-800 text-success-200 border-1 border-success-500"
      : color === "warning"
        ? "bg-warning-800 text-warning-200 border-1 border-warning-500"
        : "bg-primary-800 text-primary-200 border-1 border-primary-500";

  return (
    <span
      className={clsx(
        "rounded-md px-3 py-1.5 text-xs font-semibold leading-[100%] flex items-center justify-center",
        cls,
      )}
    >
      {children}
    </span>
  );
}

function statusRank(s: Status) {
  // Asc: Active < Paused < Disabled
  if (s === "Active") return 1;
  if (s === "Paused") return 2;
  return 3;
}

function formatMoneyUSD(amount: number) {
  const n = Number.isFinite(amount) ? amount : 0;
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function fullTrackingUrl(pathOnly: string) {
  // For demo we keep it local; swap to your real tracking domain if needed.
  if (!pathOnly) return "";
  return `${typeof window !== "undefined" ? window.location.origin : ""}${pathOnly}`;
}

function useEscapeToClose(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
}

/* ----------------------------- Dialogs ---------------------------- */
function ArchiveLinkDialog({
  open,
  row,
  onClose,
  onConfirm,
}: {
  open: boolean;
  row: Row | null;
  onClose: () => void;
  onConfirm: (row: Row) => void;
}) {
  useEscapeToClose(open, onClose);
  if (!open || !row) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={clsx(
          "relative mx-4 w-full max-w-[700px] overflow-hidden rounded-xl",
          "border border-white/10 bg-neutral-900",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pb-7 pt-10 md:px-12 md:pb-10">
          <h2 className="text-center text-3xl font-semibold tracking-[-0.48px] text-neutral-0">
            Archive Link
          </h2>
          <p className="mt-2.5 text-center text-base text-neutral-400 tracking-[-0.32px]">
            Are you sure you want to Archive “{row.name}”?
          </p>

          <div
            className={clsx(
              "mt-5 rounded-lg border border-error-500 bg-neutral-800 p-4",
            )}
          >
            <div className="flex flex-col items-start gap-0.5">
              <div className="items-center flex-shrink-0 gap-1 inline-flex">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="w-4 h-4 flex-shrink-0"
                >
                  <path
                    d="M14.5067 10.6133L10.24 2.93333C9.66665 1.9 8.87332 1.33333 7.99998 1.33333C7.12665 1.33333 6.33332 1.9 5.75998 2.93333L1.49332 10.6133C0.953318 11.5933 0.893318 12.5333 1.32665 13.2733C1.75999 14.0133 2.61332 14.42 3.73332 14.42H12.2667C13.3867 14.42 14.24 14.0133 14.6733 13.2733C15.1067 12.5333 15.0467 11.5867 14.5067 10.6133ZM7.49998 6C7.49998 5.72666 7.72665 5.5 7.99998 5.5C8.27332 5.5 8.49998 5.72666 8.49998 6V9.33333C8.49998 9.60666 8.27332 9.83333 7.99998 9.83333C7.72665 9.83333 7.49998 9.60666 7.49998 9.33333V6ZM8.47332 11.8067C8.43998 11.8333 8.40665 11.86 8.37332 11.8867C8.33332 11.9133 8.29332 11.9333 8.25332 11.9467C8.21332 11.9667 8.17332 11.98 8.12665 11.9867C8.08665 11.9933 8.03998 12 7.99998 12C7.95998 12 7.91332 11.9933 7.86665 11.9867C7.82665 11.98 7.78665 11.9667 7.74665 11.9467C7.70665 11.9333 7.66665 11.9133 7.62665 11.8867C7.59332 11.86 7.55998 11.8333 7.52665 11.8067C7.40665 11.68 7.33332 11.5067 7.33332 11.3333C7.33332 11.16 7.40665 10.9867 7.52665 10.86C7.55998 10.8333 7.59332 10.8067 7.62665 10.78C7.66665 10.7533 7.70665 10.7333 7.74665 10.72C7.78665 10.7 7.82665 10.6867 7.86665 10.68C7.95332 10.66 8.04665 10.66 8.12665 10.68C8.17332 10.6867 8.21332 10.7 8.25332 10.72C8.29332 10.7333 8.33332 10.7533 8.37332 10.78C8.40665 10.8067 8.43998 10.8333 8.47332 10.86C8.59332 10.9867 8.66665 11.16 8.66665 11.3333C8.66665 11.5067 8.59332 11.68 8.47332 11.8067Z"
                    fill="#FF454A"
                  />
                </svg>
                <p className="text-base font-medium uppercase text-error-500 tracking-[-0.32px]">
                  Reminder
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-base text-neutral-0">
                  Links cannot be deleted as this may cause issues with your
                  records. Instead, they’ll be safely moved to your
                  <a
                    href="/dashboard/tracking/archives"
                    className="text-primary-500 underline decoration-primary-500 underline-offset-4 hover:text-primary-500 ml-1"
                    onClick={(e) => {
                      e.preventDefault();
                      onClose();
                      window.location.href = "/dashboard/tracking/archives";
                    }}
                  >
                    Archives Folder
                  </a>
                </p>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              className={clsx(
                "rounded-full",
                "border border-white/40 bg-transparent py-3 px-6 text-base font-medium text-neutral-0 leading-[100%]",
                "transition hover:border-white/60 cursor-pointer",
              )}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => onConfirm(row)}
              className={clsx(
                "rounded-full px-6 py-3",
                "bg-error-500 text-base font-semibold text-white leading-[100%]",
                "transition hover:bg-error-400 cursor-pointer",
              )}
            >
              <span className="inline-flex items-center justify-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <path
                    d="M14.0467 3.48666C12.9733 3.38 11.9 3.3 10.82 3.24V3.23333L10.6733 2.36666C10.5733 1.75333 10.4267 0.833328 8.86667 0.833328H7.12C5.56667 0.833328 5.42 1.71333 5.31334 2.35999L5.17334 3.21333C4.55334 3.25333 3.93334 3.29333 3.31334 3.35333L1.95334 3.48666C1.67334 3.51333 1.47334 3.76 1.5 4.03333C1.52667 4.30666 1.76667 4.50666 2.04667 4.47999L3.40667 4.34666C6.9 3.99999 10.42 4.13333 13.9533 4.48666C13.9733 4.48666 13.9867 4.48666 14.0067 4.48666C14.26 4.48666 14.48 4.29333 14.5067 4.03333C14.5267 3.76 14.3267 3.51333 14.0467 3.48666Z"
                    fill="white"
                  />
                  <path
                    d="M12.82 5.42666C12.66 5.26 12.44 5.16666 12.2133 5.16666H3.78667C3.56001 5.16666 3.33334 5.26 3.18001 5.42666C3.02667 5.59333 2.94001 5.82 2.95334 6.05333L3.36667 12.8933C3.44001 13.9067 3.53334 15.1733 5.86001 15.1733H10.14C12.4667 15.1733 12.56 13.9133 12.6333 12.8933L13.0467 6.06C13.06 5.82 12.9733 5.59333 12.82 5.42666ZM9.10667 11.8333H6.88667C6.61334 11.8333 6.38667 11.6067 6.38667 11.3333C6.38667 11.06 6.61334 10.8333 6.88667 10.8333H9.10667C9.38001 10.8333 9.60667 11.06 9.60667 11.3333C9.60667 11.6067 9.38001 11.8333 9.10667 11.8333ZM9.66667 9.16666H6.33334C6.06001 9.16666 5.83334 8.94 5.83334 8.66666C5.83334 8.39333 6.06001 8.16666 6.33334 8.16666H9.66667C9.94001 8.16666 10.1667 8.39333 10.1667 8.66666C10.1667 8.94 9.94001 9.16666 9.66667 9.16666Z"
                    fill="white"
                  />
                </svg>
                Archive
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function QrDialog({
  open,
  row,
  onClose,
}: {
  open: boolean;
  row: Row | null;
  onClose: () => void;
}) {
  useEscapeToClose(open, onClose);
  if (!open || !row) return null;

  const qrValue = fullTrackingUrl(row.url) || row.url;

  const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=520x520&data=${encodeURIComponent(
    qrValue,
  )}`;

  const handleShare = async () => {
    try {
      if (typeof navigator !== "undefined" && "share" in navigator) {
        await navigator.share({ title: row.name, text: qrValue, url: qrValue });
        return;
      }
    } catch {
      // ignore
    }

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(qrValue);
      }
    } catch {
      // ignore
    }
  };

  const handleSave = async () => {
    try {
      const a = document.createElement("a");
      a.href = qrImg;
      a.download = `${row.name || "qr"}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={clsx(
          "relative mx-4 w-full max-w-[487px] overflow-hidden rounded-xl",
          "border border-white/10 bg-neutral-900 ",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-8 pb-4 pt-10 md:px-12">
          <div className="mx-auto flex w-full max-w-[360px] flex-col items-center">
            <div
              className={clsx(
                "relative w-full max-w-[170px] overflow-hidden rounded-lg bg-white p-2",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrImg} alt="QR Code" className="h-auto w-full" />
            </div>

            <p className="mt-6 text-center text-neutral-400">
              {row.name.toUpperCase()}
            </p>

            <p className="mt-1 text-center text-3xl font-semibold uppercase tracking-[-0.48px] text-neutral-0 ">
              {row.url.replaceAll("/", " ").trim() || "TRACKING LINK"}
            </p>

            <div className="mt-6 flex w-full items-center justify-center gap-4">
              <button
                type="button"
                onClick={handleShare}
                className={clsx(
                  "rounded-full",
                  "border border-white/40 bg-transparent py-3 px-6 text-base font-medium text-neutral-0",
                  "transition hover:border-white/60 cursor-pointer",
                )}
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <path
                      d="M10.76 1.97333L4.74002 3.97333C0.693351 5.32666 0.693351 7.53333 4.74002 8.88L6.52668 9.47333L7.12002 11.26C8.46668 15.3067 10.68 15.3067 12.0267 11.26L14.0333 5.24666C14.9267 2.54666 13.46 1.07333 10.76 1.97333ZM10.9733 5.56L8.44002 8.10666C8.34002 8.20667 8.21335 8.25333 8.08668 8.25333C7.96002 8.25333 7.83335 8.20667 7.73335 8.10666C7.54002 7.91333 7.54002 7.59333 7.73335 7.4L10.2667 4.85333C10.46 4.66 10.78 4.66 10.9733 4.85333C11.1667 5.04666 11.1667 5.36666 10.9733 5.56Z"
                      fill="white"
                    />
                  </svg>
                  Share
                </span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                className={clsx(
                  "rounded-full px-6 py-3",
                  "bg-primary-500 text-base font-semibold text-white",
                  "transition hover:bg-primary-400 cursor-pointer",
                )}
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <path
                      d="M13.6667 6.79334H11.74C10.16 6.79334 8.87335 5.50667 8.87335 3.92667V2C8.87335 1.63334 8.57335 1.33334 8.20669 1.33334H5.38002C3.32669 1.33334 1.66669 2.66667 1.66669 5.04667V10.9533C1.66669 13.3333 3.32669 14.6667 5.38002 14.6667H10.62C12.6734 14.6667 14.3334 13.3333 14.3334 10.9533V7.46C14.3334 7.09334 14.0334 6.79334 13.6667 6.79334ZM8.18669 10.52L6.85335 11.8533C6.80669 11.9 6.74669 11.94 6.68669 11.96C6.62669 11.9867 6.56669 12 6.50002 12C6.43335 12 6.37335 11.9867 6.31335 11.96C6.26002 11.94 6.20669 11.9 6.16669 11.86C6.16002 11.8533 6.15335 11.8533 6.15335 11.8467L4.82002 10.5133C4.62669 10.32 4.62669 10 4.82002 9.80667C5.01335 9.61334 5.33335 9.61334 5.52669 9.80667L6.00002 10.2933V7.5C6.00002 7.22667 6.22669 7 6.50002 7C6.77335 7 7.00002 7.22667 7.00002 7.5V10.2933L7.48002 9.81334C7.67335 9.62 7.99335 9.62 8.18669 9.81334C8.38002 10.0067 8.38002 10.3267 8.18669 10.52Z"
                      fill="white"
                    />
                    <path
                      d="M11.62 5.87333C12.2533 5.88 13.1333 5.88 13.8867 5.88C14.2667 5.88 14.4667 5.43333 14.2 5.16667C13.24 4.2 11.52 2.46 10.5333 1.47333C10.26 1.2 9.78668 1.38667 9.78668 1.76667V4.09333C9.78668 5.06667 10.6133 5.87333 11.62 5.87333Z"
                      fill="white"
                    />
                  </svg>
                  Save
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="mt-10 text-sm font-medium text-neutral-500 hover:text-neutral-0 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type TrackingLinkDraft = {
  name: string;
  url: string;
  type: LinkType;
  status: Status;
};

function TrackingLinkDialog({
  open,
  mode,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  mode: "create" | "edit";
  initial?: Row | null;
  onClose: () => void;
  onSave: (draft: TrackingLinkDraft) => void;
}) {
  useEscapeToClose(open, onClose);

  const [draft, setDraft] = useState<TrackingLinkDraft>({
    name: "",
    url: "",
    type: "Event",
    status: "Active",
  });

  const [touched, setTouched] = useState(false);

  // Custom selects open state
  const [typeOpen, setTypeOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const typeWrapRef = useRef<HTMLDivElement | null>(null);
  const statusWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    setTouched(false);
    setTypeOpen(false);
    setStatusOpen(false);

    if (mode === "edit" && initial) {
      setDraft({
        name: initial.name || "",
        url: initial.url || "",
        type: initial.type,
        status: initial.status,
      });
    } else {
      setDraft({
        name: "Tracking Link Name",
        url: "/Tweets/",
        type: "Event",
        status: "Active",
      });
    }

    // focus next tick (LabelledInput doesn't forward refs, so focus by id)
    const t = window.setTimeout(() => {
      const el = document.getElementById("tracking-link-name");
      if (el && "focus" in el) (el as HTMLInputElement).focus();
    }, 0);

    return () => window.clearTimeout(t);
  }, [open, mode, initial]);

  // Close dropdowns on outside click
  useEffect(() => {
    if (!open) return;

    const onDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;

      const inType = !!typeWrapRef.current?.contains(target);
      const inStatus = !!statusWrapRef.current?.contains(target);

      if (!inType) setTypeOpen(false);
      if (!inStatus) setStatusOpen(false);
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  if (!open) return null;

  const title =
    mode === "create" ? "Create Tracking Link" : "Edit Tracking Link";

  const normalizedUrl = normalizePathInput(draft.url);
  const nameOk = draft.name.trim().length >= 2;
  const urlOk = normalizedUrl.startsWith("/") && normalizedUrl.length >= 2;

  const canSave = nameOk && urlOk;

  const errName = !nameOk && touched;
  const errUrl = !urlOk && touched;

  const typeOptions: { value: LinkType; label: string; desc?: string }[] = [
    {
      value: "Event",
      label: "Event",
      desc: "Tracking link for a specific event",
    },
    {
      value: "Promo",
      label: "Promo",
      desc: "Used for promotions and campaigns",
    },
    { value: "Other", label: "Other", desc: "Anything else" },
  ];

  const statusOptions: { value: Status; label: string; desc?: string }[] = [
    { value: "Active", label: "Active", desc: "Enabled and collecting views" },
    { value: "Paused", label: "Paused", desc: "Temporarily disabled" },
    { value: "Disabled", label: "Disabled", desc: "Fully disabled" },
  ];

  const selectBtnCls = clsx(
    "mt-2 w-full rounded-lg border bg-neutral-900 px-4 py-3 text-base text-neutral-0 outline-none",
    "border-white/10",
    "hover:border-white/20",
    "focus:border-primary-500",
    "transition cursor-pointer",
    "flex items-center justify-between gap-3",
  );

  const dropdownPanelCls = clsx(
    "absolute left-0 right-0 z-[90] mt-2 overflow-hidden rounded-lg",
    "border border-white/10 bg-neutral-900",
  );

  const optionBtnBase = clsx(
    "w-full text-left px-4 py-3 transition flex items-start justify-between gap-3",
    "hover:bg-white/5 focus:bg-white/5 focus:outline-none",
  );

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        className={clsx(
          "relative mx-4 w-full max-w-[720px] rounded-xl",
          "border border-white/10 bg-neutral-900",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 md:px-8">
          <div className="min-w-0">
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.48px] text-neutral-0">
              {title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-white/10 p-2 text-white/70 hover:text-white hover:border-white/20 cursor-pointer"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 md:px-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Name */}
            <div className="md:col-span-2">
              <LabelledInput
                id="tracking-link-name"
                label="Tracking Link Name"
                value={draft.name}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, name: e.target.value }))
                }
                onBlur={() => setTouched(true)}
                placeholder="e.g. Twitter Campaign A"
                size="lg"
                variant="full"
                error={
                  errName
                    ? "Please enter a name (at least 2 characters)."
                    : null
                }
                className={clsx(
                  "bg-neutral-900 border-white/10",
                  errName
                    ? "border-error-500 focus:border-error-400"
                    : "focus:border-primary-600/50",
                )}
              />
            </div>

            {/* Path */}
            <div className="md:col-span-2">
              <p className="text-sm text-neutral-500">
                This is the path users will see in the table (you can paste a
                full URL; we’ll keep the pathname).
              </p>

              <div className="mt-2">
                <LabelledInput
                  id="tracking-link-path"
                  label="Link Path"
                  value={draft.url}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, url: e.target.value }))
                  }
                  onBlur={() => setTouched(true)}
                  placeholder="/Tweets/abc123/"
                  size="lg"
                  variant="full"
                  error={
                    errUrl
                      ? "Please enter a valid path (must start with “/”)."
                      : null
                  }
                  className={clsx(
                    "bg-neutral-900 border-white/10",
                    errUrl
                      ? "border-error-500 focus:border-error-400"
                      : "focus:border-primary-600/50",
                  )}
                />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-neutral-400">
                <span className="rounded-md border border-white/10 bg-neutral-800 px-2.5 py-1">
                  Preview
                </span>
                <span className="text-neutral-300">{normalizedUrl || "—"}</span>
                {normalizedUrl ? (
                  <span className="text-neutral-500">
                    ({fullTrackingUrl(normalizedUrl)})
                  </span>
                ) : null}
              </div>
            </div>

            {/* Type (custom select) */}
            <div ref={typeWrapRef} className="relative">
              <label className="block leading-[90%] font-normal text-white mb-2">
                Link Type
              </label>

              <button
                type="button"
                className={selectBtnCls}
                aria-haspopup="listbox"
                aria-expanded={typeOpen}
                onClick={() => {
                  setStatusOpen(false);
                  setTypeOpen((v) => !v);
                }}
              >
                <span className="truncate">
                  {typeOptions.find((o) => o.value === draft.type)?.label ??
                    draft.type}
                </span>
                <ChevronDown
                  size={16}
                  className={clsx(
                    "text-neutral-400 transition",
                    typeOpen && "rotate-180 text-neutral-200",
                  )}
                />
              </button>

              {typeOpen ? (
                <div className={dropdownPanelCls} role="listbox">
                  <div className="max-h-64 overflow-auto">
                    {typeOptions.map((opt) => {
                      const selected = opt.value === draft.type;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          className={clsx(
                            optionBtnBase,
                            selected && "bg-primary-500/10",
                          )}
                          onClick={() => {
                            setDraft((d) => ({ ...d, type: opt.value }));
                            setTypeOpen(false);
                          }}
                        >
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-neutral-0">
                              {opt.label}
                            </span>
                            {opt.desc ? (
                              <span className="mt-1 block text-xs text-neutral-400">
                                {opt.desc}
                              </span>
                            ) : null}
                          </span>

                          {selected ? (
                            <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-md border border-primary-500/30 bg-primary-500/15 text-primary-200">
                              <Check size={16} />
                            </span>
                          ) : (
                            <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/5 text-transparent">
                              <Check size={16} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Status (custom select) */}
            <div ref={statusWrapRef} className="relative">
              <label className="block leading-[90%] font-normal text-white mb-2">
                Status
              </label>

              <button
                type="button"
                className={selectBtnCls}
                aria-haspopup="listbox"
                aria-expanded={statusOpen}
                onClick={() => {
                  setTypeOpen(false);
                  setStatusOpen((v) => !v);
                }}
              >
                <span className="truncate">
                  {statusOptions.find((o) => o.value === draft.status)?.label ??
                    draft.status}
                </span>
                <ChevronDown
                  size={16}
                  className={clsx(
                    "text-neutral-400 transition",
                    statusOpen && "rotate-180 text-neutral-200",
                  )}
                />
              </button>

              {statusOpen ? (
                <div className={dropdownPanelCls} role="listbox">
                  <div className="max-h-64 overflow-auto">
                    {statusOptions.map((opt) => {
                      const selected = opt.value === draft.status;

                      // subtle status tint
                      const tint =
                        opt.value === "Active"
                          ? "bg-success-500/10 border-success-500/25"
                          : opt.value === "Paused"
                            ? "bg-warning-500/10 border-warning-500/25"
                            : "bg-white/5 border-white/10";

                      return (
                        <button
                          key={opt.value}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          className={clsx(
                            optionBtnBase,
                            selected && "bg-primary-500/10",
                          )}
                          onClick={() => {
                            setDraft((d) => ({ ...d, status: opt.value }));
                            setStatusOpen(false);
                          }}
                        >
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-neutral-0">
                              {opt.label}
                            </span>
                            {opt.desc ? (
                              <span className="mt-1 block text-xs text-neutral-400">
                                {opt.desc}
                              </span>
                            ) : null}
                          </span>

                          <span
                            className={clsx(
                              "mt-0.5 inline-flex h-7 min-w-[64px] items-center justify-center rounded-md border px-2 text-xs font-semibold",
                              selected
                                ? "border-primary-500/35 bg-primary-500/15 text-primary-200"
                                : tint,
                              selected ? "" : "text-neutral-300",
                            )}
                          >
                            {selected ? (
                              <span className="inline-flex items-center gap-1">
                                <Check size={14} />
                                Selected
                              </span>
                            ) : (
                              "Choose"
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 flex flex-col items-center justify-end gap-3 sm:flex-row">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onClose}
              className={clsx(
                "py-3 px-6 text-base font-medium leading-[100%]",
                "border-white/40 hover:border-white/60 hover:bg-transparent",
              )}
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="primary"
              size="md"
              disabled={!canSave}
              icon={
                mode === "create" ? <Plus size={16} /> : <Pencil size={16} />
              }
              onClick={() => {
                setTouched(true);
                if (!canSave) return;

                onSave({
                  name: draft.name.trim(),
                  url: normalizePathInput(draft.url),
                  type: draft.type,
                  status: draft.status,
                });
              }}
              className={clsx(
                "py-3 px-6 text-base font-semibold leading-[100%]",
                !canSave && "bg-white/10 hover:bg-white/10",
              )}
              animation
            >
              {mode === "create" ? "Create" : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Component --------------------------- */
export default function TrackingLinksTable() {
  const [data, setData] = useState<Row[]>(INITIAL_ROWS);

  const [sortBy, setSortBy] = useState<SortKey>("views");
  const [dir, setDir] = useState<SortDir>("desc");

  const [archiveOpen, setArchiveOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [activeRow, setActiveRow] = useState<Row | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const sorted = useMemo(() => {
    const arr = [...data];
    arr.sort((a, b) => {
      let A: number | string;
      let B: number | string;

      if (sortBy === "views") {
        A = a.views;
        B = b.views;
      } else if (sortBy === "ticketsSold") {
        A = a.ticketsSold;
        B = b.ticketsSold;
      } else if (sortBy === "revenue") {
        A = a.revenue;
        B = b.revenue;
      } else if (sortBy === "created") {
        A = parseDate(a.created);
        B = parseDate(b.created);
      } else if (sortBy === "status") {
        A = statusRank(a.status);
        B = statusRank(b.status);
      } else {
        A = a.name;
        B = b.name;
      }

      if (typeof A === "number" && typeof B === "number") {
        return dir === "asc" ? A - B : B - A;
      }
      return dir === "asc"
        ? String(A).localeCompare(String(B))
        : String(B).localeCompare(String(A));
    });
    return arr;
  }, [data, sortBy, dir]);

  const toggleSort = (key: SortKey) => {
    if (key === sortBy) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setDir("desc");
    }
  };

  /* Clamp + fade like MyTeamTable/RecentSalesTable */
  const clipRef = useRef<HTMLDivElement | null>(null);
  const [isClamped, setIsClamped] = useState(false);
  const MAX = 458;

  useEffect(() => {
    if (!clipRef.current) return;
    const el = clipRef.current;
    const recompute = () => setIsClamped(el.scrollHeight > MAX + 0.5);
    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(el);
    const onResize = () => recompute();
    window.addEventListener("resize", onResize);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const openArchive = (row: Row) => {
    setActiveRow(row);
    setArchiveOpen(true);
  };

  const confirmArchive = (row: Row) => {
    // TODO: replace with your real archive mutation
    setArchiveOpen(false);
    setActiveRow(null);
  };

  const openQr = (row: Row) => {
    setActiveRow(row);
    setQrOpen(true);
  };

  const closeQr = () => {
    setQrOpen(false);
    setActiveRow(null);
  };

  const closeArchive = () => {
    setArchiveOpen(false);
    setActiveRow(null);
  };

  const openEdit = (row: Row) => {
    setActiveRow(row);
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setActiveRow(null);
  };

  const openCreate = () => {
    setCreateOpen(true);
  };

  const closeCreate = () => {
    setCreateOpen(false);
  };

  const handleCreate = (draft: {
    name: string;
    url: string;
    type: LinkType;
    status: Status;
  }) => {
    const now = new Date();
    const newRow: Row = {
      id: makeId("row"),
      name: draft.name,
      url: draft.url,
      type: draft.type,
      status: draft.status,
      created: formatCreated(now),
      views: 0,
      ticketsSold: 0,
      revenue: 0,
    };

    // Add to top (feels right for dashboards)
    setData((prev) => [newRow, ...prev]);
    setCreateOpen(false);
  };

  const handleEdit = (draft: {
    name: string;
    url: string;
    type: LinkType;
    status: Status;
  }) => {
    if (!activeRow) return;

    setData((prev) =>
      prev.map((r) =>
        r.id === activeRow.id
          ? {
              ...r,
              name: draft.name,
              url: draft.url,
              type: draft.type,
              status: draft.status,
            }
          : r,
      ),
    );

    setEditOpen(false);
    setActiveRow(null);
  };

  const thRow = "[&>th]:pb-3 [&>th]:pt-1 [&>th]:px-4";
  const thBase =
    "text-base font-semibold cursor-pointer select-none hover:text-white/80";

  const separatorLine =
    "bg-[linear-gradient(90deg,rgba(154,70,255,0)_0%,rgba(154,70,255,0.18)_30%,rgba(255,255,255,0.08)_50%,rgba(154,70,255,0.18)_70%,rgba(154,70,255,0)_100%)]";

  return (
    <div className="relative rounded-lg border border-neutral-700 bg-neutral-900 pt-2">
      {/* Header */}
      <div className="mb-2 pb-2 border-b border-neutral-700 flex items-center justify-between px-4">
        <h3 className="text-base font-bold uppercase text-neutral-400">
          Tracking Links
        </h3>

        {/* + Create (top-right) */}
        <button
          type="button"
          onClick={openCreate}
          className={clsx(
            "inline-flex items-center justify-center",
            "h-8 w-8 rounded-md",
            "border border-neutral-500 bg-neutral-700 text-white",
            "hover:text-white hover:border-white",
            "focus:outline-none",
            "cursor-pointer",
          )}
          title="Create Tracking Link"
          aria-label="Create Tracking Link"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Table */}
      <div
        ref={clipRef}
        className="relative overflow-hidden rounded-lg"
        style={{ height: isClamped ? `${MAX}px` : "auto" }}
      >
        <table className="w-full table-fixed border-collapse font-medium">
          {/* “Equally spaced” columns: explicit col widths */}
          <colgroup>
            <col style={{ width: "16%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "8%" }} />
          </colgroup>

          <thead className="text-neutral-400">
            <tr className={thRow}>
              <th
                className={clsx(thBase, "text-left")}
                onClick={() => toggleSort("name")}
                aria-sort={
                  sortBy === "name"
                    ? dir === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                <div className="inline-flex items-center">
                  Name &amp; Link
                  <SortArrowsIcon
                    direction={sortBy === "name" ? dir : null}
                    className="ml-2 -translate-y-[1px]"
                  />
                </div>
              </th>

              <th className="text-center text-base font-semibold">QR Code</th>

              <th
                className={clsx(thBase, "text-center")}
                onClick={() => toggleSort("views")}
                aria-sort={
                  sortBy === "views"
                    ? dir === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                <div className="inline-flex items-center">
                  Views
                  <SortArrowsIcon
                    direction={sortBy === "views" ? dir : null}
                    className="ml-2 -translate-y-[1px]"
                  />
                </div>
              </th>

              <th
                className={clsx(thBase, "text-center")}
                onClick={() => toggleSort("ticketsSold")}
                aria-sort={
                  sortBy === "ticketsSold"
                    ? dir === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                <div className="inline-flex items-center">
                  Tickets Sold
                  <SortArrowsIcon
                    direction={sortBy === "ticketsSold" ? dir : null}
                    className="ml-2 -translate-y-[1px]"
                  />
                </div>
              </th>

              <th
                className={clsx(thBase, "text-center")}
                onClick={() => toggleSort("revenue")}
                aria-sort={
                  sortBy === "revenue"
                    ? dir === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                <div className="inline-flex items-center">
                  Revenue
                  <SortArrowsIcon
                    direction={sortBy === "revenue" ? dir : null}
                    className="ml-2 -translate-y-[1px]"
                  />
                </div>
              </th>

              <th className="text-center text-base font-semibold">Link Type</th>

              <th
                className={clsx(thBase, "text-center")}
                onClick={() => toggleSort("status")}
                aria-sort={
                  sortBy === "status"
                    ? dir === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                <div className="inline-flex items-center">
                  Status
                  <SortArrowsIcon
                    direction={sortBy === "status" ? dir : null}
                    className="ml-2 -translate-y-[1px]"
                  />
                </div>
              </th>

              <th
                className={clsx(thBase, "text-center")}
                onClick={() => toggleSort("created")}
                aria-sort={
                  sortBy === "created"
                    ? dir === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                <div className="inline-flex items-center">
                  Date Created
                  <SortArrowsIcon
                    direction={sortBy === "created" ? dir : null}
                    className="ml-2 -translate-y-[1px]"
                  />
                </div>
              </th>

              <th className="text-right font-semibold"> </th>
            </tr>
          </thead>

          <tbody className="text-white">
            {sorted.flatMap((r, i) => {
              const isLast = i === sorted.length - 1;
              const rowBg = i % 2 === 0 ? "bg-neutral-948" : "bg-neutral-900";

              const dataRow = (
                <tr key={r.id} className={clsx("transition-colors", rowBg)}>
                  {/* Name & Link (URL moved under name + copy button to the right) */}
                  <td className="px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-neutral-200">
                        {r.name}
                      </p>

                      <div className="mt-2 flex min-w-0 items-center gap-2 text-neutral-400">
                        <TwitterIcon className="h-5 w-5 opacity-70" />
                        <span className="min-w-0 truncate text-neutral-300">
                          {r.url}
                        </span>

                        <CopyButton
                          text={fullTrackingUrl(r.url) || r.url}
                          title="Copy tracking link"
                          ariaLabel="Copy tracking link"
                          className="inline-flex items-center rounded-sm border border-white/10 p-1 text-white/70 hover:text-white hover:border-white/20 ml-1"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                          >
                            <path
                              d="M4.6665 6.44469C4.6665 5.97313 4.85383 5.52089 5.18727 5.18745C5.52071 4.85401 5.97295 4.66669 6.4445 4.66669H12.2218C12.4553 4.66669 12.6865 4.71268 12.9022 4.80203C13.118 4.89138 13.314 5.02235 13.4791 5.18745C13.6442 5.35255 13.7751 5.54856 13.8645 5.76428C13.9538 5.97999 13.9998 6.2112 13.9998 6.44469V12.222C13.9998 12.4555 13.9538 12.6867 13.8645 12.9024C13.7751 13.1181 13.6442 13.3142 13.4791 13.4793C13.314 13.6444 13.118 13.7753 12.9022 13.8647C12.6865 13.954 12.4553 14 12.2218 14H6.4445C6.21101 14 5.97981 13.954 5.76409 13.8647C5.54838 13.7753 5.35237 13.6444 5.18727 13.4793C5.02217 13.3142 4.8912 13.1181 4.80185 12.9024C4.71249 12.6867 4.6665 12.4555 4.6665 12.222V6.44469Z"
                              stroke="#727293"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M2.67467 11.158C2.47 11.0417 2.29977 10.8733 2.18127 10.6699C2.06277 10.4665 2.00023 10.2354 2 10V3.33333C2 2.6 2.6 2 3.33333 2H10C10.5 2 10.772 2.25667 11 2.66667"
                              stroke="#727293"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </CopyButton>
                      </div>
                    </div>
                  </td>

                  {/* QR Code (pulled closer by narrower column + centered) */}
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => openQr(r)}
                      className={clsx(
                        "inline-flex items-center justify-center rounded-md p-1 mr-1",
                        "hover:bg-white/5 focus:outline-none focus:ring-1 focus:ring-primary-600/35 cursor-pointer",
                      )}
                      title="Open QR"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="22"
                        height="22"
                        viewBox="0 0 22 22"
                        fill="none"
                        className="w-7 h-7"
                      >
                        <path
                          d="M12.8333 11.9167C13.0579 11.9167 13.2746 11.9991 13.4423 12.1483C13.6101 12.2975 13.7173 12.5031 13.7436 12.7261L13.75 12.8333V18.3333C13.7497 18.567 13.6603 18.7917 13.4999 18.9616C13.3395 19.1315 13.1203 19.2337 12.8871 19.2474C12.6538 19.2611 12.4242 19.1852 12.245 19.0353C12.0658 18.8853 11.9507 18.6726 11.9231 18.4406L11.9167 18.3333V12.8333C11.9167 12.5902 12.0132 12.3571 12.1852 12.1852C12.3571 12.0132 12.5902 11.9167 12.8333 11.9167ZM15.5833 16.0417C15.8264 16.0417 16.0596 16.1382 16.2315 16.3102C16.4034 16.4821 16.5 16.7152 16.5 16.9583V18.3333C16.5 18.5764 16.4034 18.8096 16.2315 18.9815C16.0596 19.1534 15.8264 19.25 15.5833 19.25C15.3402 19.25 15.1071 19.1534 14.9352 18.9815C14.7632 18.8096 14.6667 18.5764 14.6667 18.3333V16.9583C14.6667 16.7152 14.7632 16.4821 14.9352 16.3102C15.1071 16.1382 15.3402 16.0417 15.5833 16.0417ZM18.3333 11.9167C18.5579 11.9167 18.7746 11.9991 18.9423 12.1483C19.1101 12.2975 19.2173 12.5031 19.2436 12.7261L19.25 12.8333V18.3333C19.2497 18.567 19.1603 18.7917 18.9999 18.9616C18.8395 19.1315 18.6203 19.2337 18.3871 19.2474C18.1538 19.2611 17.9242 19.1852 17.745 19.0353C17.5658 18.8853 17.4507 18.6726 17.4231 18.4406L17.4167 18.3333V12.8333C17.4167 12.5902 17.5132 12.3571 17.6852 12.1852C17.8571 12.0132 18.0902 11.9167 18.3333 11.9167ZM8.25 11.9167C8.73623 11.9167 9.20255 12.1098 9.54636 12.4536C9.89018 12.7975 10.0833 13.2638 10.0833 13.75V17.4167C10.0833 17.9029 9.89018 18.3692 9.54636 18.713C9.20255 19.0568 8.73623 19.25 8.25 19.25H4.58333C4.0971 19.25 3.63079 19.0568 3.28697 18.713C2.94315 18.3692 2.75 17.9029 2.75 17.4167V13.75C2.75 13.2638 2.94315 12.7975 3.28697 12.4536C3.63079 12.1098 4.0971 11.9167 4.58333 11.9167H8.25ZM15.5833 11.9167C15.8079 11.9167 16.0246 11.9991 16.1923 12.1483C16.3601 12.2975 16.4673 12.5031 16.4936 12.7261L16.5 12.8333V14.2083C16.4997 14.442 16.4103 14.6667 16.2499 14.8366C16.0895 15.0065 15.8703 15.1087 15.6371 15.1224C15.4038 15.1361 15.1742 15.0602 14.995 14.9103C14.8158 14.7603 14.7007 14.5476 14.6731 14.3156L14.6667 14.2083V12.8333C14.6667 12.5902 14.7632 12.3571 14.9352 12.1852C15.1071 12.0132 15.3402 11.9167 15.5833 11.9167ZM8.25 2.75C8.73623 2.75 9.20255 2.94315 9.54636 3.28697C9.89018 3.63079 10.0833 4.0971 10.0833 4.58333V8.25C10.0833 8.73623 9.89018 9.20255 9.54636 9.54636C9.20255 9.89018 8.73623 10.0833 8.25 10.0833H4.58333C4.0971 10.0833 3.63079 9.89018 3.28697 9.54636C2.94315 9.20255 2.75 8.73623 2.75 8.25V4.58333C2.75 4.0971 2.94315 3.63079 3.28697 3.28697C3.63079 2.94315 4.0971 2.75 4.58333 2.75H8.25ZM17.4167 2.75C17.9029 2.75 18.3692 2.94315 18.713 3.28697C19.0568 3.63079 19.25 4.0971 19.25 4.58333V8.25C19.25 8.73623 19.0568 9.20255 18.713 9.54636C18.3692 9.89018 17.9029 10.0833 17.4167 10.0833H13.75C13.2638 10.0833 12.7975 9.89018 12.4536 9.54636C12.1098 9.20255 11.9167 8.73623 11.9167 8.25V4.58333C11.9167 4.0971 12.1098 3.63079 12.4536 3.28697C12.7975 2.94315 13.2638 2.75 13.75 2.75H17.4167Z"
                          fill="#A7A7BC"
                        />
                      </svg>
                    </button>
                  </td>

                  {/* Views */}
                  <td className="px-4 py-3 text-center">
                    <span className="tabular-nums inline-flex items-center justify-center gap-1">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        className="w-4 h-4"
                      >
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M10.8749 6.00001L11.1862 5.84401V5.84251L11.1839 5.84026L11.1794 5.83126L11.1637 5.80126L11.1037 5.69326C11.0304 5.56696 10.9526 5.44338 10.8704 5.32276C10.596 4.91997 10.2806 4.54673 9.92916 4.20901C9.08467 3.39901 7.78491 2.57251 5.99992 2.57251C4.21642 2.57251 2.91592 3.39826 2.07142 4.20901C1.72001 4.54673 1.40457 4.91997 1.13017 5.32276C1.01882 5.48704 0.915692 5.65675 0.821166 5.83126L0.816666 5.84026L0.815166 5.84251V5.84326C0.815166 5.84326 0.814416 5.84401 1.12567 6.00001L0.814416 5.84326C0.790351 5.89188 0.777832 5.94539 0.777832 5.99963C0.777832 6.05388 0.790351 6.10739 0.814416 6.15601L0.813666 6.15751L0.815916 6.15976L0.820416 6.16876C0.843802 6.21562 0.868817 6.26165 0.895416 6.30676C1.21836 6.85232 1.61343 7.35182 2.06992 7.79176C2.91517 8.60176 4.21492 9.42676 5.99992 9.42676C7.78416 9.42676 9.08466 8.60176 9.92991 7.79101C10.2807 7.45289 10.5958 7.07969 10.8704 6.67726C10.9756 6.52242 11.0734 6.36275 11.1637 6.19876L11.1794 6.16876L11.1839 6.15976L11.1854 6.15751V6.15676C11.1854 6.15676 11.1862 6.15601 10.8749 6.00001ZM10.8749 6.00001L11.1862 6.15676C11.2102 6.10814 11.2227 6.05463 11.2227 6.00038C11.2227 5.94614 11.2102 5.89262 11.1862 5.84401L10.8749 6.00001ZM5.95492 4.84801C5.64939 4.84801 5.35637 4.96938 5.14033 5.18542C4.92429 5.40146 4.80292 5.69448 4.80292 6.00001C4.80292 6.30554 4.92429 6.59855 5.14033 6.8146C5.35637 7.03064 5.64939 7.15201 5.95492 7.15201C6.26044 7.15201 6.55346 7.03064 6.7695 6.8146C6.98554 6.59855 7.10691 6.30554 7.10691 6.00001C7.10691 5.69448 6.98554 5.40146 6.7695 5.18542C6.55346 4.96938 6.26044 4.84801 5.95492 4.84801ZM4.10842 6.00001C4.10842 5.50989 4.30311 5.03984 4.64968 4.69328C4.99625 4.34671 5.4663 4.15201 5.95642 4.15201C6.44654 4.15201 6.91658 4.34671 7.26315 4.69328C7.60972 5.03984 7.80442 5.50989 7.80442 6.00001C7.80442 6.49013 7.60972 6.96018 7.26315 7.30674C6.91658 7.65331 6.44654 7.84801 5.95642 7.84801C5.4663 7.84801 4.99625 7.65331 4.64968 7.30674C4.30311 6.96018 4.10842 6.49013 4.10842 6.00001Z"
                          fill="#A7A7BC"
                        />
                      </svg>
                      {r.views}
                    </span>
                  </td>

                  {/* Tickets Sold */}
                  <td className="px-4 py-3 text-center">
                    <span className="tabular-nums inline-flex items-center justify-center gap-1">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        className="h-4 w-4"
                      >
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M7.00413 9.5015L7.00713 8.5C7.00713 8.36706 7.05994 8.23957 7.15394 8.14556C7.24794 8.05156 7.37544 7.99875 7.50838 7.99875C7.64132 7.99875 7.76881 8.05156 7.86281 8.14556C7.95682 8.23957 8.00963 8.36706 8.00963 8.5V9.4885C8.00963 9.729 8.00963 9.8495 8.08663 9.9235C8.16413 9.997 8.28163 9.992 8.51813 9.982C9.44963 9.9425 10.0221 9.817 10.4251 9.414C10.8301 9.011 10.9556 8.4385 10.9951 7.5055C11.0026 7.3205 11.0066 7.2275 10.9721 7.166C10.9371 7.1045 10.7996 7.0275 10.5236 6.873C10.3682 6.78633 10.2387 6.65971 10.1485 6.50624C10.0584 6.35276 10.0108 6.17799 10.0108 6C10.0108 5.82201 10.0584 5.64724 10.1485 5.49376C10.2387 5.34029 10.3682 5.21367 10.5236 5.127C10.7996 4.973 10.9376 4.8955 10.9721 4.834C11.0066 4.7725 11.0026 4.68 10.9946 4.4945C10.9556 3.5615 10.8296 2.9895 10.4251 2.586C9.98663 2.148 9.34763 2.0375 8.26413 2.0095C8.23095 2.00863 8.19794 2.01442 8.16703 2.02652C8.13613 2.03862 8.10796 2.05678 8.08419 2.07995C8.06043 2.10311 8.04154 2.1308 8.02865 2.16138C8.01575 2.19196 8.00912 2.22481 8.00913 2.258V3.5C8.00913 3.63294 7.95632 3.76043 7.86232 3.85444C7.76831 3.94844 7.64082 4.00125 7.50788 4.00125C7.37494 4.00125 7.24744 3.94844 7.15344 3.85444C7.05944 3.76043 7.00663 3.63294 7.00663 3.5L7.00313 2.2495C7.003 2.18328 6.9766 2.11982 6.92973 2.07305C6.88286 2.02627 6.81934 2 6.75313 2H4.99713C3.10713 2 2.16213 2 1.57463 2.586C1.16963 2.989 1.04413 3.5615 1.00463 4.4945C0.997127 4.6795 0.993127 4.7725 1.02763 4.834C1.06263 4.8955 1.20013 4.973 1.47613 5.127C1.63159 5.21367 1.7611 5.34029 1.85125 5.49376C1.9414 5.64724 1.98893 5.82201 1.98893 6C1.98893 6.17799 1.9414 6.35276 1.85125 6.50624C1.7611 6.65971 1.63159 6.78633 1.47613 6.873C1.20013 7.0275 1.06213 7.1045 1.02763 7.166C0.993127 7.2275 0.997127 7.32 1.00513 7.505C1.04413 8.4385 1.17013 9.011 1.57463 9.414C2.16213 10 3.10713 10 4.99763 10H6.50263C6.73863 10 6.85613 10 6.92963 9.927C7.00313 9.854 7.00363 9.737 7.00413 9.5015ZM8.00913 6.5V5.5C8.00913 5.36706 7.95632 5.23957 7.86232 5.14556C7.76831 5.05156 7.64082 4.99875 7.50788 4.99875C7.37494 4.99875 7.24744 5.05156 7.15344 5.14556C7.05944 5.23957 7.00663 5.36706 7.00663 5.5V6.5C7.00663 6.63301 7.05946 6.76056 7.15351 6.85461C7.24756 6.94866 7.37512 7.0015 7.50813 7.0015C7.64113 7.0015 7.76869 6.94866 7.86274 6.85461C7.95679 6.76056 8.00913 6.63301 8.00913 6.5Z"
                          fill="#A7A7BC"
                        />
                      </svg>{" "}
                      {r.ticketsSold}
                    </span>
                  </td>

                  {/* Revenue */}
                  <td className="px-4 py-3 text-center">
                    <span className="tabular-nums ">
                      {formatMoneyUSD(r.revenue)}
                    </span>
                  </td>

                  {/* Link Type */}
                  <td className="px-4 py-3 text-center">
                    <div className="inline-block">
                      <Chip color="primary">{r.type}</Chip>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 text-center">
                    <div className="inline-block">
                      {r.status === "Active" ? (
                        <Chip color="success">Active</Chip>
                      ) : r.status === "Paused" ? (
                        <Chip color="warning">Paused</Chip>
                      ) : (
                        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[13px] text-white/60 ring-1 ring-white/15">
                          Disabled
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Date */}
                  {(() => {
                    const c = formatCreatedParts(r.created);
                    return (
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center leading-tight">
                          <span className="text-sm text-neutral-0">
                            {c.date}
                          </span>
                          <span className="text-xs text-neutral-500">
                            {c.time || "—"}
                          </span>
                        </div>
                      </td>
                    );
                  })()}

                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEdit(r)}
                        className="rounded-md border border-white/10 p-1.5 text-white/70 hover:text-white hover:border-white/20 cursor-pointer"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => openArchive(r)}
                        className="rounded-md border border-white/10 p-1.5 text-white/70 hover:text-white hover:border-white/20 cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );

              const separatorRow = !isLast ? (
                <tr key={`${r.id}-sep`} aria-hidden className="bg-neutral-900">
                  <td colSpan={9} className="p-0">
                    <div className={clsx("mx-4 h-px", separatorLine)} />
                  </td>
                </tr>
              ) : null;

              return separatorRow ? [dataRow, separatorRow] : [dataRow];
            })}
          </tbody>
        </table>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(0deg,#181828_0%,rgba(24,24,40,0)_100%)]" />
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center">
        <Link
          href="/dashboard/tracking"
          className="pointer-events-auto rounded-full border border-neutral-500 bg-neutral-700 px-3 py-2 text-xs font-medium text-white transition duration-200 hover:border-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        >
          View All
        </Link>
      </div>

      <ArchiveLinkDialog
        open={archiveOpen}
        row={activeRow}
        onClose={closeArchive}
        onConfirm={confirmArchive}
      />
      <QrDialog open={qrOpen} row={activeRow} onClose={closeQr} />

      {/* Create */}
      <TrackingLinkDialog
        open={createOpen}
        mode="create"
        onClose={closeCreate}
        onSave={handleCreate}
      />

      {/* Edit */}
      <TrackingLinkDialog
        open={editOpen}
        mode="edit"
        initial={activeRow}
        onClose={closeEdit}
        onSave={handleEdit}
      />
    </div>
  );
}
