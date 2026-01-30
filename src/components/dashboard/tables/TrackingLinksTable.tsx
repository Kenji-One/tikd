/* ------------------------------------------------------------------ */
/*  src/components/dashboard/tables/TrackingLinksTable.tsx            */
/* ------------------------------------------------------------------ */
"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import Link from "next/link";
import clsx from "clsx";
import {
  ChevronDown,
  Check,
  Plus,
  Pencil,
  X,
  Trash2,
  Search,
  Ban,
  Calendar,
  Building2,
  Ticket,
} from "lucide-react";
import SortArrowsIcon from "@/components/ui/SortArrowsIcon";
import CopyButton from "@/components/ui/CopyButton";
import LabelledInput from "@/components/ui/LabelledInput";
import { Button } from "@/components/ui/Button";
import Image from "next/image";

/* ------------------------------- Types ------------------------------ */
type DestinationKind = "Event" | "Organization";
type Status = "Active" | "Paused" | "Disabled";

/**
 * IMPORTANT: Backend expects "twitter" (not "x") in iconKey enums.
 * We still label it as "X" in UI.
 */
type PresetIconKey =
  | "instagram"
  | "facebook"
  | "twitter"
  | "linkedin"
  | "google"
  | "youtube"
  | "snapchat"
  | "reddit"
  | "tiktok"
  | "telegram";

type Row = {
  id: string;
  name: string;

  destinationKind: DestinationKind;
  destinationId: string;
  destinationTitle: string;

  /**
   * This is the tracking path stored in DB (e.g. /t/Ab3Kp9xQ/)
   * NOT the destination public route.
   */
  url: string;

  iconKey?: PresetIconKey | null;
  iconUrl?: string | null; // should be a persistent URL (http/s). blob: is not persisted

  views: number;
  ticketsSold: number;
  revenue: number;
  status: Status;

  /** ISO string from API */
  created: string;
};

/* ----------------------------- Helpers ----------------------------- */
type ApiDestination = { kind: DestinationKind; id: string; title: string };

type ApiRow = {
  id: string;
  name: string;
  destinationKind: DestinationKind;
  destinationId: string;
  destinationTitle: string;
  url: string; // /t/:code/
  iconKey?: PresetIconKey | null;
  iconUrl?: string | null;
  views: number;
  ticketsSold: number;
  revenue: number;
  status: Status;
  created: string; // ISO string
};

async function fetchDestinations(q: string, signal?: AbortSignal) {
  const res = await fetch(
    `/api/tracking-links/destinations?q=${encodeURIComponent(q || "")}`,
    { method: "GET", signal },
  );
  if (!res.ok) return [];
  const json = (await res.json()) as { destinations?: ApiDestination[] };
  return Array.isArray(json.destinations) ? json.destinations : [];
}

async function fetchTrackingLinks(signal?: AbortSignal): Promise<ApiRow[]> {
  const res = await fetch("/api/tracking-links", { method: "GET", signal });
  if (!res.ok) throw new Error("Failed to load tracking links");
  const json = (await res.json()) as { rows?: ApiRow[] };
  return Array.isArray(json.rows) ? json.rows : [];
}

async function createTrackingLink(payload: {
  name: string;
  destinationKind: DestinationKind;
  destinationId: string;
  status: Status;
  iconKey?: PresetIconKey | null;
  iconUrl?: string | null;
}): Promise<ApiRow> {
  const res = await fetch("/api/tracking-links", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || "Failed to create tracking link");
  }
  const json = (await res.json()) as { row?: ApiRow };
  if (!json.row) throw new Error("Invalid create response");
  return json.row;
}

async function updateTrackingLink(
  id: string,
  payload: Partial<{
    name: string;
    destinationKind: DestinationKind;
    destinationId: string;
    status: Status;
    iconKey?: PresetIconKey | null;
    iconUrl?: string | null;
  }>,
): Promise<void> {
  const res = await fetch(`/api/tracking-links/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || "Failed to update tracking link");
  }
}

async function archiveTrackingLink(id: string): Promise<void> {
  const res = await fetch(`/api/tracking-links/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || "Failed to archive tracking link");
  }
}

type SortKey =
  | "views"
  | "ticketsSold"
  | "revenue"
  | "created"
  | "name"
  | "status";
type SortDir = "asc" | "desc";

const parseDate = (d: string) => Date.parse(d) || 0;

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

