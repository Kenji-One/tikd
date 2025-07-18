"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Menu, X } from "lucide-react";
import clsx from "classnames";
import { Input } from "@/components/ui/Input";

export default function Header() {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  const [open, setOpen] = useState(false);

  return (
    <header
      className={clsx(
        isLanding ? "sticky top-0" : "absolute top-0",
        "z-50 w-full"
      )}
    >
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 pt-4">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image src="/logo.svg" alt="Tikd." width={72} height={24} priority />
        </Link>

        {/* Search + Desktop Nav */}
        <div className="flex items-center gap-4 justify-between w-full max-w-[732px]">
          <Input
            variant="frosted"
            shape="pill"
            size="sm"
            maxWidth={263}
            placeholder="Search events"
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="17"
                viewBox="0 0 16 17"
                fill="none"
              >
                <circle
                  cx="7.82492"
                  cy="7.82492"
                  r="6.74142"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12.5137 12.8638L15.1567 15.4999"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
          />

          <nav className="hidden lg:flex items-center space-x-6 text-sm font-medium text-neutral-50">
            <Link href="/events">Events</Link>
            <Link href="/about">About us</Link>
            <div className="flex items-center gap-2">
              <Button variant="secondary">
                <Link href="/login">Log in</Link>
              </Button>
              <Button>
                <Link href="/register">Sign up</Link>
              </Button>
            </div>
          </nav>
        </div>

        {/* Mobile menu toggle */}
        <button
          className="block lg:hidden text-neutral-0"
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu sheet */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 bg-neutral-950/90 backdrop-blur">
          <div className="flex flex-col items-center justify-center h-full space-y-6 text-lg font-medium">
            <Link href="/events" onClick={() => setOpen(false)}>
              Events
            </Link>
            <Link href="/about" onClick={() => setOpen(false)}>
              About us
            </Link>
            <Link href="/login" onClick={() => setOpen(false)}>
              Log in
            </Link>
            <Button size="lg" onClick={() => setOpen(false)} asChild>
              <Link href="/register">Sign up</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
