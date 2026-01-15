/* ------------------------------------------------------------------ */
/*  src/app/dashboard/connections/ConnectionsHubClient.tsx            */
/* ------------------------------------------------------------------ */
"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import {
  Plus,
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
import { useRouter } from "next/navigation";

import { Skeleton } from "@/components/ui/Skeleton";
import ConnectionProfileCard, {
  type ConnectionProfileKind,
} from "@/components/connections/ConnectionProfileCard";

/* ------------------------------ Types ------------------------------ */
type Org = {
  _id: string;
  name: string;

  logo?: string;
  banner?: string;
  description?: string;

  totalMembers?: number;
  createdAt?: string;

  website?: string;
};

type TabKey = "all" | "establishments" | "organizations" | "teams" | "friends";

type TabItem =
  | { key: TabKey; label: string; kind?: "tab" }
  | { key: "divider"; label?: string; kind: "divider" };

type CardRow = {
  id: string;
  kind: ConnectionProfileKind;
  href: string;
  title: string;
  description: string;
  bannerUrl?: string;
  iconUrl?: string;
  totalMembers?: number;
  joinDateLabel?: string;
};

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

/* ---------------------------- Helpers ------------------------------ */
async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok)
    throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
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

function formatMembers(n?: number) {
  if (!n || n <= 0) return "—";
  try {
    return new Intl.NumberFormat(undefined).format(n);
  } catch {
    return String(n);
  }
}

function joinLabel(iso?: string) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const m = d.toLocaleString(undefined, { month: "short" });
    return `Joined ${m} ${d.getFullYear()}`;
  } catch {
    return "—";
  }
}

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

/* ------------------------------ Tabs ------------------------------- */
const TABS: TabItem[] = [
  { key: "all", label: "All" },
  { key: "establishments", label: "Establishments" },
  { key: "organizations", label: "Organizations" },
  { key: "teams", label: "Teams" },
  { key: "divider", kind: "divider" },
  { key: "friends", label: "Friends" },
];

function titleForTab(t: TabKey) {
  switch (t) {
    case "all":
      return "Connections";
    case "establishments":
      return "Establishments";
    case "organizations":
      return "Organizations";
    case "teams":
      return "Teams";
    case "friends":
      // Reference shows "Contacts" heading for the Friends UI
      return "Contacts";
    default:
      return "Connections";
  }
}

function subtitleForTab(t: TabKey) {
  if (t === "friends") return "Manage your friends and contacts";
  return "";
}

