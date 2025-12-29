/* ------------------------------------------------------------------ */
/*  src/components/dashboard/NotificationsDialog.tsx                  */
/*  - Tikd-styled notifications modal                                 */
/*  - LocalStorage-backed (fully functional now), easy to swap to API  */
/* ------------------------------------------------------------------ */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, X } from "lucide-react";

export type NotificationItem = {
  id: string;
  title: string;
  message?: string;
  createdAt: string; // ISO string
  read: boolean;
  href?: string; // optional deep-link
};

type Props = {
  open: boolean;
  onClose: () => void;
  onUnreadChange?: (count: number) => void;
};

const STORAGE_KEY = "tikd:notifications:v1";

/* ----------------------------- Helpers ----------------------------- */
function nowIso() {
  return new Date().toISOString();
}

function timeAgo(iso: string) {
  const t = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - t);

  const m = Math.floor(diff / (60 * 1000));
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;

  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;

  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;

  // fallback to a short date
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

function safeParse(json: string | null): NotificationItem[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    if (!Array.isArray(v)) return [];
    return v.filter(Boolean) as NotificationItem[];
  } catch {
    return [];
  }
}

function loadNotifications(): NotificationItem[] {
  return safeParse(
    typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null
  );
}

function saveNotifications(list: NotificationItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function seedIfEmpty() {
  const existing = loadNotifications();
  if (existing.length > 0) return existing;

  const seeded: NotificationItem[] = [
    {
      id: "n1",
      title: "Ticket sold",
      message: "You sold 2 tickets for “Avalon NYC: Yacht Party”.",
      createdAt: nowIso(),
      read: false,
      href: "/dashboard/sales",
    },
    {
      id: "n2",
      title: "Event published",
      message: "Your event is now live and visible to everyone.",
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      read: false,
      href: "/dashboard/events",
    },
    {
      id: "n3",
      title: "Payout scheduled",
      message: "Your payout will be processed within 1–2 business days.",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      read: true,
      href: "/dashboard/finances",
    },
  ];

  saveNotifications(seeded);
  return seeded;
}

/* ------------------------------ UI -------------------------------- */
export default function NotificationsDialog({
  open,
  onClose,
  onUnreadChange,
}: Props) {
  const router = useRouter();

  const [tab, setTab] = useState<"all" | "unread">("all");
  const [items, setItems] = useState<NotificationItem[]>([]);

  const unreadCount = useMemo(
    () => items.filter((n) => !n.read).length,
    [items]
  );

  const visible = useMemo(() => {
    if (tab === "unread") return items.filter((n) => !n.read);
    return items;
  }, [items, tab]);

  // Load + seed on open
  useEffect(() => {
    if (!open) return;

    const seeded = seedIfEmpty();
    setItems(seeded);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Report unread changes to parent (badge)
  useEffect(() => {
    if (!open && items.length === 0) return;
    onUnreadChange?.(unreadCount);
  }, [unreadCount, onUnreadChange, open, items.length]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function setAndPersist(next: NotificationItem[]) {
    setItems(next);
    saveNotifications(next);
    onUnreadChange?.(next.filter((n) => !n.read).length);
  }

  function markAllRead() {
    const next = items.map((n) => ({ ...n, read: true }));
    setAndPersist(next);
  }

  function markOneRead(id: string) {
    const next = items.map((n) => (n.id === id ? { ...n, read: true } : n));
    setAndPersist(next);
  }

  function openNotification(n: NotificationItem) {
    if (!n.read) markOneRead(n.id);
    if (n.href) {
      onClose();
      router.push(n.href);
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Notifications"
      className="fixed inset-0 z-[60]"
      onMouseDown={(e) => {
        // close only when clicking the backdrop, not the panel
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" />

      {/* Panel wrapper (mobile bottom sheet, desktop centered) */}
      <div className="relative z-[61] flex h-full items-end justify-center p-3 sm:items-center">
        <div className="w-full max-w-[520px] overflow-hidden rounded-card border border-white/10 bg-neutral-948 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">Notifications</p>
              <p className="mt-1 text-[12px] text-neutral-500">
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={markAllRead}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-neutral-900 px-3 py-1.5 text-[12px] font-semibold text-white/90 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-primary-500/40 disabled:opacity-50"
                disabled={unreadCount === 0}
              >
                <CheckCheck className="h-4 w-4 opacity-80" />
                Mark all read
              </button>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close notifications"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-neutral-900 text-white/90 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 px-4 py-3">
            <button
              type="button"
              onClick={() => setTab("all")}
              className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${
                tab === "all"
                  ? "bg-white/10 text-white"
                  : "border border-white/10 bg-neutral-900 text-white/80 hover:bg-white/5"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setTab("unread")}
              className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${
                tab === "unread"
                  ? "bg-white/10 text-white"
                  : "border border-white/10 bg-neutral-900 text-white/80 hover:bg-white/5"
              }`}
            >
              Unread
            </button>
          </div>

          {/* List */}
          <div className="max-h-[62vh] overflow-auto px-2 pb-2 sm:max-h-[420px]">
            {visible.length === 0 ? (
              <div className="mx-2 rounded-xl border border-white/10 bg-neutral-900 px-4 py-10 text-center">
                <p className="text-sm font-semibold text-white">
                  No notifications
                </p>
                <p className="mt-2 text-[12px] text-neutral-500">
                  {tab === "unread"
                    ? "You have no unread updates."
                    : "You’re all caught up."}
                </p>
              </div>
            ) : (
              visible.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => openNotification(n)}
                  className="group relative mx-2 mb-2 w-[calc(100%-16px)] rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-left hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-primary-500/35"
                >
                  {/* unread dot */}
                  {!n.read && (
                    <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-error-500" />
                  )}

                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {n.title}
                      </p>
                      {n.message ? (
                        <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-neutral-500">
                          {n.message}
                        </p>
                      ) : null}
                    </div>

                    <p className="flex-shrink-0 text-[11px] font-semibold text-neutral-500">
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>

                  {n.href ? (
                    <p className="mt-2 text-[11px] font-semibold text-primary-400 opacity-0 transition group-hover:opacity-100">
                      Open →
                    </p>
                  ) : null}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          {/* <div className="border-t border-white/10 px-4 py-3">
            <p className="text-[11px] text-neutral-500">
              Tip: later you can back this with an API and real-time updates
              (Ably/WebSockets).
            </p>
          </div> */}
        </div>
      </div>
    </div>
  );
}
