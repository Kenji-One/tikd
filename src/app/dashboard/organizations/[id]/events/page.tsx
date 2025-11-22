// src/app/dashboard/organizations/[id]/events/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { CalendarPlus, Calendar, FilePlus2 } from "lucide-react";

import { Tabs, type Tab } from "@/components/ui/Tabs";
import { EventCard } from "@/components/ui/EventCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";

/* ------------------------------ Types ------------------------------ */
type MyEvent = {
  _id: string;
  title: string;
  image?: string;
  date: string; // ISO date string
  location: string;
  category?: string;
  status?: "draft" | "published";
};

type OrgWithEvents = {
  _id: string;
  name: string;
  logo?: string;
  website?: string;
  events?: MyEvent[];
};

/* ---------------------------- Helpers ------------------------------ */
async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  return (await res.json()) as T;
}

function formatDateLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* --------------------------- Empty State --------------------------- */
function EmptyState({
  icon,
  title,
  sub,
  cta,
}: {
  icon: ReactNode;
  title: string;
  sub?: string;
  cta?: ReactNode;
}) {
  return (
    <div className="mx-auto mt-8 max-w-md rounded-2xl border border-white/12 bg-neutral-950/80 px-8 py-9 text-center shadow-[0_18px_45px_rgba(0,0,0,0.7)]">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-primary-950 via-primary-900 to-primary-700 ring-1 ring-primary-700/60 shadow-[0_0_0_1px_rgba(255,255,255,0.1)]">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-neutral-0">{title}</h3>
      {sub ? <p className="mt-2 text-sm text-neutral-300">{sub}</p> : null}
      {cta ? <div className="mt-5">{cta}</div> : null}
    </div>
  );
}

/* --------------------------- Sort control -------------------------- */
type SortKey = "newest" | "oldest" | "az" | "za";
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "oldest", label: "Oldest" },
  { key: "az", label: "A–Z" },
  { key: "za", label: "Z–A" },
];

