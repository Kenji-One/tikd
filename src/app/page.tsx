/* ------------------------------------------------------------------ */
/*  src/app/page.tsx – public landing page for Tikd.                  */
/* ------------------------------------------------------------------ */
"use client";

import Link from "next/link";
import {
  Ticket,
  Users,
  Sparkles,
  ShieldCheck,
  CalendarDays,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CSSProperties } from "react";

/* ------------------------------------------------------------------ */
/*  Types & tiny helpers                                               */
/* ------------------------------------------------------------------ */
interface FeatureItem {
  icon: React.ReactNode;
  title: string;
  text: string;
}

interface PromoEvent {
  id: string;
  title: string;
  dateLabel: string;
  venue: string;
  img: string;
}

/*  Brand-y gradient mesh used behind hero text  */
const meshBg: CSSProperties = {
  background:
    "radial-gradient(1200px 600px at 15% 20%, rgba(130, 46, 255, .28), transparent 60%)," +
    "radial-gradient(900px 500px at 85% 15%, rgba(88, 101, 242, .25), transparent 60%)," +
    "radial-gradient(700px 500px at 50% 80%, rgba(196, 181, 253, .18), transparent 60%)",
};

const features: FeatureItem[] = [
  {
    icon: <Ticket className="h-6 w-6 text-primary-400" />,
    title: "Instant Tickets",
    text: "Mobile-wallet delivery in seconds with a smooth, secure checkout.",
  },
  {
    icon: <Users className="h-6 w-6 text-primary-400" />,
    title: "Curated Events",
    text: "Only the good stuff. Hand-picked gigs, parties & festivals every week.",
  },
  {
    icon: <ShieldCheck className="h-6 w-6 text-primary-400" />,
    title: "Transparent Pricing",
    text: "No hidden fees. Clear totals before you pay — always.",
  },
  {
    icon: <Sparkles className="h-6 w-6 text-primary-400" />,
    title: "Delightful Experience",
    text: "Fast, accessible UI that feels premium on every device.",
  },
];

const categories = [
  "All",
  "Shows",
  "Clubs",
  "Live Music",
  "Festivals",
  "Techno",
  "Hip-Hop",
  "House",
  "Comedy",
  "Theatre",
];

const promos: PromoEvent[] = [
  {
    id: "1657675",
    title: "NYC Highschool Party",
    dateLabel: "May 23, 2025 · 6:00 PM",
    venue: "Brooklyn, NY",
    img: "/dummy/event-1.png",
  },
  {
    id: "1765756",
    title: "Sunset Rooftop Session",
    dateLabel: "Jun 02, 2025 · 7:30 PM",
    venue: "Downtown LA",
    img: "/dummy/event-2.png",
  },
  {
    id: "2453453",
    title: "Basement Techno Night",
    dateLabel: "Jun 11, 2025 · 11:00 PM",
    venue: "Berlin, DE",
    img: "/dummy/event-3.png",
  },
];

/* ------------------------------------------------------------------ */
/*  Small presentational pieces                                       */
/* ------------------------------------------------------------------ */
function SectionTitle({
  kicker,
  title,
  sub,
}: {
  kicker?: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="mx-auto mb-10 max-w-2xl text-center">
      {kicker ? (
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-neutral-300">
          {kicker}
        </p>
      ) : null}
      <h2 className="text-balance text-2xl font-semibold md:text-3xl">
        {title}
      </h2>
      {sub ? (
        <p className="mt-3 text-pretty text-sm text-neutral-300 md:text-base">
          {sub}
        </p>
      ) : null}
    </div>
  );
}

function FeatureCard({ icon, title, text }: FeatureItem) {
  return (
    <article className="rounded-2xl bg-gradient-to-b from-primary-600/20 to-transparent p-[1px]">
      <div className="group rounded-2xl border border-white/10 bg-neutral-950 p-6 shadow-[0_10px_40px_-10px_rgba(0,0,0,.5)] transition-transform duration-300 hover:-translate-y-0.5">
        <div className="mb-4 inline-flex rounded-xl bg-primary-900/50 p-2 ring-1 ring-primary-700/40">
          {icon}
        </div>
        <h3 className="mb-2 text-base font-semibold">{title}</h3>
        <p className="text-sm leading-relaxed text-neutral-300">{text}</p>
      </div>
    </article>
  );
}

function CategoryPill({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="whitespace-nowrap rounded-full border border-white/10 bg-neutral-950/70 px-4 py-2 text-sm text-neutral-200 transition-colors hover:border-primary-500/40 hover:text-neutral-0"
      aria-label={`Browse ${label}`}
    >
      {label}
    </button>
  );
}

