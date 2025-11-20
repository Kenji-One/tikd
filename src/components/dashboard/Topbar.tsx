/* ------------------------------------------------------------------ */
/*  src/components/dashboard/Topbar.tsx                               */
/*  - Reuses auth + search behavior from site Header                  */
/*  - Opens SearchModal on "/" or ⌘/Ctrl+K                            */
/*  - Avatar dropdown with Settings + Logout                          */
/* ------------------------------------------------------------------ */
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  Search as SearchIcon,
  Settings as SettingsIcon,
  LogOut,
} from "lucide-react";
import SearchModal from "@/components/search/SearchModal";

type TopbarProps = {
  /** For organization dashboard pages we hide the Tikd logo */
  hideLogo?: boolean;
};

export default function Topbar({ hideLogo = false }: TopbarProps) {
  /* ----- auth ---------------------------------------------------------- */
  const { data: session } = useSession();
  const seed = session?.user?.id ?? "guest";
  const avatarSrc =
    session?.user?.image && session.user.image.length > 0
      ? session.user.image
      : `/api/avatar?seed=${encodeURIComponent(seed)}`;

  /* ----- UI state ------------------------------------------------------ */
  const [searchOpen, setSearchOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement | null>(null);

  /* close avatar on outside click / Esc */
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (avatarRef.current && !avatarRef.current.contains(target)) {
        setAvatarOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setAvatarOpen(false);
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  /* global hotkeys for search: "/" and Cmd/Ctrl+K */
  useEffect(() => {
    const onGlobal = (e: KeyboardEvent) => {
      const isCmdK = e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey);
      if (isCmdK || e.key === "/") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", onGlobal);
    return () => document.removeEventListener("keydown", onGlobal);
  }, []);

  return (
    <>
      <div className="flex flex-col gap-3 py-6 sm:flex-row sm:items-center sm:justify-between">
        {/* Logo (hidden on organization pages) */}
        {!hideLogo && (
          <Link href="/" className="flex items-center">
            <Image
              src="/Logo.svg"
              alt="Tikd."
              width={72}
              height={24}
              priority
            />
          </Link>
        )}

        {/* Search trigger – looks like an input but opens SearchModal */}
        <div
          className={
            hideLogo
              ? "relative w-full sm:max-w-md"
              : "relative w-full sm:max-w-md"
          }
        >
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Open search"
            className="group flex h-[44px] w-full items-center gap-3 rounded-full border border-white/10 bg-[#121420] px-3 text-left text-sm text-white outline-none focus-visible:border-violet-500/50"
          >
            <SearchIcon className="h-4 w-4 opacity-70" />
            <span className="flex-1 truncate text-white/70">
              Search events, orgs, artists…
            </span>
            <span className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/60 md:inline-flex">
              <kbd className="font-mono">/</kbd> <span>or</span>{" "}
              <kbd className="font-mono">⌘K</kbd>
            </span>
          </button>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Notifications */}
          <button
            aria-label="Notifications"
            className="relative rounded-full bg-neutral-900 p-2 hover:border-violet-500/40"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M18 13.18V10C17.9986 8.58312 17.4958 7.21247 16.5806 6.13077C15.6655 5.04908 14.3971 4.32615 13 4.09V3C13 2.73478 12.8946 2.48043 12.7071 2.29289C12.5196 2.10536 12.2652 2 12 2C11.7348 2 11.4804 2.10536 11.2929 2.29289C11.1054 2.48043 11 2.73478 11 3V4.09C9.60294 4.32615 8.33452 5.04908 7.41939 6.13077C6.50425 7.21247 6.00144 8.58312 6 10V13.18C5.41645 13.3863 4.911 13.7681 4.55294 14.2729C4.19488 14.7778 4.00174 15.3811 4 16V18C4 18.2652 4.10536 18.5196 4.29289 18.7071C4.48043 18.8946 4.73478 19 5 19H8.14C8.37028 19.8474 8.873 20.5954 9.5706 21.1287C10.2682 21.6621 11.1219 21.951 12 21.951C12.8781 21.951 13.7318 21.6621 14.4294 21.1287C15.127 20.5954 15.6297 19.8474 15.86 19H19C19.2652 19 19.5196 18.8946 19.7071 18.7071C19.8946 18.5196 20 18.2652 20 18V16C19.9983 15.3811 19.8051 14.7778 19.4471 14.2729C19.089 13.7681 18.5835 13.3863 18 13.18ZM8 10C8 8.93913 8.42143 7.92172 9.17157 7.17157C9.92172 6.42143 10.9391 6 12 6C13.0609 6 14.0783 6.42143 14.8284 7.17157C15.5786 7.92172 16 8.93913 16 10V13H8V10ZM12 20C11.651 19.9979 11.3086 19.9045 11.0068 19.7291C10.7051 19.5536 10.4545 19.3023 10.28 19H13.72C13.5455 19.3023 13.2949 19.5536 12.9932 19.7291C12.6914 19.9045 12.349 19.9979 12 20ZM18 17H6V16C6 15.7348 6.10536 15.4804 6.29289 15.2929C6.48043 15.1054 6.73478 15 7 15H17C17.2652 15 17.5196 15.1054 17.7071 15.2929C17.8946 15.4804 18 15.7348 18 16V17Z"
                fill="#727293"
              />
            </svg>
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-error-500" />
          </button>

          {/* Avatar w/ dropdown (account, settings, logout) */}
          <div className="relative" ref={avatarRef}>
            <button
              type="button"
              onClick={() => setAvatarOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={avatarOpen}
              className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full ring-2 ring-white/10 focus:outline-none focus:ring-violet-500/40"
            >
              <Image
                src={avatarSrc}
                width={36}
                height={36}
                alt={session?.user?.name ?? "Profile"}
                className="h-full w-full object-cover"
              />
            </button>

            {avatarOpen && (
              <div className="absolute right-0 z-50 mt-2 w-56">
                <div className="relative">
                  {/* caret */}
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
                        {session?.user?.email || session?.user?.name || "User"}
                      </p>
                    </div>

                    <div className="p-1.5">
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
                        className="mt-0.5 flex w-full items-center gap-2 rounded-lg px-3.5 py-2.5 text-left text-sm text-white/90 hover:bg-white/5 focus:bg-white/5 focus:outline-none"
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

      {/* Global search modal (reuses your existing component) */}
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
