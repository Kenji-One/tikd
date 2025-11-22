// src/components/search/SearchModal.tsx
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
  Calendar,
  Mic2,
  Building2,
} from "lucide-react";

/* ────────────────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────────────────── */
type Filter = "all" | "event" | "artist" | "org";

type Item = {
  id: string;
  type: "event" | "artist" | "org";
  title: string;
  subtitle?: string; // for artists/orgs and also orgName for events
  orgName?: string | null;
  date?: string | null; // ISO string
  image?: string | null; // poster/avatar/logo
  href: string;
};

type Results = {
  events: Item[];
  artists: Item[];
  orgs: Item[];
};

const FILTER_LABEL: Record<Filter, string> = {
  all: "All",
  event: "Event",
  artist: "Artist",
  org: "Organization",
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
      </mark>
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
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5/50 px-3 py-1.5 text-xs text-neutral-200 hover:bg-white/10 active:scale-[0.98] transition"
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
  const cardRef = useRef<HTMLDivElement | null>(null); // ⬅️ modal card ref

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Results>({
    events: [],
    artists: [],
    orgs: [],
  });
  const [active, setActive] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const flatResults: Item[] = useMemo(() => {
    const items: Item[] = [];
    if (filter === "event" || filter === "all") items.push(...results.events);
    if (filter === "artist" || filter === "all") items.push(...results.artists);
    if (filter === "org" || filter === "all") items.push(...results.orgs);
    return items;
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
    try {
      const next = [q, ...recent.filter((x) => x !== q)].slice(0, 8);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      setRecent(next);
    } catch {
      /* ignore */
    }
  }

  /* key handling + focus */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const idx = flatResults.findIndex((i) => i.id === active);
        const nextIdx =
          e.key === "ArrowDown"
            ? Math.min(idx + 1, flatResults.length - 1)
            : Math.max(idx - 1, 0);
        setActive(flatResults[nextIdx]?.id ?? null);
      }
      if (e.key === "Enter") {
        const target = flatResults.find((i) => i.id === active);
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
      setResults({ events: [], artists: [], orgs: [] });
      setActive(null);
      return;
    }
    setLoading(true);
    const ac = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(q)}&type=${encodeURIComponent(
            filter
          )}&limit=8`,
          { signal: ac.signal, cache: "no-store" }
        );
        const data: { results?: Results } = await res.json();
        setResults(data.results || { events: [], artists: [], orgs: [] });
        const first =
          data.results?.events?.[0] ||
          data.results?.artists?.[0] ||
          data.results?.orgs?.[0];
        setActive(first?.id ?? null);
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

  if (!open || typeof window === "undefined") return null;

  /* ─────────────────────────── UI ─────────────────────────── */
  return createPortal(
    <div
      className={clsx(
        "fixed inset-0 z-[100] overflow-y-auto overscroll-contain",
        "bg-gradient-to-b from-neutral-950/80 to-neutral-950/60 backdrop-blur-md"
      )}
      // Close when clicking/tapping anywhere outside the card
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
      {/* safe-area padding + centering */}
      <div className="min-h-screen w-full grid place-items-start sm:place-items-center pt-[max(env(safe-area-inset-top),0.75rem)] pb-[max(env(safe-area-inset-bottom),1rem)]">
        <div className="w-full max-w-3xl px-3 sm:px-4">
          {/* Command bar + results (the “card”) */}
          <div
            ref={cardRef}
            className={clsx(
              "relative rounded-2xl sm:rounded-[1.5rem] border border-white/8 bg-neutral-900/70 backdrop-blur-xl",
              "shadow-[0_16px_40px_-12px_rgba(0,0,0,0.45),0_4px_16px_rgba(0,0,0,0.35)]"
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
                placeholder="Search events, artists, organizers…"
                aria-label="Search"
                inputMode="search"
                className={clsx(
                  "w-full peer flex-1 bg-transparent text-neutral-0 placeholder:text-neutral-400",
                  "outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 border-0",
                  "text-[14px] sm:text-base"
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
                    "hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700/40"
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
                      "shadow-[0_22px_50px_-20px_rgba(0,0,0,0.55),0_6px_16px_rgba(0,0,0,0.35)]"
                    )}
                    onPointerDown={(e) => e.stopPropagation()} // prevent outside-close when interacting the menu
                  >
                    {(["all", "event", "artist", "org"] as Filter[]).map(
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
                            "flex w-full items-center gap-2 px-3 sm:px-3.5 py-2.5 text-xs sm:text-sm hover:bg-white/5 focus:outline-none",
                            filter === f && "bg-white/7"
                          )}
                        >
                          {f === "event" && (
                            <Calendar className="h-4 w-4 opacity-80" />
                          )}
                          {f === "artist" && (
                            <Mic2 className="h-4 w-4 opacity-80" />
                          )}
                          {f === "org" && (
                            <Building2 className="h-4 w-4 opacity-80" />
                          )}
                          {f === "all" && (
                            <Search className="h-4 w-4 opacity-80" />
                          )}
                          <span>{FILTER_LABEL[f]}</span>
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>

              {/* Close */}
              <button
                type="button"
                onClick={onClose}
                className="ml-0.5 inline-flex h-6 w-6 sm:h-9 sm:w-9 items-center justify-center rounded-full hover:bg-white/7 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700/40"
                aria-label="Close search"
              >
                <X className="h-5 w-5 text-neutral-300" />
              </button>
            </div>

            {/* Divider */}
            <div className="h-px w-full bg-gradient-to-r from-white/5 via-white/10 to-white/5" />

            {/* Results panel */}
            <div className="max-h-[70vh] sm:max-h-[60vh] overflow-auto rounded-b-2xl sm:rounded-b-[1.5rem]">
              {/* Empty query → Recent */}
              {!query.trim() && (
                <div className="p-3.5 sm:p-5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[13px] sm:text-sm font-medium text-neutral-100">
                      Recent searches
                    </h4>
                    {recent.length > 0 && (
                      <button
                        className="text-xs text-neutral-400 hover:text-neutral-200 focus:outline-none"
                        onClick={() => {
                          localStorage.removeItem(HISTORY_KEY);
                          setRecent([]);
                        }}
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {recent.length === 0 ? (
                      <>
                        <Chip onClick={() => setQuery("Jazz")}>Jazz</Chip>
                        <Chip onClick={() => setQuery("New York")}>
                          New York
                        </Chip>
                        <Chip onClick={() => setQuery("Coldplay")}>
                          Coldplay
                        </Chip>
                        <Chip onClick={() => setQuery("Theatre")}>Theatre</Chip>
                      </>
                    ) : (
                      recent.map((r) => (
                        <Chip key={r} onClick={() => setQuery(r)}>
                          <History className="h-3.5 w-3.5 text-neutral-300" />
                          <span className="truncate">{r}</span>
                        </Chip>
                      ))
                    )}
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
                    const activeNow = active === item.id;

                    if (item.type === "event") {
                      return (
                        <li key={item.id}>
                          <button
                            role="option"
                            aria-selected={activeNow}
                            onMouseEnter={() => setActive(item.id)}
                            onClick={() => {
                              pushRecent(query);
                              onClose();
                              router.push(item.href);
                            }}
                            className={clsx(
                              "group grid w-full items-center text-left transition",
                              "grid-cols-[48px_1fr_auto] sm:grid-cols-[56px_1fr_auto]",
                              "gap-3 sm:gap-4 px-3.5 sm:px-4 py-3",
                              "hover:bg-white/5 focus:outline-none",
                              activeNow && "bg-white/6"
                            )}
                          >
                            <div
                              className={clsx(
                                "h-12 w-12 sm:h-14 sm:w-14 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5",
                                "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
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
                                  <Calendar className="h-5 w-5" />
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

                            <span className="hidden sm:inline-flex rounded-full bg-primary-900/30 px-2 py-1 text-[10px] uppercase tracking-wide text-primary-300">
                              Event
                            </span>
                          </button>
                        </li>
                      );
                    }

                    // Artists / Orgs
                    return (
                      <li key={item.id}>
                        <button
                          role="option"
                          aria-selected={activeNow}
                          onMouseEnter={() => setActive(item.id)}
                          onClick={() => {
                            pushRecent(query);
                            onClose();
                            router.push(item.href);
                          }}
                          className={clsx(
                            "group grid w-full items-center text-left transition",
                            "grid-cols-[40px_1fr_auto] sm:grid-cols-[44px_1fr_auto]",
                            "gap-3 sm:gap-3.5 px-3.5 sm:px-4 py-3",
                            "hover:bg-white/5 focus:outline-none",
                            activeNow && "bg-white/6"
                          )}
                        >
                          <div
                            className={clsx(
                              "h-10 w-10 sm:h-11 sm:w-11 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/5",
                              "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
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
                                {item.type === "artist" ? (
                                  <Mic2 className="h-4 w-4" />
                                ) : (
                                  <Building2 className="h-4 w-4" />
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

                          <span
                            className={clsx(
                              "hidden sm:inline-flex rounded-full px-2 py-1 text-[10px] uppercase tracking-wide",
                              item.type === "artist" &&
                                "bg-success-950 text-success-300",
                              item.type === "org" &&
                                "bg-warning-950 text-warning-300"
                            )}
                          >
                            {item.type}
                          </span>
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
                    artists, or organizers.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <Chip onClick={() => setFilter("event")}>Events only</Chip>
                    <Chip onClick={() => setFilter("artist")}>
                      Artists only
                    </Chip>
                    <Chip onClick={() => setFilter("org")}>
                      Organizers only
                    </Chip>
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* end card */}
        </div>
      </div>
    </div>,
    document.body
  );
}
