// src/components/layout/Footer.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import {
  FaDiscord,
  FaTwitter,
  FaRedditAlien,
  FaGithub,
  FaYoutube,
  FaTelegram,
} from "react-icons/fa";
import { ChevronDown } from "lucide-react";

const socialIcons = [
  { href: "https://discord.com", icon: <FaDiscord />, label: "Discord" },
  { href: "https://twitter.com", icon: <FaTwitter />, label: "Twitter" },
  { href: "https://reddit.com", icon: <FaRedditAlien />, label: "Reddit" },
  { href: "https://github.com", icon: <FaGithub />, label: "GitHub" },
  { href: "https://youtube.com", icon: <FaYoutube />, label: "YouTube" },
  { href: "https://telegram.org", icon: <FaTelegram />, label: "Telegram" },
];

type LinkItem = { label: string; href: string };
type LinkGroup = { title: string; links: LinkItem[] };

const groups: LinkGroup[] = [
  {
    title: "Company",
    links: [
      { label: "Sell on TIKD", href: "/organizers" },
      { label: "About", href: "/about" },
      { label: "Discover", href: "/discover" },
      { label: "Fan Support", href: "/help" },
      { label: "Blog", href: "/blog" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Help Center", href: "/help" },
      { label: "Status", href: "/status" },
      { label: "Pricing", href: "/pricing" },
      { label: "Developers", href: "/developers" },
      { label: "Brand Assets", href: "/brand" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Cookie Policy", href: "/legal/cookies" },
      { label: "Manage Cookies", href: "/legal/cookies#manage" },
      { label: "Privacy Policy", href: "/legal/privacy" },
      { label: "Privacy Choices", href: "/legal/choices" },
      { label: "Do not sell my info", href: "/legal/do-not-sell" },
      { label: "Terms", href: "/legal/terms" },
    ],
  },
];

function NavColumn({ title, links }: LinkGroup) {
  return (
    <nav aria-label={title}>
      <h4 className="mb-4 text-sm font-semibold text-neutral-200/80 tracking-wide">
        {title}
      </h4>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.label}>
            <Link
              href={l.href}
              className="inline-flex items-center gap-2 rounded text-neutral-300 transition-colors hover:text-neutral-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600/60"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Branded select with hidden native/plug-in arrow */
function SelectControl({
  id,
  options,
  defaultValue,
  ariaLabel,
}: {
  id: string;
  options: { value: string; label: string }[];
  defaultValue: string;
  ariaLabel: string;
}) {
  return (
    <div className="relative w-full">
      <label htmlFor={id} className="sr-only">
        {ariaLabel}
      </label>
      <select
        id={id}
        defaultValue={defaultValue}
        className={[
          // layout
          "w-full rounded-2xl px-4 py-3 pr-10",
          // hide native + plugin arrow
          "appearance-none [-webkit-appearance:none] [-moz-appearance:none] !bg-none [background-image:none]",
          // surface
          "bg-neutral-900/80 text-neutral-200",
          // borders
          "border border-white/10 hover:border-white/20",
          // focus brand
          "focus-visible:outline-none focus-visible:border-primary-700 focus-visible:ring-4 focus-visible:ring-primary-700/25",
          "transition-colors",
        ].join(" ")}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {/* our only chevron */}
      <svg
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <path
          d="M6 9l6 6 6-6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function StoreBadge({
  platform,
  sub,
  href,
  svg,
}: {
  platform: string;
  sub: string;
  href: string;
  svg: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="group inline-flex items-center gap-3 rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 hover:border-primary-700/50 hover:bg-neutral-800/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600/60"
    >
      <span aria-hidden className="shrink-0 text-neutral-100">
        {svg}
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-[10px] uppercase tracking-widest text-neutral-400">
          {sub}
        </span>
        <span className="text-sm font-semibold text-neutral-0">{platform}</span>
      </span>
    </a>
  );
}

export default function Footer() {
  return (
    <footer className="bg-neutral-948 text-neutral-0">
      {/* subtle top gradient divider */}
      <div className="h-px w-full bg-gradient-to-r from-primary-700/0 via-primary-700/50 to-primary-700/0" />

      <div className="mx-auto max-w-[1232px] px-4 md:px-6">
        {/* Top: brand only (newsletter removed) */}
        <section className="flex items-center justify-between gap-6 py-8">
          <div className="flex items-center gap-4">
            <Image
              src="/Logo.svg"
              width={96}
              height={34}
              alt="Tikd Logo"
              className="opacity-95"
            />
            <span className="hidden h-6 w-px bg-white/10 md:block" />
            <p className="hidden text-neutral-300 md:block">
              Discover, buy, and enjoy the night with Tikd.
            </p>
          </div>
        </section>

        {/* Middle Grid: nav columns + app badges + locale selectors */}
        <section className="grid grid-cols-1 gap-10 pb-10 md:grid-cols-4">
          {groups.map((g) => (
            <NavColumn key={g.title} {...g} />
          ))}

          <div>
            <h4 className="mb-4 text-sm font-semibold text-neutral-200/80 tracking-wide">
              Get Tikd.
            </h4>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
              <StoreBadge
                platform="Desktop App"
                sub="Download on"
                href="#"
                svg={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 14 14"
                    fill="none"
                  >
                    <path
                      d="M1.75089 3.19498L6.05414 2.60232V6.75973H1.75031V3.19557L1.75089 3.19498ZM1.75089 10.8028L6.05414 11.3961V7.2894H1.75031L1.75089 10.8028ZM6.52722 11.4591L12.2509 12.2489V7.2894H6.52722V11.4591ZM6.52722 2.53873V6.75973H12.2509V1.7489L6.52722 2.53873Z"
                      fill="currentColor"
                    />
                  </svg>
                }
              />
              <StoreBadge
                platform="iOS"
                sub="Download on"
                href="#"
                svg={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 14 14"
                    fill="none"
                  >
                    <path
                      d="M9.94585 11.831C9.37418 12.3852 8.75001 12.2977 8.14918 12.0352C7.51335 11.7669 6.93001 11.7552 6.25918 12.0352C5.41918 12.3969 4.97585 12.2919 4.47418 11.831C1.62751 8.89687 2.04751 4.42854 5.27918 4.2652C6.06668 4.30604 6.61501 4.69687 7.07585 4.73187C7.76418 4.59187 8.42335 4.18937 9.15835 4.24187C10.0392 4.31187 10.7042 4.66187 11.1417 5.29187C9.32168 6.3827 9.75335 8.7802 11.4217 9.45104C11.0892 10.326 10.6575 11.1952 9.94001 11.8369L9.94585 11.831ZM7.01751 4.2302C6.93001 2.92937 7.98585 1.85604 9.19918 1.75104C9.36835 3.25604 7.83418 4.37604 7.01751 4.2302Z"
                      fill="currentColor"
                    />
                  </svg>
                }
              />
            </div>

            {/* Language / Currency selectors (newsletter removed) */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              {/* <SelectControl
                id="language"
                ariaLabel="Language"
                defaultValue="en"
                options={[
                  { value: "en", label: "English" },
                  { value: "ka", label: "ქართული" },
                ]}
              />
              <SelectControl
                id="currency"
                ariaLabel="Currency"
                defaultValue="USD"
                options={[
                  { value: "USD", label: "USD" },
                  { value: "GEL", label: "GEL" },
                  { value: "EUR", label: "EUR" },
                ]}
              /> */}
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="h-px w-full bg-white/10" />

        {/* Bottom Bar */}
        <section className="flex flex-col-reverse items-center justify-between gap-6 py-6 md:flex-row">
          <p className="text-xs text-neutral-400">
            © {new Date().getFullYear()} TIKD. All rights reserved.
          </p>

          <ul className="flex flex-wrap items-center gap-5 text-sm">
            <li>
              <Link
                href="/legal/privacy"
                className="rounded text-neutral-400 transition-colors hover:text-neutral-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600/60"
              >
                Privacy
              </Link>
            </li>
            <li>
              <Link
                href="/legal/terms"
                className="rounded text-neutral-400 transition-colors hover:text-neutral-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600/60"
              >
                Terms
              </Link>
            </li>
            <li>
              <Link
                href="/status"
                className="rounded text-neutral-400 transition-colors hover:text-neutral-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600/60"
              >
                System Status
              </Link>
            </li>
          </ul>

          {/* Socials */}
          <div className="flex items-center gap-4 text-xl">
            {socialIcons.map(({ href, icon, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="rounded p-1 text-neutral-400 transition-colors hover:text-neutral-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600/60"
              >
                {icon}
              </a>
            ))}
          </div>
        </section>
      </div>
    </footer>
  );
}
