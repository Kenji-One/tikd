/* ------------------------------------------------------------------ */
/*  src/app/page.tsx – public landing page for Tikd.                  */
/*  Figma: "Tickets Made Easy"                                        */
/* ------------------------------------------------------------------ */
"use client";

import Link from "next/link";
import { useId, useMemo, useState, type CSSProperties } from "react";
import clsx from "clsx";
import { ChevronDown, ChevronUp } from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/ui/Button";
import EventCarouselSection, {
  type Event,
} from "@/components/sections/Landing/EventCarouselSection";

/* ------------------------------------------------------------------ */
/*  Background (mesh + old grid)                                       */
/* ------------------------------------------------------------------ */
const pageMesh: CSSProperties = {
  background:
    "radial-gradient(1100px 640px at 8% 12%, rgba(130, 46, 255, .35), transparent 62%)," +
    "radial-gradient(1000px 560px at 92% 10%, rgba(130, 46, 255, .28), transparent 62%)," +
    "radial-gradient(900px 560px at 50% 110%, rgba(196, 181, 253, .16), transparent 60%)",
};

const gridOverlayStyle: CSSProperties = {
  backgroundImage:
    "linear-gradient(to right, rgba(255,255,255,.65) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.65) 1px, transparent 1px)",
  backgroundSize: "60px 60px",
  maskImage: "radial-gradient(1100px 680px at 50% 18%, black, transparent 70%)",
};

/* ------------------------------------------------------------------ */
/*  Demo data (swap with real API)                                     */
/* ------------------------------------------------------------------ */
const trendingEvents: Event[] = [
  {
    id: "24",
    title: "Senior Rave",
    dateLabel: "May 23, 2025 · 6:00 PM",
    venue: "Brooklyn, NY",
    img: "/dummy/event-2.png",
    category: "Trending",
  },
  {
    id: "32",
    title: "Swim Good Open Air",
    dateLabel: "May 23, 2025 · 6:00 PM",
    venue: "Brooklyn, NY",
    img: "/dummy/event-3.png",
    category: "Trending",
  },
  {
    id: "4",
    title: "Summer Kickoff",
    dateLabel: "May 23, 2025 · 6:00 PM",
    venue: "Brooklyn, NY",
    img: "/dummy/event-4.png",
    category: "Trending",
  },
  {
    id: "5",
    title: "Evol Saturdays",
    dateLabel: "May 23, 2025 · 6:00 PM",
    venue: "Brooklyn, NY",
    img: "/dummy/event-5.png",
    category: "Trending",
  },
  {
    id: "1765756",
    title: "Sunset Rooftop Session",
    dateLabel: "Jun 02, 2025 · 7:30 PM",
    venue: "Downtown LA",
    img: "/dummy/event-2.png",
    category: "Trending",
  },
  {
    id: "2453453",
    title: "Basement Techno Night",
    dateLabel: "Jun 11, 2025 · 11:00 PM",
    venue: "Berlin, DE",
    img: "/dummy/event-3.png",
    category: "Trending",
  },
  {
    id: "1657675",
    title: "NYC Highschool Party",
    dateLabel: "May 23, 2025 · 6:00 PM",
    venue: "Brooklyn, NY",
    img: "/dummy/event-1.png",
    category: "Trending",
  },
  {
    id: "19867",
    title: "After Prom RSVP",
    dateLabel: "May 23, 2025 · 6:00 PM",
    venue: "Mepham",
    img: "/dummy/event-4.png",
    category: "Trending",
  },
];

type FaqItem = { q: string; a: string };

const faqItems: FaqItem[] = [
  {
    q: "How do tickets work on Tikd?",
    a: "Buy a ticket, get instant delivery, and scan it at the door. No mystery steps, no weird redirects.",
  },
  {
    q: "Can I refund or transfer tickets?",
    a: "Policies depend on the organizer. Tikd supports transfers and refunds when the event allows it.",
  },
  {
    q: "Is checkout secure?",
    a: "Yes — secure payments, clear totals, and a smooth flow designed to minimize drop-offs.",
  },
  {
    q: "How do I host an event on Tikd?",
    a: "Create an organizer account, set up your event page, publish, and start selling. Tools included for promotion and check-in.",
  },
];

/* ------------------------------------------------------------------ */
/*  Small UI blocks                                                    */
/* ------------------------------------------------------------------ */
function SectionKicker({ children }: { children: string }) {
  return (
    <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-300">
      {children}
    </p>
  );
}

