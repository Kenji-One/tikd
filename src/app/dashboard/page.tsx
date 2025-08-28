/* ------------------------------------------------------------------ */
/*  src/app/dashboard/page.tsx – Tikd Dashboard                       */
/* ------------------------------------------------------------------ */
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  Building2,
  CalendarPlus,
  Ticket as TicketIcon,
} from "lucide-react";

import { Tabs } from "@/components/ui/Tabs";
import { EventCard } from "@/components/ui/EventCard";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import SettingsShell from "@/components/features/settings/SettingsShell";
import TicketCard from "@/components/ui/TicketCard";
import TicketDialog from "@/components/ui/TicketDialog";

/* --------------------------------------------------------------- */
/*  Small fetch helper                                             */
/* --------------------------------------------------------------- */
async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  return (await res.json()) as T;
}

type Org = { _id: string; name: string; logo?: string; website?: string };

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

type MyEvent = {
  _id: string;
  title: string;
  image?: string;
  date: string;
  location: string;
  category?: string;
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

type TabDef = {
  id: string;
  label: React.ReactNode;
  badge?: number;
  content: React.ReactNode;
};

/* --------------------------------------------------------------- */
/*  Small presentational bits                                      */
/* --------------------------------------------------------------- */
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
    <div className="mx-auto mt-8 max-w-md rounded-2xl border border-white/10 bg-neutral-950/70 p-10 text-center">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-primary-900/50 ring-1 ring-primary-700/40">
        {icon}
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {sub ? <p className="mt-2 text-sm text-neutral-300">{sub}</p> : null}
      {cta ? <div className="mt-5">{cta}</div> : null}
    </div>
  );
}