function formatShortDate(isoOrNull: string | null) {
  if (!isoOrNull) return "";
  const ms = Date.parse(isoOrNull);
  if (!Number.isFinite(ms)) return "";
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

/* ----------------------------- Icons ------------------------------ */
function PresetIcon({
  iconKey,
  className = "h-5 w-5",
}: {
  iconKey: PresetIconKey;
  className?: string;
}) {
  const src = `/icons/social/${iconKey}.svg`;

  return (
    <span
      className={clsx(
        "relative inline-flex items-center justify-center",
        className,
      )}
      aria-hidden
    >
      <Image
        src={src}
        alt=""
        fill
        sizes="24px"
        className={clsx(
          "object-contain opacity-90",
          "[filter:brightness(0)_saturate(100%)_invert(78%)_sepia(9%)_saturate(375%)_hue-rotate(200deg)_brightness(92%)_contrast(90%)]",
        )}
        draggable={false}
      />
    </span>
  );
}

function TrackingIcon({
  iconKey,
  iconUrl,
  className = "h-5 w-5",
}: {
  iconKey?: PresetIconKey | null;
  iconUrl?: string | null;
  className?: string;
}) {
  if (iconUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={iconUrl}
        alt=""
        className={clsx("rounded-[6px] object-cover", className, "opacity-80")}
      />
    );
  }
  if (iconKey) return <PresetIcon iconKey={iconKey} className={className} />;
  return null;
}

