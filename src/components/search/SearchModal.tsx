"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  Search,
  X,
  Loader2,
  ChevronDown,
  History,
  Building2,
  Users2,
  UserRound,
  Ticket,
} from "lucide-react";

/* ────────────────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────────────────── */
type Filter = "all" | "event" | "org" | "team" | "friend";
type ItemType = "event" | "org" | "team" | "friend";

type Item = {
  id: string;
  type: ItemType;
  title: string;
  subtitle?: string; // for orgs/teams/friends, and can also be orgName for events
  orgName?: string | null;
  date?: string | null; // ISO string
  image?: string | null; // poster/avatar/logo
  href: string;

  // optional, if your API provides it (safe to ignore)
  orgId?: string | null;
};

type Results = {
  events: Item[];
  orgs: Item[];
  teams: Item[];
  friends: Item[];
};

const FILTER_LABEL: Record<Filter, string> = {
  all: "All",
  event: "Events",
  org: "Organizations",
  team: "Teams",
  friend: "Friends",
};

const ITEM_LABEL: Record<ItemType, string> = {
  event: "Events",
  org: "Organizations",
  team: "Teams",
  friend: "Friends",
};

/* ────────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────────── */
function highlight(text: string, query: string): ReactNode {
  if (!query) return text;
  const pattern = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rx = new RegExp(pattern, "ig");
  const parts: ReactNode[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = rx.exec(text))) {
    const start = match.index;
    const end = rx.lastIndex;
    if (start > lastIdx) parts.push(text.slice(lastIdx, start));
    parts.push(
      <mark
        key={`${start}-${end}`}
        className="rounded-[0.35rem] px-1 py-0.5 bg-primary-900/35 text-primary-200"
      >
        {text.slice(start, end)}
      </mark>,
    );
    lastIdx = end;
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx));
  return parts;
}

function Chip({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5/50 px-3 py-1.5 text-xs text-neutral-200 hover:bg-white/10 active:scale-[0.98] transition cursor-pointer"
    >
      {children}
    </button>
  );
}

function formatDate(iso?: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

function itemKey(item: Item) {
  return `${item.type}:${item.id}`;
}

/* ---- Tracking-links style pill helpers (same logic as TrackingLinksTable) ---- */
function safeHexToRgb(hex: string) {
  const raw = hex.replace("#", "").trim();
  if (raw.length !== 6) return null;
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  if (![r, g, b].every((n) => Number.isFinite(n))) return null;
  return { r, g, b };
}

function pickAccentFromOrgResponse(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;

  const asRecord = json as Record<string, unknown>;

  const direct = asRecord.accentColor;
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  const orgA = asRecord.organization;
  if (orgA && typeof orgA === "object") {
    const v = (orgA as Record<string, unknown>).accentColor;
    if (typeof v === "string" && v.trim()) return v.trim();
  }

  const orgB = asRecord.org;
  if (orgB && typeof orgB === "object") {
    const v = (orgB as Record<string, unknown>).accentColor;
    if (typeof v === "string" && v.trim()) return v.trim();
  }

  return null;
}

/**
 * EXACT same “Destination” column pill style as TrackingLinksTable:
 * - Event: always default event hex
 * - Org: uses org accent color if available (fallback to default org hex)
 * - Event icon: Ticket
 */
function SearchDestinationPill({
  type,
  accentColor,
}: {
  type: "event" | "org";
  accentColor?: string | null;
}) {
  const defaultEventHex = "#9A46FF";
  const defaultOrgHex = "#A670FF";

  const hex =
    type === "org" && typeof accentColor === "string" && accentColor.trim()
      ? accentColor.trim()
      : type === "event"
        ? defaultEventHex
        : defaultOrgHex;

  const rgb = safeHexToRgb(hex);
  const soft =
    rgb != null
      ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.14)`
      : "rgba(154,70,255,0.14)";
  const ring =
    rgb != null
      ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.26)`
      : "rgba(154,70,255,0.26)";
  const text =
    rgb != null
      ? `rgba(${Math.min(255, rgb.r + 120)},${Math.min(
          255,
          rgb.g + 120,
        )},${Math.min(255, rgb.b + 120)},0.98)`
      : "rgba(231,222,255,0.98)";

  const label = type === "event" ? "Event" : "Organization";
  const Icon = type === "event" ? Ticket : Building2;

  return (
    <span
      className={clsx(
        "hidden sm:inline-flex items-center gap-1 rounded-md px-2.5 pl-2 py-1.5",
        "text-[13px] font-semibold ring-1 ring-inset",
      )}
      style={{
        background: soft,
        color: text,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
        borderColor: ring,
      }}
      aria-label={`Destination: ${label}`}
      title={label}
    >
      <span className="inline-flex items-center justify-center">
        <Icon className="h-4 w-4" />
      </span>
      <span className="leading-none">{label}</span>
    </span>
  );
}

