// src/app/events/[id]/page.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { Button } from "@/components/ui/Button";
import Pill from "@/components/ui/Pill";
import { Skeleton } from "@/components/ui/Skeleton";
import InfoRow from "@/components/ui/InfoRow";
import { EventHero } from "@/components/sections/event/EventHero";
import { useCart } from "@/store/useCart";
import { EVENT_CARD_DEFAULT_POSTER } from "@/components/ui/EventCard";
import EventMediaGallery, {
  type EventMediaItem,
} from "@/components/ui/EventMediaGallery";

/* ------------------------------------------------------------------ */
/*  Remote types                                                      */
/* ------------------------------------------------------------------ */
interface Artist {
  _id: string;
  stageName: string;
  avatar?: string;
  isVerified: boolean;
}

interface TicketType {
  _id: string;
  label: string;
  price: number;
  quantity: number;
  currency: string;
  feesIncluded: boolean;
  image?: string;
}

interface ApiEvent {
  _id: string;
  title: string;
  description?: string;
  date: string; // ISO
  location: string;
  image?: string;

  // ✅ NEW: media gallery items
  media?: EventMediaItem[];

  attendingCount: number;
  attendeesPreview: { _id: string; image?: string }[];
  artists: Artist[];

  // ✅ Ticket types may be missing if backend changes again; never crash
  ticketTypes?: TicketType[];

  organization: {
    _id: string;
    name: string;
    logo?: string;
    website?: string;
  };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */
const fetchJSON = async <T,>(url: string): Promise<T> => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(await r.text());
  return (await r.json()) as T;
};

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

const getStaticMapUrl = (
  address: string,
  width = 800,
  height = 400,
): string | null => {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  if (!key) return null;
  return [
    "https://maps.googleapis.com/maps/api/staticmap",
    `?center=${encodeURIComponent(address)}`,
    `&zoom=15`,
    `&size=${width}x${height}`,
    `&scale=2`,
    `&maptype=roadmap`,
    `&markers=color:0x9A51FF%7C${encodeURIComponent(address)}`,
    `&key=${key}`,
  ].join("");
};

function posterOrDefault(src: unknown): string {
  if (typeof src !== "string") return EVENT_CARD_DEFAULT_POSTER;
  const s = src.trim();
  return s ? s : EVENT_CARD_DEFAULT_POSTER;
}

