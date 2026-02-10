// src/components/dashboard/NotificationsDialog.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, X, Bell } from "lucide-react";
import clsx from "clsx";

export type NotificationItem = {
  id: string;
  type?: string;
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

/* ----------------------------- Helpers ----------------------------- */
function timeAgo(iso: string) {
  const t = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - t);

  const m = Math.floor(diff / (60 * 1000));
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m`;

  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;

  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

async function fetchNotifications(tab: "all" | "unread") {
  const res = await fetch(`/api/notifications?tab=${tab}&limit=50`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load notifications");
  return (await res.json()) as {
    unreadCount: number;
    items: NotificationItem[];
  };
}

async function markAllReadApi() {
  const res = await fetch("/api/notifications/mark-all-read", {
    method: "PATCH",
  });
  if (!res.ok) throw new Error("Failed to mark all read");
  return (await res.json()) as { unreadCount: number };
}

async function markOneReadApi(id: string) {
  const res = await fetch(`/api/notifications/${id}/read`, {
    method: "PATCH",
  });
  if (!res.ok) throw new Error("Failed to mark read");
  return (await res.json()) as { unreadCount: number };
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
  const [loading, setLoading] = useState(false);

  const unreadCount = useMemo(
    () => items.filter((n) => !n.read).length,
    [items],
  );

  const visible = useMemo(() => {
    if (tab === "unread") return items.filter((n) => !n.read);
    return items;
  }, [items, tab]);

  // Load from backend whenever opened or tab changes
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);

    fetchNotifications(tab)
      .then((data) => {
        if (cancelled) return;
        setItems(Array.isArray(data.items) ? data.items : []);
        onUnreadChange?.(Number(data.unreadCount || 0));
      })
      .catch(() => {
        if (cancelled) return;
        setItems([]);
        onUnreadChange?.(0);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab]);

  // Keep badge synced even when local list updates (optimistic)
  useEffect(() => {
    if (!open) return;
    onUnreadChange?.(unreadCount);
  }, [unreadCount, onUnreadChange, open]);

  async function markAllRead() {
    // optimistic
    const optimistic = items.map((n) => ({ ...n, read: true }));
    setItems(optimistic);
    onUnreadChange?.(0);

    try {
      const data = await markAllReadApi();
      onUnreadChange?.(Number(data.unreadCount || 0));
    } catch {
      // if failed, reload tab
      try {
        const data = await fetchNotifications(tab);
        setItems(data.items);
        onUnreadChange?.(Number(data.unreadCount || 0));
      } catch {
        // ignore
      }
    }
  }

  async function markOneRead(id: string) {
    // optimistic
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );

    try {
      const data = await markOneReadApi(id);
      onUnreadChange?.(Number(data.unreadCount || 0));
    } catch {
      // fallback reload
      try {
        const data = await fetchNotifications(tab);
        setItems(data.items);
        onUnreadChange?.(Number(data.unreadCount || 0));
      } catch {
        // ignore
      }
    }
  }

  function openNotification(n: NotificationItem) {
    if (!n.read) void markOneRead(n.id);
    if (n.href) {
      onClose();
      router.push(n.href);
    }
  }

  if (!open) return null;

  return (
    <div
      className={clsx(
        "absolute right-0 top-[calc(100%+10px)] z-[60] w-[380px]",
        "overflow-hidden rounded-2xl",
        "border border-white/10",
        "bg-neutral-950/55 backdrop-blur-2xl",
        "bg-[radial-gradient(1100px_520px_at_12%_-10%,rgba(154,70,255,0.22),transparent_55%),radial-gradient(900px_520px_at_110%_-15%,rgba(154,70,255,0.14),transparent_55%)]",
        "shadow-[0_28px_110px_rgba(0,0,0,0.72)]",
        "ring-1 ring-white/[0.06]",
      )}
      role="dialog"
      aria-label="Notifications"
    >
      {/* Header */}
      <div
        className={clsx(
          "border-b border-white/10 px-4 py-3",
          "bg-white/[0.03] backdrop-blur-xl",
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[12px] font-semibold tracking-[0.18em] text-neutral-300">
              NOTIFICATIONS
            </div>
            <div className="mt-1 text-[12px] text-neutral-500">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={markAllRead}
              disabled={unreadCount === 0 || loading}
              className={clsx(
                "inline-flex h-8 items-center justify-center gap-2 rounded-lg px-3",
                "border border-white/10 bg-primary-500/15 text-primary-200",
                "hover:bg-primary-500/20 transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
                "disabled:opacity-50 disabled:hover:bg-primary-500/15 cursor-pointer",
              )}
              aria-label="Mark all as read"
            >
              <CheckCheck className="h-4 w-4" />
              <span className="text-[11px] font-semibold">Mark all</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close notifications"
              className={clsx(
                "inline-flex h-8 w-8 items-center justify-center rounded-lg",
                "border border-white/10 bg-white/[0.06] text-neutral-200",
                "hover:bg-white/[0.10] transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 cursor-pointer",
              )}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTab("all")}
            className={clsx(
              "inline-flex h-7 items-center justify-center rounded-lg px-3",
              "border border-white/10 text-[11px] font-semibold",
              tab === "all"
                ? "bg-primary-500/15 text-primary-200 ring-1 ring-primary-500/20"
                : "bg-white/[0.06] text-neutral-200 hover:bg-white/[0.10]",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 cursor-pointer",
            )}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setTab("unread")}
            className={clsx(
              "inline-flex h-7 items-center justify-center rounded-lg px-3",
              "border border-white/10 text-[11px] font-semibold",
              tab === "unread"
                ? "bg-primary-500/15 text-primary-200 ring-1 ring-primary-500/20"
                : "bg-white/[0.06] text-neutral-200 hover:bg-white/[0.10]",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 cursor-pointer",
            )}
          >
            Unread
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
          <div
            className={clsx(
              "inline-flex h-10 w-10 items-center justify-center rounded-xl",
              "bg-white/[0.06] text-neutral-200 ring-1 ring-white/10",
              "backdrop-blur-xl",
            )}
          >
            <Bell className="h-5 w-5" />
          </div>
          <div className="text-[13px] font-semibold text-neutral-100">
            Loading…
          </div>
          <div className="text-[12px] text-neutral-500">
            Fetching your latest updates.
          </div>
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
          <div
            className={clsx(
              "inline-flex h-10 w-10 items-center justify-center rounded-xl",
              "bg-white/[0.06] text-neutral-200 ring-1 ring-white/10",
              "backdrop-blur-xl",
            )}
          >
            <Bell className="h-5 w-5" />
          </div>
          <div className="text-[13px] font-semibold text-neutral-100">
            No notifications
          </div>
          <div className="text-[12px] text-neutral-500">
            {tab === "unread"
              ? "You have no unread updates."
              : "You’re all caught up."}
          </div>
        </div>
      ) : (
        <div className="max-h-[420px] overflow-auto p-2 no-scrollbar">
          <div className="space-y-2">
            {visible.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => openNotification(n)}
                className={clsx(
                  "group relative w-full rounded-xl text-left",
                  "border border-white/10",
                  "bg-white/[0.05] backdrop-blur-xl",
                  "px-3 py-3",
                  "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
                  "hover:bg-white/[0.08] hover:border-white/15 transition-colors",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 cursor-pointer",
                )}
              >
                {!n.read ? (
                  <span
                    className={clsx(
                      "absolute right-3 top-3 h-2 w-2 rounded-full",
                      "bg-red-500 ring-2 ring-neutral-950/60",
                    )}
                  />
                ) : null}

                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-neutral-0">
                      {n.title}
                    </div>
                    {n.message ? (
                      <div className="mt-1 line-clamp-2 text-[12px] text-neutral-400">
                        {n.message}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex-shrink-0 text-[11px] text-neutral-500">
                    {timeAgo(n.createdAt)}
                  </div>
                </div>

                {n.href ? (
                  <div
                    className={clsx(
                      "mt-2 text-[11px] font-semibold text-primary-300",
                      "opacity-80 group-hover:opacity-95 transition-opacity",
                    )}
                  >
                    Open →
                  </div>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
