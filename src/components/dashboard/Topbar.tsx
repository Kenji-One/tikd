// src/components/dashboard/Topbar.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState, useMemo } from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronDown,
  Search as SearchIcon,
  Settings as SettingsIcon,
  LogOut,
} from "lucide-react";

import SearchModal from "@/components/search/SearchModal";
import NotificationsDialog from "@/components/dashboard/NotificationsDialog";
import ChatsPopover from "@/components/ui/ChatsPopover";
import clsx from "clsx";

type TopbarProps = {
  /** For organization dashboard pages we hide the Tikd logo */
  hideLogo?: boolean;
};

type SortByKey = "me" | "newest" | "oldest";

const SORT_OPTIONS: { key: SortByKey; label: string }[] = [
  { key: "me", label: "Me" },
  { key: "newest", label: "Newest" },
  { key: "oldest", label: "Oldest" },
];

export default function Topbar({ hideLogo = false }: TopbarProps) {
  /* ----- auth ---------------------------------------------------------- */
  const { data: session } = useSession();
  const seed = session?.user?.id ?? "guest";
  const avatarSrc =
    session?.user?.image && session.user.image.length > 0
      ? session.user.image
      : `/api/avatar?seed=${encodeURIComponent(seed)}`;

  const [searchOpen, setSearchOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement | null>(null);

  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement | null>(null);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const chatRef = useRef<HTMLDivElement | null>(null);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Event dashboard pages (inside a specific event)
  const isEventDashboard =
    pathname?.startsWith("/dashboard/events/") &&
    pathname.split("/").length >= 4;

  const showSortSelector = useMemo(() => {
    if (!pathname) return false;

    // if (pathname === "/dashboard/organizations") return true;
    return /^\/dashboard\/organization\/[^/]+$/.test(pathname);
  }, [pathname]);

  const sortParamRaw = searchParams.get("sortBy");
  const sortParam: SortByKey | null =
    sortParamRaw === "me" ||
    sortParamRaw === "newest" ||
    sortParamRaw === "oldest"
      ? sortParamRaw
      : null;

  const [sortOpen, setSortOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortByKey>(sortParam ?? "me");
  const sortRef = useRef<HTMLDivElement | null>(null);

  const sortLabel = SORT_OPTIONS.find((o) => o.key === sortBy)?.label ?? "Me";

  function applySort(next: SortByKey) {
    setSortBy(next);
    setSortOpen(false);

    const params = new URLSearchParams(searchParams.toString());
    params.set("sortBy", next);

    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  // keep local state in sync when user navigates back/forward or page changes query
  useEffect(() => {
    if (sortParam && sortParam !== sortBy) setSortBy(sortParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortParamRaw]);

  // ✅ Load unread count from backend so dot is correct on refresh
  useEffect(() => {
    let cancelled = false;

    async function loadUnread() {
      if (!session?.user?.id) return;
      try {
        const res = await fetch("/api/notifications?tab=unread&limit=1", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { unreadCount?: number };
        if (!cancelled) setUnreadCount(Number(data.unreadCount || 0));
      } catch {
        // ignore
      }
    }

    loadUnread();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;

      if (avatarRef.current && !avatarRef.current.contains(target)) {
        setAvatarOpen(false);
      }

      if (sortRef.current && !sortRef.current.contains(target)) {
        setSortOpen(false);
      }

      if (notifRef.current && !notifRef.current.contains(target)) {
        setNotifOpen(false);
      }

      if (chatRef.current && !chatRef.current.contains(target)) {
        setChatOpen(false);
      }
    }

    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setAvatarOpen(false);
        setSearchOpen(false);
        setSortOpen(false);
        setNotifOpen(false);
        setChatOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  useEffect(() => {
    const onGlobal = (e: KeyboardEvent) => {
      const key = typeof e.key === "string" ? e.key.toLowerCase() : "";
      const isCmdK = key === "k" && (e.metaKey || e.ctrlKey);

      if (isCmdK || key === "/") {
        e.preventDefault();
        setNotifOpen(false);
        setChatOpen(false);
        setAvatarOpen(false);
        setSortOpen(false);

        setSearchOpen(true);
      }
    };

    document.addEventListener("keydown", onGlobal);
    return () => document.removeEventListener("keydown", onGlobal);
  }, []);

  return (
    <>
      <div
        className={clsx(
          "relative z-10",
          isEventDashboard && "px-4 md:px-6 lg:px-8",
        )}
      >
        {isEventDashboard && (
          <div aria-hidden="true" className="tikd-event-topbar-bg" />
        )}

        <div className="relative z-10">
          <div className="grid grid-cols-[3.10fr_1.51fr] gap-5 pb-6 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4 justify-between w-full sm:w-auto">
              <div className={"relative w-full sm:max-w-md"}>
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  aria-label="Open search"
                  className="group flex h-[44px] w-full items-center gap-3 rounded-full border border-white/10 bg-[#121420] px-3 text-left text-sm text-white outline-none focus-visible:border-primary-500 cursor-pointer"
                >
                  <SearchIcon className="h-4 w-4 opacity-70" />
                  <span className="flex-1 truncate text-white/70">
                    Search events, organizations, teams…
                  </span>
                </button>
              </div>

              {showSortSelector && (
                <div ref={sortRef} className="relative w-full max-w-[126px]">
                  <button
                    type="button"
                    onClick={() => setSortOpen((v) => !v)}
                    aria-haspopup="listbox"
                    aria-expanded={sortOpen}
                    className="flex w-full items-center justify-between rounded-full border border-white/10 bg-neutral-900 px-3 py-[9px] text-left text-white/80 hover:text-white outline-none hover:border-primary-500 focus-visible:border-primary-500 cursor-pointer"
                  >
                    <span className="truncate">Sort by: {sortLabel}</span>
                    <ChevronDown
                      className={`h-4 w-4 opacity-70 transition-transform ${
                        sortOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {sortOpen && (
                    <div className="absolute left-0 z-50 mt-2 w-full">
                      <div className="relative">
                        <span className="pointer-events-none absolute -top-2 left-6 h-3 w-3 rotate-45 border border-white/10 border-b-0 border-r-0 bg-[#121420]" />

                        <div
                          role="listbox"
                          aria-label="Sort by"
                          className="overflow-hidden rounded-xl border border-white/10 bg-[#121420] backdrop-blur"
                        >
                          <div className="p-1.5">
                            {SORT_OPTIONS.map((opt) => {
                              const active = opt.key === sortBy;
                              return (
                                <button
                                  key={opt.key}
                                  type="button"
                                  role="option"
                                  aria-selected={active}
                                  onClick={() => applySort(opt.key)}
                                  className={`flex w-full items-center justify-between rounded-lg px-3.5 py-2 text-left text-sm outline-none hover:bg-white/5 focus:bg-white/5 ${
                                    active
                                      ? "bg-white/5 text-white"
                                      : "text-white/90"
                                  }`}
                                >
                                  <span>{opt.label}</span>
                                  {active ? (
                                    <span className="text-xs font-semibold text-white/80">
                                      ✓
                                    </span>
                                  ) : null}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 sm:gap-3">
              {/* Messages */}
              <div className="relative" ref={chatRef}>
                <button
                  type="button"
                  aria-label="Messages"
                  aria-haspopup="dialog"
                  aria-expanded={chatOpen}
                  onClick={() => {
                    setAvatarOpen(false);
                    setSortOpen(false);
                    setSearchOpen(false);
                    setNotifOpen(false);
                    setChatOpen((v) => !v);
                  }}
                  className="tikd-chat-btn relative rounded-full bg-neutral-900 p-[9px] hover:border-primary-500 focus:outline-none ring-1 ring-white/10 hover:ring-primary-500 focus:ring-primary-500 cursor-pointer transition"
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="tikd-chat-svg text-[#727293] w-5.5 h-5.5"
                    >
                      <path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719" />
                      <path
                        className="tikd-chat-dot tikd-chat-dot-1"
                        d="M8 12h.01"
                      />
                      <path
                        className="tikd-chat-dot tikd-chat-dot-2"
                        d="M12 12h.01"
                      />
                      <path
                        className="tikd-chat-dot tikd-chat-dot-3"
                        d="M16 12h.01"
                      />
                    </svg>
                  </div>

                  {chatUnreadCount > 0 && (
                    <span className="absolute right-[9px] top-[9px] h-1.5 w-1.5 rounded-full bg-error-500" />
                  )}
                </button>

                <ChatsPopover
                  open={chatOpen}
                  onClose={() => setChatOpen(false)}
                  onUnreadChange={setChatUnreadCount}
                />
              </div>

              {/* Notifications */}
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  aria-label="Notifications"
                  aria-haspopup="dialog"
                  aria-expanded={notifOpen}
                  onClick={() => {
                    setAvatarOpen(false);
                    setSortOpen(false);
                    setSearchOpen(false);
                    setChatOpen(false);
                    setNotifOpen((v) => !v);
                  }}
                  className="tikd-notif-btn relative rounded-full bg-neutral-900 p-[9px] hover:border-primary-500 cursor-pointer focus:outline-none ring-1 ring-white/10 hover:ring-primary-500 focus:ring-primary-500 cursor-pointer transition"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="tikd-bell-svg"
                    aria-hidden="true"
                  >
                    <path
                      d="M18 13.18V10C17.9986 8.58312 17.4958 7.21247 16.5806 6.13077C15.6655 5.04908 14.3971 4.32615 13 4.09V3C13 2.73478 12.8946 2.48043 12.7071 2.29289C12.5196 2.10536 12.2652 2 12 2C11.7348 2 11.4804 2.10536 11.2929 2.29289C11.1054 2.48043 11 2.73478 11 3V4.09C9.60294 4.32615 8.33452 5.04908 7.41939 6.13077C6.50425 7.21247 6.00144 8.58312 6 10V13.18C5.41645 13.3863 4.911 13.7681 4.55294 14.2729C4.19488 14.7778 4.00174 15.3811 4 16V18C4 18.2652 4.10536 18.5196 4.29289 18.7071C4.48043 18.8946 4.73478 19 5 19H8.14C8.37028 19.8474 8.873 20.5954 9.5706 21.1287C10.2682 21.6621 11.1219 21.951 12 21.951C12.8781 21.951 13.7318 21.6621 14.4294 21.1287C15.127 20.5954 15.6297 19.8474 15.86 19H19C19.2652 19 19.5196 18.8946 19.7071 18.7071C19.8946 18.5196 20 18.2652 20 18V16C19.9983 15.3811 19.8051 14.7778 19.4471 14.2729C19.089 13.7681 18.5835 13.3863 18 13.18ZM8 10C8 8.93913 8.42143 7.92172 9.17157 7.17157C9.92172 6.42143 10.9391 6 12 6C13.0609 6 14.0783 6.42143 14.8284 7.17157C15.5786 7.92172 16 8.93913 16 10V13H8V10ZM12 20C11.651 19.9979 11.3086 19.9045 11.0068 19.7291C10.7051 19.5536 10.4545 19.3023 10.28 19H13.72C13.5455 19.3023 13.2949 19.5536 12.9932 19.7291C12.6914 19.9045 12.349 19.9979 12 20ZM18 17H6V16C6 15.7348 6.10536 15.4804 6.29289 15.2929C6.48043 15.1054 6.73478 15 7 15H17C17.2652 15 17.5196 15.1054 17.7071 15.2929C17.8946 15.4804 18 15.7348 18 16V17Z"
                      fill="#727293"
                    />
                  </svg>

                  {unreadCount > 0 && (
                    <span className="absolute right-[9px] top-[9px] h-1.5 w-1.5 rounded-full bg-error-500" />
                  )}
                </button>

                <NotificationsDialog
                  open={notifOpen}
                  onClose={() => setNotifOpen(false)}
                  onUnreadChange={setUnreadCount}
                />
              </div>

              {/* Avatar */}
              <div className="relative" ref={avatarRef}>
                <button
                  type="button"
                  onClick={() => setAvatarOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={avatarOpen}
                  className="flex gap-1.5 min-w-[120px] p-1 pr-2 items-center rounded-full ring-1 ring-white/10 focus:outline-none hover:ring-primary-500 focus:ring-primary-500 bg-neutral-900 cursor-pointer transition"
                >
                  <div className=" relative h-[34px] w-[34px] rounded-full bg-white/5 flex-shrink-0 overflow-hidden">
                    <Image
                      src={avatarSrc}
                      width={34}
                      height={34}
                      alt={session?.user?.name ?? "Profile"}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <p className="w-full text-left capitalize font-medium">
                    {session?.user?.name || "User"}
                  </p>

                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    className=" flex-shrink-0"
                  >
                    <path
                      d="M10.36 7.52661L6.58666 3.75994C6.52469 3.69746 6.45096 3.64786 6.36972 3.61402C6.28848 3.58017 6.20134 3.56274 6.11333 3.56274C6.02532 3.56274 5.93819 3.58017 5.85695 3.61402C5.77571 3.64786 5.70197 3.69746 5.64 3.75994C5.51583 3.88485 5.44614 4.05382 5.44614 4.22994C5.44614 4.40607 5.51583 4.57503 5.64 4.69994L8.94 8.03328L5.64 11.3333C5.51583 11.4582 5.44614 11.6272 5.44614 11.8033C5.44614 11.9794 5.51583 12.1484 5.64 12.2733C5.70174 12.3363 5.77537 12.3864 5.85662 12.4207C5.93787 12.455 6.02513 12.4729 6.11333 12.4733C6.20154 12.4729 6.28879 12.455 6.37004 12.4207C6.45129 12.3864 6.52492 12.3363 6.58666 12.2733L10.36 8.50661C10.4277 8.44418 10.4817 8.36841 10.5186 8.28408C10.5556 8.19975 10.5746 8.10868 10.5746 8.01661C10.5746 7.92454 10.5556 7.83347 10.5186 7.74914C10.4817 7.66481 10.4277 7.58904 10.36 7.52661Z"
                      fill="#727293"
                    />
                  </svg>
                </button>

                {avatarOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-56">
                    <div className="relative">
                      <span className="pointer-events-none absolute -top-2 right-4 h-3 w-3 rotate-45 border border-white/10 border-b-0 border-r-0 bg-[#121420]" />
                      <div
                        role="menu"
                        aria-label="Account"
                        className="overflow-hidden rounded-xl border border-white/10 bg-[#121420] shadow-2xl backdrop-blur"
                      >
                        <div className="border-b border-white/10 px-4 py-3">
                          <p className="text-[11px] uppercase tracking-wide text-white/50">
                            Signed in as
                          </p>
                          <p className="mt-0.5 truncate text-sm font-medium">
                            {session?.user?.email ||
                              session?.user?.name ||
                              "User"}
                          </p>
                        </div>

                        <div className="p-1.5">
                          <Link
                            href="/"
                            role="menuitem"
                            onClick={() => setAvatarOpen(false)}
                            className="flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-sm text-white/90 hover:bg-white/5 focus:bg-white/5 focus:outline-none"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                              className="w-4 h-4 opacity-80"
                            >
                              <g transform="translate(-5.1429 -5.1429) scale(1.4286)">
                                <path d="M5 7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V7z" />
                                <path d="M9 7.5v9" stroke-dasharray="1 2" />
                                <path d="M11 9h7" />
                                <path d="M14.5 9v8" />
                              </g>
                            </svg>
                            <span>Explore Tixsy</span>
                          </Link>

                          <Link
                            href="/dashboard/settings"
                            role="menuitem"
                            onClick={() => setAvatarOpen(false)}
                            className="flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-sm text-white/90 hover:bg-white/5 focus:bg-white/5 focus:outline-none"
                          >
                            <SettingsIcon className="h-4 w-4 opacity-80" />
                            <span>Settings</span>
                          </Link>

                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => signOut({ callbackUrl: "/" })}
                            className="mt-0.5 flex w-full items-center gap-2 rounded-lg px-3.5 py-2.5 text-left text-sm text-white/90 hover:bg-white/5 focus:bg-white/5 focus:outline-none cursor-pointer"
                          >
                            <LogOut className="h-4 w-4 opacity-80" />
                            <span>Logout</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