function SortBy({
  value,
  onChange,
}: {
  value: SortKey;
  onChange: (v: SortKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const currentIndex = useMemo(
    () =>
      Math.max(
        0,
        SORT_OPTIONS.findIndex((o) => o.key === value)
      ),
    [value]
  );
  const [highlight, setHighlight] = useState(currentIndex);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const dir = e.key === "ArrowDown" ? 1 : -1;
        const next =
          (highlight + dir + SORT_OPTIONS.length) % SORT_OPTIONS.length;
        setHighlight(next);
        listRef.current
          ?.querySelector<HTMLElement>(`[data-index="${next}"]`)
          ?.scrollIntoView({ block: "nearest" });
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const opt = SORT_OPTIONS[highlight];
        if (opt) {
          onChange(opt.key);
          setOpen(false);
        }
      }
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, highlight, onChange]);

  const label = SORT_OPTIONS.find((o) => o.key === value)?.label ?? "Newest";

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => {
          setHighlight(currentIndex);
          setOpen((v) => !v);
        }}
        className={clsx(
          "inline-flex items-center gap-2 rounded-full border border-white/10",
          "bg-neutral-950/70 px-4 py-2 text-sm text-neutral-300",
          "hover:text-neutral-0 focus:outline-none focus:ring-1 focus:ring-primary-600/40"
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>Sort by: {label}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          className={clsx(
            "transition-transform",
            open ? "rotate-180 text-neutral-200" : "text-neutral-400"
          )}
          aria-hidden="true"
        >
          <path
            d="M11.333 6.113a.67.67 0 0 0-.47-.194c-.176 0-.345.07-.47.194L8 8.473 5.64 6.113a.665.665 0 0 0-.94 0 .66.66 0 0 0 0 .947l2.827 2.827a.666.666 0 0 0 .946 0l2.86-2.827a.66.66 0 0 0 0-.947Z"
            fill="currentColor"
          />
        </svg>
      </button>

      {open && (
        <div
          ref={listRef}
          role="listbox"
          aria-activedescendant={`sort-opt-${highlight}`}
          className={clsx(
            "absolute right-0 z-50 mt-2 w-48 overflow-auto rounded-2xl",
            "border border-white/10 bg-neutral-950/95 shadow-xl backdrop-blur",
            "focus:outline-none"
          )}
        >
          {SORT_OPTIONS.map((opt, i) => {
            const selected = opt.key === value;
            const isActive = i === highlight;
            return (
              <div
                key={opt.key}
                id={`sort-opt-${i}`}
                data-index={i}
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => {
                  onChange(opt.key);
                  setOpen(false);
                }}
                className={clsx(
                  "cursor-pointer px-3 py-2 text-sm",
                  selected ? "text-neutral-0" : "text-neutral-200",
                  isActive ? "bg-primary-700/25" : "hover:bg-white/5"
                )}
              >
                {`Sort by: ${opt.label}`}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------- Page ------------------------------ */
export default function OrgEventsPage() {
  const params = useParams() as { id?: string };
  const orgId = params?.id ?? "";

  /* --- data query: this org + its events --- */
  const { data: org, isLoading: eventsLoading } = useQuery<OrgWithEvents>({
    queryKey: ["orgEvents", orgId],
    queryFn: () =>
      fetchJSON<OrgWithEvents>(
        `/api/organizations/${orgId}?include=events&status=all`
      ),
    enabled: !!orgId,
  });

  const events = org?.events ?? [];

  /* where the event builder lives for this org */
  const createHref = orgId
    ? `/dashboard/organizations/${orgId}/events/create`
    : "/dashboard/events/create";

  /* --- tabs + sort state --- */
  const [activeId, setActiveId] = useState<string>("upcoming");
  const [sort, setSort] = useState<SortKey>("newest");

  /* --- computed lists for this org --- */
  const now = useMemo(() => Date.now(), []);
  const upcoming = events.filter(
    (e) => new Date(e.date).getTime() >= now && e.status !== "draft"
  );
  const past = events.filter(
    (e) => new Date(e.date).getTime() < now && e.status !== "draft"
  );
  const drafts = events.filter((e) => e.status === "draft");

  function sortList(list: MyEvent[]) {
    const arr = [...list];
    switch (sort) {
      case "newest":
        return arr.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
      case "oldest":
        return arr.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
      case "az":
        return arr.sort((a, b) => a.title.localeCompare(b.title));
      case "za":
        return arr.sort((a, b) => b.title.localeCompare(a.title));
      default:
        return arr;
    }
  }

  function renderEventGrid(list: MyEvent[]) {
    const data = sortList(list);
    const showSort = eventsLoading || data.length > 0;

    return (
      <>
        {showSort && (
          <div className="mb-4 flex items-center justify-end">
            <SortBy value={sort} onChange={setSort} />
          </div>
        )}

        {eventsLoading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 xl:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-60 rounded-2xl" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <EmptyState
            icon={<Calendar className="h-5 w-5 text-primary-200" />}
            title="No events here yet"
            sub="Create an event and it will appear in this list."
            cta={
              <Link href={createHref}>
                <Button variant="primary">
                  <CalendarPlus className="mr-2 h-4 w-4" />
                  Create Event
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 xl:grid-cols-4">
            {data.map((ev) => (
              <div key={ev._id} className="flex flex-col">
                <EventCard
                  id={ev._id}
                  title={ev.title}
                  img={ev.image ?? "/placeholder.jpg"}
                  dateLabel={formatDateLabel(ev.date)}
                  venue={ev.location}
                  category={ev.category ?? ""}
                />
              </div>
            ))}
          </div>
        )}
      </>
    );
  }

  /* ---------------- tabs config (org-scoped) ---------------- */
  const tabs: Tab[] = [
    {
      id: "upcoming",
      label: "Upcoming",
      content: renderEventGrid(upcoming),
    },
    {
      id: "past",
      label: "Past Events",
      content: renderEventGrid(past),
    },
    {
      id: "drafts",
      label: "Drafts",
      content: drafts.length ? (
        renderEventGrid(drafts)
      ) : (
        <EmptyState
          icon={<FilePlus2 className="h-5 w-5 text-primary-200" />}
          title="No drafts yet"
          sub="Start creating an event and save it as a draft."
          cta={
            <Link href={createHref}>
              <Button variant="primary">
                <CalendarPlus className="mr-2 h-4 w-4" />
                Create Event
              </Button>
            </Link>
          }
        />
      ),
    },
  ];

  return (
    <main className="relative overflow-hidden bg-neutral-950 text-neutral-0">
      <section className="pb-20 pt-6">
        {/* Header row: org name + clean CTA (no electric button) */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-semibold text-neutral-0">
              {org?.name ?? "Organization events"}
            </h1>
            <p className="mt-1 text-xs text-neutral-400">
              Manage upcoming, past and draft events for this organization.
            </p>
          </div>
        </div>

        <Tabs tabs={tabs} activeId={activeId} onChange={setActiveId} />
      </section>
    </main>
  );
}
