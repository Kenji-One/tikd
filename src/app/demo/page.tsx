/* ------------------------------------------------------------------ */
/*  src/app/book-a-demo/page.tsx – Book a Demo (Tikd.)               */
/*  - Brand mesh hero                                                 */
/*  - Zod + RHF validated form                                        */
/*  - Helpful copy + beautiful cards                                  */
/*  - Success state with optional .ics download                       */
/* ------------------------------------------------------------------ */
"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { z } from "zod";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Rocket, ShieldCheck, Sparkles, ArrowRight, Mail } from "lucide-react";

import { Button } from "@/components/ui/Button";
import LabelledInput from "@/components/ui/LabelledInput";
import { TextArea } from "@/components/ui/TextArea";

/* ----------------------------- schema ----------------------------- */
/** Proper enum signature: use errorMap (not required_error) */
const VolumeEnum = z.enum(["<1k", "1k-10k", "10k-50k", "50k+"] as const, {
  message: "Pick your monthly ticket volume",
});

const DemoSchema = z.object({
  name: z.string().min(2, "Please enter your full name"),
  email: z.string().email("Enter a valid work email"),
  company: z.string().min(2, "Company or organization"),
  // Allow empty -> transform to undefined so blank input doesn't fail URL check.
  website: z
    .union([z.literal(""), z.string().trim().url("Use a valid URL (https://)")])
    .transform((v) => (v === "" ? undefined : v))
    .optional(),
  role: z.string().min(2, "Your role / title"),
  timezone: z.string().min(2, "Timezone"),
  volume: VolumeEnum,
  interests: z.array(z.string()).min(1, "Choose at least one interest"),
  message: z.string().min(10, "Tell us briefly what you’d like to see"),
  marketingOptIn: z.boolean().default(false),
});

type DemoForm = z.infer<typeof DemoSchema>;

/* ------------------------ tiny UI helpers ------------------------- */
function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-neutral-300">
      {children}
    </p>
  );
}

function SectionTitle({
  title,
  sub,
  align = "center",
}: {
  title: string;
  sub?: string;
  align?: "center" | "left";
}) {
  return (
    <div
      className={`${align === "center" ? "mx-auto text-center" : ""} max-w-2xl`}
    >
      <h1 className="text-balance text-3xl font-extrabold leading-tight md:text-5xl">
        {title}
      </h1>
      {sub ? (
        <p className="mx-auto mt-3 max-w-xl text-pretty text-neutral-200">
          {sub}
        </p>
      ) : null}
    </div>
  );
}

function Card({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-neutral-950/70 p-5">
      <div className="mb-3 inline-flex rounded-xl bg-primary-900/50 p-2 ring-1 ring-primary-700/40">
        {icon}
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-neutral-300">{text}</p>
    </div>
  );
}

/* -------------------------- timezones ----------------------------- */
const fallbackZones = [
  "UTC",
  "America/New_York",
  "Europe/London",
  "Asia/Tbilisi",
  "Asia/Tokyo",
];

type IntlWithSupportedValuesOf = typeof Intl & {
  supportedValuesOf?: (key: "timeZone") => string[];
};

function getTimezones(): string[] {
  const intl = Intl as IntlWithSupportedValuesOf;

  if (
    typeof intl !== "undefined" &&
    typeof intl.supportedValuesOf === "function"
  ) {
    const list = intl.supportedValuesOf("timeZone");
    return list ?? fallbackZones;
  }
  return fallbackZones;
}

