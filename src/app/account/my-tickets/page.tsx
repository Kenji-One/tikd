/* ------------------------------------------------------------------ */
/*  src/app/account/my-tickets/page.tsx – My Tickets                   */
/* ------------------------------------------------------------------ */
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Ticket as TicketIcon,
  Settings as SettingsIcon,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import TicketDialog from "@/components/ui/TicketDialog";
import TicketPassCard, {
  type TicketPassDesign,
} from "@/components/ui/TicketPassCard";

/* --------------------------------------------------------------- */
/*  Small fetch helper                                             */
/* --------------------------------------------------------------- */
async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return (await res.json()) as T;
}

type Ticket = {
  _id: string;

  // event-ish
  eventTitle?: string;
  event?: { title?: string; date?: string; location?: string; image?: string };
  date?: string;
  dateLabel?: string;
  venue?: string;
  location?: string;
  eventImg?: string;
  image?: string;

  // ticket-ish
  qty?: number;
  quantity?: number;
  badge?: string;

  // qr
  qrUrl?: string;
  qrSvg?: string;
  qrCode?: string;

  // reference
  reference?: string;
  refCode?: string;

  // ticket type info (varies by API)
  ticketTypeLabel?: string;
  ticketType?: string;

  // optional design (if API provides it)
  design?: Partial<TicketPassDesign> | null;
};

type DialogTicket = {
  title: string;
  dateLabel: string;
  venue: string;
  img: string;
  qty?: number;
  badge?: string;

  qrUrl?: string;
  qrSvg?: string;
  qrValue?: string;

  refCode?: string;

  design?: Partial<TicketPassDesign> | null;

  eventTitle?: string;
  eventDateISO?: string;
  eventLocation?: string;
  eventImageUrl?: string;
  ticketTypeLabel?: string;
};

function EmptyState({
  icon,
  title,
  sub,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  sub?: string;
  cta?: React.ReactNode;
}) {
  return (
    <div className="mx-auto mt-10 max-w-md rounded-2xl border border-white/10 bg-neutral-950/70 p-10 text-center">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-primary-900/50 ring-1 ring-primary-700/40">
        {icon}
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {sub ? <p className="mt-2 text-sm text-neutral-300">{sub}</p> : null}
      {cta ? <div className="mt-5">{cta}</div> : null}
    </div>
  );
}

