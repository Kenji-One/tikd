// src/app/page.tsx
"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import clsx from "clsx";
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  MapPin,
  Music2,
  ShieldCheck,
  Sparkles,
  Ticket,
  TicketCheck,
  Users,
} from "lucide-react";
import Image from "next/image";
import {
  MotionConfig,
  motion,
  useScroll,
  useTransform,
  type MotionValue,
  type Variants,
} from "framer-motion";

import { Button } from "@/components/ui/Button";

type FaqItem = { q: string; a: string };

const faqItems: FaqItem[] = [
  {
    q: "How do tickets work on Tixsy?",
    a: "Buy a ticket, get instant delivery, and scan it at the door. No mystery steps, no weird redirects.",
  },
  {
    q: "Can I refund or transfer tickets?",
    a: "Policies depend on the organizer. Tixsy supports transfers and refunds when the event allows it.",
  },
  {
    q: "Is checkout secure?",
    a: "Yes — secure payments, clear totals, and a smooth flow designed to minimize drop-offs.",
  },
  {
    q: "How do I host an event on Tixsy?",
    a: "Create an organizer account, set up your event page, publish, and start selling. Tools included for promotion and check-in.",
  },
];

const heroEvents = [
  {
    src: "/dummy/event-3.png",
    title: "Midnight Signal",
    venue: "Warehouse District",
    date: "Fri, 11:30 PM",
    accent: "#ff7b45",
  },
  {
    src: "/dummy/event-avalon.png",
    title: "Avalon Yacht",
    venue: "Skyport Marina",
    date: "Sat, 6:00 PM",
    accent: "#9a46ff",
  },
  {
    src: "/dummy/event-card-2.png",
    title: "Skyline Session",
    venue: "Brooklyn Rooftop",
    date: "Sun, 8:00 PM",
    accent: "#45ff79",
  },
] as const;

const floatingTickets = [
  { label: "VIP", left: "7%", top: "18%", rotate: -12, delay: 0.1 },
  { label: "GA", left: "82%", top: "17%", rotate: 10, delay: 0.9 },
  { label: "2x", left: "73%", top: "78%", rotate: -8, delay: 1.5 },
] as const;

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
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

const heroItem: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.99 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.82, ease: EASE },
  },
};

const heroDeviceWrap: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 1, ease: EASE },
  },
};

const scrollReveal: Variants = {
  hidden: { opacity: 0, y: 32 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.88, ease: EASE },
  },
};

const scrollRevealSlow: Variants = {
  hidden: { opacity: 0, y: 42 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 1, ease: EASE },
  },
};

/* ------------------------------------------------------------------ */
/*  Procreate-style Devices block + “shine floor”                      */
/* ------------------------------------------------------------------ */
function _ProcreateStyleHeroDevices() {
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
              alt="Tixsy iPhone previews"
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

function HeroStat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="flex min-w-[132px] items-center gap-3 rounded-full border border-white/10 bg-white/[0.055] px-4 py-3 text-left shadow-[0_18px_60px_rgba(0,0,0,0.24)] backdrop-blur-md">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white">
        {icon}
      </span>
      <span>
        <span className="block text-lg font-black leading-none text-white">
          {value}
        </span>
        <span className="mt-1 block text-xs leading-none text-white/55">
          {label}
        </span>
      </span>
    </div>
  );
}