function actionForTab(t: TabKey) {
  switch (t) {
    case "organizations":
      return {
        createHref: "/dashboard/organizations/new",
        createLabel: "New organization",
        countLabel: "Total members",
      };
    case "establishments":
      return {
        createHref: "/dashboard/establishments/new",
        createLabel: "New establishment",
        countLabel: "Total members",
      };
    case "teams":
      return {
        createHref: "/dashboard/teams/new",
        createLabel: "New team",
        countLabel: "Total members",
      };
    case "friends":
      return {
        createHref: "/dashboard/connections/friends",
        createLabel: "Add Friend",
        countLabel: "Total friends",
      };
    case "all":
    default:
      return {
        createHref: "/dashboard/organizations/new",
        createLabel: "New organization",
        countLabel: "Total members",
      };
  }
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
      {/* menu */}
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
        {/* avatar */}
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

          {/* name + role + company */}
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

        {/* contacts */}
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
  // Render like reference: prev, 1,2,3,4, next (keep tight)
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

/* ------------------------------ Component -------------------------- */
export default function ConnectionsHubClient() {
  const router = useRouter();
  const { data: session } = useSession();
  const [active, setActive] = useState<TabKey>("organizations");

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const [underline, setUnderline] = useState<{
    x: number;
    w: number;
    o: number;
  }>({ x: 0, w: 0, o: 0 });

  /* ------------------------ Data (real + demo) ----------------------- */
  const { data: orgs, isLoading: orgsLoading } = useQuery<Org[]>({
    queryKey: ["orgs", "connections-hub"],
    queryFn: () => fetchJSON<Org[]>("/api/organizations"),
    enabled: !!session,
  });

  const orgRows: CardRow[] = useMemo(() => {
    const list = orgs ?? [];
    return list.map((org) => {
      const site = domainFromUrl(org.website);
      const description =
        org.description?.trim() || (site ? `${site}` : "Public profile");

      return {
        id: org._id,
        kind: "organization",
        href: `/dashboard/organizations/${org._id}`,
        title: org.name,
        description,
        bannerUrl: org.banner,
        iconUrl: org.logo,
        totalMembers: org.totalMembers,
        joinDateLabel: joinLabel(org.createdAt),
      };
    });
  }, [orgs]);

  // Demo placeholders until endpoints exist for these.
  const demoEstablishments: CardRow[] = useMemo(
    () => [
      {
        id: "est-1",
        kind: "establishment",
        href: "/dashboard/connections",
        title: "Astro Hospitality",
        description: "Public profile",
        totalMembers: 0,
        joinDateLabel: "Joined Nov 2025",
      },
      {
        id: "est-2",
        kind: "establishment",
        href: "/dashboard/connections",
        title: "Old Town Venue",
        description: "Live venue • Rustaveli",
        totalMembers: 0,
        joinDateLabel: "Joined Oct 2025",
      },
    ],
    []
  );

  const demoTeams: CardRow[] = useMemo(
    () => [
      {
        id: "team-1",
        kind: "team",
        href: "/dashboard/connections",
        title: "Marketing",
        description: "Internal team",
        totalMembers: 0,
        joinDateLabel: "Joined Sep 2025",
      },
      {
        id: "team-2",
        kind: "team",
        href: "/dashboard/connections",
        title: "Operations",
        description: "Internal team",
        totalMembers: 0,
        joinDateLabel: "Joined Aug 2025",
      },
    ],
    []
  );

  const rowsForTab = useMemo(() => {
    if (active === "organizations") return orgRows;
    if (active === "establishments") return demoEstablishments;
    if (active === "teams") return demoTeams;
    if (active === "friends") return [];
    return [...demoEstablishments, ...orgRows, ...demoTeams];
  }, [active, orgRows, demoEstablishments, demoTeams]);

  const totalMembersForTab = useMemo(() => {
    if (active === "friends") return undefined;
    const sum = rowsForTab.reduce((acc, r) => acc + (r.totalMembers ?? 0), 0);
    return sum > 0 ? sum : undefined;
  }, [active, rowsForTab]);

  /* --------------------- Underline measurement ---------------------- */
  const measureUnderline = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const btn = tabRefs.current[active];
    if (!btn) {
      setUnderline((u) => ({ ...u, o: 0 }));
      return;
    }

    const btnRect = btn.getBoundingClientRect();
    const scRect = scroller.getBoundingClientRect();

    const x = btnRect.left - scRect.left + scroller.scrollLeft;
    const w = btnRect.width;

    setUnderline({ x, w, o: 1 });
  }, [active]);

  useLayoutEffect(() => {
    measureUnderline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    const onResize = () => measureUnderline();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [measureUnderline]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => measureUnderline());
    };

    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [measureUnderline]);

  const onSelect = (key: TabKey) => {
    setActive(key);

    const scroller = scrollerRef.current;
    const btn = tabRefs.current[key];
    if (!scroller || !btn) return;

    const scRect = scroller.getBoundingClientRect();
    const bRect = btn.getBoundingClientRect();

    const pad = 28;
    const leftOverflow = bRect.left - scRect.left;
    const rightOverflow = bRect.right - scRect.right;

    if (leftOverflow < pad) {
      scroller.scrollBy({ left: leftOverflow - pad, behavior: "smooth" });
    } else if (rightOverflow > -pad) {
      scroller.scrollBy({ left: rightOverflow + pad, behavior: "smooth" });
    }
  };

  const action = actionForTab(active);

  // ✅ Grid that fits your 264px cards perfectly (no giant gaps)
  const gridClass = clsx(
    "grid gap-4",
    "grid-cols-1",
    "sm:[grid-template-columns:repeat(auto-fill,264px)]",
    "sm:justify-start"
  );

  /* --------------------------- Friends state ------------------------- */
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
            {/* Header */}
            {active === "friends" ? (
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                {/* left title */}
                <div>
                  <h1 className="text-[22px] font-semibold tracking-[-0.32px] text-neutral-50">
                    {titleForTab(active)}
                  </h1>
                </div>

                {/* right controls */}
                <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
                  {/* Search */}
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

                  {/* View toggles */}
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

                  {/* Add Friend */}
                  <Button
                    onClick={() => {
                      // TODO: open "Add Friend" modal when backend is ready
                      // For now, keep as a UI element per client request.
                    }}
                    type="button"
                    variant="primary"
                    icon={<Users className="h-4 w-4" />}
                  >
                    {action.createLabel}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-[22px] font-semibold tracking-[-0.32px] text-neutral-50">
                    {titleForTab(active)}
                  </h1>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-neutral-200 h-10">
                    <Users className="h-4 w-4 text-neutral-400" />
                    <span className="font-semibold text-neutral-0">
                      {formatMembers(totalMembersForTab)}
                    </span>
                    <span className="text-neutral-400">
                      {action.countLabel}
                    </span>
                  </span>
                  <Button
                    onClick={() => router.push(action.createHref)}
                    type="button"
                    variant="primary"
                    icon={<Plus className="h-4 w-4" />}
                  >
                    {action.createLabel}
                  </Button>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div
              className={clsx(
                "relative",
                "rounded-lg",
                "border border-white/10",
                "bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))]",
                "backdrop-blur-md",
                "px-3 sm:px-4"
              )}
            >
              <div
                ref={scrollerRef}
                className={clsx(
                  "relative",
                  "overflow-x-auto overflow-y-hidden whitespace-nowrap",
                  "no-scrollbar"
                )}
              >
                <div
                  role="tablist"
                  aria-label="Connections tabs"
                  className={clsx(
                    "relative inline-flex items-center gap-5 sm:gap-7",
                    "py-2.5"
                  )}
                >
                  {TABS.map((t) => {
                    if (t.kind === "divider") {
                      return (
                        <span
                          key="divider"
                          aria-hidden="true"
                          className="mx-1 h-5 w-px bg-white/10"
                        />
                      );
                    }

                    const isActive = active === t.key;

                    return (
                      <button
                        key={t.key}
                        ref={(el) => {
                          tabRefs.current[t.key] = el;
                        }}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => onSelect(t.key)}
                        className={clsx(
                          "relative",
                          "px-1",
                          "py-2",
                          "text-[13px] sm:text-[14px]",
                          "font-semibold tracking-[-0.28px]",
                          "transition-colors duration-200",
                          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 focus-visible:ring-offset-0",
                          isActive
                            ? "text-neutral-50"
                            : "text-neutral-300 hover:text-neutral-100"
                        )}
                      >
                        <span
                          className={clsx(
                            "relative",
                            isActive &&
                              "drop-shadow-[0_0_16px_rgba(154,70,255,0.20)]"
                          )}
                        >
                          {t.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="pointer-events-none absolute left-0 right-0 bottom-0 h-px bg-white/10" />

                <div
                  aria-hidden="true"
                  className={clsx(
                    "pointer-events-none absolute bottom-0 left-0",
                    "h-[2px] rounded-full",
                    "bg-primary-500/80",
                    "shadow-[0_0_0_1px_rgba(154,70,255,0.18),0_10px_28px_rgba(154,70,255,0.16)]",
                    "transition-[transform,width,opacity] duration-300 ease-out"
                  )}
                  style={{
                    width: underline.w ? `${underline.w}px` : "0px",
                    transform: `translateX(${underline.x}px)`,
                    opacity: underline.o,
                  }}
                />

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-neutral-948/70 to-transparent"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-neutral-948/70 to-transparent"
                />
              </div>
            </div>

            {/* Content */}
            <div className="mt-4">
              {/* Friends */}
              {active === "friends" ? (
                <div>
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

                  {/* Footer (showing + pagination) */}
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
              ) : active === "organizations" && orgsLoading ? (
                <div className={gridClass}>
                  {[...Array(6)].map((_, i) => (
                    <Skeleton
                      key={i}
                      className="h-[205px] w-full sm:w-[264px] rounded-[12px]"
                    />
                  ))}
                </div>
              ) : rowsForTab.length ? (
                <div className={gridClass}>
                  {rowsForTab.map((item) => (
                    <ConnectionProfileCard
                      key={item.id}
                      href={item.href}
                      kind={item.kind}
                      title={item.title}
                      description={item.description}
                      bannerUrl={item.bannerUrl}
                      iconUrl={item.iconUrl}
                      totalMembers={item.totalMembers}
                      joinDateLabel={item.joinDateLabel}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/15 bg-neutral-950/50 p-10 text-center">
                  <p className="text-sm font-medium text-neutral-0">
                    Nothing here yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}