/**
 * NEW: Friends pill redesigned to match the Event/Organization pill vibe.
 * (Also used for Team for consistency.)
 */
function SearchTypePill({ type }: { type: "team" | "friend" }) {
  const meta =
    type === "friend"
      ? { hex: "#A6D7FF", label: "Friends", Icon: UserRound }
      : { hex: "#45FF79", label: "Teams", Icon: Users2 };

  const rgb = safeHexToRgb(meta.hex);
  const soft =
    rgb != null
      ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.12)`
      : "rgba(166,215,255,0.12)";
  const ring =
    rgb != null
      ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.24)`
      : "rgba(166,215,255,0.24)";
  const text =
    rgb != null
      ? `rgba(${Math.min(255, rgb.r + 80)},${Math.min(
          255,
          rgb.g + 80,
        )},${Math.min(255, rgb.b + 80)},0.98)`
      : "rgba(231,222,255,0.95)";

  const Icon = meta.Icon;

  return (
    <span
      className={clsx(
        "hidden sm:inline-flex items-center gap-1 rounded-md px-2.5 pl-2 py-1.5",
        "text-[13px] font-semibold ring-1 ring-inset",
      )}
      style={{
        background: soft,
        color: text,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
        borderColor: ring,
      }}
      aria-label={`Type: ${meta.label}`}
      title={meta.label}
    >
      <span className="inline-flex items-center justify-center">
        <Icon className="h-4 w-4" />
      </span>
      <span className="leading-none">{meta.label}</span>
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────
   Component
   ──────────────────────────────────────────────────────────────── */
export default function SearchModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Results>({
    events: [],
    orgs: [],
    teams: [],
    friends: [],
  });
  const [active, setActive] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // org accent cache (same idea as TrackingLinksTable)
  const [orgAccentById, setOrgAccentById] = useState<Record<string, string>>(
    {},
  );

  const flatResults: Item[] = useMemo(() => {
    if (filter === "all") {
      return [
        ...(results.events ?? []),
        ...(results.orgs ?? []),
        ...(results.teams ?? []),
        ...(results.friends ?? []),
      ];
    }
    if (filter === "event") return results.events ?? [];
    if (filter === "org") return results.orgs ?? [];
    if (filter === "team") return results.teams ?? [];
    return results.friends ?? [];
  }, [results, filter]);

  /* recent search history */
  const HISTORY_KEY = "tikd:recent-searches:v1";
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setRecent(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  function pushRecent(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;

    try {
      const next = [trimmed, ...recent.filter((x) => x !== trimmed)].slice(
        0,
        8,
      );
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      setRecent(next);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (!open) return;

    setQuery("");
    setResults({ events: [], orgs: [], teams: [], friends: [] });
    setActive(null);
    setLoading(false);

    setFilter("all");
    setDropdownOpen(false);
  }, [open]);

  /* key handling + focus */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const idx = flatResults.findIndex((i) => itemKey(i) === active);
        const nextIdx =
          e.key === "ArrowDown"
            ? Math.min(idx + 1, flatResults.length - 1)
            : Math.max(idx - 1, 0);
        setActive(flatResults[nextIdx] ? itemKey(flatResults[nextIdx]) : null);
      }
      if (e.key === "Enter") {
        const target = flatResults.find((i) => itemKey(i) === active);
        if (target) {
          pushRecent(query);
          onClose();
          router.push(target.href);
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const t = setTimeout(() => inputRef.current?.focus(), 10);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, flatResults, active, query]);

  /* fetch (debounced) */
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) {
      setResults({ events: [], orgs: [], teams: [], friends: [] });
      setActive(null);
      return;
    }
    setLoading(true);
    const ac = new AbortController();
    const t = setTimeout(async () => {
      try {
        const typeParam =
          filter === "all" ? "" : `&type=${encodeURIComponent(filter)}`;

        const res = await fetch(
          `/api/search?q=${encodeURIComponent(q)}${typeParam}&limit=8`,
          { signal: ac.signal, cache: "no-store" },
        );
        const data: { results?: Results } = await res.json();

        const safe: Results = data.results || {
          events: [],
          orgs: [],
          teams: [],
          friends: [],
        };
        setResults(safe);

        const first =
          filter === "all"
            ? safe.events?.[0] ||
              safe.orgs?.[0] ||
              safe.teams?.[0] ||
              safe.friends?.[0] ||
              null
            : (filter === "event" ? safe.events?.[0] : null) ||
              (filter === "org" ? safe.orgs?.[0] : null) ||
              (filter === "team" ? safe.teams?.[0] : null) ||
              (filter === "friend" ? safe.friends?.[0] : null) ||
              null;

        setActive(first ? itemKey(first) : null);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          console.error("search error", err);
        }
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [query, filter, open]);

  // load org accent colors for org pills (match TrackingLinksTable behavior)
  useEffect(() => {
    if (!open) return;

    const orgIds = Array.from(
      new Set(
        flatResults
          .filter((x) => x.type === "org")
          .map((x) => x.id)
          .filter(Boolean),
      ),
    );

    const missing = orgIds.filter((id) => !orgAccentById[id]);
    if (missing.length === 0) return;

    let alive = true;

    (async () => {
      try {
        const pairs = await Promise.all(
          missing.map(async (id) => {
            try {
              const res = await fetch(
                `/api/organizations/${encodeURIComponent(id)}`,
                {
                  method: "GET",
                  cache: "no-store",
                },
              );
              if (!res.ok) return [id, null] as const;
              const json = (await res.json().catch(() => null)) as unknown;
              const accent = pickAccentFromOrgResponse(json);
              return [id, accent] as const;
            } catch {
              return [id, null] as const;
            }
          }),
        );

        if (!alive) return;

        const next: Record<string, string> = {};
        for (const [id, accent] of pairs) {
          if (typeof accent === "string" && accent.trim()) {
            next[id] = accent.trim();
          }
        }

        if (Object.keys(next).length > 0) {
          setOrgAccentById((prev) => ({ ...prev, ...next }));
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      alive = false;
    };
  }, [open, flatResults, orgAccentById]);

  if (!open || typeof window === "undefined") return null;

  /* ─────────────────────────── UI ─────────────────────────── */
  return createPortal(
    <div
      className={clsx(
        "fixed inset-0 z-[100] overflow-y-auto overscroll-contain",
        "bg-gradient-to-b from-neutral-950/80 to-neutral-950/60 backdrop-blur-md",
      )}
      onPointerDown={(e) => {
        const target = e.target as Node;
        if (cardRef.current && !cardRef.current.contains(target)) {
          onClose();
        }
      }}
      aria-modal="true"
      role="dialog"
      aria-label="Search"
    >
      <div className="min-h-screen w-full grid place-items-start sm:place-items-center pt-[max(env(safe-area-inset-top),0.75rem)] pb-[max(env(safe-area-inset-bottom),1rem)]">
        <div className="w-full max-w-3xl px-3 sm:px-4">
          <div
            ref={cardRef}
            className={clsx(
              "relative rounded-2xl sm:rounded-[1.5rem] border border-white/8 bg-neutral-900/70 backdrop-blur-xl",
              "shadow-[0_16px_40px_-12px_rgba(0,0,0,0.45),0_4px_16px_rgba(0,0,0,0.35)]",
            )}
          >
            {/* Top row */}
            <div className="flex items-center gap-2 px-3.5 py-3 sm:px-5 sm:py-3.5">
              <Search
                className="h-5 w-5 shrink-0 text-neutral-300"
                aria-hidden
              />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onPointerDown={() => {
                  if (filter !== "all") setFilter("all");
                  setDropdownOpen(false);
                }}
                placeholder="Search events, organizations, teams, friends…"
                aria-label="Search"
                inputMode="search"
                className={clsx(
                  "w-full peer flex-1 bg-transparent text-neutral-0 placeholder:text-neutral-400",
                  "outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 border-0",
                  "text-[14px] sm:text-base",
                )}
              />

              {/* Filter dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen((v) => !v)}
                  className={clsx(
                    "group inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5",
                    "h-7 sm:h-9 px-2 sm:px-3 text-[11px] sm:text-xs text-neutral-200",
                    "hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700/40 cursor-pointer",
                  )}
                  aria-haspopup="listbox"
                  aria-expanded={dropdownOpen}
                >
                  <span className="hidden sm:inline opacity-70">by</span>
                  <span className="font-medium">{FILTER_LABEL[filter]}</span>
                  <ChevronDown className="h-4 w-4 opacity-70 group-hover:opacity-100" />
                </button>

                {dropdownOpen && (
                  <div
                    role="listbox"
                    className={clsx(
                      "absolute right-0 mt-2 w-44 sm:w-48 overflow-hidden rounded-xl border border-white/10",
                      "bg-neutral-900/95 backdrop-blur-xl",
                      "shadow-[0_22px_50px_-20px_rgba(0,0,0,0.55),0_6px_16px_rgba(0,0,0,0.35)]",
                    )}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <button
                      role="option"
                      aria-selected={filter === "all"}
                      onClick={() => {
                        setFilter("all");
                        setDropdownOpen(false);
                        inputRef.current?.focus();
                      }}
                      className={clsx(
                        "flex w-full items-center gap-2 px-3 sm:px-3.5 py-2.5 text-xs sm:text-sm hover:bg-white/5 focus:outline-none cursor-pointer",
                        filter === "all" ? "bg-white/7" : "bg-transparent",
                      )}
                    >
                      <Search className="h-4 w-4 opacity-80" />
                      <span>{FILTER_LABEL.all}</span>
                    </button>

                    <div className="h-px w-full bg-white/8" />

                    {(["event", "org", "team", "friend"] as Filter[]).map(
                      (f) => (
                        <button
                          key={f}
                          role="option"
                          aria-selected={filter === f}
                          onClick={() => {
                            setFilter(f);
                            setDropdownOpen(false);
                            inputRef.current?.focus();
                          }}
                          className={clsx(
                            "flex w-full items-center gap-2 px-3 sm:px-3.5 py-2.5 text-xs sm:text-sm hover:bg-white/5 focus:outline-none cursor-pointer",
                            filter === f && "bg-white/7",
                          )}
                        >
                          {f === "event" && (
                            <Ticket className="h-4 w-4 opacity-80" />
                          )}
                          {f === "org" && (
                            <Building2 className="h-4 w-4 opacity-80" />
                          )}
                          {f === "team" && (
                            <Users2 className="h-4 w-4 opacity-80" />
                          )}
                          {f === "friend" && (
                            <UserRound className="h-4 w-4 opacity-80" />
                          )}
                          <span>{FILTER_LABEL[f]}</span>
                        </button>
                      ),
                    )}
                  </div>
                )}
              </div>

              {/* Close */}
              <button
                type="button"
                onClick={onClose}
                className="ml-0.5 inline-flex h-6 w-6 sm:h-9 sm:w-9 items-center justify-center rounded-full hover:bg-white/7 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700/40 cursor-pointer"
                aria-label="Close search"
              >
                <X className="h-5 w-5 text-neutral-300" />
              </button>
            </div>

            {/* Divider */}
            <div className="h-px w-full bg-gradient-to-r from-white/5 via-white/10 to-white/5" />

            {/* Results panel */}
            <div className="max-h-[70vh] sm:max-h-[60vh] overflow-auto rounded-b-2xl sm:rounded-b-[1.5rem]">
              {/* Empty query → Recent (ONLY when there are recents) */}
              {!query.trim() && recent.length > 0 && (
                <div className="p-3.5 sm:p-5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[13px] sm:text-sm font-medium text-neutral-100">
                      Recent searches
                    </h4>
                    <button
                      className="text-xs text-neutral-400 hover:text-neutral-200 focus:outline-none cursor-pointer"
                      onClick={() => {
                        localStorage.removeItem(HISTORY_KEY);
                        setRecent([]);
                      }}
                    >
                      Clear
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {recent.map((r) => (
                      <Chip key={r} onClick={() => setQuery(r)}>
                        <History className="h-3.5 w-3.5 text-neutral-300" />
                        <span className="truncate">{r}</span>
                      </Chip>
                    ))}
                  </div>
                </div>
              )}

              {/* Loading */}
              {query.trim() && loading && (
                <div className="flex items-center gap-3 px-3.5 sm:px-4 py-5 text-neutral-300">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching…
                </div>
              )}

              {/* Results */}
              {query.trim() && !loading && flatResults.length > 0 && (
                <ul role="listbox" className="divide-y divide-white/5">
                  {flatResults.map((item) => {
                    const key = itemKey(item);
                    const activeNow = active === key;

                    if (item.type === "event") {
                      return (
                        <li key={key}>
                          <button
                            role="option"
                            aria-selected={activeNow}
                            onMouseEnter={() => setActive(key)}
                            onClick={() => {
                              pushRecent(query);
                              onClose();
                              router.push(item.href);
                            }}
                            className={clsx(
                              "group grid w-full items-center text-left transition",
                              "grid-cols-[40px_1fr_auto] sm:grid-cols-[44px_1fr_auto]",
                              "gap-3 sm:gap-3.5 px-3.5 sm:px-4 py-3",
                              "hover:bg-white/5 focus:outline-none cursor-pointer",
                              activeNow && "bg-white/6",
                            )}
                          >
                            <div
                              className={clsx(
                                "h-10 w-10 sm:h-11 sm:w-11 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/5",
                                "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
                              )}
                            >
                              {item.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={item.image}
                                  alt=""
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-neutral-400">
                                  <Ticket className="h-4 w-4" />
                                </div>
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="truncate text-[15px] sm:text-sm text-neutral-0">
                                {highlight(item.title, query)}
                              </div>
                              <div className="mt-0.5 line-clamp-2 sm:line-clamp-1 text-xs text-neutral-400">
                                {item.orgName || item.subtitle}
                                {item.date && (
                                  <span className="ml-2 text-neutral-500">
                                    • {formatDate(item.date)}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* EXACT tracking-links destination pill style */}
                            <SearchDestinationPill type="event" />
                          </button>
                        </li>
                      );
                    }

                    // Orgs / Teams / Friends
                    return (
                      <li key={key}>
                        <button
                          role="option"
                          aria-selected={activeNow}
                          onMouseEnter={() => setActive(key)}
                          onClick={() => {
                            pushRecent(query);
                            onClose();
                            router.push(item.href);
                          }}
                          className={clsx(
                            "group grid w-full items-center text-left transition",
                            "grid-cols-[40px_1fr_auto] sm:grid-cols-[44px_1fr_auto]",
                            "gap-3 sm:gap-3.5 px-3.5 sm:px-4 py-3",
                            "hover:bg-white/5 focus:outline-none cursor-pointer",
                            activeNow && "bg-white/6",
                          )}
                        >
                          <div
                            className={clsx(
                              "h-10 w-10 sm:h-11 sm:w-11 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/5",
                              "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
                            )}
                          >
                            {item.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.image}
                                alt=""
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-neutral-400">
                                {item.type === "org" && (
                                  <Building2 className="h-4 w-4" />
                                )}
                                {item.type === "team" && (
                                  <Users2 className="h-4 w-4" />
                                )}
                                {item.type === "friend" && (
                                  <UserRound className="h-4 w-4" />
                                )}
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="truncate text-[15px] sm:text-sm text-neutral-0">
                              {highlight(item.title, query)}
                            </div>
                            <div className="truncate text-xs text-neutral-400">
                              {item.subtitle}
                            </div>
                          </div>

                          {/* Right pill */}
                          {item.type === "org" ? (
                            <SearchDestinationPill
                              type="org"
                              accentColor={orgAccentById[item.id] ?? null}
                            />
                          ) : item.type === "team" ? (
                            <SearchTypePill type="team" />
                          ) : (
                            <SearchTypePill type="friend" />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* Empty state */}
              {query.trim() && !loading && flatResults.length === 0 && (
                <div className="p-8 text-center">
                  <div className="inline-flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-neutral-300">
                    <Search className="h-5 w-5" />
                  </div>
                  <p className="mt-3 text-neutral-200">
                    No results for{" "}
                    <span className="text-neutral-0">“{query}”</span>
                  </p>
                  <p className="mt-1 text-sm text-neutral-400">
                    Try a different spelling, or use the filter for events,
                    organizations, teams, or friends.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <Chip onClick={() => setFilter("all")}>All</Chip>
                    <Chip onClick={() => setFilter("event")}>Events</Chip>
                    <Chip onClick={() => setFilter("org")}>Organizations</Chip>
                    <Chip onClick={() => setFilter("team")}>Teams</Chip>
                    <Chip onClick={() => setFilter("friend")}>Friends</Chip>
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* end card */}
        </div>
      </div>
    </div>,
    document.body,
  );
}