function FloatingTicket({
  label,
  left,
  top,
  rotate,
  delay,
}: {
  label: string;
  left: string;
  top: string;
  rotate: number;
  delay: number;
}) {
  return (
    <motion.div
      aria-hidden
      className="absolute hidden rounded-[14px] border border-white/10 bg-white/[0.08] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/65 shadow-[0_22px_70px_rgba(0,0,0,0.32)] backdrop-blur-md sm:block"
      style={{ left, top, rotate }}
      animate={{ y: [0, -12, 0], opacity: [0.45, 0.85, 0.45] }}
      transition={{
        duration: 5.5,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <span className="mr-2 text-primary-300">●</span>
      {label}
    </motion.div>
  );
}

function TicketPass() {
  return (
    <motion.div
      className="absolute -bottom-8 left-3 z-30 w-[250px] rounded-2xl border border-white/12 bg-neutral-950/78 p-4 shadow-[0_34px_90px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:left-8 sm:w-[286px] lg:-bottom-4"
      initial={{ opacity: 0, y: 22, rotate: -4 }}
      animate={{ opacity: 1, y: 0, rotate: -4 }}
      transition={{ duration: 0.88, ease: EASE, delay: 0.36 }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary-200">
            Tixsy Pass
          </p>
          <p className="mt-2 text-xl font-black leading-none text-white">
            02 Tickets
          </p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500 text-white">
          <TicketCheck className="h-6 w-6" />
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between gap-4">
        <div className="space-y-1.5">
          {["w-24", "w-20", "w-28"].map((width) => (
            <div
              key={width}
              className={clsx("h-1.5 rounded-full bg-white/16", width)}
            />
          ))}
        </div>
        <div className="grid grid-cols-4 gap-1">
          {Array.from({ length: 16 }).map((_, index) => (
            <span
              key={index}
              className={clsx(
                "h-1.5 w-1.5 rounded-[2px]",
                index % 3 === 0 ? "bg-primary-300" : "bg-white/70",
              )}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function LandingHeroVisual({ y }: { y: MotionValue<number> }) {
  return (
    <motion.div
      variants={heroDeviceWrap}
      style={{ y }}
      className="relative mx-auto mt-12 h-[470px] w-full max-w-[620px] lg:mt-0 lg:h-[610px]"
    >
      {floatingTickets.map((ticket) => (
        <FloatingTicket key={ticket.label} {...ticket} />
      ))}

      <motion.div
        className="absolute left-1/2 top-9 z-20 h-[330px] w-[240px] -translate-x-1/2 overflow-hidden rounded-[28px] border border-white/14 bg-neutral-900 shadow-[0_42px_120px_rgba(0,0,0,0.56)] sm:h-[390px] sm:w-[284px] lg:top-20 lg:h-[430px] lg:w-[314px]"
        initial={{ opacity: 0, y: 34, rotate: -3 }}
        animate={{ opacity: 1, y: 0, rotate: -3 }}
        transition={{ duration: 1.02, ease: EASE, delay: 0.16 }}
      >
        <Image
          src={heroEvents[0].src}
          alt="Featured Tixsy event"
          fill
          priority
          sizes="(min-width: 1024px) 314px, 284px"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/12 to-transparent" />
        <div className="absolute inset-x-4 bottom-4">
          <p className="rounded-full bg-white/12 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white/80 backdrop-blur">
            Featured tonight
          </p>
          <h3 className="mt-3 text-3xl font-black italic uppercase leading-[0.86] text-white">
            {heroEvents[0].title}
          </h3>
          <div className="mt-3 space-y-1.5 text-xs font-medium text-white/72">
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-warning-400" />
              {heroEvents[0].venue}
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-3.5 w-3.5 text-primary-300" />
              {heroEvents[0].date}
            </div>
          </div>
        </div>
      </motion.div>

      {heroEvents.slice(1).map((event, index) => (
        <motion.div
          key={event.title}
          className={clsx(
            "absolute z-10 overflow-hidden rounded-[24px] border border-white/12 bg-neutral-900 shadow-[0_34px_90px_rgba(0,0,0,0.44)]",
            index === 0
              ? "right-1 top-[118px] h-[210px] w-[154px] rotate-[10deg] sm:right-2 sm:h-[245px] sm:w-[178px] lg:right-3 lg:top-[165px]"
              : "left-1 top-[190px] h-[190px] w-[142px] -rotate-[11deg] sm:left-1 sm:h-[226px] sm:w-[166px] lg:left-2 lg:top-[285px]",
          )}
          initial={{ opacity: 0, y: 26, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: 0.95,
            ease: EASE,
            delay: index === 0 ? 0.28 : 0.42,
          }}
        >
          <Image
            src={event.src}
            alt=""
            fill
            sizes="180px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/86 via-black/10 to-transparent" />
          <div
            className="absolute bottom-0 left-0 right-0 h-1"
            style={{ backgroundColor: event.accent }}
          />
        </motion.div>
      ))}

      <motion.div
        className="absolute right-5 top-8 z-30 hidden rounded-2xl border border-white/12 bg-neutral-950/72 p-4 text-white shadow-[0_26px_80px_rgba(0,0,0,0.44)] backdrop-blur-xl sm:block lg:right-2 lg:top-28"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: EASE, delay: 0.52 }}
      >
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Music2 className="h-4 w-4 text-warning-400" />
          Live demand
        </div>
        <div className="mt-3 flex h-10 items-end gap-1.5">
          {[18, 28, 20, 34, 26, 38, 30].map((height, index) => (
            <motion.span
              key={height}
              className="w-2 rounded-full bg-gradient-to-t from-primary-700 to-warning-400"
              animate={{ height: [height, height + 8, height] }}
              transition={{
                duration: 1.8,
                delay: index * 0.1,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </motion.div>

      <TicketPass />
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function LandingPage() {
  const { scrollY } = useScroll();
  const heroVisualY = useTransform(scrollY, [0, 760], [0, 72]);
  const heroBackdropY = useTransform(scrollY, [0, 760], [0, 110]);

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
        {/* HERO                                                               */}
        {/* ------------------------------------------------------------------ */}
        <motion.section
          className="relative min-h-[760px] overflow-hidden"
          initial="hidden"
          animate="show"
          variants={heroContainer}
        >
          <motion.div
            aria-hidden
            style={{ y: heroBackdropY }}
            className="absolute inset-x-0 top-0 h-[840px]"
          >
            <Image
              src="/dummy/event-3.png"
              alt=""
              fill
              priority
              sizes="100vw"
              className="scale-110 object-cover opacity-[0.38]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,8,15,0.98)_0%,rgba(8,8,15,0.74)_42%,rgba(8,8,15,0.86)_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(900px_560px_at_78%_42%,rgba(154,70,255,0.28),transparent_66%)]" />
            <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-b from-transparent to-neutral-950" />
          </motion.div>

          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.18) 1px, transparent 1px)",
              backgroundSize: "72px 72px",
              maskImage:
                "linear-gradient(to bottom, transparent, black 18%, black 72%, transparent)",
              WebkitMaskImage:
                "linear-gradient(to bottom, transparent, black 18%, black 72%, transparent)",
            }}
          />

          <div className="relative mx-auto grid max-w-[1232px] items-center gap-8 px-4 pb-16 pt-24 sm:pt-28 lg:grid-cols-[0.94fr_1.06fr] lg:pb-24 lg:pt-[120px]">
            <div className="relative z-20 max-w-[680px] text-center lg:text-left">
              <motion.div
                variants={heroItem}
                className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white/75 backdrop-blur-md lg:mx-0"
              >
                <Sparkles className="h-4 w-4 text-warning-400" />
                Tixsy event tickets
              </motion.div>

              <motion.h1
                variants={heroItem}
                className="mt-6 text-balance text-[46px] font-black italic uppercase leading-[0.86] tracking-[-1.3px] text-white sm:text-[68px] sm:tracking-[-1.8px] lg:text-[86px]"
              >
                Your Night Starts Here
              </motion.h1>

              <motion.p
                variants={heroItem}
                className="mx-auto mt-6 max-w-[590px] text-pretty text-[16px] leading-[1.65] text-white/72 sm:text-[20px] lg:mx-0"
              >
                Discover the best parties, concerts, and private events around
                you. Buy secure tickets in seconds and keep every pass ready at
                the door.
              </motion.p>

              <motion.div
                variants={heroItem}
                className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start"
              >
                <Button asChild size="xl" variant="premium" animation>
                  <Link href="/events">
                    Browse Events
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild size="xl" variant="secondary">
                  <Link href="/demo">Host an Event</Link>
                </Button>
              </motion.div>

              <motion.div
                variants={heroItem}
                className="mt-9 flex flex-wrap justify-center gap-3 lg:justify-start"
              >
                <HeroStat
                  icon={<ShieldCheck className="h-4 w-4 text-success-400" />}
                  value="Secure"
                  label="checkout"
                />
                <HeroStat
                  icon={<Ticket className="h-4 w-4 text-primary-300" />}
                  value="Instant"
                  label="tickets"
                />
                <HeroStat
                  icon={<Users className="h-4 w-4 text-warning-400" />}
                  value="Live"
                  label="events"
                />
              </motion.div>
            </div>

            <LandingHeroVisual y={heroVisualY} />
          </div>
        </motion.section>

        {/* ------------------------------------------------------------------ */}
        {/* ALL-IN-ONE PLATFORM                                                */}
        {/* ------------------------------------------------------------------ */}
        <motion.section
          className="mx-auto max-w-[1232px] px-4 py-16 sm:py-20"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.22, margin: "0px 0px -80px" }}
          variants={scrollRevealSlow}
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
                payouts, Tixsy gives you everything you need to run a successful
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
          viewport={{ once: true, amount: 0.18, margin: "0px 0px -90px" }}
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
          viewport={{ once: true, amount: 0.18, margin: "0px 0px -90px" }}
          variants={scrollRevealSlow}
        >
          <h2 className="text-center font-black italic uppercase leading-[0.9] tracking-[-1.04px] text-[36px] sm:text-[44px] lg:text-[52px]">
            UNLOCK YOUR FULL
            <br className="hidden sm:block" />
            POTENTIAL
          </h2>

          <div className="relative mt-10 grid items-center gap-10 lg:mt-14 lg:grid-cols-[1fr_auto_1fr]">
            <div className="relative hidden h-[560px] lg:block">
              <UnlockLabel emphasize className="absolute left-0 top-[90px]">
                SELLER DASHBOARD
              </UnlockLabel>

              <UnlockLabel className="absolute left-[110px] top-[275px]">
                FAST CHECK-IN
              </UnlockLabel>

              <UnlockLabel className="absolute left-[-40px] bottom-[40px]">
                PROMO TOOLS
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
                  alt="Tixsy app preview"
                  fill
                  sizes="(min-width: 1024px) 380px, (min-width: 640px) 340px, 280px"
                  className="drop-shadow-[0_60px_140px_rgba(0,0,0,.75)]"
                />
              </div>
            </div>

            <div className="relative hidden h-[560px] text-right lg:block">
              <UnlockLabel className="absolute right-0 top-[90px]">
                SMART PAYOUTS
              </UnlockLabel>

              <UnlockLabel className="absolute right-0 top-[245px]">
                EVENT INSIGHTS
              </UnlockLabel>

              <UnlockLabel className="absolute right-0 bottom-[70px]">
                AUDIENCE GROWTH
              </UnlockLabel>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:hidden">
              <UnlockLabel emphasize className="text-center sm:text-left">
                SELLER DASHBOARD
              </UnlockLabel>
              <UnlockLabel className="text-center sm:text-right">
                SMART PAYOUTS
              </UnlockLabel>

              <UnlockLabel className="text-center sm:text-left">
                FAST CHECK-IN
              </UnlockLabel>
              <UnlockLabel className="text-center sm:text-right">
                EVENT INSIGHTS
              </UnlockLabel>

              <UnlockLabel className="text-center sm:text-left">
                PROMO TOOLS
              </UnlockLabel>
              <UnlockLabel className="text-center sm:text-right">
                AUDIENCE GROWTH
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
          viewport={{ once: true, amount: 0.18, margin: "0px 0px -90px" }}
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
          viewport={{ once: true, amount: 0.2, margin: "0px 0px -80px" }}
          variants={scrollRevealSlow}
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
