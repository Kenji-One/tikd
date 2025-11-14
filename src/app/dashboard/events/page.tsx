/* ------------------------------------------------------------------ */
/*  src/app/dashboard/events/page.tsx – Tikd Dashboard / Events       */
/*  - Tabs: Upcoming | Past | Pinned | Drafts | My Organizations      */
/*  - <SortBy /> appears inside event tabs, above their grids          */
/*  - Uses EventCard + refined OrgCard                                 */
/* ------------------------------------------------------------------ */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { CalendarPlus, Calendar, Pin, FilePlus2, Plus } from "lucide-react";

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
  pinned?: boolean;
  status?: "draft" | "published";
};

type Org = { _id: string; name: string; logo?: string; website?: string };

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

function domainFromUrl(url?: string) {
  if (!url) return "";
  try {
    const clean = url.startsWith("http") ? url : `https://${url}`;
    const u = new URL(clean);
    return u.host.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\/(www\.)?/, "");
  }
}

/* --------------------------- Empty State --------------------------- */
function EmptyState({
  icon,
  title,
  sub,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  sub?: string;
  cta?: React.ReactNode;
}) {
  return (
    <div className="mx-auto mt-8 max-w-md rounded-2xl border border-white/10 bg-neutral-950/70 p-10 text-center">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-primary-900/50 ring-1 ring-primary-700/40">
        {icon}
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {sub ? <p className="mt-2 text-sm text-neutral-300">{sub}</p> : null}
      {cta ? <div className="mt-5">{cta}</div> : null}
    </div>
  );
}

/* --------------------------- Org Card (refined) -------------------- */
function OrgCard({
  org,
}: {
  org: { _id: string; name: string; logo?: string; website?: string };
}) {
  const site = domainFromUrl(org.website);

  return (
    <Link
      href={`/org/${org._id}`}
      className={clsx(
        "group relative flex items-center gap-5 rounded-2xl",
        "border border-white/10 bg-neutral-948 p-5",
        "ring-1 ring-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.35)]",
        "transition-all duration-200 hover:-translate-y-0.5",
        "hover:border-primary-700/40 hover:ring-primary-700/25"
      )}
    >
      {/* Logo tile */}
      <div
        className={clsx(
          "relative h-16 w-16 shrink-0 overflow-hidden rounded-md",
          "bg-neutral-900 ring-1 ring-inset ring-white/10",
          "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]",
          "transition-colors duration-200 group-hover:ring-primary-700/40"
        )}
        aria-hidden="true"
      >
        {org.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={org.logo} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-[conic-gradient(from_220deg_at_50%_50%,#6d28d9,#3b82f6,#111827)] text-white">
            <span className="text-lg font-semibold">
              {org.name?.[0]?.toUpperCase() ?? "O"}
            </span>
          </div>
        )}
      </div>

      {/* Text block */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold leading-tight">
          {org.name}
        </p>
        <p className="mt-1 truncate text-sm text-neutral-300/90">
          {site || "Public profile"}
        </p>
      </div>

      {/* Right pill + chevron */}
      <div className="ml-auto flex items-center gap-2">
        <span
          className={clsx(
            "rounded-full px-3 py-1.5 text-xs",
            "text-neutral-200 ring-1 ring-inset ring-white/10",
            "bg-white/5 transition-colors duration-200",
            "group-hover:bg-primary-700/20 group-hover:text-neutral-0"
          )}
        >
          View
        </span>
        <svg
          className="h-4 w-4 text-neutral-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-neutral-0"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M7.5 15l5-5-5-5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Focus ring for a11y */}
      <span className="pointer-events-none absolute inset-0 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600/50" />
    </Link>
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
export default function EventsDashboardPage() {
  const { data: session } = useSession();

  /* --- data queries --- */
  const { data: allEvents, isLoading: eventsLoading } = useQuery<MyEvent[]>({
    queryKey: ["myEvents", "dashboard"],
    queryFn: () => fetchJSON<MyEvent[]>("/api/events?owned=1"),
    enabled: !!session,
  });

  const { data: orgs, isLoading: orgsLoading } = useQuery<Org[]>({
    queryKey: ["orgs", "dashboard"],
    queryFn: () => fetchJSON<Org[]>("/api/organizations"),
    enabled: !!session,
  });

  const events = allEvents ?? [];
  const orgsList = orgs ?? [];

  /* --- tabs state --- */
  const [activeId, setActiveId] = useState<string>("upcoming");
  const [sort, setSort] = useState<SortKey>("newest");

  /* --- computed lists --- */
  const now = useMemo(() => Date.now(), []);
  const upcoming = events.filter(
    (e) => new Date(e.date).getTime() >= now && e.status !== "draft"
  );
  const past = events.filter(
    (e) => new Date(e.date).getTime() < now && e.status !== "draft"
  );
  const pinned = events.filter((e) => (e as any).pinned === true);
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
            icon={<Calendar className="h-5 w-5 text-primary-300" />}
            title="No events here yet"
            sub="Create an event and it will appear in this list."
            cta={
              <Link href="/dashboard/event/new">
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

  /* ---------------- tabs config ---------------- */
  const tabs: Tab[] = [
    {
      id: "upcoming",
      label: "Upcoming events",
      content: renderEventGrid(upcoming),
    },
    {
      id: "orgs",
      label: "My organizations",
      content: (
        <>
          {orgsLoading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-2xl" />
              ))}
            </div>
          ) : orgsList.length ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {orgsList.map((o) => (
                <OrgCard key={o._id} org={o} />
              ))}
              <Link
                href="/dashboard/organizations/new"
                className="group flex items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 bg-neutral-950/50 p-6 text-neutral-300 transition-colors hover:border-primary-600/50 hover:text-neutral-0"
              >
                <Plus className="h-5 w-5" />
                <span>Create a new organization</span>
              </Link>
            </div>
          ) : (
            <EmptyState
              icon={<Plus className="h-5 w-5 text-primary-300" />}
              title="No organizations yet"
              sub="Create an organization to host events and manage your brand."
              cta={
                <Link href="/dashboard/organizations/new">
                  <Button variant="primary">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Organization
                  </Button>
                </Link>
              }
            />
          )}
        </>
      ),
    },
    {
      id: "past",
      label: "Past events",
      content: renderEventGrid(past),
    },
    {
      id: "pinned",
      label: "Pinned events",
      content: pinned.length ? (
        renderEventGrid(pinned)
      ) : (
        <EmptyState
          icon={<Pin className="h-5 w-5 text-primary-300" />}
          title="No pinned events"
          sub="Pin an event to keep it handy."
        />
      ),
    },
    {
      id: "drafts",
      label: "Drafts",
      content: drafts.length ? (
        renderEventGrid(drafts)
      ) : (
        <EmptyState
          icon={<FilePlus2 className="h-5 w-5 text-primary-300" />}
          title="No drafts yet"
          sub="Start creating an event and save it as a draft."
          cta={
            <Link href="/dashboard/event/new">
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
        <Tabs tabs={tabs} activeId={activeId} onChange={setActiveId} />
      </section>
    </main>
  );
}
