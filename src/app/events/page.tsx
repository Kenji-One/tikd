"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import clsx from "clsx";

import HeroSection from "@/components/sections/Landing/HeroSection";
import FilterBar, {
  type FilterDateValue,
  type FilterSortValue,
} from "@/components/ui/FilterBar";
import {
  EventCard,
  EVENT_CARD_DEFAULT_POSTER,
} from "@/components/ui/EventCard";

/* -------------------------------------------------------------------------- */
/*  Helpers for API → UI adapter                                              */
/* -------------------------------------------------------------------------- */
type BackendEvent = {
  _id: string;
  title: string;
  date: string; // ISO from Mongo
  endDate?: string | null;
  location: string;
  image?: string;
  categories?: string[];
};

type EventsPageResponse =
  | BackendEvent[]
  | {
      items: BackendEvent[];
      nextCursor: string | null;
    };

type UiEvent = {
  id: string;
  title: string;
  dateLabel: string;
  venue: string;
  img: string;
  category: string;

  // keep raw fields for sorting/filtering if needed later
  dateIso: string;
  endDateIso?: string | null;
  location: string;
};

const fmtDateLabel = (iso: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));

const primaryCategoryOf = (cats: unknown): string => {
  if (!Array.isArray(cats)) return "Uncategorized";
  const first = cats.find((c) => typeof c === "string" && c.trim().length > 0);
  return typeof first === "string" ? first.trim() : "Uncategorized";
};

const posterOf = (img: unknown): string => {
  if (typeof img !== "string") return EVENT_CARD_DEFAULT_POSTER;
  const s = img.trim();
  return s ? s : EVENT_CARD_DEFAULT_POSTER;
};

const toUiEvent = (e: BackendEvent): UiEvent => ({
  id: e._id,
  title: e.title,
  dateLabel: fmtDateLabel(e.date),
  venue: e.location,
  img: posterOf(e.image),
  category: primaryCategoryOf(e.categories),

  dateIso: e.date,
  endDateIso: e.endDate ?? null,
  location: e.location,
});

/* -------------------------------------------------------------------------- */
/*  Tiny debounce hook (for location typing)                                   */
/* -------------------------------------------------------------------------- */
function useDebouncedValue<T>(value: T, ms: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);

  return debounced;
}

/* -------------------------------------------------------------------------- */
/*  Infinite scroll hook (IntersectionObserver)                                */
/* -------------------------------------------------------------------------- */
function useInView<T extends HTMLElement>(opts?: IntersectionObserverInit) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        setInView(entries.some((e) => e.isIntersecting));
      },
      { root: null, rootMargin: "800px 0px", threshold: 0.01, ...opts },
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [opts]);

  return { ref, inView };
}

/* -------------------------------------------------------------------------- */
/*  Skeleton (matches EventCard sizing better)                                 */
/* -------------------------------------------------------------------------- */
function EventCardSkeleton() {
  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-[var(--radius-card)]",
        "border border-white/10 bg-neutral-950/35",
        "shadow-[0_18px_48px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)]",
        "h-[320px] w-full",
      )}
      aria-hidden="true"
    >
      <div className="absolute inset-0">
        <div className="h-[62%] w-full bg-white/5" />
        <div className="h-[38%] w-full bg-white/2" />
      </div>

      <div className="absolute inset-0">
        <div
          className={clsx(
            "absolute -inset-x-24 inset-y-0",
            "bg-gradient-to-r from-transparent via-white/10 to-transparent",
            "animate-[tikdSkimmer_1.15s_ease-in-out_infinite]",
          )}
          style={{ transform: "translateX(-40%)" }}
        />
      </div>

      <div className="absolute inset-x-4 bottom-4 space-y-2">
        <div className="h-4 w-3/4 rounded-md bg-white/8" />
        <div className="h-3.5 w-1/2 rounded-md bg-white/6" />
        <div className="h-3.5 w-2/3 rounded-md bg-white/6" />
      </div>

      <style jsx>{`
        @keyframes tikdSkimmer {
          0% {
            transform: translateX(-60%);
            opacity: 0.55;
          }
          100% {
            transform: translateX(60%);
            opacity: 0.75;
          }
        }
      `}</style>
    </div>
  );
}

