/* ------------------------------------------------------------------ */
/*  src/app/dashboard/friends/FriendsClient.tsx                       */
/* ------------------------------------------------------------------ */
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import {
  Users,
  Search,
  LayoutGrid,
  List,
  MoreVertical,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

/* ------------------------------ Types ------------------------------ */
type Friend = {
  id: string;
  name: string;
  role: string;
  company: string;
  companyHref?: string;
  phone: string;
  email: string;
  avatarUrl?: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function initialsFromName(name: string) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return "FR";

  const a = parts[0]?.[0] ?? "";
  const b = (parts.length > 1 ? parts[1]?.[0] : parts[0]?.[1]) ?? "";
  const two = `${a}${b}`.toUpperCase();
  return two || "FR";
}

/* -------------------------- Friends (dummy) ------------------------- */
const DEMO_FRIENDS: Friend[] = [
  {
    id: "f-1",
    name: "Angela Moss",
    role: "Marketing Manager at",
    company: "Highspeed Studios",
    companyHref: "#",
    phone: "+12 345 6789 0",
    email: "angelamoss@mail.com",
    avatarUrl:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=256&q=80",
  },
  {
    id: "f-2",
    name: "Ahmad Zayn",
    role: "Photographer at",
    company: "Audio Video Teams",
    companyHref: "#",
    phone: "+12 345 6789 0",
    email: "ahmadzayn@mail.com",
    avatarUrl:
      "https://images.unsplash.com/photo-1525134479668-1bee5c7c6845?auto=format&fit=crop&w=256&q=80",
  },
  {
    id: "f-3",
    name: "Brian Connor",
    role: "Designer at",
    company: "Crimzon Guards Studios",
    companyHref: "#",
    phone: "+12 345 6789 0",
    email: "brianconnor@mail.com",
  },
  {
    id: "f-4",
    name: "Courtney Hawkins",
    role: "Programmer at",
    company: "Highspeed Studios",
    companyHref: "#",
    phone: "+12 345 6789 0",
    email: "courtneyhawk@mail.com",
    avatarUrl:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80",
  },
  {
    id: "f-5",
    name: "Chyntia Smilee",
    role: "Marketing Manager at",
    company: "Highspeed Studios",
    companyHref: "#",
    phone: "+12 345 6789 0",
    email: "chyntia@mail.com",
    avatarUrl:
      "https://images.unsplash.com/photo-1524502397800-2eeaad7c3fe5?auto=format&fit=crop&w=256&q=80",
  },
  {
    id: "f-6",
    name: "David Here",
    role: "Marketing Manager at",
    company: "Highspeed Studios",
    companyHref: "#",
    phone: "+12 345 6789 0",
    email: "davidhere@mail.com",
  },
  {
    id: "f-7",
    name: "Dennise Lee",
    role: "Marketing Manager at",
    company: "Highspeed Studios",
    companyHref: "#",
    phone: "+12 345 6789 0",
    email: "dennislee@mail.com",
    avatarUrl:
      "https://images.unsplash.com/photo-1524502397800-2eeaad7c3fe5?auto=format&fit=crop&w=256&q=80",
  },
  {
    id: "f-8",
    name: "Erbatov Axie",
    role: "Marketing Manager at",
    company: "Highspeed Studios",
    companyHref: "#",
    phone: "+12 345 6789 0",
    email: "erbatovaxie@mail.com",
    avatarUrl:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=256&q=80",
  },
  {
    id: "f-9",
    name: "Evan Khan",
    role: "Marketing Manager at",
    company: "Highspeed Studios",
    companyHref: "#",
    phone: "+12 345 6789 0",
    email: "evankhan@mail.com",
    avatarUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80",
  },
  {
    id: "f-10",
    name: "Fanny Humble",
    role: "Marketing Manager at",
    company: "Highspeed Studios",
    companyHref: "#",
    phone: "+12 345 6789 0",
    email: "fannyhumble@mail.com",
    avatarUrl:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80",
  },
  {
    id: "f-11",
    name: "Franklin Jr.",
    role: "Marketing Manager at",
    company: "Highspeed Studios",
    companyHref: "#",
    phone: "+12 345 6789 0",
    email: "franklinjr@mail.com",
  },
  {
    id: "f-12",
    name: "Gandalf Hoos",
    role: "Marketing Manager at",
    company: "Highspeed Studios",
    companyHref: "#",
    phone: "+12 345 6789 0",
    email: "gandalfhoos@mail.com",
    avatarUrl:
      "https://images.unsplash.com/photo-1525134479668-1bee5c7c6845?auto=format&fit=crop&w=256&q=80",
  },
  {
    id: "f-13",
    name: "Gabriella",
    role: "Marketing Manager at",
    company: "Highspeed Studios",
    companyHref: "#",
    phone: "+12 345 6789 0",
    email: "gabriella@mail.com",
    avatarUrl:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80",
  },
  {
    id: "f-14",
    name: "Hanny Shella",
    role: "Marketing Manager at",
    company: "Highspeed Studios",
    companyHref: "#",
    phone: "+12 345 6789 0",
    email: "hannyshella@mail.com",
    avatarUrl:
      "https://images.unsplash.com/photo-1524502397800-2eeaad7c3fe5?auto=format&fit=crop&w=256&q=80",
  },
  {
    id: "f-15",
    name: "Ivankov",
    role: "Marketing Manager at",
    company: "Highspeed Studios",
    companyHref: "#",
    phone: "+12 345 6789 0",
    email: "ivankov123@mail.com",
    avatarUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80",
  },
  // Pad to 46 like reference footer
  ...Array.from({ length: 31 }).map((_, i) => ({
    id: `f-x-${i + 16}`,
    name: `Friend ${i + 16}`,
    role: "Marketing Manager at",
    company: "Highspeed Studios",
    companyHref: "#",
    phone: "+12 345 6789 0",
    email: `friend${i + 16}@mail.com`,
  })),
];

/* ------------------------ Friends UI pieces ------------------------- */
function FriendsCard({
  friend,
  dense = false,
}: {
  friend: Friend;
  dense?: boolean;
}) {
  const badge = initialsFromName(friend.name);

  return (
    <div
      className={clsx(
        "group relative overflow-hidden rounded-[12px] border border-white/10 hover:border-primary-500",
        "bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))]",
        "transition-transform duration-200 "
      )}
    >
      <button
        type="button"
        aria-label="More actions"
        className={clsx(
          "absolute right-3 top-3 z-10",
          "inline-flex h-8 w-8 items-center justify-center rounded-full",
          "bg-white/5 text-neutral-200 hover:bg-white/10",
          "border border-white/10",
          "opacity-90 hover:opacity-100",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60"
        )}
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      <div className={clsx("p-4", dense ? "pb-3" : "pb-4")}>
        <div className="mx-auto flex w-full flex-col items-center">
          <div className="relative">
            <div
              className={clsx(
                "relative overflow-hidden",
                "h-[68px] w-[68px] rounded-lg",
                "bg-white/5 ring-1 ring-white/10"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {friend.avatarUrl ? (
                <img
                  src={friend.avatarUrl}
                  alt={friend.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-neutral-200">
                  {badge}
                </div>
              )}
            </div>

            <div
              className={clsx(
                "absolute -right-2 -bottom-2",
                "h-8 w-8 rounded-[10px]",
                "border border-white/10",
                "bg-primary-500/90",
                "shadow-[0_12px_30px_rgba(154,70,255,0.25)]",
                "flex items-center justify-center"
              )}
            >
              <span className="text-[12px] font-extrabold tracking-[-0.2px] text-neutral-0">
                {badge}
              </span>
            </div>
          </div>

          <div className="mt-3 text-center">
            <div className="font-semibold tracking-[-0.25px] text-neutral-50">
              {friend.name}
            </div>
            <div className="mt-1 text-[12px] text-neutral-400">
              {friend.role}{" "}
              <Link
                href={friend.companyHref || "#"}
                className="font-semibold text-primary-300 hover:text-primary-200"
              >
                {friend.company}
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-4 h-px w-full bg-white/10" />

        <div className="mt-4 space-y-2.5">
          <div className="flex items-center gap-3">
            <span
              className={clsx(
                "inline-flex h-8 w-8 items-center justify-center rounded-md",
                "bg-primary-500/15 text-primary-300",
                "ring-1 ring-primary-500/20"
              )}
            >
              <Phone className="h-4 w-4" />
            </span>
            <span className="text-[12px] font-medium text-neutral-100">
              {friend.phone}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={clsx(
                "inline-flex h-8 w-8 items-center justify-center rounded-md",
                "bg-primary-500/15 text-primary-300",
                "ring-1 ring-primary-500/20"
              )}
            >
              <Mail className="h-4 w-4" />
            </span>
            <span className="text-[12px] font-medium text-neutral-100">
              {friend.email}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FriendsRow({ friend }: { friend: Friend }) {
  const badge = initialsFromName(friend.name);
  return (
    <div
      className={clsx(
        "flex items-center justify-between gap-4",
        "rounded-[12px] border border-white/10 bg-white/5 px-4 py-3",
        "hover:bg-white/7 transition-colors"
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative">
          <div className="h-10 w-10 overflow-hidden rounded-[10px] bg-white/5 ring-1 ring-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {friend.avatarUrl ? (
              <img
                src={friend.avatarUrl}
                alt={friend.name}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[12px] font-bold text-neutral-200">
                {badge}
              </div>
            )}
          </div>
          <div className="absolute -right-2 -bottom-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary-500/90 text-[10px] font-extrabold text-neutral-0 ring-1 ring-white/10">
            {badge}
          </div>
        </div>

        <div className="min-w-0 space-y-0.5">
          <div className="truncate text-[13px] font-semibold text-neutral-50">
            {friend.name}
          </div>
          <div className="truncate text-[12px] text-neutral-400">
            {friend.role}{" "}
            <span className="font-semibold text-primary-300">
              {friend.company}
            </span>
          </div>
        </div>
      </div>

      <div className="hidden items-center gap-6 md:flex">
        <div className="flex items-center gap-2 text-[12px] text-neutral-200">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary-500/15 text-primary-300 ring-1 ring-primary-500/20">
            <Phone className="h-4 w-4" />
          </span>
          {friend.phone}
        </div>
        <div className="flex items-center gap-2 text-[12px] text-neutral-200">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary-500/15 text-primary-300 ring-1 ring-primary-500/20">
            <Mail className="h-4 w-4" />
          </span>
          {friend.email}
        </div>
      </div>

      <button
        type="button"
        aria-label="More actions"
        className={clsx(
          "inline-flex h-9 w-9 items-center justify-center rounded-full",
          "bg-white/5 text-neutral-200 hover:bg-white/10",
          "border border-white/10",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60"
        )}
      >
        <MoreVertical className="h-4 w-4" />
      </button>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  const visible = useMemo(() => {
    const max = Math.min(totalPages, 4);
    return Array.from({ length: max }).map((_, i) => i + 1);
  }, [totalPages]);

  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-1">
      <button
        type="button"
        onClick={() => onPage(clamp(page - 1, 1, totalPages))}
        disabled={page <= 1}
        className={clsx(
          "inline-flex h-8 w-8 items-center justify-center rounded-md",
          "border border-white/10 bg-white/5 text-neutral-100",
          "hover:border-primary-500 disabled:opacity-40 disabled:hover:bg-white/5",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60"
        )}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {visible.map((p) => {
        const active = p === page;
        return (
          <button
            key={p}
            type="button"
            onClick={() => onPage(p)}
            className={clsx(
              "inline-flex h-8 w-8 items-center justify-center rounded-md text-[12px] font-semibold",
              "transition-colors",
              active
                ? "bg-primary-500 text-neutral-0"
                : "bg-white/0 text-neutral-200 hover:bg-white/10 hover:border-white/20"
            )}
            aria-current={active ? "page" : undefined}
          >
            {p}
          </button>
        );
      })}

      <button
        type="button"
        onClick={() => onPage(clamp(page + 1, 1, totalPages))}
        disabled={page >= totalPages}
        className={clsx(
          "inline-flex h-8 w-8 items-center justify-center rounded-md",
          "border border-white/10 bg-white/5 text-neutral-100",
          "hover:border-primary-500 disabled:opacity-40 disabled:hover:bg-white/5",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60"
        )}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ------------------------------ Page ------------------------------- */
export default function FriendsClient() {
  const [friendsQuery, setFriendsQuery] = useState("");
  const [friendsView, setFriendsView] = useState<"grid" | "list">("grid");
  const [friendsPage, setFriendsPage] = useState(1);

  const friendsPageSize = 10;

  const friendsFiltered = useMemo(() => {
    const q = friendsQuery.trim().toLowerCase();
    if (!q) return DEMO_FRIENDS;
    return DEMO_FRIENDS.filter((f) => {
      const hay =
        `${f.name} ${f.role} ${f.company} ${f.email} ${f.phone}`.toLowerCase();
      return hay.includes(q);
    });
  }, [friendsQuery]);

  const friendsTotal = friendsFiltered.length;
  const friendsTotalPages = Math.max(
    1,
    Math.ceil(friendsTotal / friendsPageSize)
  );

  useEffect(() => {
    setFriendsPage(1);
  }, [friendsQuery]);

  const friendsPageSafe = clamp(friendsPage, 1, friendsTotalPages);

  const friendsSlice = useMemo(() => {
    const start = (friendsPageSafe - 1) * friendsPageSize;
    return friendsFiltered.slice(start, start + friendsPageSize);
  }, [friendsFiltered, friendsPageSafe]);

  const friendsShowingLabel = useMemo(() => {
    if (!friendsTotal) return "Showing 0-0 from 0 data";
    const start = (friendsPageSafe - 1) * friendsPageSize + 1;
    const end = Math.min(friendsTotal, start + friendsPageSize - 1);
    return `Showing ${start}-${end} from ${friendsTotal} data`;
  }, [friendsTotal, friendsPageSafe]);

  return (
    <div className="relative overflow-hidden bg-neutral-950 text-neutral-0">
      <section className="pb-16">
        <section
          className={clsx(
            "mt-4 overflow-hidden rounded-2xl border border-white/10",
            "bg-neutral-950/70 shadow-[0_18px_60px_rgba(0,0,0,0.55)]"
          )}
        >
          <div
            className={clsx(
              "relative p-4 md:p-5",
              "bg-[radial-gradient(900px_320px_at_25%_0%,rgba(154,70,255,0.10),transparent_60%),radial-gradient(900px_320px_at_90%_110%,rgba(66,139,255,0.08),transparent_55%)]"
            )}
          >
            {/* Friends Header (Kenji layout kept, title adjusted to FRIENDS) */}
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-base font-semibold tracking-[0.18em] text-neutral-300">
                  FRIENDS
                </div>
                <div className="mt-1 text-neutral-400">
                  Manage your friends and contacts
                </div>
              </div>

              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
                <div
                  className={clsx(
                    "relative w-full sm:w-[420px]",
                    "rounded-lg border border-white/10 bg-white/5 h-10"
                  )}
                >
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-300" />
                  <input
                    value={friendsQuery}
                    onChange={(e) => setFriendsQuery(e.target.value)}
                    placeholder="Search here"
                    className={clsx(
                      "h-10 w-full rounded-lg bg-transparent",
                      "pl-10 pr-4 text-[12px] text-neutral-100",
                      "placeholder:text-neutral-500",
                      "outline-none border-none focus:ring-1 focus:ring-primary-500"
                    )}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFriendsView("list")}
                    aria-label="List view"
                    className={clsx(
                      "inline-flex h-10 w-10 items-center justify-center rounded-lg",
                      "border border-white/10",
                      friendsView === "list"
                        ? "bg-primary-500/15 text-primary-200 ring-1 ring-primary-500/20"
                        : "bg-white/5 text-neutral-200 hover:bg-white/8",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60"
                    )}
                  >
                    <List className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setFriendsView("grid")}
                    aria-label="Grid view"
                    className={clsx(
                      "inline-flex h-10 w-10 items-center justify-center rounded-lg",
                      "border border-white/10",
                      friendsView === "grid"
                        ? "bg-primary-500/15 text-primary-200 ring-1 ring-primary-500/20"
                        : "bg-white/5 text-neutral-200 hover:bg-white/8",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60"
                    )}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                </div>

                <Button
                  onClick={() => {
                    // TODO: open "Add Friend" modal when backend is ready
                  }}
                  type="button"
                  variant="primary"
                  icon={<Users className="h-4 w-4" />}
                >
                  Add Friend
                </Button>
              </div>
            </div>

            {/* Friends Content */}
            <div className="mt-4">
              {friendsView === "grid" ? (
                <div
                  className={clsx(
                    "grid gap-4",
                    "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
                  )}
                >
                  {friendsSlice.map((f) => (
                    <FriendsCard key={f.id} friend={f} />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {friendsSlice.map((f) => (
                    <FriendsRow key={f.id} friend={f} />
                  ))}
                </div>
              )}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-[12px] text-neutral-300">
                  {friendsShowingLabel}
                </div>
                <Pagination
                  page={friendsPageSafe}
                  totalPages={friendsTotalPages}
                  onPage={setFriendsPage}
                />
              </div>
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}
