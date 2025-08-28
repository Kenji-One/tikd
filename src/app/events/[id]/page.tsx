/* ------------------------------------------------------------------ */
/*  src/app/events/[id]/page.tsx                                      */
/* ------------------------------------------------------------------ */
"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo } from "react";

import { Button } from "@/components/ui/Button";
import Pill from "@/components/ui/Pill";
import { Skeleton } from "@/components/ui/Skeleton";
import { EventHero } from "@/components/sections/event/EventHero";
import InfoRow from "@/components/ui/InfoRow";
import EventCarouselSection, {
  type Event as CarouselEvent,
} from "@/components/sections/Landing/EventCarouselSection";
import InstagramGallery from "@/components/sections/event/InstagramGallery";
import { useCart } from "@/store/useCart";

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
  attendingCount: number;
  attendeesPreview: { _id: string; image?: string }[];
  artists: Artist[];
  ticketTypes: TicketType[];
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
  height = 400
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

      <span className="text-xl font-medium text-white">Attending</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Dummy “similar events”                                            */
/* ------------------------------------------------------------------ */
const similarEvents: CarouselEvent[] = [
  {
    id: "1",
    title: "NYC Highschool Party",
    dateLabel: "May 23, 2025 6:00 PM",
    venue: "Brooklyn, NY",
    img: "/dummy/event-1.png",
    category: "Shows",
  },
  {
    id: "17",
    title: "Summer Cruise",
    dateLabel: "Jun 01, 2025 9:00 PM",
    venue: "Manhattan, NY",
    img: "/dummy/event-2.png",
    category: "Shows",
  },
];

