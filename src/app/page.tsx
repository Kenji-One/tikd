// src/app/page.tsx
"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import clsx from "clsx";
import { ChevronDown, ChevronUp } from "lucide-react";
import Image from "next/image";
import { MotionConfig, motion, type Variants } from "framer-motion";

import { Button } from "@/components/ui/Button";

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
/*  FAQ                                                                */
/* ------------------------------------------------------------------ */
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
                    : "grid-rows-[0fr] opacity-0",
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
  title: string;
  size: "lg" | "md" | "sm";
  className?: string;
  children?: React.ReactNode;
};

function FeatureCard({ title, size, className, children }: FeatureCardProps) {
  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-2xl border border-white/5",
        "bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.00))] bg-neutral-948",
        "shadow-[0_30px_80px_-60px_rgba(0,0,0,.9)] min-h-[280px] sm:min-h-[321px]",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(900px 380px at 50% -30%, rgba(154,70,255,.22), transparent 60%)",
        }}
      />

      <div className="relative z-10 w-full pt-8 pl-8">
        <FeatureTag />
        <h3
          className={clsx(
            "mt-4 whitespace-pre-line font-black italic uppercase text-white leading-[90%]",
            size === "lg" || size === "md"
              ? "text-[32px] tracking-[-0.64px]"
              : "text-[24px] tracking-[-0.48px]",
          )}
        >
          {title}
        </h3>
      </div>

      {children}
    </div>
  );
}

/* ------------------- Feature media placeholders (no assets) ------------------- */
function MediaLaptopPlaceholder() {
  return (
    <div className="pointer-events-none absolute bottom-0 right-0 flex h-[98%] w-[397px] items-end justify-end">
      <img
        src="/landing/features/feature-control.png"
        alt=""
        className="h-full w-full object-cover"
      />
    </div>
  );
}

function MediaEventSetupPlaceholder() {
  return (
    <div className="pointer-events-none absolute bottom-0 right-0 flex h-[90%] w-[290px] items-end justify-end">
      <img
        src="/landing/features/feature-event-setup.png"
        alt=""
        className="h-full w-full"
      />
    </div>
  );
}

function MediaWideScreenshotPlaceholder({
  src,
}: {
  src: string;
  align?: "center" | "right";
}) {
  return (
    <div className="pointer-events-none absolute bottom-0 right-0 flex h-[90%] w-full items-end justify-end pl-8">
      <img src={src} alt="" className="h-auto w-full" />
    </div>
  );
}

function HelpCenterPagePlaceholder({
  src,
}: {
  src: string;
  align?: "center" | "right";
}) {
  return (
    <div className="pointer-events-none absolute bottom-0 right-0 flex h-[72%] w-full items-end justify-end pl-8">
      <img src={src} alt="" className="h-full w-auto" />
    </div>
  );
}

function MediaMegaphonePlaceholder() {
  return (
    <div className="pointer-events-none absolute bottom-0 right-0 flex h-full w-[87%] items-end justify-end pl-8">
      <img
        src="/landing/features/feature-promo-marketing.png"
        alt=""
        className="h-auto w-full"
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
      <div className="relative h-[330px] sm:h-[390px] lg:h-[430px]">
        <div className="absolute right-0 top-0 h-[42%] w-[52%] overflow-hidden rounded-lg ring-1 ring-white/10 shadow-[0_30px_80px_-55px_rgba(0,0,0,.9)]">
          <Image
            src={allInOneImages.top}
            alt="Venue exterior"
            fill
            sizes="(min-width:1024px) 360px, 60vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/45" />
        </div>

        <div className="absolute left-0 top-[18%] z-10 h-[55%] w-[68%] overflow-hidden rounded-lg border-2 border-primary-500 shadow-[0_40px_110px_-70px_rgba(154,70,255,.65)]">
          <Image
            src={allInOneImages.main}
            alt="Ticket scanning on mobile"
            fill
            sizes="(min-width:1024px) 420px, 75vw"
            className="object-cover"
          />
        </div>

        <div className="absolute bottom-0 -right-8 h-[44%] w-[52%] overflow-hidden rounded-lg ring-1 ring-white/10 shadow-[0_30px_80px_-55px_rgba(0,0,0,.9)]">
          <Image
            src={allInOneImages.bottom}
            alt="Ticket handoff"
            fill
            sizes="(min-width:1024px) 360px, 60vw"
            className="object-cover"
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
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Motion (typed to avoid TS “variants” warnings)                     */
/* ------------------------------------------------------------------ */
const EASE: [number, number, number, number] = [0.2, 0.85, 0.2, 1];

const heroContainer: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.08,
    },
  },
};