export default function EventsPage() {
  const LIMIT = 30;

  // Filters (Trending & Largest exist but are intentionally no-op for now)
  const [sort, setSort] = useState<FilterSortValue>("Trending");
  const [date, setDate] = useState<FilterDateValue>("This Week");

  // ✅ IMPORTANT: start with "Anywhere" (no filter)
  const [loc, setLoc] = useState<string>("");

  const debouncedLoc = useDebouncedValue(loc, 350);

  const sortParam = useMemo(() => {
    // Only "Newest" is implemented
    if (sort === "Newest") return "newest";
    return undefined;
  }, [sort]);

  const whenParam = useMemo(() => {
    switch (date) {
      case "Today":
        return "today";
      case "This Week":
        return "week";
      case "This Month":
        return "month";
      case "Right Now":
        return "now";
      default:
        return undefined;
    }
  }, [date]);

  const locationParam = useMemo(() => {
    const v = (debouncedLoc || "").trim();
    if (!v) return undefined;
    if (v.toLowerCase() === "near me") return undefined; // no backend yet
    if (v.toLowerCase() === "anywhere") return undefined;
    return v;
  }, [debouncedLoc]);

  const eventsQuery = useInfiniteQuery({
    queryKey: [
      "events-public-infinite",
      LIMIT,
      sortParam,
      whenParam,
      locationParam,
    ],
    initialPageParam: null as string | null,
    queryFn: async ({
      pageParam,
    }): Promise<{ items: UiEvent[]; nextCursor: string | null }> => {
      const params = new URLSearchParams();
      params.set("limit", String(LIMIT));
      if (pageParam) params.set("cursor", pageParam);

      if (sortParam) params.set("sort", sortParam);
      if (whenParam) params.set("when", whenParam);
      if (locationParam) params.set("location", locationParam);

      const res = await fetch(`/api/events?${params.toString()}`, {
        method: "GET",
      });

      if (!res.ok) throw new Error(await res.text());

      const json = (await res.json()) as EventsPageResponse;

      if (Array.isArray(json)) {
        const items = json.map(toUiEvent);
        return { items, nextCursor: null };
      }

      return {
        items: (json.items ?? []).map(toUiEvent),
        nextCursor: json.nextCursor ?? null,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 60_000,
  });

  const allEvents = useMemo(
    () => eventsQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [eventsQuery.data],
  );

  const { ref: sentinelRef, inView } = useInView<HTMLDivElement>();

  useEffect(() => {
    if (!inView) return;
    if (eventsQuery.isFetchingNextPage) return;
    if (!eventsQuery.hasNextPage) return;
    eventsQuery.fetchNextPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  return (
    <>
      <HeroSection />

      <FilterBar
        sort={sort}
        date={date}
        location={loc}
        onSort={setSort}
        onDate={setDate}
        onLocation={setLoc}
      />

      <main className="w-full py-12">
        <section className="px-4 sm:px-6 lg:px-[120px]">
          <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {allEvents.map((ev) => (
              <div key={ev.id} className="min-w-0">
                <EventCard {...ev} className="h-full w-full" />
              </div>
            ))}

            {eventsQuery.isLoading &&
              Array.from({ length: 12 }).map((_, i) => (
                <div key={`sk-${i}`} className="min-w-0">
                  <EventCardSkeleton />
                </div>
              ))}

            {eventsQuery.isFetchingNextPage &&
              Array.from({ length: 6 }).map((_, i) => (
                <div key={`sk-next-${i}`} className="min-w-0">
                  <EventCardSkeleton />
                </div>
              ))}
          </div>

          <div ref={sentinelRef} className="h-10 w-full" />

          <div className="mt-8 flex items-center justify-center">
            {eventsQuery.isError ? (
              <div className="rounded-full border border-white/10 bg-neutral-950/55 px-4 py-2 text-sm text-white/70 backdrop-blur">
                Failed to load events.{" "}
                <button
                  type="button"
                  className="ml-1 text-white/90 underline decoration-white/20 underline-offset-4 hover:decoration-white/40"
                  onClick={() => eventsQuery.refetch()}
                >
                  Retry
                </button>
              </div>
            ) : eventsQuery.isLoading ? null : eventsQuery.hasNextPage ? (
              <div className="rounded-full border border-white/10 bg-neutral-950/45 px-4 py-2 text-sm text-white/55 backdrop-blur">
                Scroll to load more
              </div>
            ) : allEvents.length ? (
              <div className="rounded-full border border-white/10 bg-neutral-950/45 px-4 py-2 text-sm text-white/55 backdrop-blur">
                You’ve reached the end.
              </div>
            ) : (
              <div className="rounded-full border border-white/10 bg-neutral-950/45 px-4 py-2 text-sm text-white/55 backdrop-blur">
                No upcoming events.
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
