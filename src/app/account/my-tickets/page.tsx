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
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import TicketCard from "@/components/ui/TicketCard";
import TicketDialog from "@/components/ui/TicketDialog";

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
  eventTitle?: string;
  event?: { title?: string };
  date?: string;
  dateLabel?: string;
  venue?: string;
  location?: string;
  eventImg?: string;
  image?: string;
  qty?: number;
  quantity?: number;
  badge?: string;
  qrUrl?: string;
  qrSvg?: string;
  reference?: string;
  refCode?: string;
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
  refCode?: string;
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
  const { data: session, status } = useSession();

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
      const venue = (t.venue ?? t.location ?? "").toLowerCase();
      return title.includes(needle) || venue.includes(needle);
    });
  }, [q, ticketsList]);

  const countLabel = useMemo(() => {
    const n = filtered.length;
    return n === 1 ? "1 ticket" : `${n} tickets`;
  }, [filtered.length]);

  return (
    <main className="relative overflow-hidden bg-neutral-950 text-neutral-0">
      {/* Header */}
      <section className="relative isolate px-4 pt-10 md:py-12 ">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-85"
          style={{
            background:
              "radial-gradient(1000px 420px at 15% 10%, rgba(130,46,255,.25), transparent 60%), radial-gradient(800px 420px at 85% 0%, rgba(88,101,242,.20), transparent 60%)",
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
                <Button variant="ghost" size="sm">
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  Settings
                </Button>
              </Link>
              <Link href="/events">
                <Button variant="secondary" size="sm">
                  Browse events
                </Button>
              </Link>
            </div>
          </div>

          {/* Search + count */}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-neutral-950/60 px-3 py-2 backdrop-blur">
              <Search className="h-4 w-4 text-neutral-300" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search tickets by event or venue…"
                className="w-full bg-transparent text-sm text-neutral-0 placeholder:text-neutral-400 focus:outline-none sm:w-[340px]"
              />
            </div>

            <div className="text-sm text-neutral-300">
              {authed ? (
                <span className="rounded-full border border-white/10 bg-neutral-950/60 px-3 py-1.5">
                  {countLabel}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="mx-auto max-w-[1232px] px-4 pb-20 pt-6">
        {!authed ? (
          <EmptyState
            icon={<TicketIcon className="h-5 w-5 text-primary-300" />}
            title="Sign in to view your tickets"
            sub="Your tickets are tied to your account, so you’ll need to log in to access them."
            cta={
              <Button variant="primary" onClick={() => signIn()}>
                Sign in
              </Button>
            }
          />
        ) : tixLoading ? (
          <div className="grid [grid-template-columns:repeat(auto-fill,minmax(187px,187px))] gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-[310px] w-[187px] rounded-3xl" />
            ))}
          </div>
        ) : filtered.length ? (
          <div className="grid [grid-template-columns:repeat(auto-fill,minmax(186.5px,186.5px))] gap-4">
            {filtered.map((t) => {
              const title = t.eventTitle ?? t.event?.title ?? "Event";
              const dateLabel =
                t.dateLabel ??
                (t.date
                  ? new Date(t.date).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Date TBA");
              const venue = t.venue ?? t.location ?? "TBA";
              const img = t.eventImg ?? t.image ?? "/placeholder.jpg";
              const qty = t.qty ?? t.quantity ?? 1;

              const dialogTicket: DialogTicket = {
                title,
                dateLabel,
                venue,
                img,
                qty,
                badge: t.badge,
                qrUrl: t.qrUrl,
                qrSvg: t.qrSvg,
                refCode: t.reference ?? t.refCode,
              };

              return (
                <TicketCard
                  key={t._id}
                  title={title}
                  dateLabel={dateLabel}
                  venue={venue}
                  img={img}
                  qty={qty}
                  badge={t.badge}
                  onDetails={() => setOpenTicket(dialogTicket)}
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
                <Button variant="primary">Browse events</Button>
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
            refCode: openTicket?.refCode,
          }}
        />
      </section>
    </main>
  );
}