export default function MyTicketsPage() {
  const { status } = useSession();

  const [q, setQ] = useState("");
  const [openTicket, setOpenTicket] = useState<DialogTicket | null>(null);

  const authed = status === "authenticated";

  const { data: tickets, isLoading: tixLoading } = useQuery<Ticket[]>({
    queryKey: ["tickets", "self"],
    queryFn: () => fetchJSON<Ticket[]>("/api/tickets?scope=self"),
    enabled: authed,
  });

  const ticketsList = tickets ?? [];

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return ticketsList;

    return ticketsList.filter((t) => {
      const title = (t.eventTitle ?? t.event?.title ?? "").toLowerCase();
      const venue = (
        t.venue ??
        t.location ??
        t.event?.location ??
        ""
      ).toLowerCase();
      const type = (t.ticketTypeLabel ?? t.ticketType ?? "").toLowerCase();
      return (
        title.includes(needle) ||
        venue.includes(needle) ||
        type.includes(needle)
      );
    });
  }, [q, ticketsList]);

  const countLabel = useMemo(() => {
    const n = filtered.length;
    return n === 1 ? "1 ticket" : `${n} tickets`;
  }, [filtered.length]);

  return (
    <main className="relative overflow-hidden bg-neutral-950 text-neutral-0">
      {/* Header */}
      <section className="relative isolate px-4 pt-10 pb-6 md:pt-12 md:pb-8">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-85"
          style={{
            background:
              "radial-gradient(1000px 420px at 15% 10%, rgba(130,46,255,.22), transparent 60%), radial-gradient(900px 420px at 85% 0%, rgba(88,101,242,.14), transparent 60%)",
          }}
        />
        <div className="mx-auto max-w-[1232px]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-extrabold md:text-3xl">
                My Tickets
              </h1>
              <p className="mt-2 max-w-prose text-sm text-neutral-300">
                Your QR tickets live here. Open any ticket to show details at
                the door.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/account/settings">
                <Button variant="ghost" size="sm" className="h-10 px-4">
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  Settings
                </Button>
              </Link>
              <Link href="/events">
                <Button variant="secondary" size="sm" className="h-10 px-4">
                  Browse events
                </Button>
              </Link>
            </div>
          </div>

          {/* Search + count */}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:max-w-[380px]">
              <div className="inline-flex w-full items-center gap-0.5 rounded-full border border-white/10 bg-neutral-950/60 px-4 py-1.5 backdrop-blur">
                <Search className="h-4 w-4 text-neutral-300" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search tickets by event or venue…"
                  aria-label="Search tickets"
                  className="
                    w-full bg-transparent text-sm text-neutral-0 placeholder:text-neutral-400
                    focus:outline-none
                    !border-0 !ring-0 !shadow-none
                    focus:!border-0 focus:!ring-0 focus:!shadow-none
                  "
                />
                {q.trim() ? (
                  <button
                    type="button"
                    onClick={() => setQ("")}
                    className="grid h-8 w-8 place-items-center rounded-full bg-white/6 text-white/80 transition hover:bg-white/10 hover:text-white cursor-pointer"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>

            {authed ? (
              <div className="text-sm text-neutral-300">
                <span className="rounded-full border border-white/10 bg-neutral-950/60 px-3 py-1.5">
                  {countLabel}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="mx-auto max-w-[1232px] px-4 pb-20 pt-2">
        {!authed ? (
          <EmptyState
            icon={<TicketIcon className="h-5 w-5 text-primary-300" />}
            title="Sign in to view your tickets"
            sub="Your tickets are tied to your account, so you’ll need to log in to access them."
            cta={
              <Button variant="primary" onClick={() => signIn()} animation>
                Sign in
              </Button>
            }
          />
        ) : tixLoading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-[520px] w-full rounded-2xl" />
            ))}
          </div>
        ) : filtered.length ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((t) => {
              const title = t.eventTitle ?? t.event?.title ?? "Event";

              const eventISO = t.date ?? t.event?.date;
              const venue = t.venue ?? t.location ?? t.event?.location ?? "TBA";
              const img =
                t.eventImg ?? t.image ?? t.event?.image ?? "/placeholder.jpg";
              const qty = t.qty ?? t.quantity ?? 1;

              const typeLabel =
                t.ticketTypeLabel ?? t.ticketType ?? "General admission";

              const dateLabel =
                t.dateLabel ??
                (eventISO
                  ? new Date(eventISO).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Date TBA");

              const dialogTicket: DialogTicket = {
                title,
                dateLabel,
                venue,
                img,
                qty,
                badge: t.badge,
                qrUrl: t.qrUrl,
                qrSvg: t.qrSvg,
                qrValue: t.qrCode ?? t.reference ?? t.refCode ?? t._id,
                refCode: t.reference ?? t.refCode,

                design: t.design ?? null,
                eventTitle: title,
                eventDateISO: eventISO,
                eventLocation: venue,
                eventImageUrl: img,
                ticketTypeLabel: typeLabel,
              };

              return (
                <TicketPassCard
                  key={t._id}
                  onClick={() => setOpenTicket(dialogTicket)}
                  ticketTypeLabel={typeLabel}
                  eventTitle={title}
                  eventDateISO={eventISO}
                  eventLocation={venue}
                  eventImageUrl={img}
                  design={t.design ?? undefined}
                  className="w-full"
                />
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={<TicketIcon className="h-5 w-5 text-primary-300" />}
            title={q.trim() ? "No matches" : "No tickets yet"}
            sub={
              q.trim()
                ? "Try a different search term (event name, venue, city)."
                : "When you book with Tikd., your tickets will appear here for quick access."
            }
            cta={
              <Link href="/events">
                <Button variant="primary" animation>
                  Browse events
                </Button>
              </Link>
            }
          />
        )}

        {/* Modal */}
        <TicketDialog
          open={!!openTicket}
          onClose={() => setOpenTicket(null)}
          ticket={{
            title: openTicket?.title ?? "",
            dateLabel: openTicket?.dateLabel ?? "",
            venue: openTicket?.venue ?? "",
            img: openTicket?.img ?? "",
            qty: openTicket?.qty,
            badge: openTicket?.badge,
            qrUrl: openTicket?.qrUrl,
            qrSvg: openTicket?.qrSvg,
            qrValue: openTicket?.qrValue,
            refCode: openTicket?.refCode,

            design: openTicket?.design ?? null,
            eventTitle: openTicket?.eventTitle ?? "",
            eventDateISO: openTicket?.eventDateISO ?? "",
            eventLocation: openTicket?.eventLocation ?? "",
            eventImageUrl: openTicket?.eventImageUrl ?? "",
            ticketTypeLabel: openTicket?.ticketTypeLabel ?? "",
          }}
        />
      </section>
    </main>
  );
}
