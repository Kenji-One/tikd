"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

import { Button } from "@/components/ui/Button";
import { X, LogOut, LayoutDashboard } from "lucide-react";

import clsx from "classnames";
import { Input } from "@/components/ui/Input";
import RegisterLoginModal from "@/components/ui/RegisterLoginModal";

export default function Header() {
  /* ----- routing helpers ------------------------------------------------ */
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const isAbout = pathname === "/about";
  const isDemo = pathname === "/demo";
  const showDemo = pathname === "/" || pathname.startsWith("/help");

  /* ----- auth state ----------------------------------------------------- */
  const { data: session, status } = useSession();
  const loggedIn = status === "authenticated";

  /* ----- ui state ------------------------------------------------------- */
  const [mobileOpen, setMobileOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"login" | "register">("register");
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [mobileAvatarOpen, setMobileAvatarOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement | null>(null);
  const mobileAvatarRef = useRef<HTMLDivElement | null>(null);

  const openModal = (mode: "login" | "register") => {
    setModalMode(mode);
    setModalOpen(true);
    setMobileOpen(false);
  };

  const seed = session?.user?.id ?? "guest";
  const avatarSrc =
    session?.user?.image && session.user.image.length > 0
      ? session.user.image
      : `/api/avatar?seed=${encodeURIComponent(seed)}`;

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (avatarRef.current && !avatarRef.current.contains(target)) {
        setAvatarOpen(false);
      }
      if (
        mobileAvatarRef.current &&
        !mobileAvatarRef.current.contains(target)
      ) {
        setMobileAvatarOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setAvatarOpen(false);
        setMobileAvatarOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  /* ---------------------------------------------------------------------- */
  return (
    <>
      <header
        className={clsx(
          isLanding || isAbout || isDemo ? "fixed top-0" : "relative top-0",
          "z-50 w-full"
        )}
      >
        <div className="flex items-center justify-between px-4 lg:px-8 xl:px-[120px] pt-4">
          {/* left: logo + desktop search ---------------------------------- */}
          <div className="flex items-center gap-6 w-full max-w-[357px]">
            <Link href="/" className="flex items-center">
              <Image
                src="/Logo.svg"
                alt="Tikd."
                width={72}
                height={24}
                priority
              />
            </Link>

            {/* search (desktop only) */}
            <div className="hidden lg:block w-full">
              {/* NEW: wrap in a real search form to isolate from credential autofill */}
              <form
                role="search"
                autoComplete="off"
                onSubmit={(e) => e.preventDefault()}
              >
                <Input
                  variant="frosted"
                  shape="pill"
                  size="sm"
                  maxWidth={263}
                  name="q"
                  inputMode="search"
                  enterKeyHint="search"
                  autoComplete="off"
                  placeholder="Search events"
                  icon={
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="17"
                      viewBox="0 0 16 17"
                      fill="none"
                      focusable="false"
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-white/70" // ← force visible color
                    >
                      <circle
                        cx="7.824"
                        cy="7.825"
                        r="6.741"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M12.514 12.864 L 15.157 15.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  }
                />
              </form>
            </div>
          </div>

          {/* desktop nav --------------------------------------------------- */}
          <nav className="hidden lg:flex items-center space-x-6 text-neutral-0">
            {showDemo && (
              <Link
                href="/demo"
                className="hover:text-primary-500 transition duration-200 ease-in-out"
              >
                Book a Demo
              </Link>
            )}
            <Link
              href="/events"
              className="hover:text-primary-500 transition duration-200 ease-in-out"
            >
              Events
            </Link>
            <Link
              href="/about"
              className="hover:text-primary-500 transition duration-200 ease-in-out"
            >
              About us
            </Link>

            {/* right-hand buttons / avatar / logout (desktop) */}
            <div className="flex items-center gap-2">
              {!loggedIn ? (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => openModal("login")}
                  >
                    Log in
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => openModal("register")}
                  >
                    Sign up
                  </Button>
                  {/* Cart icon – always visible */}
                  <Link
                    href="/checkout"
                    className="w-[38px] h-[38px] rounded-full border border-[#FFFFFF1A] hover:border-primary-500 transition duration-200 flex items-center justify-center cursor-pointer"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                    >
                      <path
                        d="M13.2994 1.34215H0.000488281V2.74203H1.61035L4.07484 9.51956C4.17296 9.78961 4.3518 10.0229 4.58709 10.1878C4.82237 10.3527 5.10271 10.4413 5.39003 10.4414H11.1995V9.0415H5.39003L4.88047 7.64162H11.1995C11.4795 7.64162 11.7329 7.47503 11.8428 7.21745L13.9426 2.31787C13.9886 2.21143 14.0074 2.09522 13.9973 1.9797C13.9872 1.86419 13.9484 1.75302 13.8846 1.65621C13.8208 1.5594 13.7339 1.48 13.6317 1.42517C13.5295 1.37034 13.4153 1.34181 13.2994 1.34215Z"
                        fill="white"
                      />
                      <path
                        d="M5.94994 13.2412C6.52978 13.2412 6.99985 12.7711 6.99985 12.1913C6.99985 11.6114 6.52978 11.1413 5.94994 11.1413C5.37009 11.1413 4.90002 11.6114 4.90002 12.1913C4.90002 12.7711 5.37009 13.2412 5.94994 13.2412Z"
                        fill="white"
                      />
                      <path
                        d="M10.1496 13.2412C10.7295 13.2412 11.1996 12.7711 11.1996 12.1913C11.1996 11.6114 10.7295 11.1413 10.1496 11.1413C9.56979 11.1413 9.09973 11.6114 9.09973 12.1913C9.09973 12.7711 9.56979 13.2412 10.1496 13.2412Z"
                        fill="white"
                      />
                    </svg>
                  </Link>
                </>
              ) : (
                <>
                  {/* Cart icon – always visible */}
                  <Link
                    href="/checkout"
                    className="w-[38px] h-[38px] rounded-full border border-[#FFFFFF1A] hover:border-primary-500 transition duration-200 flex items-center justify-center cursor-pointer"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                    >
                      <path
                        d="M13.2994 1.34215H0.000488281V2.74203H1.61035L4.07484 9.51956C4.17296 9.78961 4.3518 10.0229 4.58709 10.1878C4.82237 10.3527 5.10271 10.4413 5.39003 10.4414H11.1995V9.0415H5.39003L4.88047 7.64162H11.1995C11.4795 7.64162 11.7329 7.47503 11.8428 7.21745L13.9426 2.31787C13.9886 2.21143 14.0074 2.09522 13.9973 1.9797C13.9872 1.86419 13.9484 1.75302 13.8846 1.65621C13.8208 1.5594 13.7339 1.48 13.6317 1.42517C13.5295 1.37034 13.4153 1.34181 13.2994 1.34215Z"
                        fill="white"
                      />
                      <path
                        d="M5.94994 13.2412C6.52978 13.2412 6.99985 12.7711 6.99985 12.1913C6.99985 11.6114 6.52978 11.1413 5.94994 11.1413C5.37009 11.1413 4.90002 11.6114 4.90002 12.1913C4.90002 12.7711 5.37009 13.2412 5.94994 13.2412Z"
                        fill="white"
                      />
                      <path
                        d="M10.1496 13.2412C10.7295 13.2412 11.1996 12.7711 11.1996 12.1913C11.1996 11.6114 10.7295 11.1413 10.1496 11.1413C9.56979 11.1413 9.09973 11.6114 9.09973 12.1913C9.09973 12.7711 9.56979 13.2412 10.1496 13.2412Z"
                        fill="white"
                      />
                    </svg>
                  </Link>
                  <div className="relative" ref={avatarRef}>
                    <button
                      type="button"
                      onClick={() => setAvatarOpen((v) => !v)}
                      aria-haspopup="menu"
                      aria-expanded={avatarOpen}
                      className="w-[38px] h-[38px] rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary-500 hover:ring-2 hover:ring-white/10 cursor-pointer"
                    >
                      <Image
                        src={avatarSrc}
                        alt={session?.user?.name ?? "Profile"}
                        width={38}
                        height={38}
                        className="object-cover rounded-full"
                      />
                    </button>

                    {avatarOpen && (
                      <div className="absolute right-0 mt-2 w-56 z-50">
                        <div className="relative">
                          {/* caret */}
                          <span className="pointer-events-none absolute -top-2 right-4 h-3 w-3 rotate-45 bg-neutral-900/95 border border-white/10 border-b-0 border-r-0"></span>

                          <div
                            role="menu"
                            aria-label="Account"
                            className="overflow-hidden rounded-xl border border-[#FFFFFF1A] bg-neutral-900/95 backdrop-blur shadow-2xl ring-1 ring-black/40"
                          >
                            {/* header */}
                            <div className="px-4 py-3 border-b border-[#FFFFFF1A]">
                              <p className="text-[11px] uppercase tracking-wide text-neutral-400">
                                Signed in as
                              </p>
                              <p className="mt-0.5 text-sm font-medium text-neutral-0 truncate">
                                {session?.user?.email ||
                                  session?.user?.name ||
                                  "User"}
                              </p>
                            </div>

                            {/* items */}
                            <div className="p-1.5">
                              <Link
                                href="/dashboard"
                                role="menuitem"
                                onClick={() => setAvatarOpen(false)}
                                className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-neutral-0 hover:bg:white/5 focus:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
                              >
                                <LayoutDashboard className="h-4 w-4 opacity-80" />
                                <span className="text-sm">Dashboard</span>
                              </Link>

                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => signOut({ callbackUrl: "/" })}
                                className="mt-0.5 w-full flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-left text-neutral-0 hover:bg-white/5 focus:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
                              >
                                <LogOut className="h-4 w-4 opacity-80" />
                                <span className="text-sm">Logout</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </nav>

          {/* right utilities (mobile): cart + avatar + hamburger ---------- */}
          <div className="flex items-center gap-3 lg:hidden">
            {/* Cart always visible on mobile, outside the menu */}
            <Link
              href="/checkout"
              className="w-[38px] h-[38px] rounded-full border border-[#FFFFFF1A] flex items-center justify-center cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
              >
                <path
                  d="M13.2994 1.34215H0.000488281V2.74203H1.61035L4.07484 9.51956C4.17296 9.78961 4.3518 10.0229 4.58709 10.1878C4.82237 10.3527 5.10271 10.4413 5.39003 10.4414H11.1995V9.0415H5.39003L4.88047 7.64162H11.1995C11.4795 7.64162 11.7329 7.47503 11.8428 7.21745L13.9426 2.31787C13.9886 2.21143 14.0074 2.09522 13.9973 1.9797C13.9872 1.86419 13.9484 1.75302 13.8846 1.65621C13.8208 1.5594 13.7339 1.48 13.6317 1.42517C13.5295 1.37034 13.4153 1.34181 13.2994 1.34215Z"
                  fill="white"
                />
                <path
                  d="M5.94994 13.2412C6.52978 13.2412 6.99985 12.7711 6.99985 12.1913C6.99985 11.6114 6.52978 11.1413 5.94994 11.1413C5.37009 11.1413 4.90002 11.6114 4.90002 12.1913C4.90002 12.7711 5.37009 13.2412 5.94994 13.2412Z"
                  fill="white"
                />
                <path
                  d="M10.1496 13.2412C10.7295 13.2412 11.1996 12.7711 11.1996 12.1913C11.1996 11.6114 10.7295 11.1413 10.1496 11.1413C9.56979 11.1413 9.09973 11.6114 9.09973 12.1913C9.09973 12.7711 9.56979 13.2412 10.1496 13.2412Z"
                  fill="white"
                />
              </svg>
            </Link>

            {/* Avatar outside the menu (only when logged in) */}
            {loggedIn && (
              <div className="relative" ref={mobileAvatarRef}>
                <button
                  type="button"
                  onClick={() => setMobileAvatarOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={mobileAvatarOpen}
                  className="w-[38px] h-[38px] rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary-500 hover:ring-2 hover:ring-white/10"
                >
                  <Image
                    src={avatarSrc}
                    alt={session?.user?.name ?? "Profile"}
                    width={38}
                    height={38}
                    className="object-cover rounded-full"
                  />
                </button>
                {mobileAvatarOpen && (
                  <div className="absolute right-0 mt-2 w-56 z-50">
                    <div className="relative">
                      {/* caret */}
                      <span className="pointer-events-none absolute -top-2 right-4 h-3 w-3 rotate-45 bg-neutral-900/95 border border-white/10 border-b-0 border-r-0"></span>

                      <div
                        role="menu"
                        aria-label="Account"
                        className="overflow-hidden rounded-xl border border-white/10 bg-neutral-900/95 backdrop-blur shadow-2xl ring-1 ring-black/40"
                      >
                        <div className="px-4 py-3 border-b border-white/5">
                          <p className="text-[11px] uppercase tracking-wide text-neutral-400">
                            Signed in as
                          </p>
                          <p className="mt-0.5 text-sm font-medium text-neutral-0 truncate">
                            {session?.user?.email ||
                              session?.user?.name ||
                              "User"}
                          </p>
                        </div>

                        <div className="p-1.5">
                          <Link
                            href="/dashboard"
                            role="menuitem"
                            onClick={() => setMobileAvatarOpen(false)}
                            className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-neutral-0 hover:bg-white/5 focus:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
                          >
                            <LayoutDashboard className="h-4 w-4 opacity-80" />
                            <span className="text-sm">Dashboard</span>
                          </Link>

                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => signOut({ callbackUrl: "/" })}
                            className="mt-0.5 w-full flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-left text-neutral-0 hover:bg-white/5 focus:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
                          >
                            <LogOut className="h-4 w-4 opacity-80" />
                            <span className="text-sm">Logout</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Hamburger toggle */}
            <button
              className="block lg:hidden text-neutral-0 z-50"
              onClick={() => {
                setMobileOpen(!mobileOpen);
                setMobileAvatarOpen(false);
              }}
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M2 5.995C2 5.445 2.446 5 2.995 5H11.005C11.2689 5 11.522 5.10483 11.7086 5.29143C11.8952 5.47803 12 5.73111 12 5.995C12 6.25889 11.8952 6.51197 11.7086 6.69857C11.522 6.88517 11.2689 6.99 11.005 6.99H2.995C2.445 6.99 2 6.545 2 5.995ZM2 12C2 11.45 2.446 11.005 2.995 11.005H21.005C21.2689 11.005 21.522 11.1098 21.7086 11.2964C21.8952 11.483 22 11.7361 22 12C22 12.2639 21.8952 12.517 21.7086 12.7036C21.522 12.8902 21.2689 12.995 21.005 12.995H2.995C2.445 12.995 2 12.549 2 12ZM2.995 17.01C2.73111 17.01 2.47803 17.1148 2.29143 17.3014C2.10483 17.488 2 17.7411 2 18.005C2 18.2689 2.10483 18.522 2.29143 18.7086C2.47803 18.8952 2.73111 19 2.995 19H15.005C15.1357 19 15.2651 18.9743 15.3858 18.9243C15.5065 18.8743 15.6162 18.801 15.7086 18.7086C15.801 18.6162 15.8743 18.5065 15.9243 18.3858C15.9743 18.2651 16 18.1357 16 18.005C16 17.8743 15.9743 17.7449 15.9243 17.6242C15.8743 17.5035 15.801 17.3938 15.7086 17.3014C15.6162 17.209 15.5065 17.1357 15.3858 17.0857C15.2651 17.0357 15.1357 17.01 15.005 17.01H2.995Z"
                    fill="white"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* mobile menu ------------------------------------------------------ */}
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-40 bg-neutral-950/90 backdrop-blur">
            <div className="flex flex-col items-center justify-center h-full space-y-6 px-4">
              {/* search moved into mobile menu */}
              <div className="w-full max-w-[263px]">
                {/* NEW: same search form guard on mobile */}
                <form
                  role="search"
                  autoComplete="off"
                  onSubmit={(e) => e.preventDefault()}
                >
                  <Input
                    variant="frosted"
                    shape="pill"
                    size="sm"
                    name="q"
                    inputMode="search"
                    enterKeyHint="search"
                    autoComplete="off"
                    placeholder="Search events"
                    icon={
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="17"
                        viewBox="0 0 16 17"
                        fill="none"
                        focusable="false"
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 text-white/70" // ← force visible color
                      >
                        <circle
                          cx="7.824"
                          cy="7.825"
                          r="6.741"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        />
                        <path
                          d="M12.514 12.864 L 15.157 15.5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    }
                  />
                </form>
              </div>

              {showDemo && (
                <Link href="/demo" onClick={() => setMobileOpen(false)}>
                  Book a Demo
                </Link>
              )}
              <Link href="/events" onClick={() => setMobileOpen(false)}>
                Events
              </Link>
              <Link href="/about" onClick={() => setMobileOpen(false)}>
                About us
              </Link>

              {!loggedIn ? (
                <>
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => openModal("login")}
                  >
                    Log in
                  </Button>
                  <Button size="lg" onClick={() => openModal("register")}>
                    Sign up
                  </Button>
                </>
              ) : (
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => {
                    setMobileOpen(false);
                    signOut({ callbackUrl: "/" });
                  }}
                >
                  Logout
                </Button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* register / login modal only available when not logged-in */}
      {!loggedIn && (
        <RegisterLoginModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          initialMode={modalMode}
        />
      )}
    </>
  );
}
