/* ------------------------------------------------------------------ */
/*  src/app/about-us/page.tsx – About Tikd.                           */
/* ------------------------------------------------------------------ */
"use client";

import Link from "next/link";
import Image from "next/image";
import type { CSSProperties } from "react";
import {
  Sparkles,
  HeartHandshake,
  ShieldCheck,
  Rocket,
  Users,
  Target,
  Globe2,
  Music4,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

/* ----------------------------- helpers ---------------------------- */
type Team = {
  name: string;
  role: string;
  img?: string; // optional; we’ll render a gradient fallback if missing
};

const team: Team[] = [
  { name: "Brandon", role: "Co-founder & CEO" },
  { name: "Arubin", role: "Co-founder & CEO" },
  { name: "Kenji", role: "Engineering Lead" },
  { name: "Giorgi", role: "Design Lead" },
];

const values = [
  {
    icon: <HeartHandshake className="h-6 w-6 text-primary-300" />,
    title: "People First",
    text: "Fans, artists, organizers — we build for the entire ecosystem with empathy and respect.",
  },
  {
    icon: <ShieldCheck className="h-6 w-6 text-primary-300" />,
    title: "Trust by Default",
    text: "Transparent pricing, secure checkout, and clear policies. No tricks, ever.",
  },
  {
    icon: <Rocket className="h-6 w-6 text-primary-300" />,
    title: "Move Fast, Polish Faster",
    text: "Quality over quantity. We ship thoughtfully and obsess over details.",
  },
  {
    icon: <Sparkles className="h-6 w-6 text-primary-300" />,
    title: "Delight in the Details",
    text: "Every interaction should feel premium — from tap to ticket.",
  },
];

const stats = [
  { label: "Tickets issued", value: "120k+" },
  { label: "Organizers", value: "900+" },
  { label: "Cities", value: "40+" },
  { label: "Avg. rating", value: "4.9/5" },
];

/* brand mesh for hero */
const meshBg: CSSProperties = {
  background:
    "radial-gradient(1100px 520px at 15% 20%, rgba(130, 46, 255, .28), transparent 60%)," +
    "radial-gradient(900px 480px at 85% 10%, rgba(88, 101, 242, .22), transparent 60%)," +
    "radial-gradient(700px 520px at 50% 90%, rgba(196, 181, 253, .16), transparent 60%)",
};

/* --------------------------- subcomponents ------------------------ */
function SectionTitle({
  kicker,
  title,
  sub,
  align = "center",
}: {
  kicker?: string;
  title: string;
  sub?: string;
  align?: "center" | "left";
}) {
  return (
    <div
      className={`mb-10 ${align === "center" ? "mx-auto text-center" : ""} max-w-2xl`}
    >
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

function ValueCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <article className="h-full rounded-2xl bg-gradient-to-b from-primary-600/20 to-transparent p-[1px]">
      <div className="group flex h-full flex-col rounded-2xl border border-white/10 bg-neutral-950 p-6 shadow-[0_10px_40px_-10px_rgba(0,0,0,.5)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_60px_-12px_rgba(88,101,242,.25)]">
        <div className="mb-4 inline-flex justify-center rounded-xl bg-primary-900/50 p-2 ring-1 ring-primary-700/40">
          {icon}
        </div>
        <h3 className="mb-2 text-base font-semibold leading-tight">{title}</h3>
        <p className="text-sm leading-relaxed text-neutral-300">{text}</p>
      </div>
    </article>
  );
}

function Avatar({ person }: { person: Team }) {
  const initial = person.name?.[0]?.toUpperCase() ?? "U";
  return (
    <div className="relative h-16 w-16 overflow-hidden rounded-full ring-4 ring-black/50 md:h-20 md:w-20">
      {person.img ? (
        <Image
          src={person.img}
          alt={`${person.name} picture`}
          fill
          className="object-cover"
          sizes="80px"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-[conic-gradient(from_220deg_at_50%_50%,#6d28d9,#3b82f6,#111827)] text-white">
          <span className="text-xl font-semibold">{initial}</span>
        </div>
      )}
    </div>
  );
}

function TimelineItem({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="relative pl-10">
      <div className="absolute left-0 top-1 grid h-7 w-7 place-items-center rounded-full border border-white/15 bg-neutral-950 text-primary-300">
        {icon}
      </div>
      <h4 className="text-sm font-semibold">{title}</h4>
      <p className="mt-1 text-sm text-neutral-300">{text}</p>
    </div>
  );
}

/* ------------------------------- Page ----------------------------- */
export default function AboutUsPage() {
  return (
    <main className="relative overflow-hidden bg-neutral-950 text-neutral-0">
      {/* Hero */}
      <section className="relative isolate flex items-center justify-center px-4 py-24 text-center md:py-28">
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
        />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(1200px_400px_at_50%_120%,rgba(17,17,17,.9),transparent)]" />

        <div className="mx-auto max-w-3xl">
          <p className="mb-3 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-neutral-300">
            <Music4 className="h-4 w-4" /> About Tikd.
          </p>
          <h1 className="text-balance text-4xl font-extrabold leading-tight md:text-6xl">
            We’re building the most delightful way to{" "}
            <span className="bg-gradient-to-r from-primary-300 via-primary-400 to-primary-200 bg-clip-text text-transparent">
              discover and book events
            </span>
            .
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-neutral-200">
            Born from late nights, loud speakers and a love for community —
            Tikd. connects fans with unforgettable experiences and helps
            organizers sell out with ease.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" variant="primary" className="px-7">
              <Link href="/events">Browse events</Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="px-7">
              <Link href="/help">For organizers</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto mt-8 max-w-[1232px] px-4 pb-10 md:pb-16">
        <div className="grid grid-cols-2 gap-4 rounded-2xl border border-white/10 bg-neutral-950/70 p-6 backdrop-blur sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-2xl font-extrabold md:text-3xl">
                {s.value}
              </div>
              <div className="mt-1 text-xs text-neutral-300 md:text-sm">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Mission + Story */}
      <section className="mx-auto grid max-w-[1232px] grid-cols-1 gap-10 px-4 pb-6 md:grid-cols-2">
        <div>
          <SectionTitle
            align="left"
            kicker="Our Mission"
            title="Make going out effortless"
            sub="Ticketing should be simple, fast and fair. We obsess over tiny interactions so that buying a ticket feels as smooth as pressing play."
          />
          <div className="space-y-4 text-sm leading-relaxed text-neutral-300 md:text-base">
            <p>
              We’ve all dealt with clunky checkouts, surprise fees, and QR codes
              that don’t scan. Tikd. fixes that with an experience crafted for
              real life — mobile first, wallet ready, and lightning quick.
            </p>
            <p>
              We partner closely with organizers to deliver reliable tools,
              honest economics, and great support. Fans get transparency and
              speed; organizers get control and growth.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-neutral-950/80 p-6">
          <h3 className="text-base font-semibold">Our Story</h3>
          <div className="mt-6 grid gap-6">
            <TimelineItem
              icon={<Users className="h-4 w-4" />}
              title="It started with friends"
              text="A small crew throwing local nights, frustrated with clunky tools and confused guests at the door."
            />
            <TimelineItem
              icon={<Target className="h-4 w-4" />}
              title="Designing for clarity"
              text="We sketched a cleaner flow: transparent pricing, instant tickets, and a checkout that just works."
            />
            <TimelineItem
              icon={<Globe2 className="h-4 w-4" />}
              title="Scaling the vibes"
              text="From pop-ups to major venues — today Tikd. powers events across dozens of cities."
            />
          </div>
        </div>
      </section>

      {/* Values (updated layout: equal columns/heights) */}
      <section className="mx-auto max-w-[1232px] px-4 py-14 md:py-20">
        <SectionTitle
          kicker="Our Values"
          title="Principles that guide every decision"
          sub="We keep these close when we design, build, and support Tikd."
        />
        <div className="grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v) => (
            <ValueCard key={v.title} {...v} />
          ))}
        </div>
      </section>

      {/* Team */}
      <section className="mx-auto max-w-[1232px] px-4 pb-14 md:pb-20">
        <SectionTitle
          kicker="Team"
          title="The crew behind the curtain"
          sub="A compact, senior team shipping with care and speed."
        />
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
          {team.map((person) => (
            <div
              key={person.name}
              className="rounded-2xl border border-white/10 bg-neutral-950/70 p-6"
            >
              <Avatar person={person} />
              <div className="mt-4">
                <h4 className="text-sm font-semibold md:text-base">
                  {person.name}
                </h4>
                <p className="text-xs text-neutral-300 md:text-sm">
                  {person.role}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative isolate overflow-hidden px-4 pb-20 pt-12 text-center">
        <div
          className="absolute inset-0 -z-10 bg-gradient-to-tr from-primary-700/30 via-primary-900/20 to-neutral-950"
          aria-hidden
        />
        <h2 className="text-balance text-2xl font-semibold md:text-3xl">
          Let’s make your next event unforgettable
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-pretty text-neutral-300">
          Join hundreds of organizers using Tikd. for fast checkout, fair
          pricing, and happier guests.
        </p>
        <div className="mt-7 flex items-center justify-center gap-3">
          <Button asChild size="lg" variant="secondary" className="px-8">
            <Link href="/help/organizers">Get started</Link>
          </Button>
          <Button asChild size="lg" variant="ghost" className="px-8">
            <Link href="/events" className="inline-flex items-center">
              Explore events <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