function OrgCard({
  org,
}: {
  org: { _id: string; name: string; logo?: string; website?: string };
}) {
  return (
    <Link
      href={`/org/${org._id}`}
      className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-neutral-950/70 p-5 transition-transform duration-200 hover:-translate-y-0.5"
    >
      <div className="relative h-14 w-14 overflow-hidden rounded-xl ring-4 ring-black/50">
        {org.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={org.logo}
            alt={`${org.name} logo`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-[conic-gradient(from_220deg_at_50%_50%,#6d28d9,#3b82f6,#111827)] text-white">
            <span className="text-lg font-semibold">
              {org.name?.[0]?.toUpperCase() ?? "O"}
            </span>
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold">{org.name}</p>
        {org.website ? (
          <p className="truncate text-sm text-neutral-300">
            {org.website.replace(/^https?:\/\/(www\.)?/, "")}
          </p>
        ) : (
          <p className="text-sm text-neutral-300">Public profile</p>
        )}
      </div>
      <div className="ml-auto">
        <Button size="sm" variant="ghost">
          View
        </Button>
      </div>
    </Link>
  );
}

/* --------------------------------------------------------------- */
/*  Page                                                            */
/* --------------------------------------------------------------- */
export default function DashboardPage() {
  const { data: session } = useSession();

  /* ---------------- react-query calls -------------------------- */
  const { data: orgs, isLoading: orgsLoading } = useQuery<Org[]>({
    queryKey: ["orgs"],
    queryFn: () => fetchJSON<Org[]>("/api/organizations"),
    enabled: !!session,
  });

  const { data: tickets, isLoading: tixLoading } = useQuery<Ticket[]>({
    queryKey: ["tickets"],
    queryFn: () => fetchJSON<Ticket[]>("/api/tickets?scope=self"),
    enabled: !!session,
  });

  const { data: myEvents, isLoading: eventsLoading } = useQuery<MyEvent[]>({
    queryKey: ["myEvents"],
    queryFn: () => fetchJSON<MyEvent[]>("/api/events?owned=1"),
    enabled: !!session,
  });

  const ticketsCount = tickets?.length ?? 0;
  const orgsCount = orgs?.length ?? 0;
  const eventsCount = myEvents?.length ?? 0;

  /* ---------------- local UI state ----------------------------- */
  const [activeId, setActiveId] = useState<string>("tickets");
  const [openTicket, setOpenTicket] = useState<DialogTicket | null>(null);

  /* ---------------- tab definitions --------------------------- */
  const tabs: TabDef[] = [
    {
      id: "tickets",
      label: `Tickets`,
      badge: ticketsCount,
      content: (
        <>
          {tixLoading ? (
            <div className="grid [grid-template-columns:repeat(auto-fill,minmax(187px,187px))] gap-4">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-[310px] w-[187px] rounded-3xl" />
              ))}
            </div>
          ) : ticketsCount ? (
            <div className="grid [grid-template-columns:repeat(auto-fill,minmax(186.5px,186.5px))] gap-4">
              {tickets.map((t: Ticket) => {
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
                const img = t.eventImg ?? "/placeholder.jpg";
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
              title="No tickets yet"
              sub="When you book with Tikd., your tickets will appear here for quick access."
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
              refCode: openTicket?.reference ?? openTicket?.refCode,
            }}
          />
        </>
      ),
    },
    {
      id: "orgs",
      label: "Organizations",
      badge: orgsCount,
      content: (
        <>
          {orgsLoading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-2xl" />
              ))}
            </div>
          ) : orgsCount ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {orgs.map((o: Org) => (
                <OrgCard key={o._id} org={o} />
              ))}
              <Link
                href="/dashboard/organizations/new"
                className="group flex items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 bg-neutral-950/50 p-6 text-neutral-300 transition-colors hover:border-primary-600/50 hover:text-neutral-0"
              >
                <Plus className="h-5 w-5" />
                <span>Create a new organization</span>
              </Link>
            </div>
          ) : (
            <EmptyState
              icon={<Building2 className="h-5 w-5 text-primary-300" />}
              title="No organizations yet"
              sub="Create an organization to host events and manage your brand."
              cta={
                <Link href="/dashboard/organizations/new">
                  <Button variant="primary">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Organization
                  </Button>
                </Link>
              }
            />
          )}
        </>
      ),
    },
    {
      id: "events",
      label: "My events",
      badge: eventsCount,
      content: (
        <>
          {eventsLoading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 xl:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-60 rounded-2xl" />
              ))}
            </div>
          ) : eventsCount ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 xl:grid-cols-4">
              {myEvents.map((ev: MyEvent) => (
                <div key={ev._id} className="flex flex-col">
                  <EventCard
                    id={ev._id}
                    title={ev.title}
                    img={ev.image ?? "/placeholder.jpg"}
                    dateLabel={new Date(ev.date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                    venue={ev.location}
                    category={ev.category ?? ""}
                  />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<CalendarPlus className="h-5 w-5 text-primary-300" />}
              title="You haven’t hosted any events yet"
              sub="Spin up your first event in minutes. Set tickets, publish, and start selling."
              cta={
                <Link href="/dashboard/events/new">
                  <Button variant="primary">
                    <CalendarPlus className="mr-2 h-4 w-4" />
                    Create Event
                  </Button>
                </Link>
              }
            />
          )}
        </>
      ),
    },

    /* -------- Profile & Settings tab -------- */
    {
      id: "settings",
      label: "Profile & Settings",
      content: <SettingsShell />,
    },
  ];

  /* ---------------- render ------------------------------- */
  const firstName = useMemo(
    () => (session?.user?.name ? session.user.name.split(" ")[0] : "Your"),
    [session?.user?.name]
  );

  return (
    <main className="relative overflow-hidden bg-neutral-950 text-neutral-0">
      {/* Header with mesh + quick actions */}
      <section className="relative isolate px-4 pt-10 md:py-12 mt-6 md:mt-8">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-80"
          style={{
            background:
              "radial-gradient(1000px 420px at 15% 10%, rgba(130,46,255,.25), transparent 60%), radial-gradient(800px 420px at 85% 0%, rgba(88,101,242,.20), transparent 60%)",
          }}
        />
        <div className="mx-auto max-w-[1232px]">
          <h1 className="text-2xl font-extrabold md:text-3xl">
            {firstName} Dashboard
          </h1>
          <p className="mt-2 max-w-prose text-sm text-neutral-300">
            Manage tickets, organizations, events and your profile — all in one
            place.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link href="/dashboard/events/new">
              <Button variant="secondary" size="sm">
                <CalendarPlus className="mr-2 h-4 w-4" />
                Create Event
              </Button>
            </Link>
            <Link href="/dashboard/organizations/new">
              <Button variant="ghost" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Organization
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Tabs + content */}
      <section className="mx-auto max-w-[1232px] px-4 pb-20 pt-6">
        {/* Tabs header row with floating right button (events only) */}
        <div className="relative mb-6 min-h-[56px]">
          <Tabs tabs={tabs} activeId={activeId} onChange={setActiveId} />
        </div>
      </section>
    </main>
  );
}