/* ------------------------------------------------------------------ */
/*  Skeleton while loading                                            */
/* ------------------------------------------------------------------ */
function EventDetailSkeleton() {
  return (
    <>
      {/* ─── Hero skeleton ─── */}
      <section className="relative w-full overflow-hidden">
        <div className="absolute inset-0 z-0 bg-neutral-900 blur-[24px]" />
        <div className="absolute inset-0 z-0 bg-neutral-950/70" />
        <div className="relative mx-auto w-full max-w-[848px] px-4 pt-[72px] pb-[82px] lg:flex lg:items-center lg:gap-[70px] lg:py-[186px]">
          <Skeleton className="h-[275px] w-[220px] rounded-xl sm:h-[325px] sm:w-[260px] md:h-[375px] md:w-[300px] lg:h-[428px] lg:w-[342px]" />
          <div className="mt-4 flex w-full max-w-[436px] flex-col gap-4 lg:mt-0">
            <Skeleton className="h-12 w-3/4" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-28 rounded-full" />
            </div>
            <div className="flex gap-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-24 rounded-full" />
              ))}
            </div>
            <Skeleton className="mt-6 h-[140px] rounded-2xl" />
          </div>
        </div>
      </section>

      {/* ─── Body skeleton ─── */}
      <article className="mx-auto w-full max-w-[1232px] px-4 py-12 space-y-12">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </article>
    </>
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

  /* ---------- Cart qty per ticket type ---------- */
  const qtyByTicket = useMemo(() => {
    if (!event) return {} as Record<string, number>;
    const map: Record<string, number> = {};
    for (const it of items) {
      if (it.eventId === event._id) map[it.ticketTypeId] = it.qty;
    }
    return map;
  }, [items, event?._id]);

  const selectedCount = useMemo(
    () => Object.values(qtyByTicket).reduce((a, b) => a + b, 0),
    [qtyByTicket]
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

  /* ---------- Date / map ---------- */
  const dateLabel = formatDate(event.date);

  const MAP_W = 800;
  const MAP_H = 400;
  const mapUrl =
    getStaticMapUrl(event.location, MAP_W, MAP_H) || "/dummy/map.png";

  /* ---------- Handle qty change -> Cart ---------- */
  function handleTicketQtyChange(ticketTypeId: string, nextQty: number) {
    if (!event) return;
    const tt = event.ticketTypes.find((t) => t._id === ticketTypeId);
    if (!tt) return;

    const key = `${event._id}:${ticketTypeId}`;
    const existing = items.find((i) => i.key === key);

    if (!existing && nextQty > 0) {
      addItem({
        eventId: event._id,
        eventTitle: event.title,
        ticketTypeId,
        ticketLabel: tt.label,
        unitPrice: tt.price,
        currency: tt.currency,
        image: tt.image ?? event.image,
        qty: nextQty,
      });
    } else if (existing && nextQty > 0) {
      setQty(existing.key, nextQty);
    } else if (existing && nextQty === 0) {
      removeItem(existing.key);
    }
  }

  /* ---------- Render ------------------ */
  return (
    <>
      {/* ───────── Hero Section ───────── */}
      <EventHero
        poster={event.image ?? "/dummy/event.png"}
        title={event.title}
        venue={event.location}
        dateLabel={dateLabel}
        ticketOptions={event.ticketTypes.map((t) => ({
          id: t._id,
          label: t.label,
          price: t.price,
          currency: t.currency,
          qty: qtyByTicket[t._id] ?? 0,
          image: t.image ?? event.image,
        }))}
        onTicketQtyChange={handleTicketQtyChange}
        artists={event.artists.slice(0, 3)}
        attendingCount={event.attendingCount}
        selectedCount={selectedCount}
        onCheckout={() => router.push("/checkout")}
      />

      <article className="mx-auto w-full max-w-[1232px] px-4 pb-[70px] pt-8">
        {/* ───────── Artists Attending ───────── */}
        {event.artists.length > 0 && (
          <InfoRow title="Artists Attending" splitTitle>
            <ul className="flex flex-wrap gap-2">
              {event.artists.map((artist) => (
                <li
                  key={artist._id}
                  className="flex items-center gap-2 p-1 pr-4 rounded-full bg-neutral-800"
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
                  <span className="text-neutral-0">{artist.stageName}</span>
                </li>
              ))}
            </ul>
          </InfoRow>
        )}

        {/* ───────── Description ───────── */}
        {event.description && (
          <InfoRow title="Description">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
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
                  text={`Doors open at ${new Date(event.date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`}
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
                <Pill
                  text={dateLabel}
                  color="#9A51FF"
                  textColor="#C7A0FF"
                  icon={
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                    >
                      <path
                        d="M12.6667 4H3.33333C2.59695 4 2 4.59695 2 5.33333V12.6667C2 13.403 2.59695 14 3.33333 14H12.6667C13.403 14 14 13.403 14 12.6667V5.33333C14 4.59695 13.403 4 12.6667 4Z"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      <path
                        d="M2 6.66667C2 5.40933 2 4.78133 2.39067 4.39067C2.78133 4 3.40933 4 4.66667 4H11.3333C12.5907 4 13.2187 4 13.6093 4.39067C14 4.78133 14 5.40933 14 6.66667H2Z"
                        fill="currentColor"
                      />
                      <path
                        d="M4.66669 2V4M11.3334 2V4"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  }
                />
              </div>
              <p className="whitespace-pre-wrap text-neutral-0 font-light leading-[130%]">
                {event.description}
              </p>
              {event.attendingCount > 0 && (
                <AvatarStack
                  images={event.attendeesPreview}
                  total={event.attendingCount}
                />
              )}
            </div>
          </InfoRow>
        )}

        {/* ───────── Location ───────── */}
        <InfoRow title="Location">
          <div className="flex flex-col items-start gap-4">
            <div className="relative w-full overflow-hidden rounded-lg">
              <Image
                src={mapUrl}
                alt={`Map for ${event.location}`}
                width={MAP_W}
                height={MAP_H}
                className="h-[210px] w-full object-cover sm:h-[250px] lg:h-[328px]"
                unoptimized
              />
            </div>
            <p className="text-base font-light leading-[130%] tracking-[-0.32px] text-neutral-0">
              {event.location}
            </p>
            <Button asChild variant="secondary">
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(event.location)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in Maps
              </a>
            </Button>
          </div>
        </InfoRow>

        {/* ───────── Contact ───────── */}
        <InfoRow
          title="Contact"
          classNameCont="flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4 py-3">
            <Link
              href={`/org/${event.organization._id}`}
              className="relative size-13 overflow-hidden rounded-full bg-neutral-800"
            >
              <Image
                src={
                  event.organization.logo ||
                  "/dummy/organization-placeholder.png"
                }
                alt={`${event.organization.name} logo`}
                fill
                sizes="52px"
                className="object-cover"
              />
            </Link>
            <p className="font-semibold text-neutral-0">
              {event.organization.name}
            </p>
          </div>

          {event.organization.website && (
            <Button variant="secondary" asChild>
              <a
                href={event.organization.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-[10px]"
              >
                Visit Website
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                >
                  <path
                    d="M3 11L11 3M11 3H3M11 3V11"
                    stroke="white"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
            </Button>
          )}
        </InfoRow>

        {/* ───────── Terms (placeholder) ───────── */}
        <InfoRow title="Terms">
          <p className="whitespace-pre-line text-neutral-0 font-light leading-[130%]">
            All tickets are final sale and cannot be exchanged or refunded…
          </p>
        </InfoRow>
      </article>

      <InstagramGallery />

      {/* ───────── Similar Events ───────── */}
      <section className="mx-auto w-full max-w-[1201px] px-4 py-12">
        <EventCarouselSection events={similarEvents} title="Similar Events" />
      </section>
    </>
  );
}
