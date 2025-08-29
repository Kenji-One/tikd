"use client";

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

/* ------------------------------ types ------------------------------ */
type Filter = "all" | "event" | "artist" | "org";

type Item = {
  id: string;
  type: "event" | "artist" | "org";
  title: string;
  subtitle?: string;
  date?: string | null;
  image?: string | null;
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

/* ------------------------- utils: highlight ------------------------ */
function highlight(text: string, query: string) {
  if (!query) return text;
  const pattern = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rx = new RegExp(pattern, "ig");
  const parts: (string | JSX.Element)[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  while ((match = rx.exec(text))) {
    const start = match.index;
    const end = rx.lastIndex;
    if (start > lastIdx) parts.push(text.slice(lastIdx, start));
    parts.push(
      <mark
        key={`${start}-${end}`}
        className="rounded px-0.5 py-0 text-primary-300 bg-primary-900/40"
      >
        {text.slice(start, end)}
      </mark>
    );
    lastIdx = end;
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx));
  return parts;
}

/* ----------------------- small local components -------------------- */
function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-neutral-200">
      {children}
    </span>
  );
}

/* ------------------------------- modal ----------------------------- */
export default function SearchModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Results>({
    events: [],
    artists: [],
    orgs: [],
  });
  const [active, setActive] = useState<string | null>(null); // id of active item
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const flatResults: Item[] = useMemo(() => {
    const items: Item[] = [];
    if (filter === "event" || filter === "all") items.push(...results.events);
    if (filter === "artist" || filter === "all") items.push(...results.artists);
    if (filter === "org" || filter === "all") items.push(...results.orgs);
    return items;
  }, [results, filter]);

  /* --------------------- recent history in localStorage ------------- */
  const HISTORY_KEY = "tikd:recent-searches:v1";
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setRecent(JSON.parse(raw));
    } catch {}
  }, []);

  function pushRecent(q: string) {
    try {
      const next = [q, ...recent.filter((x) => x !== q)].slice(0, 6);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      setRecent(next);
    } catch {}
  }

  /* --------------------- open/close + focus trap -------------------- */
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

  // Global hotkeys to open: "/" or "Cmd/Ctrl+K"
  useEffect(() => {
    const onGlobal = (e: KeyboardEvent) => {
      const isCmdK = e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey);
      if (isCmdK || e.key === "/") {
        e.preventDefault();
        if (!open) (onClose as any)._open?.(); // no-op if not wired
      }
    };
    document.addEventListener("keydown", onGlobal);
    return () => document.removeEventListener("keydown", onGlobal);
  }, [open, onClose]);

  /* ---------------------------- fetch (debounced) ------------------- */
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
          `/api/search?q=${encodeURIComponent(q)}&type=${encodeURIComponent(filter)}&limit=6`,
          { signal: ac.signal, cache: "no-store" }
        );
        const data = await res.json();
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
    }, 250);
    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [query, filter, open]);

  /* --------------------------- render portal ------------------------ */
  if (!open || typeof window === "undefined") return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-neutral-950/80 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      ref={containerRef}
      aria-modal="true"
      role="dialog"
    >
      {/* top search bar */}
      <div className="mx-auto max-w-3xl px-4 pt-12">
        <div className="relative flex items-center gap-2 rounded-full border border-white/10 bg-neutral-900/90 backdrop-blur px-4 py-2.5 shadow-2xl">
          <Search
            className="h-5 w-5 shrink-0 text-neutral-300"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="flex-1 bg-transparent text-neutral-0 placeholder:text-neutral-400 outline-none"
            aria-label="Search"
          />
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen((v) => !v)}
              className="group inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-neutral-200 hover:bg-white/10"
              aria-haspopup="listbox"
              aria-expanded={dropdownOpen}
            >
              <span className="opacity-70">by</span>
              <span className="font-medium">{FILTER_LABEL[filter]}</span>
              <ChevronDown className="h-4 w-4 opacity-70 group-hover:opacity-100" />
            </button>
            {dropdownOpen && (
              <div
                role="listbox"
                className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-white/10 bg-neutral-900/95 shadow-xl"
              >
                {(["all", "event", "artist", "org"] as Filter[]).map((f) => (
                  <button
                    key={f}
                    role="option"
                    aria-selected={filter === f}
                    onClick={() => {
                      setFilter(f);
                      setDropdownOpen(false);
                    }}
                    className={clsx(
                      "flex w-full items-center gap-2 px-3.5 py-2.5 text-sm hover:bg-white/5",
                      filter === f && "bg-white/5"
                    )}
                  >
                    {f === "event" && (
                      <Calendar className="h-4 w-4 opacity-80" />
                    )}
                    {f === "artist" && <Mic2 className="h-4 w-4 opacity-80" />}
                    {f === "org" && (
                      <Building2 className="h-4 w-4 opacity-80" />
                    )}
                    {f === "all" && <Search className="h-4 w-4 opacity-80" />}
                    <span>{FILTER_LABEL[f]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/5"
            aria-label="Close search"
          >
            <X className="h-4 w-4 text-neutral-300" />
          </button>
        </div>
      </div>

      {/* results panel */}
      <div className="mx-auto max-w-3xl px-4">
        <div className="mt-3 overflow-hidden rounded-card border border-white/10 bg-neutral-900/90 backdrop-blur shadow-2xl">
          {/* state: empty query → recent */}
          {!query.trim() && (
            <div className="p-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-neutral-100">
                  Recent searches
                </h4>
                {recent.length > 0 && (
                  <button
                    className="text-xs text-neutral-400 hover:text-neutral-200"
                    onClick={() => {
                      localStorage.removeItem(HISTORY_KEY);
                      setRecent([]);
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {recent.length === 0 ? (
                  <p className="col-span-full text-sm text-neutral-400">
                    Try searching for{" "}
                    <span className="text-neutral-200">“Jazz”</span>,{" "}
                    <span className="text-neutral-200">“Tbilisi”</span>, or{" "}
                    <span className="text-neutral-200">“Coldplay”</span>.
                  </p>
                ) : (
                  recent.map((r) => (
                    <button
                      key={r}
                      onClick={() => setQuery(r)}
                      className="group flex items-center gap-2 rounded-lg border border-white/5 bg-white/2 px-3 py-2 text-left hover:bg-white/5"
                    >
                      <History className="h-4 w-4 text-neutral-400 group-hover:text-neutral-300" />
                      <span className="truncate text-sm text-neutral-200">
                        {r}
                      </span>
                    </button>
                  ))
                )}
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-neutral-400">
                <Badge>
                  <kbd className="font-mono">/</kbd> open
                </Badge>
                <Badge>
                  <kbd className="font-mono">⌘K</kbd> open
                </Badge>
                <Badge>
                  <kbd className="font-mono">↑↓</kbd> navigate
                </Badge>
                <Badge>
                  <kbd className="font-mono">Enter</kbd> go
                </Badge>
                <Badge>
                  <kbd className="font-mono">Esc</kbd> close
                </Badge>
              </div>
            </div>
          )}

          {/* state: loading */}
          {query.trim() && loading && (
            <div className="flex items-center gap-3 p-4 text-neutral-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching…
            </div>
          )}

          {/* state: results */}
          {query.trim() && !loading && flatResults.length > 0 && (
            <ul role="listbox" className="divide-y divide-white/5">
              {flatResults.map((item) => {
                const activeNow = active === item.id;
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
                        "flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/5 focus:bg-white/5",
                        activeNow && "bg-white/5"
                      )}
                    >
                      {/* avatar / image */}
                      <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/5">
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
                            {item.type === "event" && (
                              <Calendar className="h-4 w-4" />
                            )}
                            {item.type === "artist" && (
                              <Mic2 className="h-4 w-4" />
                            )}
                            {item.type === "org" && (
                              <Building2 className="h-4 w-4" />
                            )}
                          </div>
                        )}
                      </div>
                      {/* text */}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm text-neutral-0">
                          {highlight(item.title, query)}
                        </div>
                        <div className="truncate text-xs text-neutral-400">
                          {item.subtitle}
                          {item.type === "event" && item.date && (
                            <span className="ml-2 text-neutral-500">
                              • {new Date(item.date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        className={clsx(
                          "rounded-full px-2 py-1 text-[10px] uppercase tracking-wide",
                          item.type === "event" &&
                            "bg-primary-900/30 text-primary-300",
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

          {/* state: no results */}
          {query.trim() && !loading && flatResults.length === 0 && (
            <div className="p-6 text-center text-neutral-300">
              No results for <span className="text-neutral-0">“{query}”</span>.
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

/* -------------- helper to allow "/" / "Cmd+K" to open from header --------- */
// Attach this to the onClose you pass in: (onClose as any)._open = () => setOpen(true);
// (We wire it in Header below.)
