// src/components/ui/ChatsPopover.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, MessageCircle, X } from "lucide-react";
import clsx from "clsx";

type ChatThread = {
  id: string;
  name: string;
  lastMessage: string;
  updatedAt: string; // ISO
  unread: boolean;
  avatarSeed?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onUnreadChange?: (count: number) => void;
};

const STORAGE_KEY = "tikd:chats:v1";

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
  return `${d}d`;
}

function safeParse(json: string | null): ChatThread[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    if (!Array.isArray(v)) return [];
    return v.filter(Boolean) as ChatThread[];
  } catch {
    return [];
  }
}

function loadChats(): ChatThread[] {
  return safeParse(
    typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null,
  );
}

function saveChats(list: ChatThread[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function seedIfEmpty() {
  const existing = loadChats();
  if (existing.length > 0) return existing;

  const now = Date.now();
  const seeded: ChatThread[] = [
    {
      id: "c1",
      name: "Mirza Lutfi",
      lastMessage: "Sent you the updated flyer version.",
      updatedAt: new Date(now - 5 * 60 * 1000).toISOString(),
      unread: true,
      avatarSeed: "mirza",
    },
    {
      id: "c2",
      name: "Adil Anas",
      lastMessage: "Are we publishing today or tomorrow?",
      updatedAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      unread: false,
      avatarSeed: "adil",
    },
  ];

  saveChats(seeded);
  return seeded;
}

/* ------------------------------ UI -------------------------------- */
export default function ChatsPopover({ open, onClose, onUnreadChange }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<ChatThread[]>([]);

  const unread = useMemo(() => items.filter((c) => c.unread).length, [items]);

  useEffect(() => {
    if (!open) return;
    const seeded = seedIfEmpty();
    setItems(seeded);
  }, [open]);

  useEffect(() => {
    if (!open && items.length === 0) return;
    onUnreadChange?.(unread);
  }, [open, items.length, onUnreadChange, unread]);

  function setAndPersist(next: ChatThread[]) {
    setItems(next);
    saveChats(next);
    onUnreadChange?.(next.filter((c) => c.unread).length);
  }

  function openThread(t: ChatThread) {
    if (t.unread) {
      setAndPersist(
        items.map((x) => (x.id === t.id ? { ...x, unread: false } : x)),
      );
    }

    onClose();
    router.push("/dashboard/friends");
  }

  function startNewChat() {
    onClose();
    router.push("/dashboard/friends");
  }

  if (!open) return null;

  return (
    <div
      className={clsx(
        "absolute right-0 top-[calc(100%+10px)] z-[60] w-[380px]",
        "overflow-hidden rounded-2xl",
        // glass container (match Friends + Notifications)
        "border border-white/10",
        "bg-neutral-950/55 backdrop-blur-2xl",
        // subtle purple glow wash
        "bg-[radial-gradient(1100px_520px_at_12%_-10%,rgba(154,70,255,0.22),transparent_55%),radial-gradient(900px_520px_at_110%_-15%,rgba(154,70,255,0.14),transparent_55%)]",
        "shadow-[0_28px_110px_rgba(0,0,0,0.72)]",
        "ring-1 ring-white/[0.06]",
      )}
      role="dialog"
      aria-label="Messages"
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
              MESSAGES
            </div>
            <div className="mt-1 text-[12px] text-neutral-500">
              {unread > 0 ? `${unread} unread` : "No new messages"}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={startNewChat}
              className={clsx(
                "inline-flex h-8 items-center justify-center gap-2 rounded-lg px-3",
                "border border-white/10 bg-primary-500/15 text-primary-200",
                "hover:bg-primary-500/20 transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
              )}
              aria-label="Start new chat"
            >
              <Plus className="h-4 w-4" />
              <span className="text-[11px] font-semibold">New</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close messages"
              className={clsx(
                "inline-flex h-8 w-8 items-center justify-center rounded-lg",
                "border border-white/10 bg-white/[0.06] text-neutral-200",
                "hover:bg-white/[0.10] transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
              )}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
          <div
            className={clsx(
              "inline-flex h-10 w-10 items-center justify-center rounded-xl",
              "bg-white/[0.06] text-neutral-200 ring-1 ring-white/10",
              "backdrop-blur-xl",
            )}
          >
            <MessageCircle className="h-5 w-5" />
          </div>
          <div className="text-[13px] font-semibold text-neutral-100">
            No chats yet
          </div>
          <div className="text-[12px] text-neutral-500">
            Start a new chat with your friends.
          </div>
        </div>
      ) : (
        <div className="max-h-[420px] overflow-auto p-2 no-scrollbar">
          <div className="space-y-2">
            {items.map((t) => {
              const avatar = `/api/avatar?seed=${encodeURIComponent(
                t.avatarSeed || t.name,
              )}`;

              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => openThread(t)}
                  className={clsx(
                    "group relative w-full rounded-xl text-left",
                    // frosted item cards like Friends page
                    "border border-white/10",
                    "bg-white/[0.05] backdrop-blur-xl",
                    "px-3 py-3",
                    // subtle inner sheen
                    "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
                    // hover
                    "hover:bg-white/[0.08] hover:border-white/15 transition-colors",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
                  )}
                >
                  {/* ✅ Keep dot away from the time */}
                  {t.unread ? (
                    <span
                      className={clsx(
                        "absolute right-3 top-3 h-2 w-2 rounded-full",
                        "bg-red-500 ring-2 ring-neutral-950/60",
                      )}
                    />
                  ) : null}

                  <div className="flex items-start gap-3">
                    {/* ✅ Fully rounded avatar */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={avatar}
                      alt={t.name}
                      className="h-12 w-12 rounded-full object-cover ring-1 ring-white/10"
                      loading="lazy"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate font-semibold text-neutral-0">
                          {t.name}
                        </div>

                        {/* ✅ Reserve space on the right when unread so dot never overlaps */}
                        <div
                          className={clsx(
                            "flex-shrink-0 text-[11px] text-neutral-500",
                            t.unread ? "pr-5" : "pr-0",
                          )}
                        >
                          {timeAgo(t.updatedAt)}
                        </div>
                      </div>

                      <div className="mt-1 line-clamp-2 text-[12px] text-neutral-400">
                        {t.lastMessage}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