function EventPromoCard({ e }: { e: PromoEvent }) {
  return (
    <Link
      href={`/events/${e.id}`}
      className="group relative isolate flex min-h-64 items-end overflow-hidden rounded-2xl border border-white/10 bg-neutral-900"
    >
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${e.img})` }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/90 via-neutral-950/40 to-transparent" />
      <div className="relative z-10 w-full p-4">
        <span className="inline-flex items-center gap-2 rounded-full bg-neutral-950/70 px-3 py-1 text-xs text-neutral-300 ring-1 ring-white/10 backdrop-blur">
          <CalendarDays className="h-4 w-4" />
          {e.dateLabel}
        </span>
        <h3 className="mt-3 line-clamp-2 text-lg font-semibold">{e.title}</h3>
        <p className="mt-1 text-sm text-neutral-300">{e.venue}</p>
        <div className="mt-3 inline-flex items-center text-sm text-primary-300">
          View details{" "}
          <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function LandingPage() {
  return (
    <main className="relative overflow-hidden bg-neutral-950 text-neutral-0">
      {/* ───────── Hero ───────── */}
      <section className="relative isolate flex min-h-[78vh] items-center justify-center px-4 py-24 text-center">
        {/* Mesh + subtle grid + vignette */}
        <div
          className="pointer-events-none absolute inset-0 -z-20 opacity-90"
          style={meshBg}
        />
        <div
          className="pointer-events-none absolute inset-0 -z-30 opacity-[.08]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,.65) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.65) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            maskImage:
              "radial-gradient(1000px 600px at 50% 40%, black, transparent 70%)",
          }}
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(1200px_400px_at_50%_120%,rgba(17,17,17,.9),transparent)]" />

        <div className="mx-auto max-w-3xl">
          <h1 className="text-balance text-4xl font-extrabold leading-tight md:text-6xl">
            Discover{" "}
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-primary-300 via-primary-400 to-primary-200 bg-clip-text text-transparent">
                unmissable
              </span>
              <span className="absolute -bottom-1 left-0 h-[3px] w-full bg-gradient-to-r from-primary-500/80 via-primary-400/70 to-primary-300/80 blur-[1px]" />
            </span>{" "}
            events
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-pretty text-neutral-200">
            From underground raves to rooftop concerts — Tikd. gets you through
            the door. Browse, book, and party like it’s 2025.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" variant="primary" className="px-7">
              <Link href="/events">Browse events</Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="px-7">
              <Link href="/help">How Tikd works</Link>
            </Button>
          </div>

          {/* trust row */}
          <div className="mx-auto mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-neutral-300 md:text-sm">
            <span>🎟️ 120k+ tickets issued</span>
            <span className="opacity-40">•</span>
            <span>⚡ Fast, secure checkout</span>
            <span className="opacity-40">•</span>
            <span>⭐ 4.9/5 community rating</span>
          </div>
        </div>
      </section>

      {/* ───────── Categories (quick browse) ───────── */}
      <section className="mx-auto max-w-[1232px] px-4 pb-6">
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto py-2">
          {categories.map((c) => (
            <CategoryPill key={c} label={c} />
          ))}
        </div>
      </section>

      {/* ───────── Features ───────── */}
      <section className="mx-auto max-w-[1232px] px-4 py-14 md:py-20">
        <SectionTitle
          kicker="Why Tikd?"
          title="A premium ticketing experience that just works"
          sub="Designed with clarity, speed and transparency — so you spend less time checking out and more time vibing."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </section>

      {/* ───────── Showcase / Popular right now ───────── */}
      <section className="mx-auto max-w-[1232px] px-4 pb-14 md:pb-20">
        <SectionTitle
          kicker="Popular right now"
          title="This week’s highlights"
          sub="Hand-picked by our editors. Limited tickets — don’t sleep."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {promos.map((e) => (
            <EventPromoCard key={e.id} e={e} />
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <Button asChild variant="secondary" className="px-8">
            <Link href="/events">See all events</Link>
          </Button>
        </div>
      </section>

      {/* ───────── Organizer CTA ───────── */}
      <section className="relative isolate px-4 py-16">
        <div
          className="absolute inset-0 -z-10 bg-gradient-to-br from-primary-700/35 via-primary-900/25 to-neutral-950"
          aria-hidden
        />
        <div className="mx-auto max-w-[1100px] overflow-hidden rounded-2xl border border-white/10 bg-neutral-950/80 p-8 backdrop-blur">
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-[0.18em] text-neutral-300">
                For organizers
              </p>
              <h3 className="text-balance text-xl font-semibold md:text-2xl">
                Sell out your next event with Tikd.
              </h3>
              <p className="mt-2 max-w-prose text-sm text-neutral-300">
                Powerful tools, fair pricing, and payouts on time.
              </p>
            </div>
            <div className="flex gap-3">
              <Button asChild variant="primary" className="px-6">
                <Link href="/help/organizers">Get started</Link>
              </Button>
              <Button asChild variant="ghost" className="px-6">
                <Link href="/help">Learn more</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── Final CTA ───────── */}
      <section className="relative isolate overflow-hidden px-4 py-20 text-center">
        <div
          className="absolute inset-0 -z-10 bg-gradient-to-tr from-primary-700/30 via-primary-900/20 to-neutral-950"
          aria-hidden
        />
        <h2 className="text-balance text-2xl font-semibold md:text-3xl">
          Ready for your next night out?
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-pretty text-neutral-300">
          Browse trending events, lock your spot, and we’ll meet you on the
          dancefloor.
        </p>
        <div className="mt-7">
          <Button asChild size="lg" variant="secondary" className="px-10">
            <Link href="/events">Get tickets</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