/* ------------------------------ page ------------------------------ */
export default function BookADemoPage() {
  const { data: session } = useSession();
  const [submitted, setSubmitted] = useState<DemoForm | null>(null);
  const zones = useMemo(getTimezones, []);
  const defaultTz =
    (typeof Intl !== "undefined" &&
      Intl.DateTimeFormat().resolvedOptions().timeZone) ||
    "UTC";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<DemoForm>({
    resolver: zodResolver(DemoSchema),
    defaultValues: {
      name: session?.user?.name ?? "",
      email: session?.user?.email ?? "",
      company: "",
      website: "", // harmless; transforms to undefined on submit
      role: "",
      timezone: defaultTz,
      volume: "<1k",
      interests: [],
      message: "",
      marketingOptIn: false,
    },
    mode: "onBlur",
  });

  // If session arrives after first render, prefill politely.
  useEffect(() => {
    if (session?.user) {
      reset((curr) => ({
        ...curr,
        name: curr.name || session.user.name || "",
        email: curr.email || session.user.email || "",
      }));
    }
  }, [session?.user, reset]);

  const onSubmit: SubmitHandler<DemoForm> = async (data) => {
    try {
      await fetch("/api/demo-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).catch(() => {});
    } finally {
      setSubmitted(data);
      reset({ ...data, message: "" });
    }
  };

  /* -------- success: optional .ics generator on the client -------- */
  function downloadICS() {
    const start = new Date();
    start.setDate(start.getDate() + 2);
    start.setHours(15, 0, 0, 0);

    const dt = (d: Date) =>
      `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(
        d.getUTCDate()
      ).padStart(2, "0")}T${String(d.getUTCHours()).padStart(2, "0")}${String(
        d.getUTCMinutes()
      ).padStart(2, "0")}00Z`;

    const end = new Date(start.getTime() + 30 * 60 * 1000);

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Tikd//Demo//EN",
      "BEGIN:VEVENT",
      `UID:${crypto.randomUUID()}`,
      `DTSTAMP:${dt(new Date())}`,
      `DTSTART:${dt(start)}`,
      `DTEND:${dt(end)}`,
      "SUMMARY:Tikd — Demo Call",
      "DESCRIPTION:Thanks for booking a Tikd demo! We'll follow up by email to confirm.",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Tikd-demo.ics";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="relative overflow-hidden bg-neutral-950 text-neutral-0">
      {/* Hero */}
      <section className="relative isolate px-4 pb-10 pt-20 md:pb-14 md:pt-28">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-90"
          style={{
            background:
              "radial-gradient(1100px 520px at 15% 20%, rgba(130, 46, 255, .28), transparent 60%)," +
              "radial-gradient(900px 480px at 85% 10%, rgba(88, 101, 242, .22), transparent 60%)," +
              "radial-gradient(700px 520px at 50% 90%, rgba(196, 181, 253, .16), transparent 60%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 -z-20 opacity-[.08]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,.65) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.65) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            maskImage:
              "radial-gradient(1000px 600px at 50% 40%, black, transparent 70%)",
          }}
        />

        <div className="mx-auto max-w-[1232px] text-center">
          <Kicker>Book a Demo</Kicker>
          <SectionTitle
            title="See Tikd. in action"
            sub="A 20–30 minute walkthrough tailored to your events — from instant tickets to transparent fees and lightning checkout."
          />
          <div className="mt-6 flex items-stretch justify-center gap-3">
            <Button asChild size="lg" variant="primary" className="px-7">
              <Link href="/events">Browse events</Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="px-7">
              <Link
                href="/help/organizers"
                className="inline-flex items-center"
              >
                For organizers <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="mx-auto mt-10 grid max-w-[1232px] grid-cols-1 gap-8 px-4 pb-20 md:grid-cols-12">
        {/* Left: form / success */}
        <div className="md:col-span-7 lg:col-span-8">
          <div className="rounded-2xl border border-white/10 bg-neutral-950/70 p-6 md:p-7">
            {!submitted ? (
              <>
                <h2 className="mb-1 text-xl font-semibold">
                  Tell us about you
                </h2>
                <p className="mb-6 text-sm text-neutral-300">
                  A few details so we can tailor your walkthrough. We’ll reply
                  within one business day.
                </p>

                <form
                  onSubmit={handleSubmit(onSubmit)}
                  className="space-y-5"
                  noValidate
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <LabelledInput
                      label="Full name"
                      {...register("name")}
                      variant="full"
                      className={errors.name && "border border-error-500"}
                    />
                    <LabelledInput
                      label="Work email"
                      type="email"
                      {...register("email")}
                      variant="full"
                      className={errors.email && "border border-error-500"}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <LabelledInput
                      label="Company / Organization"
                      {...register("company")}
                      variant="full"
                      className={errors.company && "border border-error-500"}
                    />
                    <LabelledInput
                      label="Website (optional)"
                      placeholder="https://"
                      {...register("website")}
                      variant="full"
                      className={errors.website && "border border-error-500"}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <LabelledInput
                      label="Role / Title"
                      {...register("role")}
                      variant="full"
                      className={errors.role && "border border-error-500"}
                    />
                    <div className="space-y-1">
                      <label className="block text-sm font-medium">
                        Monthly ticket volume
                      </label>
                      <select
                        {...register("volume")}
                        className="w-full rounded-md border border-white/10 bg-neutral-950 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
                      >
                        <option value="<1k">&lt; 1k</option>
                        <option value="1k-10k">1k – 10k</option>
                        <option value="10k-50k">10k – 50k</option>
                        <option value="50k+">50k+</option>
                      </select>
                      {errors.volume && (
                        <p className="text-xs text-error-300">
                          {errors.volume.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="block text-sm font-medium">
                        Timezone
                      </label>
                      <select
                        {...register("timezone")}
                        defaultValue={defaultTz}
                        className="w-full rounded-md border border-white/10 bg-neutral-950 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
                      >
                        {zones.slice(0, 200).map((z) => (
                          <option key={z} value={z}>
                            {z}
                          </option>
                        ))}
                      </select>
                      {errors.timezone && (
                        <p className="text-xs text-error-300">
                          {errors.timezone.message}
                        </p>
                      )}
                    </div>

                    {/* Interests (checkbox chips) */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">
                        What are you interested in?
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          "Sell tickets & payouts",
                          "Migrate from Eventbrite",
                          "Guest list & RSVPs",
                          "POS / door scanning",
                          "Promotions / codes",
                          "White-label / API",
                        ].map((i) => (
                          <label
                            key={i}
                            className="inline-flex cursor-pointer select-none items-center gap-2 rounded-full border border-white/10 bg-neutral-950 px-3 py-1.5 text-sm transition-colors has-[:checked]:border-primary-600 has-[:checked]:bg-primary-700/30"
                          >
                            <input
                              type="checkbox"
                              value={i}
                              className="hidden"
                              {...register("interests")}
                            />
                            <span>{i}</span>
                          </label>
                        ))}
                      </div>
                      {errors.interests && (
                        <p className="text-xs text-error-300">
                          {errors.interests.message as string}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium">
                      Goals / anything else?
                    </label>
                    <TextArea
                      {...register("message")}
                      placeholder="Share your goals, timelines, or tools you use today…"
                      variant="full"
                      className={errors.message && "border border-error-500"}
                    />
                  </div>

                  <label className="mt-1 inline-flex items-center gap-2 text-sm text-neutral-300">
                    <input
                      type="checkbox"
                      {...register("marketingOptIn")}
                      className="accent-primary-600"
                    />
                    Send me product updates and tips (optional)
                  </label>

                  <div className="flex items-center gap-3 pt-2">
                    <Button
                      type="submit"
                      variant="primary"
                      loading={isSubmitting}
                    >
                      Request a demo
                    </Button>
                    <p className="text-xs text-neutral-400">
                      We’ll never share your info. See our{" "}
                      <Link href="/privacy" className="underline">
                        Privacy Policy
                      </Link>
                      .
                    </p>
                  </div>
                </form>
              </>
            ) : (
              /* --------- Success state --------- */
              <div className="text-center">
                <div className="mx-auto mb-4 inline-flex rounded-xl bg-primary-900/50 p-3 ring-1 ring-primary-700/40">
                  <Mail className="h-5 w-5 text-primary-300" />
                </div>
                <h3 className="text-2xl font-extrabold">
                  Thanks — request received!
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-neutral-300">
                  We’ll email{" "}
                  <span className="font-medium text-neutral-0">
                    {submitted.email}
                  </span>{" "}
                  to schedule your walkthrough. Expect a reply within one
                  business day.
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                  <Button variant="secondary" onClick={downloadICS}>
                    Add placeholder to calendar (.ics)
                  </Button>
                  <Button asChild variant="ghost">
                    <Link href="/events">Explore events</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: value props / FAQ */}
        <aside className="md:col-span-5 lg:col-span-4">
          <div className="sticky top-20 space-y-6">
            <div className="rounded-2xl border border-white/10 bg-neutral-950/70 p-6">
              <h3 className="mb-4 text-base font-semibold">What you’ll see</h3>
              <div className="grid gap-4">
                <Card
                  icon={<Rocket className="h-5 w-5 text-primary-300" />}
                  title="Lightning checkout"
                  text="Wallet-ready tickets, instant delivery, and transparent pricing that converts."
                />
                <Card
                  icon={<ShieldCheck className="h-5 w-5 text-primary-300" />}
                  title="Organizer tooling"
                  text="Ticket tiers, promos, payouts, and clean reporting built for real teams."
                />
                <Card
                  icon={<Sparkles className="h-5 w-5 text-primary-300" />}
                  title="API & white-label"
                  text="Embed Tikd in your own flows with flexible APIs and a polished UI kit."
                />
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-neutral-950/70 p-6">
              <h3 className="mb-3 text-base font-semibold">FAQ</h3>
              <ul className="space-y-3 text-sm text-neutral-300">
                <li>
                  <span className="font-medium text-neutral-0">
                    How long is the demo?
                  </span>
                  <br />
                  Typically 20–30 minutes, tailored to your use case.
                </li>
                <li>
                  <span className="font-medium text-neutral-0">
                    Do you migrate from Eventbrite?
                  </span>
                  <br />
                  Yes — we’ll cover imports, fees, and timelines on the call.
                </li>
                <li>
                  <span className="font-medium text-neutral-0">
                    Is there a cost?
                  </span>
                  <br />
                  No — the demo is free and zero-pressure.
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-white/10 bg-neutral-950/70 p-6">
              <h3 className="text-base font-semibold">Prefer email?</h3>
              <p className="mt-1 text-sm text-neutral-300">
                Drop us a line and we’ll set up a time that works for you.
              </p>
              <Button asChild variant="ghost" className="mt-3 w-full">
                <a href="mailto:hello@tikd.app">hello@tikd.app</a>
              </Button>
            </div>
          </div>
        </aside>
      </section>

      {/* CTA */}
      <section className="relative isolate overflow-hidden px-4 pb-20 pt-12 text-center">
        <div
          className="absolute inset-0 -z-10 bg-gradient-to-tr from-primary-700/30 via-primary-900/20 to-neutral-950"
          aria-hidden
        />
        <h2 className="text-balance text-2xl font-semibold md:text-3xl">
          Ready to level up your ticketing?
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-pretty text-neutral-300">
          Join organizers who made the switch for speed, fairness, and happier
          guests.
        </p>
        <div className="mt-7 flex items-stretch justify-center gap-3">
          <Button asChild size="lg" variant="secondary" className="px-8">
            <Link href="/help/organizers">Learn more</Link>
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