const heroItem: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.995 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.78, ease: EASE },
  },
};

const heroDeviceWrap: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.9, ease: EASE },
  },
};

const scrollReveal: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: EASE },
  },
};

/* ------------------------------------------------------------------ */
/*  Procreate-style Devices block + “shine floor”                      */
/* ------------------------------------------------------------------ */
function ProcreateStyleHeroDevices() {
  return (
    <motion.div
      variants={heroDeviceWrap}
      className="relative mx-auto w-full max-w-[560px] sm:max-w-[660px]"
    >
      <div className="relative">
        {/* -------------------------------------------------------------- */}
        {/* Procreate-like bottom “shine” (Tikd colors)                    */}
        {/* -------------------------------------------------------------- */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[62%] -z-10 h-[360px] w-[620px] -translate-x-1/2 rounded-full blur-[105px] sm:h-[420px] sm:w-[720px]"
          style={{
            background:
              "radial-gradient(closest-side, rgba(154,70,255,0.26), transparent 70%), radial-gradient(closest-side, rgba(199,160,255,0.16), transparent 74%)",
          }}
          animate={{ opacity: [0.62, 0.9, 0.62] }}
          transition={{ duration: 4.6, ease: "easeInOut", repeat: Infinity }}
        />

        {/* “Specular” sheen ring (sharper glow like the Procreate floor) */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[70%] -z-10 h-[140px] w-[520px] -translate-x-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(closest-side, rgba(255,255,255,0.10), transparent 62%)",
            filter: "blur(18px)",
            maskImage:
              "radial-gradient(closest-side, black 35%, transparent 78%)",
            WebkitMaskImage:
              "radial-gradient(closest-side, black 35%, transparent 78%)",
          }}
          animate={{ opacity: [0.25, 0.45, 0.25] }}
          transition={{ duration: 3.8, ease: "easeInOut", repeat: Infinity }}
        />

        {/* Extra thin colored rim */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[73%] -z-10 h-[110px] w-[480px] -translate-x-1/2 rounded-full"
          style={{
            background:
              "conic-gradient(from 180deg, rgba(154,70,255,0.0), rgba(154,70,255,0.20), rgba(199,160,255,0.12), rgba(154,70,255,0.0))",
            filter: "blur(26px)",
            opacity: 0.65,
          }}
          animate={{ opacity: [0.45, 0.75, 0.45] }}
          transition={{ duration: 5.2, ease: "easeInOut", repeat: Infinity }}
        />

        {/* Soft vignette behind devices */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-20"
          style={{
            background:
              "radial-gradient(520px 340px at 50% 45%, rgba(255,255,255,0.06), transparent 70%)",
          }}
        />

        {/* Float wrapper (very subtle) */}
        <motion.div
          className="relative mx-auto w-full"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 6.0, ease: "easeInOut", repeat: Infinity }}
        >
          <div className="relative mx-auto aspect-[5/4] w-full">
            <Image
              src="/landing/hero-phones.svg"
              alt="Tikd iPhone previews"
              fill
              priority
              sizes="(min-width: 1024px) 660px, 92vw"
              className="select-none object-contain drop-shadow-[0_60px_140px_rgba(0,0,0,0.75)]"
            />
          </div>
        </motion.div>
      </div>
    </motion.div>
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
    [],
  );

  return (
    <MotionConfig reducedMotion="user">
      <main className="relative overflow-hidden bg-neutral-950 text-neutral-0">
        {/* ------------------------------------------------------------------ */}
        {/* HERO (Procreate-style: centered devices + centered copy)            */}
        {/* ------------------------------------------------------------------ */}
        <motion.section
          className="relative overflow-hidden"
          initial="hidden"
          animate="show"
          variants={heroContainer}
        >
          {/* Background wash (dark spotlight + faint Tikd purple) */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(900px 520px at 50% 18%, rgba(255,255,255,0.06), transparent 62%), radial-gradient(860px 520px at 50% 92%, rgba(0,0,0,0.65), transparent 60%)",
              }}
            />
            <div
              className="absolute inset-0 opacity-70"
              style={{
                background:
                  "radial-gradient(820px 440px at 18% 30%, rgba(154,70,255,0.14), transparent 64%), radial-gradient(820px 440px at 82% 30%, rgba(154,70,255,0.10), transparent 66%)",
              }}
            />
            <div className="absolute inset-0 bg-neutral-950/40" />
          </div>

          <div className="relative mx-auto max-w-[980px] px-4 pb-16 pt-20 sm:pb-20 sm:pt-24 lg:pb-24 lg:pt-28">
            <div className="flex flex-col items-center text-center">
              <ProcreateStyleHeroDevices />

              <motion.h1
                variants={heroItem}
                className="mt-10 text-balance text-[44px] font-extrabold leading-[1.02] tracking-[-1.2px] sm:mt-12 sm:text-[64px] sm:tracking-[-1.6px] lg:text-[76px]"
              >
                Tickets Made Easy.
              </motion.h1>

              <motion.p
                variants={heroItem}
                className="mt-4 max-w-[620px] text-pretty text-[15px] leading-[1.55] text-white/70 sm:mt-5 sm:text-[20px]"
              >
                Buy, sell, and discover tickets effortlessly. Fast, secure, and
                hassle-free, so you can focus on the event — not the process.
              </motion.p>

              <motion.div variants={heroItem} className="mt-8">
                <Button asChild size="xl" variant="primary" animation>
                  <Link href="/events">Browse Events</Link>
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.section>

        {/* ------------------------------------------------------------------ */}
        {/* ALL-IN-ONE PLATFORM                                                */}
        {/* ------------------------------------------------------------------ */}
        <motion.section
          className="mx-auto max-w-[1232px] px-4 py-16 sm:py-20"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.25 }}
          variants={scrollReveal}
        >
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_1fr] lg:gap-24">
            <AllInOneCollage />

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
                    <div className="mt-1 text-[14px] leading-[1.3] tracking-[-0.28px] text-white/55">
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        {/* ------------------------------------------------------------------ */}
        {/* FEATURES                                                           */}
        {/* ------------------------------------------------------------------ */}
        <motion.section
          className="mx-auto max-w-[1232px] px-4 pb-16 sm:pb-20"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={scrollReveal}
        >
          <div className="grid gap-4">
            <div className="grid gap-4 lg:grid-cols-[2.44fr_1.73fr]">
              <FeatureCard size="lg" title={"Control everything\nin one place"}>
                <MediaLaptopPlaceholder />
              </FeatureCard>

              <FeatureCard size="md" title={"Event page\nset-up"}>
                <MediaEventSetupPlaceholder />
              </FeatureCard>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <FeatureCard size="sm" title={"Ticket creation"}>
                <MediaWideScreenshotPlaceholder
                  src="/landing/features/feature-ticket-creation.png"
                  align="center"
                />
              </FeatureCard>

              <FeatureCard size="sm" title={"Promotion &\nmarketing"}>
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
        </motion.section>

        {/* ------------------------------------------------------------------ */}
        {/* UNLOCK YOUR FULL POTENTIAL                                         */}
        {/* ------------------------------------------------------------------ */}
        <motion.section
          className="mx-auto max-w-[1232px] px-4 pt-16 sm:pt-20 -mb-4.5"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.22 }}
          variants={scrollReveal}
        >
          <h2 className="text-center font-black italic uppercase leading-[0.9] tracking-[-1.04px] text-[36px] sm:text-[44px] lg:text-[52px]">
            UNLOCK YOUR FULL
            <br className="hidden sm:block" />
            POTENTIAL
          </h2>

          <div className="relative mt-10 grid items-center gap-10 lg:mt-14 lg:grid-cols-[1fr_auto_1fr]">
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

            <div className="relative mx-auto">
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
                  className="drop-shadow-[0_60px_140px_rgba(0,0,0,.75)]"
                />
              </div>
            </div>

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
        </motion.section>

        {/* ------------------------------------------------------------------ */}
        {/* FAQ                                                                */}
        {/* ------------------------------------------------------------------ */}
        <motion.section
          className="relative isolate px-4 py-16 sm:py-20"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.22 }}
          variants={scrollReveal}
        >
          <div
            className="absolute inset-0 -z-10 bg-gradient-to-br from-primary-700/35 via-primary-900/25 to-neutral-950"
            aria-hidden
          />
          <Faq items={faqItems} />
        </motion.section>

        {/* ------------------------------------------------------------------ */}
        {/* Final CTA                                                          */}
        {/* ------------------------------------------------------------------ */}
        <motion.section
          className="relative isolate px-8 pb-16 sm:py-[80px]"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.22 }}
          variants={scrollReveal}
        >
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
                <Button asChild size="md" animation>
                  <Link href="/events">Browse Events</Link>
                </Button>
                <Button asChild size="md" variant="secondary">
                  <Link href="/book-demo">Book a Demo</Link>
                </Button>
              </div>
            </div>
          </div>
        </motion.section>
      </main>
    </MotionConfig>
  );
}