function AvatarStack({
  images,
  total,
}: {
  images: { _id: string; image?: string }[];
  total: number;
}) {
  const visible = images.slice(0, 3);
  const remainder = Math.max(total - visible.length, 0);

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-3">
        {visible.map((u, i) => (
          <div
            key={u._id}
            className="relative size-8 overflow-hidden rounded-full border-2 border-[#08080F]"
            style={{ zIndex: visible.length - i }}
          >
            <Image
              fill
              sizes="32px"
              src={u.image || "/dummy/avatar.png"}
              alt=""
              className="object-cover"
            />
          </div>
        ))}

        {remainder > 0 && (
          <div className="relative size-8 rounded-full bg-neutral-800 text-center text-xs leading-8 text-white border-2 border-[#08080F]">
            +{remainder}
          </div>
        )}
      </div>

      <span className="text-sm font-medium text-white/90">Attending</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton while loading                                            */
/* ------------------------------------------------------------------ */
function EventDetailSkeleton() {
  return (
    <div className="relative">
      <div className="fixed inset-0 -z-10 bg-neutral-950" />

      <div className="mx-auto w-full max-w-[1360px] px-4 pt-[112px] pb-16 md:pt-[124px]">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-x-8 xl:gap-x-10">
          {/* left poster */}
          <div className="lg:col-span-4 xl:col-span-5">
            <div className="lg:sticky lg:top-[112px] md:lg:top-[124px] lg:flex lg:justify-end">
              <Skeleton className="h-[275px] w-[220px] rounded-xl sm:h-[325px] sm:w-[260px] md:h-[375px] md:w-[300px] lg:h-[428px] lg:w-[342px]" />
            </div>
          </div>

          {/* right content */}
          <div className="lg:col-span-8 xl:col-span-7 space-y-6">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-5 w-44" />
            <div className="flex gap-2">
              <Skeleton className="h-7 w-28 rounded-full" />
              <Skeleton className="h-7 w-48 rounded-full" />
            </div>

            <Skeleton className="h-[260px] rounded-2xl" />
            <Skeleton className="h-[170px] rounded-2xl" />
            <Skeleton className="h-[170px] rounded-2xl" />
            <Skeleton className="h-[240px] rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page component                                                    */
/* ------------------------------------------------------------------ */
export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { items, addItem, setQty, removeItem } = useCart();

  const {
    data: event,
    isLoading,
    isError,
    error,
  } = useQuery<ApiEvent>({
    queryKey: ["event", id],
    queryFn: () => fetchJSON<ApiEvent>(`/api/events/${id}`),
    enabled: Boolean(id),
  });

  /**
   * ✅ IMPORTANT: Hooks must run on every render in the same order.
   * We compute memoized values *before* early returns, using safe fallbacks.
   */
  const eventId = event?._id?.toString() ?? "";
  const safeTicketTypes = event?.ticketTypes ?? [];
  const heroPoster = posterOrDefault(event?.image);

  const EMPTY_QTY_MAP: Readonly<Record<string, number>> = Object.freeze({});

  const qtyByTicket = useMemo<Record<string, number>>(() => {
    if (!eventId) return EMPTY_QTY_MAP;

    const map: Record<string, number> = {};
    for (const it of items) {
      if (it.eventId === eventId) map[it.ticketTypeId] = it.qty;
    }
    return map;
  }, [items, eventId]);

  const selectedCount = useMemo(
    () => Object.values(qtyByTicket).reduce((a, b) => a + b, 0),
    [qtyByTicket],
  );

  /* ---------- Early returns ---------- */
  if (isLoading) return <EventDetailSkeleton />;

  if (isError || !event) {
    return (
      <div className="mx-auto max-w-[998px] py-24 text-center text-neutral-300">
        {isError ? (error as Error).message : "Event not found."}
      </div>
    );
  }

  // ✅ From here on, `event` is guaranteed
  const eventData: ApiEvent = event;

  /* ---------- Date / map ---------- */
  const dateLabel = formatDate(eventData.date);

  // Slightly larger request so it stays crisp when embedded
  const MAP_W = 1000;
  const MAP_H = 560;
  const mapUrl =
    getStaticMapUrl(eventData.location, MAP_W, MAP_H) || "/dummy/map.png";

  /* ---------- Handle qty change -> Cart ---------- */
  function handleTicketQtyChange(ticketTypeId: string, nextQty: number) {
    const tt = safeTicketTypes.find((t) => t._id === ticketTypeId);
    if (!tt) return;

    const key = `${eventData._id}:${ticketTypeId}`;
    const existing = items.find((i) => i.key === key);

    if (!existing && nextQty > 0) {
      addItem({
        eventId: eventData._id,
        eventTitle: eventData.title,
        ticketTypeId,
        ticketLabel: tt.label,
        unitPrice: tt.price,
        currency: tt.currency,
        image: heroPoster, // ticket photos removed; use event poster only
        qty: nextQty,
      });
    } else if (existing && nextQty > 0) {
      setQty(existing.key, nextQty);
    } else if (existing && nextQty === 0) {
      removeItem(existing.key);
    }
  }

  const hasDesc = Boolean(eventData.description?.trim());
  const hasMedia = (eventData.media?.length ?? 0) > 0;
  const showDetailsCard = hasDesc || hasMedia || eventData.attendingCount > 0;

  /* ---------- Render ---------- */
  return (
    <EventHero
      poster={heroPoster}
      title={eventData.title}
      venue={eventData.location}
      dateLabel={dateLabel}
      organization={{
        id: eventData.organization._id,
        name: eventData.organization.name,
        logo: eventData.organization.logo,
        website: eventData.organization.website,
      }}
      ticketOptions={safeTicketTypes.map((t) => ({
        id: t._id,
        label: t.label,
        price: t.price,
        currency: t.currency,
        qty: qtyByTicket[t._id] ?? 0,
        feesIncluded: t.feesIncluded,
      }))}
      onTicketQtyChange={handleTicketQtyChange}
      selectedCount={selectedCount}
      onCheckout={() => router.push("/checkout")}
    >
      {/* ---------------- Right column content ---------------- */}
      <div className="space-y-6">
        {/* Details */}
        {showDetailsCard && (
          <section className="rounded-2xl border border-white/10 bg-neutral-950/55 backdrop-blur-md">
            <div className="p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-white">Details</h2>

              <div className="mt-4 flex flex-wrap gap-2">
                <Pill
                  text="All ages"
                  icon={
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                    >
                      <path
                        d="M10.6666 11.3333V12.6667H1.33331V11.3333C1.33331 11.3333 1.33331 8.66668 5.99998 8.66668C10.6666 8.66668 10.6666 11.3333 10.6666 11.3333ZM8.33331 5.00001C8.33331 4.53852 8.19647 4.0874 7.94008 3.70368C7.68369 3.31997 7.31927 3.0209 6.89291 2.8443C6.46655 2.66769 5.99739 2.62148 5.54477 2.71152C5.09215 2.80155 4.67639 3.02378 4.35006 3.3501C4.02374 3.67642 3.80151 4.09218 3.71148 4.5448C3.62145 4.99743 3.66766 5.46658 3.84426 5.89294C4.02087 6.3193 4.31993 6.68372 4.70365 6.94011C5.08736 7.1965 5.53849 7.33335 5.99998 7.33335C6.61882 7.33335 7.21231 7.08751 7.6499 6.64993C8.08748 6.21235 8.33331 5.61885 8.33331 5.00001ZM10.6266 8.66668C11.0365 8.98385 11.3718 9.38697 11.6091 9.84769C11.8464 10.3084 11.9798 10.8155 12 11.3333V12.6667H14.6666V11.3333C14.6666 11.3333 14.6666 8.91335 10.6266 8.66668ZM9.99998 2.66668C9.54117 2.66455 9.09251 2.8017 8.71331 3.06001C9.11827 3.62584 9.33602 4.30421 9.33602 5.00001C9.33602 5.69582 9.11827 6.37419 8.71331 6.94001C9.09251 7.19833 9.54117 7.33548 9.99998 7.33335C10.6188 7.33335 11.2123 7.08751 11.6499 6.64993C12.0875 6.21235 12.3333 5.61885 12.3333 5.00001C12.3333 4.38118 12.0875 3.78768 11.6499 3.3501C11.2123 2.91251 10.6188 2.66668 9.99998 2.66668Z"
                        fill="white"
                      />
                    </svg>
                  }
                />
                <Pill
                  text={`Doors open at ${new Date(
                    eventData.date,
                  ).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`}
                  icon={
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                    >
                      <path
                        d="M7.99998 14.6667C4.31798 14.6667 1.33331 11.682 1.33331 8.00001C1.33331 4.31801 4.31798 1.33334 7.99998 1.33334C11.682 1.33334 14.6666 4.31801 14.6666 8.00001C14.6666 11.682 11.682 14.6667 7.99998 14.6667ZM7.99998 13.3333C9.41447 13.3333 10.771 12.7714 11.7712 11.7712C12.7714 10.7711 13.3333 9.4145 13.3333 8.00001C13.3333 6.58552 12.7714 5.22897 11.7712 4.22877C10.771 3.22858 9.41447 2.66668 7.99998 2.66668C6.58549 2.66668 5.22894 3.22858 4.22874 4.22877C3.22855 5.22897 2.66665 6.58552 2.66665 8.00001C2.66665 9.4145 3.22855 10.7711 4.22874 11.7712C5.22894 12.7714 6.58549 13.3333 7.99998 13.3333ZM8.66665 8.00001H11.3333V9.33334H7.33331V4.66668H8.66665V8.00001Z"
                        fill="white"
                      />
                    </svg>
                  }
                />
              </div>

              {hasDesc ? (
                <p className="mt-4 whitespace-pre-wrap text-white/90 font-light leading-[150%]">
                  {eventData.description}
                </p>
              ) : null}

              {/* ✅ Media gallery (videos one-by-one, images carousel) */}
              {hasMedia ? (
                <div className={hasDesc ? "mt-5" : "mt-4"}>
                  <EventMediaGallery items={eventData.media ?? []} />
                </div>
              ) : null}

              {eventData.attendingCount > 0 && (
                <div className="mt-5">
                  <AvatarStack
                    images={eventData.attendeesPreview}
                    total={eventData.attendingCount}
                  />
                </div>
              )}
            </div>
          </section>
        )}

        {/* Lineup */}
        {eventData.artists.length > 0 && (
          <section className="rounded-2xl border border-white/10 bg-neutral-950/55 backdrop-blur-md">
            <div className="p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-white">Lineup</h2>

              <ul className="mt-4 flex flex-wrap gap-2">
                {eventData.artists.map((artist) => (
                  <li
                    key={artist._id}
                    className="flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-1 py-1 pr-3"
                  >
                    <div className="relative size-8 overflow-hidden rounded-full bg-neutral-800">
                      <Image
                        src={artist.avatar || "/dummy/avatar.png"}
                        alt={artist.stageName}
                        fill
                        sizes="32px"
                        className="object-cover"
                      />
                    </div>
                    <span className="text-white/90">{artist.stageName}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Venue (✅ map moved here) */}
        <section className="rounded-2xl border border-white/10 bg-neutral-950/55 backdrop-blur-md">
          <div className="p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-white">Venue</h2>

            <p className="mt-3 text-white/85 font-light leading-[150%]">
              {eventData.location}
            </p>

            {/* Embedded map (replaces “Map is shown…” text) */}
            <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-neutral-900/25">
              <div className="relative h-[220px] sm:h-[240px] md:h-[260px]">
                <Image
                  src={mapUrl}
                  alt={`Map for ${eventData.location}`}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 700px, 760px"
                  className="object-cover"
                  unoptimized
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                <div className="pointer-events-none absolute inset-0 ring-1 ring-white/10" />
              </div>
            </div>
          </div>
        </section>

        {/* Terms */}
        <InfoRow title="Terms">
          <p className="whitespace-pre-line text-neutral-0 font-light leading-[150%]">
            All tickets are final sale and cannot be exchanged or refunded…
          </p>
        </InfoRow>

        {/* Bottom banner (Org only) — map removed; container reduced */}
        <section className="rounded-2xl border border-white/10 bg-neutral-950/55 backdrop-blur-md overflow-hidden">
          {/* Org panel now fills full width */}
          <div className="relative p-5 sm:p-6">
            <div
              className="pointer-events-none absolute inset-0 opacity-90"
              style={{
                background:
                  "radial-gradient(680px 240px at 16% 10%, rgba(154,70,255,0.22), transparent 55%)," +
                  "radial-gradient(520px 220px at 92% 34%, rgba(167,112,255,0.16), transparent 55%)",
              }}
            />
            <div className="relative flex flex-col items-center justify-center text-center">
              <div className="relative size-[52px] overflow-hidden rounded-full bg-white/10 border border-white/10">
                <Image
                  src={
                    eventData.organization.logo ||
                    "/dummy/organization-placeholder.png"
                  }
                  alt={`${eventData.organization.name} logo`}
                  fill
                  sizes="52px"
                  className="object-cover"
                />
              </div>

              <p className="mt-3 text-sm text-white/60">Hosted by</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {eventData.organization.name}
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <Button asChild variant="secondary">
                  <Link href={`/org/${eventData.organization._id}`}>
                    More Events
                  </Link>
                </Button>

                {eventData.organization.website && (
                  <Button asChild variant="secondary">
                    <a
                      href={eventData.organization.website}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Visit Website
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </EventHero>
  );
}