function Chip({
  children,
  color = "primary",
}: {
  children: ReactNode;
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

/* ----------------------------- Dialogs ---------------------------- */
function ArchiveLinkDialog({
  open,
  row,
  onClose,
  onConfirm,
  loading,
}: {
  open: boolean;
  row: Row | null;
  onClose: () => void;
  onConfirm: (row: Row) => void;
  loading?: boolean;
}) {
  useEscapeToClose(open, onClose);
  if (!open || !row) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={loading ? undefined : onClose}
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
              disabled={loading}
              className={clsx(
                "rounded-full",
                "border border-white/40 bg-transparent py-3 px-6 text-base font-medium text-neutral-0 leading-[100%]",
                "transition hover:border-white/60 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60",
              )}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => onConfirm(row)}
              disabled={loading}
              className={clsx(
                "rounded-full px-6 py-3",
                "bg-error-500 text-base font-semibold text-white leading-[100%]",
                "transition hover:bg-error-400 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60",
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
                {loading ? "Archiving..." : "Archive"}
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

  destinationKind: DestinationKind | null;
  destinationId: string;
  destinationTitle: string;

  status: Status;

  iconKey?: PresetIconKey | null;
  iconUrl?: string | null;
};

type DestinationResult = {
  kind: DestinationKind;
  id: string;
  title: string;
  subtitle: string;
  image: string | null;
  date: string | null;
  orgName: string | null;
};

function DestinationThumb({
  kind,
  image,
  title,
}: {
  kind: DestinationKind;
  image: string | null;
  title: string;
}) {
  if (image) {
    return (
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5">
        <Image
          src={image}
          alt={title || ""}
          fill
          sizes="48px"
          className="object-cover"
          draggable={false}
        />
      </div>
    );
  }

  const Icon = kind === "Event" ? Ticket : Building2;

  return (
    <div
      className={clsx(
        "relative h-12 w-12 shrink-0 overflow-hidden rounded-xl",
        "border border-white/10 bg-[radial-gradient(120%_120%_at_10%_0%,rgba(154,70,255,0.20)_0%,rgba(255,255,255,0.06)_45%,rgba(255,255,255,0.03)_100%)]",
        "flex items-center justify-center",
      )}
      aria-hidden
      title={title}
    >
      <Icon className="h-5 w-5 text-white/70" />
    </div>
  );
}

function KindBadge({ kind }: { kind: DestinationKind }) {
  const label = kind === "Event" ? "EVENT" : "ORG";
  return (
    <span
      className={clsx(
        "inline-flex items-center justify-center",
        "h-7 min-w-[64px] rounded-full px-3",
        "border border-white/10 bg-white/5",
        "text-[11px] font-semibold tracking-[0.12em] text-white/70",
      )}
    >
      {label}
    </span>
  );
}

function TrackingLinkDialog({
  open,
  mode,
  initial,
  onClose,
  onSave,
  saving,
}: {
  open: boolean;
  mode: "create" | "edit";
  initial?: Row | null;
  onClose: () => void;
  onSave: (draft: TrackingLinkDraft) => void;
  saving?: boolean;
}) {
  useEscapeToClose(open, onClose);

  const [draft, setDraft] = useState<TrackingLinkDraft>({
    name: "",
    destinationKind: null,
    destinationId: "",
    destinationTitle: "",
    status: "Active",
    iconKey: null,
    iconUrl: null,
  });

  const [touched, setTouched] = useState(false);

  // Destination search UI state
  const [destQuery, setDestQuery] = useState("");
  const [destOpen, setDestOpen] = useState(false);
  const [destLoading, setDestLoading] = useState(false);
  const [destError, setDestError] = useState<string | null>(null);
  const [destResults, setDestResults] = useState<DestinationResult[]>([]);
  const destWrapRef = useRef<HTMLDivElement | null>(null);
  const destAbortRef = useRef<AbortController | null>(null);
  const destDebounceRef = useRef<number | null>(null);

  // Status dropdown state
  const [statusOpen, setStatusOpen] = useState(false);
  const statusWrapRef = useRef<HTMLDivElement | null>(null);

  // Icon search state
  const [iconQuery, setIconQuery] = useState("");

  // Custom icon upload (preview only unless you pass a real URL)
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastObjectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setTouched(false);
    setDestQuery(mode === "edit" && initial ? initial.destinationTitle : "");
    setDestOpen(false);
    setDestLoading(false);
    setDestError(null);
    setDestResults([]);
    setStatusOpen(false);
    setIconQuery("");

    // cleanup any previous object url on open
    if (lastObjectUrlRef.current) {
      URL.revokeObjectURL(lastObjectUrlRef.current);
      lastObjectUrlRef.current = null;
    }

    if (mode === "edit" && initial) {
      setDraft({
        name: initial.name || "",
        destinationKind: initial.destinationKind,
        destinationId: initial.destinationId,
        destinationTitle: initial.destinationTitle,
        status: initial.status,
        iconKey: initial.iconKey ?? null,
        iconUrl: initial.iconUrl ?? null,
      });
    } else {
      setDraft({
        name: "",
        destinationKind: null,
        destinationId: "",
        destinationTitle: "",
        status: "Active",
        iconKey: null,
        iconUrl: null,
      });
    }

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

      const inDest = !!destWrapRef.current?.contains(target);
      const inStatus = !!statusWrapRef.current?.contains(target);

      if (!inDest) setDestOpen(false);
      if (!inStatus) setStatusOpen(false);
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  useEffect(() => {
    // cleanup custom icon object url when dialog closes
    if (open) return;
    if (lastObjectUrlRef.current) {
      URL.revokeObjectURL(lastObjectUrlRef.current);
      lastObjectUrlRef.current = null;
    }
  }, [open]);

  // Backend destination search (debounced + abortable)
  useEffect(() => {
    if (!open) return;
    if (!destOpen) return;

    const q = destQuery.trim();

    if (destDebounceRef.current) {
      window.clearTimeout(destDebounceRef.current);
      destDebounceRef.current = null;
    }
    if (destAbortRef.current) {
      destAbortRef.current.abort();
      destAbortRef.current = null;
    }

    if (!q) {
      setDestLoading(false);
      setDestError(null);
      setDestResults([]);
      return;
    }

    setDestLoading(true);
    setDestError(null);

    const ac = new AbortController();
    destAbortRef.current = ac;

    destDebounceRef.current = window.setTimeout(() => {
      fetchDestinations(q, ac.signal)
        .then((list) => {
          if (ac.signal.aborted) return;
          const mapped: DestinationResult[] = list.map((d) => ({
            kind: d.kind,
            id: d.id,
            title: d.title,
            subtitle: d.kind === "Event" ? "Event" : "Organization",
            image: null,
            date: null,
            orgName: null,
          }));
          setDestResults(mapped);
          setDestLoading(false);
          setDestError(null);
        })
        .catch((err) => {
          if (ac.signal.aborted) return;
          setDestLoading(false);
          setDestResults([]);
          setDestError(
            err?.message ? String(err.message) : "Search failed. Try again.",
          );
        });
    }, 220);

    return () => {
      if (destDebounceRef.current) {
        window.clearTimeout(destDebounceRef.current);
        destDebounceRef.current = null;
      }
      if (destAbortRef.current) {
        destAbortRef.current.abort();
        destAbortRef.current = null;
      }
    };
  }, [open, destOpen, destQuery]);

  const title =
    mode === "create" ? "Create Tracking Link" : "Edit Tracking Link";

  const statusOptions: { value: Status; label: string; desc?: string }[] = [
    { value: "Active", label: "Active", desc: "Enabled and collecting views" },
    { value: "Paused", label: "Paused", desc: "Temporarily disabled" },
    { value: "Disabled", label: "Disabled", desc: "Fully disabled" },
  ];

  const presetIcons: Array<{ key: PresetIconKey; label: string }> = [
    { key: "instagram", label: "Instagram" },
    { key: "facebook", label: "Facebook" },
    { key: "twitter", label: "X" },
    { key: "linkedin", label: "LinkedIn" },
    { key: "google", label: "Google" },
    { key: "youtube", label: "YouTube" },
    { key: "snapchat", label: "Snapchat" },
    { key: "reddit", label: "Reddit" },
    { key: "tiktok", label: "TikTok" },
    { key: "telegram", label: "Telegram" },
  ];

  const filteredPresetIcons = useMemo(() => {
    const q = iconQuery.trim().toLowerCase();
    if (!q) return presetIcons;
    return presetIcons.filter((p) => p.label.toLowerCase().includes(q));
  }, [iconQuery]);

  const dropdownPanelCls = clsx(
    "absolute left-0 right-0 z-[90] mt-2 overflow-hidden rounded-xl",
    "border border-white/10 bg-neutral-900",
  );

  const optionBtnBase = clsx(
    "w-full text-left transition flex items-center gap-3",
    "px-4 py-3.5",
    "hover:bg-white/5 focus:bg-white/5 focus:outline-none",
  );

  const resultDivider = "border-b border-white/10";

  if (!open) return null;

  const destinationOk = !!draft.destinationKind && !!draft.destinationId;
  const nameOk = draft.name.trim().length >= 2;
  const statusOk = !!draft.status;

  const canSave = nameOk && destinationOk && statusOk && !saving;

  const errName = !nameOk && touched;
  const errDest = !destinationOk && touched;

  const handlePickDestination = (d: DestinationResult) => {
    setDraft((prev) => ({
      ...prev,
      destinationKind: d.kind,
      destinationId: d.id,
      destinationTitle: d.title,
    }));
    setDestOpen(false);
    setDestQuery(d.title);
    setDestError(null);
  };

  const handleUploadIcon = (file: File | null) => {
    if (!file) return;

    if (lastObjectUrlRef.current) {
      URL.revokeObjectURL(lastObjectUrlRef.current);
      lastObjectUrlRef.current = null;
    }

    const url = URL.createObjectURL(file);
    lastObjectUrlRef.current = url;

    setDraft((prev) => ({
      ...prev,
      iconUrl: url, // preview only (blob:)
      iconKey: null,
    }));
  };

  const clearCustomIcon = () => {
    if (lastObjectUrlRef.current) {
      URL.revokeObjectURL(lastObjectUrlRef.current);
      lastObjectUrlRef.current = null;
    }
    setDraft((prev) => ({ ...prev, iconUrl: null }));
  };

  const hasNoIcon = !draft.iconKey && !draft.iconUrl;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={saving ? undefined : onClose}
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
            disabled={saving}
            className="rounded-md border border-white/10 p-2 text-white/70 hover:text-white hover:border-white/20 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
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
                placeholder="Enter name."
                size="lg"
                variant="full"
                disabled={saving}
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

            {/* Icon selector (optional) */}
            <div className="md:col-span-2">
              <label className="block leading-[90%] font-normal text-white mb-2">
                Icon (optional)
              </label>

              <div className="rounded-lg border border-white/10 bg-neutral-900 p-3">
                {/* Search input above icons */}
                <div
                  className={clsx(
                    "relative w-full",
                    "rounded-lg border border-white/10 bg-white/5 h-11",
                  )}
                >
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <input
                    value={iconQuery}
                    onChange={(e) => setIconQuery(e.target.value)}
                    placeholder="Search icons..."
                    disabled={saving}
                    className={clsx(
                      "h-11 w-full rounded-lg bg-transparent",
                      "pl-10 pr-4 text-[12px] text-neutral-100",
                      "placeholder:text-neutral-500",
                      "outline-none border-none focus:ring-1 focus:ring-primary-500",
                      "disabled:opacity-60 disabled:cursor-not-allowed",
                    )}
                  />
                </div>

                {/* Icon grid */}
                <div className={clsx("mt-3 flex gap-3", "flex-wrap")}>
                  {/* None */}
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      clearCustomIcon();
                      setDraft((d) => ({ ...d, iconKey: null, iconUrl: null }));
                    }}
                    aria-label="No icon"
                    aria-pressed={hasNoIcon}
                    title="No icon"
                    className={clsx(
                      "group inline-flex items-center justify-center shrink-0",
                      "h-10 w-10 md:h-11 md:w-11 rounded-md border",
                      "transition cursor-pointer",
                      "focus:outline-none focus:ring-1 focus:ring-primary-500/40",
                      "disabled:cursor-not-allowed disabled:opacity-60",
                      hasNoIcon
                        ? "border-primary-500/40 bg-primary-500/10"
                        : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20",
                    )}
                  >
                    <Ban
                      size={24}
                      className={clsx(
                        "transition",
                        hasNoIcon
                          ? "text-primary-300"
                          : "text-neutral-400 group-hover:text-neutral-200",
                      )}
                    />
                  </button>

                  {/* Presets */}
                  {filteredPresetIcons.map((p) => {
                    const selected = draft.iconKey === p.key && !draft.iconUrl;

                    return (
                      <button
                        key={p.key}
                        type="button"
                        disabled={saving}
                        onClick={() => {
                          clearCustomIcon();
                          setDraft((d) => ({
                            ...d,
                            iconKey: p.key,
                            iconUrl: null,
                          }));
                        }}
                        aria-label={p.label}
                        aria-pressed={selected}
                        title={p.label}
                        className={clsx(
                          "group inline-flex items-center justify-center shrink-0",
                          "h-10 w-10 md:h-11 md:w-11 rounded-md border",
                          "transition cursor-pointer",
                          "focus:outline-none focus:ring-1 focus:ring-primary-500/40",
                          "disabled:cursor-not-allowed disabled:opacity-60",
                          selected
                            ? "border-primary-500/40 bg-primary-500/10"
                            : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20",
                        )}
                      >
                        <span className="text-[#A7A7BC]">
                          <PresetIcon iconKey={p.key} className="h-6 w-6" />
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Upload row (preview only) */}
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      handleUploadIcon(e.target.files?.[0] ?? null)
                    }
                    disabled={saving}
                  />

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => fileInputRef.current?.click()}
                    className={clsx(
                      "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
                      "border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 transition cursor-pointer",
                      "disabled:cursor-not-allowed disabled:opacity-60",
                    )}
                    title="Upload (preview only until you wire Cloudinary)"
                  >
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-[6px] bg-white/10 text-neutral-200">
                      <Plus size={14} />
                    </span>
                    Upload custom
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={clearCustomIcon}
                    className={clsx(
                      "ml-auto inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-neutral-300 hover:bg-white/10 transition cursor-pointer",
                      "min-w-[116px] justify-center",
                      "disabled:cursor-not-allowed disabled:opacity-60",
                      draft.iconUrl ? "" : "opacity-0 pointer-events-none",
                    )}
                    title="Remove custom icon"
                    aria-hidden={!draft.iconUrl}
                    tabIndex={draft.iconUrl ? 0 : -1}
                  >
                    <X size={14} />
                    Remove
                  </button>
                </div>

                {/* Selected preview (stable height) */}
                <div className="mt-3 flex items-center gap-3 text-sm text-neutral-400 min-h-[28px]">
                  <span className="text-neutral-300">Selected:</span>

                  {draft.iconUrl ? (
                    <>
                      <TrackingIcon
                        iconUrl={draft.iconUrl}
                        className="h-6 w-6"
                      />
                      <span className="text-neutral-500">(custom preview)</span>
                    </>
                  ) : draft.iconKey ? (
                    <>
                      <span className=" flex text-[#A7A7BC]">
                        <PresetIcon
                          iconKey={draft.iconKey}
                          className="h-6 w-6"
                        />
                      </span>
                      <span className="text-neutral-500">
                        {presetIcons.find((x) => x.key === draft.iconKey)
                          ?.label ?? ""}
                      </span>
                    </>
                  ) : (
                    <span className="text-neutral-500 h-6 flex items-center">
                      None
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Destination search selector */}
            <div ref={destWrapRef} className="relative md:col-span-2">
              <label className="block leading-[90%] font-normal text-white mb-2">
                Link Path
              </label>

              <p className="text-sm text-neutral-500">
                Search and select an Event or Organization this tracking link
                will route to.
              </p>

              <div className="mt-2">
                <div
                  className={clsx(
                    "relative w-full",
                    "rounded-lg border border-white/10 bg-white/5 h-12",
                    errDest && "border-error-500",
                  )}
                >
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-300" />

                  <input
                    value={destQuery}
                    onChange={(e) => {
                      setDestQuery(e.target.value);
                      setDestOpen(true);
                    }}
                    onFocus={() => {
                      setStatusOpen(false);
                      setDestOpen(true);
                      if (destQuery === draft.destinationTitle)
                        setDestQuery("");
                    }}
                    onBlur={() => setTouched(true)}
                    placeholder="Search events or organizations…"
                    disabled={saving}
                    className={clsx(
                      "h-12 w-full rounded-lg bg-transparent",
                      "pl-10 pr-10 text-[12px] text-neutral-100",
                      "placeholder:text-neutral-500",
                      "outline-none border-none focus:ring-1 focus:ring-primary-500",
                      "disabled:opacity-60 disabled:cursor-not-allowed",
                    )}
                  />

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setStatusOpen(false);
                      setDestOpen((v) => !v);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded-md border border-white/10 bg-white/5 p-2 text-neutral-300 hover:bg-white/10 transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                    aria-haspopup="listbox"
                    aria-expanded={destOpen}
                    title="Open search"
                  >
                    <ChevronDown
                      size={16}
                      className={clsx(
                        destOpen && "rotate-180 text-neutral-200",
                      )}
                    />
                  </button>
                </div>

                {destOpen ? (
                  <div className={dropdownPanelCls} role="listbox">
                    <div className="max-h-[280px] overflow-auto">
                      {destLoading ? (
                        <div className="px-4 py-4 text-sm text-neutral-400">
                          Searching…
                        </div>
                      ) : destError ? (
                        <div className="px-4 py-4 text-sm text-neutral-400">
                          {destError}
                        </div>
                      ) : !destQuery.trim() ? (
                        <div className="px-4 py-4 text-sm text-neutral-500">
                          Type to search events or organizations.
                        </div>
                      ) : destResults.length === 0 ? (
                        <div className="px-4 py-4 text-sm text-neutral-400">
                          No matches.
                        </div>
                      ) : (
                        <div className="px-2 py-2">
                          {destResults.map((opt, idx) => {
                            const selected =
                              opt.id === draft.destinationId &&
                              opt.kind === draft.destinationKind;

                            const isLast = idx === destResults.length - 1;

                            return (
                              <button
                                key={`${opt.kind}-${opt.id}`}
                                type="button"
                                role="option"
                                aria-selected={selected}
                                onClick={() => handlePickDestination(opt)}
                                className={clsx(
                                  "group w-full text-left",
                                  "rounded-2xl",
                                  "transition cursor-pointer",
                                  "focus:outline-none focus:ring-1 focus:ring-primary-500/35",
                                  "hover:bg-white/5",
                                  selected &&
                                    "bg-primary-500/10 hover:bg-primary-500/10",
                                  "px-3",
                                )}
                              >
                                <div
                                  className={clsx(
                                    optionBtnBase,
                                    "px-0",
                                    !isLast && resultDivider,
                                    !isLast && "border-white/10",
                                  )}
                                >
                                  <DestinationThumb
                                    kind={opt.kind}
                                    image={opt.image}
                                    title={opt.title}
                                  />

                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <p className="truncate text-[15px] font-semibold text-neutral-0 tracking-[-0.2px]">
                                          {opt.title}
                                        </p>

                                        <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-neutral-400">
                                          {opt.kind === "Event" ? (
                                            <>
                                              <span className="truncate">
                                                {opt.orgName || "Event"}
                                              </span>
                                              {opt.date ? (
                                                <>
                                                  <span className="text-neutral-500">
                                                    •
                                                  </span>
                                                  <span className="inline-flex items-center gap-1 text-neutral-400">
                                                    <Calendar className="h-3.5 w-3.5 text-neutral-500" />
                                                    <span>
                                                      {formatShortDate(
                                                        opt.date,
                                                      )}
                                                    </span>
                                                  </span>
                                                </>
                                              ) : null}
                                            </>
                                          ) : (
                                            <span className="truncate">
                                              {opt.subtitle}
                                            </span>
                                          )}
                                        </p>
                                      </div>

                                      <div className="shrink-0 pt-0.5">
                                        <KindBadge kind={opt.kind} />
                                      </div>
                                    </div>
                                  </div>

                                  <div className="shrink-0">
                                    {selected ? (
                                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-primary-500/30 bg-primary-500/15 text-primary-200">
                                        <Check size={16} />
                                      </span>
                                    ) : (
                                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-transparent">
                                        <Check size={16} />
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Status (custom select) */}
            <div ref={statusWrapRef} className="relative md:col-span-2">
              <label className="block leading-[90%] font-normal text-white mb-2">
                Status
              </label>

              <button
                type="button"
                disabled={saving}
                className={clsx(
                  "mt-2 w-full rounded-lg border bg-neutral-900 px-4 py-3 text-base text-neutral-0 outline-none",
                  "border-white/10 hover:border-white/20 focus:border-primary-500 transition cursor-pointer",
                  "flex items-center justify-between gap-3",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                )}
                aria-haspopup="listbox"
                aria-expanded={statusOpen}
                onClick={() => {
                  setDestOpen(false);
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
                            "w-full text-left px-4 py-3 transition flex items-start justify-between gap-3",
                            "hover:bg-white/5 focus:bg-white/5 focus:outline-none",
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
              disabled={saving}
              className={clsx(
                "py-3 px-6 text-base font-medium leading-[100%]",
                "border-white/40 hover:border-white/60 hover:bg-transparent",
                "disabled:cursor-not-allowed disabled:opacity-60",
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
                  destinationKind: draft.destinationKind,
                  destinationId: draft.destinationId,
                  destinationTitle: draft.destinationTitle,
                  status: draft.status,
                  iconKey: draft.iconKey ?? null,
                  iconUrl: draft.iconUrl ?? null,
                });
              }}
              className={clsx(
                "py-3 px-6 text-base font-semibold leading-[100%]",
                !canSave && "bg-white/10 hover:bg-white/10",
              )}
              animation
            >
              {saving
                ? mode === "create"
                  ? "Creating..."
                  : "Saving..."
                : mode === "create"
                  ? "Create"
                  : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Component --------------------------- */
export default function TrackingLinksTable() {
  const [data, setData] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [sortBy, setSortBy] = useState<SortKey>("views");
  const [dir, setDir] = useState<SortDir>("desc");

  const [archiveOpen, setArchiveOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [activeRow, setActiveRow] = useState<Row | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const [savingCreate, setSavingCreate] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingArchive, setSavingArchive] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    const ac = new AbortController();
    try {
      const rows = await fetchTrackingLinks(ac.signal);
      setData(
        rows.map((r) => ({
          id: r.id,
          name: r.name,
          destinationKind: r.destinationKind,
          destinationId: r.destinationId,
          destinationTitle: r.destinationTitle,
          url: r.url,
          iconKey: r.iconKey ?? null,
          iconUrl: r.iconUrl ?? null,
          views: r.views ?? 0,
          ticketsSold: r.ticketsSold ?? 0,
          revenue: r.revenue ?? 0,
          status: r.status,
          created: r.created,
        })),
      );
      setLoading(false);
    } catch (e: any) {
      setLoading(false);
      setLoadError(e?.message ? String(e.message) : "Failed to load data");
    }

    return () => ac.abort();
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const rows = await fetchTrackingLinks(ac.signal);
        setData(
          rows.map((r) => ({
            id: r.id,
            name: r.name,
            destinationKind: r.destinationKind,
            destinationId: r.destinationId,
            destinationTitle: r.destinationTitle,
            url: r.url,
            iconKey: r.iconKey ?? null,
            iconUrl: r.iconUrl ?? null,
            views: r.views ?? 0,
            ticketsSold: r.ticketsSold ?? 0,
            revenue: r.revenue ?? 0,
            status: r.status,
            created: r.created,
          })),
        );
        setLoading(false);
      } catch (e: any) {
        setLoading(false);
        setLoadError(e?.message ? String(e.message) : "Failed to load data");
      }
    })();
    return () => ac.abort();
  }, []);

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
  }, [sorted.length]);

  const openArchive = (row: Row) => {
    setActiveRow(row);
    setArchiveOpen(true);
  };

  const confirmArchive = async (row: Row) => {
    if (!row?.id) return;
    setSavingArchive(true);
    try {
      await archiveTrackingLink(row.id);
      setData((prev) => prev.filter((x) => x.id !== row.id));
      setArchiveOpen(false);
      setActiveRow(null);
    } catch {
      // keep dialog open; you can improve with a toast later
    } finally {
      setSavingArchive(false);
    }
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
    if (savingArchive) return;
    setArchiveOpen(false);
    setActiveRow(null);
  };

  const openEdit = (row: Row) => {
    setActiveRow(row);
    setEditOpen(true);
  };

  const closeEdit = () => {
    if (savingEdit) return;
    setEditOpen(false);
    setActiveRow(null);
  };

  const openCreate = () => {
    setCreateOpen(true);
  };

  const closeCreate = () => {
    if (savingCreate) return;
    setCreateOpen(false);
  };

  const sanitizeIconUrlForApi = (iconUrl: string | null | undefined) => {
    const v = (iconUrl || "").trim();
    if (!v) return null;
    // blob: URLs are not persisted; only send real URLs
    if (v.startsWith("blob:")) return null;
    return v;
  };

  const handleCreate = async (draft: TrackingLinkDraft) => {
    if (!draft.destinationKind) return;

    setSavingCreate(true);
    try {
      const row = await createTrackingLink({
        name: draft.name.trim(),
        destinationKind: draft.destinationKind,
        destinationId: draft.destinationId,
        status: draft.status,
        iconKey: draft.iconKey ?? null,
        iconUrl: sanitizeIconUrlForApi(draft.iconUrl),
      });

      setData((prev) => [
        {
          id: row.id,
          name: row.name,
          destinationKind: row.destinationKind,
          destinationId: row.destinationId,
          destinationTitle: row.destinationTitle,
          url: row.url,
          iconKey: row.iconKey ?? null,
          iconUrl: row.iconUrl ?? null,
          views: row.views ?? 0,
          ticketsSold: row.ticketsSold ?? 0,
          revenue: row.revenue ?? 0,
          status: row.status,
          created: row.created,
        },
        ...prev,
      ]);

      setCreateOpen(false);
    } catch {
      // can add inline error later
    } finally {
      setSavingCreate(false);
    }
  };

  const handleEdit = async (draft: TrackingLinkDraft) => {
    if (!activeRow) return;
    if (!draft.destinationKind) return;

    setSavingEdit(true);
    try {
      await updateTrackingLink(activeRow.id, {
        name: draft.name.trim(),
        destinationKind: draft.destinationKind,
        destinationId: draft.destinationId,
        status: draft.status,
        iconKey: draft.iconKey ?? null,
        iconUrl: sanitizeIconUrlForApi(draft.iconUrl),
      });

      // IMPORTANT: tracking URL (/t/:code/) does not change on edit
      setData((prev) =>
        prev.map((r) =>
          r.id === activeRow.id
            ? {
                ...r,
                name: draft.name.trim(),
                destinationKind: draft.destinationKind ?? r.destinationKind,
                destinationId: draft.destinationId,
                destinationTitle: draft.destinationTitle,
                status: draft.status,
                iconKey: draft.iconKey ?? null,
                // keep blob preview locally if user picked one, but API won't persist it
                iconUrl:
                  sanitizeIconUrlForApi(draft.iconUrl) ?? draft.iconUrl ?? null,
              }
            : r,
        ),
      );

      setEditOpen(false);
      setActiveRow(null);
    } catch {
      // can add inline error later
    } finally {
      setSavingEdit(false);
    }
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
        <div className="flex items-center gap-3">
          <h3 className="text-base font-bold uppercase text-neutral-400">
            Tracking Links
          </h3>

          {loading ? (
            <span className="text-xs text-neutral-500">Loading...</span>
          ) : loadError ? (
            <button
              type="button"
              onClick={() => reload()}
              className="text-xs text-error-400 hover:text-error-300 underline underline-offset-4 cursor-pointer"
              title="Retry"
            >
              Failed to load — Retry
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {/* + Create (top-right) */}
          <button
            type="button"
            onClick={openCreate}
            disabled={loading || !!loadError}
            className={clsx(
              "inline-flex items-center justify-center",
              "h-8 w-8 rounded-md",
              "border border-neutral-500 bg-neutral-700 text-white",
              "hover:text-white hover:border-white",
              "focus:outline-none",
              "cursor-pointer disabled:cursor-not-allowed disabled:opacity-60",
            )}
            title="Create Tracking Link"
            aria-label="Create Tracking Link"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Empty state */}
      {!loading && !loadError && sorted.length === 0 ? (
        <div className="px-4 py-10 text-center">
          <p className="text-neutral-200 font-semibold">
            No tracking links yet.
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            Create your first link to start tracking traffic and sales.
          </p>
          <div className="mt-5 flex justify-center">
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={openCreate}
              icon={<Plus size={16} />}
              animation
            >
              Create Tracking Link
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Table */}
          <div
            ref={clipRef}
            className="relative overflow-hidden rounded-lg"
            style={{ height: isClamped ? `${MAX}px` : "auto" }}
          >
            <table className="w-full table-fixed border-collapse font-medium">
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

                  <th className="text-center text-base font-semibold">
                    QR Code
                  </th>

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

                  <th className="text-center text-base font-semibold">
                    Destination
                  </th>

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
                  const rowBg =
                    i % 2 === 0 ? "bg-neutral-948" : "bg-neutral-900";

                  const dataRow = (
                    <tr key={r.id} className={clsx("transition-colors", rowBg)}>
                      {/* Name & Link */}
                      <td className="px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-neutral-200">
                            {r.name}
                          </p>

                          <div className="mt-2 flex min-w-0 items-center gap-2 text-neutral-400">
                            {r.iconKey || r.iconUrl ? (
                              <span className="text-neutral-400">
                                <TrackingIcon
                                  iconKey={r.iconKey}
                                  iconUrl={r.iconUrl}
                                  className="h-5 w-5"
                                />
                              </span>
                            ) : null}

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

                      {/* QR Code */}
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
                          {r.views}
                        </span>
                      </td>

                      {/* Tickets Sold */}
                      <td className="px-4 py-3 text-center">
                        <span className="tabular-nums inline-flex items-center justify-center gap-1">
                          {r.ticketsSold}
                        </span>
                      </td>

                      {/* Revenue */}
                      <td className="px-4 py-3 text-center">
                        <span className="tabular-nums ">
                          {formatMoneyUSD(r.revenue)}
                        </span>
                      </td>

                      {/* Destination */}
                      <td className="px-4 py-3 text-center">
                        <div className="inline-block">
                          <Chip color="primary">{r.destinationKind}</Chip>
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
                            title="Archive"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );

                  const separatorRow = !isLast ? (
                    <tr
                      key={`${r.id}-sep`}
                      aria-hidden
                      className="bg-neutral-900"
                    >
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
        </>
      )}

      <ArchiveLinkDialog
        open={archiveOpen}
        row={activeRow}
        onClose={closeArchive}
        onConfirm={confirmArchive}
        loading={savingArchive}
      />
      <QrDialog open={qrOpen} row={activeRow} onClose={closeQr} />

      {/* Create */}
      <TrackingLinkDialog
        open={createOpen}
        mode="create"
        onClose={closeCreate}
        onSave={handleCreate}
        saving={savingCreate}
      />

      {/* Edit */}
      <TrackingLinkDialog
        open={editOpen}
        mode="edit"
        initial={activeRow}
        onClose={closeEdit}
        onSave={handleEdit}
        saving={savingEdit}
      />
    </div>
  );
}