function HeroPhones() {
  return (
    <div className="relative mx-auto w-full max-w-[560px]">
      {/* Keep the same aspect as before so layout stays stable */}
      <div className="relative aspect-[5/4]">
        <Image
          src="/landing/hero-phones.png"
          alt="Tikd app preview"
          fill
          priority
          sizes="(min-width: 1024px) 560px, 92vw"
          className="select-none object-contain"
        />
      </div>
    </div>
  );
}

function Faq({ items }: { items: FaqItem[] }) {
  const baseId = useId();
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="mx-auto w-full max-w-[920px]">
      <h2 className="text-center text-4xl font-black italic leading-[0.9] tracking-[-1.04px] sm:text-[52px]">
        F.A.Q.
      </h2>

      <div className="mt-8 divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-neutral-950/50">
        {items.map((it, idx) => {
          const isOpen = openIdx === idx;
          const panelId = `${baseId}-panel-${idx}`;
          const buttonId = `${baseId}-btn-${idx}`;

          return (
            <div key={it.q} className="px-5 py-4 sm:px-6">
              <button
                id={buttonId}
                type="button"
                className="flex w-full items-center justify-between gap-4 text-left"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenIdx((cur) => (cur === idx ? null : idx))}
              >
                <span className="text-base font-medium text-neutral-0 sm:text-lg">
                  {it.q}
                </span>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-neutral-950/60">
                  {isOpen ? (
                    <ChevronUp className="h-5 w-5 text-neutral-200" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-neutral-200" />
                  )}
                </span>
              </button>

              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                className={clsx(
                  "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
                  isOpen
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0"
                )}
              >
                <div className="overflow-hidden">
                  <p className="mt-3 text-sm leading-relaxed text-neutral-200 sm:text-base">
                    {it.a}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  HERO Ellipses (Figma)                                              */
/* ------------------------------------------------------------------ */
const heroEllipseBase: CSSProperties = {
  width: 251,
  height: 413,
  borderRadius: 413,
  background: "var(--color-primary-500)",
  filter: "blur(232px)",
  transform: "rotate(-26.157deg)",
  opacity: 0.9,
};

/* ------------------------------------------------------------------ */
/*  Features (pixel-layout like Figma)                                 */
/* ------------------------------------------------------------------ */

function FeatureTag() {
  return (
    <span className="inline-flex h-7 items-center rounded-sm bg-primary-800/70 px-4 text-[14px] font-medium text-primary-200 ring-1 ring-white/5">
      Features
    </span>
  );
}

type FeatureCardProps = {
  title: string; // use \n for line breaks
  size: "lg" | "md" | "sm";
  className?: string;
  children?: React.ReactNode;
};

function FeatureCard({ title, size, className, children }: FeatureCardProps) {
  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-2xl border border-white/5",
        // Figma-ish “deep navy card”
        "bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.00))] bg-neutral-948",
        "shadow-[0_30px_80px_-60px_rgba(0,0,0,.9)] min-h-[280px] sm:min-h-[321px]",

        className
      )}
    >
      {/* soft top glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(900px 380px at 50% -30%, rgba(154,70,255,.22), transparent 60%)",
        }}
      />

      <div className={"relative z-10 pt-8 pl-8 w-full"}>
        <FeatureTag />

        <h3
          className={clsx(
            "mt-4 whitespace-pre-line font-black italic uppercase text-white leading-[90%]",
            size === "lg" || size === "md"
              ? "text-[32px] tracking-[-0.64px] "
              : "text-[24px] tracking-[-0.48px]"
          )}
        >
          {title}
        </h3>
      </div>

      {/* media/placeholder */}
      {children}
    </div>
  );
}

/* ------------------- Feature media placeholders (no assets) ------------------- */
/* Replace any of these blocks later with a single <div style={{backgroundImage:`url(...)`}} /> */

function MediaLaptopPlaceholder() {
  return (
    <div className="pointer-events-none flex items-end justify-end w-[397px] h-[98%] absolute bottom-0 right-0">
      <img
        src="/landing/features/feature-control.png"
        alt=""
        className="object-cover w-full h-full"
      />
    </div>
  );
}

function MediaEventSetupPlaceholder() {
  return (
    <div className="pointer-events-none flex items-end justify-end w-[290px] h-[90%] absolute bottom-0 right-0">
      <img
        src="/landing/features/feature-event-setup.png"
        alt=""
        className="w-full h-full"
      />
    </div>
  );
}

function MediaWideScreenshotPlaceholder({
  src,
  align = "center",
}: {
  src: string;
  align?: "center" | "right";
}) {
  return (
    <div className="pointer-events-none flex items-end justify-end w-full h-[90%] absolute bottom-0 right-0 pl-8">
      <img src={src} alt="" className="w-full h-auto" />
    </div>
  );
}

function HelpCenterPagePlaceholder({
  src,
  align = "center",
}: {
  src: string;
  align?: "center" | "right";
}) {
  return (
    <div className="pointer-events-none flex items-end justify-end w-full h-[72%] absolute bottom-0 right-0 pl-8">
      <img src={src} alt="" className="w-auto h-full" />
    </div>
  );
}

function MediaMegaphonePlaceholder() {
  return (
    <div className="pointer-events-none flex items-end justify-end w-[87%] h-full absolute bottom-0 right-0 pl-8">
      <img
        src="/landing/features/feature-promo-marketing.png"
        alt=""
        className="w-full h-auto"
      />
    </div>
  );
}

const allInOneImages = {
  top: "/landing/all-in-one/top.jpg",
  main: "/landing/all-in-one/main.png",
  bottom: "/landing/all-in-one/bottom.jpg",
};

function AllInOneCollage() {
  return (
    <div className="relative mx-auto w-full max-w-[490px]">
      {/* Fixed height so overlap stays consistent like Figma */}
      <div className="relative h-[330px] sm:h-[390px] lg:h-[430px]">
        {/* TOP (back image) */}
        <div className="absolute right-0 top-0 h-[42%] w-[52%] overflow-hidden rounded-lg ring-1 ring-white/10 shadow-[0_30px_80px_-55px_rgba(0,0,0,.9)]">
          <Image
            src={allInOneImages.top}
            alt="Venue exterior"
            fill
            sizes="(min-width:1024px) 360px, 60vw"
            className="object-cover"
            priority={false}
          />
          <div className="absolute inset-0 bg-black/45" />
        </div>

        {/* MAIN (front image with purple border) */}
        <div className="absolute left-0 top-[18%] h-[55%] w-[68%] overflow-hidden rounded-lg border-2 border-primary-500 shadow-[0_40px_110px_-70px_rgba(154,70,255,.65)] z-10">
          <Image
            src={allInOneImages.main}
            alt="Ticket scanning on mobile"
            fill
            sizes="(min-width:1024px) 420px, 75vw"
            className="object-cover"
            priority={false}
          />
        </div>

        {/* BOTTOM (dimmed image) */}
        <div className="absolute bottom-0 -right-8 h-[44%] w-[52%] overflow-hidden rounded-lg ring-1 ring-white/10 shadow-[0_30px_80px_-55px_rgba(0,0,0,.9)]">
          <Image
            src={allInOneImages.bottom}
            alt="Ticket handoff"
            fill
            sizes="(min-width:1024px) 360px, 60vw"
            className="object-cover"
            priority={false}
          />
          <div className="absolute inset-0 bg-black/60" />
        </div>
      </div>
    </div>
  );
}

const unlockPhoneSrc = "/landing/phone.svg";

function UnlockLabel({
  children,
  emphasize = false,
  className,
}: {
  children: string;
  emphasize?: boolean;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "font-black italic uppercase leading-[0.9] tracking-[-0.48px] text-[20px] sm:text-[24px]",
        emphasize ? "text-white" : "text-neutral-300",
        className
      )}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function LandingPage() {
  const stats = useMemo(
    () => [
      { k: "+20", label: "Venues" },
      { k: "+150", label: "Events Hosted" },
      { k: "+10", label: "Tickets Sold" },
    ],
    []
  );

  return (
    <main className="relative overflow-hidden bg-neutral-950 text-neutral-0">
      {/* Global backdrop */}
      <div
        className="pointer-events-none absolute inset-0 -z-30 opacity-95"
        style={pageMesh}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 -z-20 opacity-[.08]"
        style={gridOverlayStyle}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(1400px 520px at 50% -10%, rgba(0,0,0,.0), rgba(0,0,0,.65) 55%, rgba(0,0,0,.9) 100%)",
        }}
        aria-hidden
      />

      {/* ------------------------------------------------------------------ */}
      {/* HERO (Tickets Made Easy)                                           */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative">
        {/* Figma ellipses (left + right) */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          {/* left ellipse */}
          <div
            className="absolute"
            style={{
              ...heroEllipseBase,
              left: -120,
              bottom: -240,
            }}
          />
          {/* right ellipse */}
          <div
            className="absolute"
            style={{
              ...heroEllipseBase,
              right: -160,
              top: -140,
            }}
          />
        </div>

        <div className="mx-auto max-w-[1232px] px-4 pt-16 sm:pt-20 lg:pt-24">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_.95fr] lg:gap-14">
            {/* left */}
            <div className="text-left space-y-4 sm:space-y-6 ">
              {/* Figma: 2-line title: "TICKETS" / "MADE EASY." */}
              <h1 className="font-black italic uppercase leading-[90%] tracking-[-1.6px] text-[52px] sm:text-[72px] lg:text-[80px]">
                <span className="block">Tickets</span>
                <span className="block">Made Easy.</span>
              </h1>

              <p className="max-w-[390px] text-pretty text-[13px] leading-[1.45] text-white sm:text-[14px]">
                Buy, sell, and discover tickets effortlessly. Fast, secure, and
                hassle-free, so you can focus on the event — not the process.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <Button asChild size="md" variant="primary">
                  <Link href="/events">Browse Events</Link>
                </Button>

                <Button asChild size="md" variant="secondary">
                  <Link href="/book-demo">Book a Demo</Link>
                </Button>
              </div>
            </div>

            {/* right */}
            <div className="pb-2 lg:pb-0">
              <HeroPhones />
            </div>
          </div>
        </div>

        {/* Trending Events slider */}
        <div className="mt-20">
          <EventCarouselSection
            title="Trending Events"
            events={trendingEvents}
          />
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* ALL-IN-ONE PLATFORM                                                */}
      {/* ------------------------------------------------------------------ */}
      <section className="mx-auto max-w-[1232px] px-4 py-16 sm:py-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1fr] lg:gap-24">
          {/* left: collage */}
          <AllInOneCollage />

          {/* right: copy */}
          <div className="max-w-[560px] space-y-6">
            <h2 className="font-black italic uppercase leading-[0.9] tracking-[-1.04px] text-[36px] sm:text-[44px] lg:text-[52px]">
              ALL-IN-ONE
              <br />
              PLATFORM
            </h2>

            <p className="max-w-[390px] text-[13px] leading-[1.3] tracking-[-0.28px] text-white/70 sm:text-[14px]">
              From ticket creation to seamless check-ins, promotion, and
              payouts, Tikd gives you everything you need to run a successful
              event—whether you’re hosting a nightclub party, concert, or
              private gathering—all in one place.
            </p>

            <div className="flex flex-wrap gap-x-8 gap-y-8">
              {stats.map((s) => (
                <div key={s.label}>
                  <div className="text-[28px] font-semibold leading-none tracking-[-0.64px] text-white sm:text-[32px]">
                    {s.k}
                  </div>
                  <div className="mt-1 text-[14px] text-white/55 leading-[1.3] tracking-[-0.28px]">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* FEATURES (match Figma layout)                                      */}
      {/* ------------------------------------------------------------------ */}
      <section className="mx-auto max-w-[1232px] px-4 pb-16 sm:pb-20">
        <div className="grid gap-4">
          {/* Row 1: two big cards */}
          <div className="grid gap-4 lg:grid-cols-[2.44fr_1.73fr]">
            <FeatureCard size="lg" title={"Control everything\nin one place"}>
              {/* Replace with your real image later:
                  <div className="absolute ... bg-cover" style={{backgroundImage:'url(...)'}} />
               */}
              <MediaLaptopPlaceholder />
            </FeatureCard>

            <FeatureCard size="md" title={"Event page\nset-up"}>
              {/* Replace with your real collage image later */}
              <MediaEventSetupPlaceholder />
            </FeatureCard>
          </div>

          {/* Row 2: three smaller cards */}
          <div className="grid gap-4 lg:grid-cols-3">
            <FeatureCard size="sm" title={"Ticket creation"}>
              <MediaWideScreenshotPlaceholder
                src="/landing/features/feature-ticket-creation.png"
                align="center"
              />
            </FeatureCard>

            <FeatureCard size="sm" title={"Promotion &\nmarketing"}>
              {/* Replace with real illustration image later */}
              <MediaMegaphonePlaceholder />
            </FeatureCard>

            <FeatureCard size="sm" title={"Attendee\nmanagement\n& check-in"}>
              <HelpCenterPagePlaceholder
                src="/landing/features/feature-attendee-checkin.png"
                align="right"
              />
            </FeatureCard>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* UNLOCK YOUR FULL POTENTIAL                                         */}
      {/* ------------------------------------------------------------------ */}
      <section className="mx-auto max-w-[1232px] px-4 pt-16 sm:pt-20 -mb-4.5">
        <h2 className="text-center font-black italic uppercase leading-[0.9] tracking-[-1.04px] text-[36px] sm:text-[44px] lg:text-[52px]">
          UNLOCK YOUR FULL
          <br className="hidden sm:block" />
          POTENTIAL
        </h2>

        <div className="relative mt-10 grid items-center gap-10 lg:mt-14 lg:grid-cols-[1fr_auto_1fr]">
          {/* LEFT labels (desktop) */}
          <div className="relative hidden h-[560px] lg:block">
            <UnlockLabel emphasize className="absolute left-0 top-[90px]">
              FRIENDLY DASHBOARD
            </UnlockLabel>

            <UnlockLabel className="absolute left-[110px] top-[275px]">
              SCORE STREAKS
            </UnlockLabel>

            <UnlockLabel className="absolute left-[-40px] bottom-[40px]">
              PERSONALIZED ACHIEVEMENTS
            </UnlockLabel>
          </div>

          {/* CENTER phone */}
          <div className="relative mx-auto">
            {/* Figma ellipse glow */}
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 -bottom-[52%] h-[429px] w-[765px] -translate-x-1/2 rounded-full"
              style={{
                background: "rgba(255,255,255,0.20)",
                filter: "blur(267px)",
              }}
            />

            <div className="relative mx-auto aspect-[9/16] w-[280px] sm:w-[340px] lg:w-[380px]">
              <Image
                src={unlockPhoneSrc}
                alt="Tikd app preview"
                fill
                sizes="(min-width: 1024px) 380px, (min-width: 640px) 340px, 280px"
                className=" drop-shadow-[0_60px_140px_rgba(0,0,0,.75)]"
              />
            </div>
          </div>

          {/* RIGHT labels (desktop) */}
          <div className="relative hidden h-[560px] text-right lg:block">
            <UnlockLabel className="absolute right-0 top-[90px]">
              OPTIMIZE RECOVERY
            </UnlockLabel>

            <UnlockLabel className="absolute right-0 top-[245px]">
              DAILY VIDEOS TAILORED FOR YOU
            </UnlockLabel>

            <UnlockLabel className="absolute right-0 bottom-[70px]">
              MONITOR YOUR PROGRESS
            </UnlockLabel>
          </div>

          {/* Mobile labels */}
          <div className="grid gap-5 sm:grid-cols-2 lg:hidden">
            <UnlockLabel emphasize className="text-center sm:text-left">
              FRIENDLY DASHBOARD
            </UnlockLabel>
            <UnlockLabel className="text-center sm:text-right">
              OPTIMIZE RECOVERY
            </UnlockLabel>

            <UnlockLabel className="text-center sm:text-left">
              SCORE STREAKS
            </UnlockLabel>
            <UnlockLabel className="text-center sm:text-right">
              DAILY VIDEOS TAILORED FOR YOU
            </UnlockLabel>

            <UnlockLabel className="text-center sm:text-left">
              PERSONALIZED ACHIEVEMENTS
            </UnlockLabel>
            <UnlockLabel className="text-center sm:text-right">
              MONITOR YOUR PROGRESS
            </UnlockLabel>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* FAQ                                                                */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative isolate px-4 py-16 sm:py-20">
        <div
          className="absolute inset-0 -z-10 bg-gradient-to-br from-primary-700/35 via-primary-900/25 to-neutral-950"
          aria-hidden
        />
        <Faq items={faqItems} />
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Final CTA                                                          */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative isolate px-8 pb-16 sm:py-[80px]">
        <div
          className="
    relative overflow-hidden rounded-2xl border border-white/10
    bg-[url('/landing/gg-frame.png')]
    bg-cover bg-center bg-no-repeat
    p-10 sm:p-[64px]
  "
        >
          <div className="relative flex flex-col items-center text-center">
            <h3 className="text-5xl font-black italic leading-[0.9] tracking-[-1.04px] sm:text-[64px] max-w-[490px]">
              LET&apos;S GET TO PARTY!
            </h3>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="md">
                <Link href="/events">Browse Events</Link>
              </Button>
              <Button asChild size="md" variant="secondary">
                <Link href="/book-demo">Book a Demo</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
