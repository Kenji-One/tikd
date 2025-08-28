"use client";

import { useParams } from "next/navigation";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";

import InfoRow from "@/components/ui/InfoRow";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EventCard } from "@/components/ui/EventCard";
import EventCarouselSection, {
  Event as EventCardType,
} from "@/components/sections/Landing/EventCarouselSection";
import InstagramGallery from "@/components/sections/event/InstagramGallery";

/* ───────── helpers & DTOs (unchanged) ───────── */
const fetchJSON = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};
const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

interface OrgDTO {
  _id: string;
  name: string;
  logo?: string;
  description?: string;
}
interface EventDTO {
  _id: string;
  title: string;
  date: string;
  location: string;
  image?: string;
}
interface EventsPageDTO {
  items: EventDTO[];
  page: number;
  pages: number;
  total: number;
}
const toCard = (e: EventDTO): EventCardType => ({
  id: e._id,
  title: e.title,
  dateLabel: formatDate(e.date),
  venue: e.location,
  img: e.image || "/dummy/event-1.png",
  category: "Event",
});

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */
export default function OrganizerPage() {
  const { id } = useParams<{ id: string }>();

  /* organization --------------------------------------------------------- */
  const {
    data: org,
    isLoading: orgLoading,
    error: orgErr,
  } = useQuery<OrgDTO>({
    queryKey: ["organization", id],
    queryFn: () => fetchJSON<OrgDTO>(`/api/organizations/${id}`),
    enabled: !!id,
  });

  /* events (upcoming / past) -------------------------------------------- */
  const {
    data: upcomingRes,
    isLoading: upLoading,
    error: upErr,
  } = useQuery<EventsPageDTO>({
    queryKey: ["org-events-upcoming", id],
    queryFn: () =>
      fetchJSON<EventsPageDTO>(
        `/api/organizations/${id}/events?status=upcoming&limit=50`
      ),
    enabled: !!id,
  });

  const {
    data: pastRes,
    isLoading: pastLoading,
    error: pastErr,
  } = useQuery<EventsPageDTO>({
    queryKey: ["org-events-past", id],
    queryFn: () =>
      fetchJSON<EventsPageDTO>(
        `/api/organizations/${id}/events?status=past&limit=50`
      ),
    enabled: !!id,
  });

  /* compute states ------------------------------------------------------- */
  const isLoading = orgLoading || upLoading || pastLoading;
  const hasError =
    !isLoading && (orgErr || upErr || pastErr || !org); /* not found */

  /* derived data --------------------------------------------------------- */
  const upcomingEvents = (upcomingRes?.items ?? []).map(toCard);
  const pastEvents = (pastRes?.items ?? []).map(toCard);
  const avatarSrc = org?.logo || "/dummy/event-1.png";

  /* render ---------------------------------------------------------------- */
  if (hasError) {
    return (
      <p className="p-10 text-center text-red-500">
        Failed to load organizer data.
      </p>
    );
  }

  return (
    <main>
      {/* HERO */}
      <HeroBanner
        poster={isLoading ? undefined : avatarSrc}
        alt={`${org?.name ?? "organization"} cover`}
        loading={isLoading}
      />

      {/* Avatar + name + actions */}
      <div className="-mt-16 flex flex-col items-center px-4 text-center">
        {isLoading ? (
          <Skeleton className="h-[140px] w-[140px] rounded-full" />
        ) : (
          <AvatarRing src={avatarSrc} alt={org!.name} />
        )}

        {isLoading ? (
          <Skeleton className="mt-4 h-8 w-48" />
        ) : (
          <h1 className="mt-[14px] flex items-start gap-4 text-2xl font-black italic leading-[90%] tracking-[-0.8px] text-neutral-0 md:text-[40px]">
            {org!.name.toUpperCase()}
          </h1>
        )}

        {isLoading ? (
          <div className="mt-6 flex gap-2">
            <Skeleton className="h-10 w-24 rounded-full" />
            <Skeleton className="h-10 w-24 rounded-full" />
          </div>
        ) : (
          <div className="mt-6 flex w-full max-w-xs justify-center gap-2">
            <Button variant="secondary">Message&nbsp;us</Button>
            <Button className="w-full max-w-[125px]">Follow</Button>
          </div>
        )}
      </div>

      {/* ABOUT */}
      {isLoading ? (
        <div className="mx-auto mt-10 max-w-[998px] px-4">
          <Skeleton className="mb-3 h-6 w-40" />
          <Skeleton className="h-4 w-full max-w-[600px]" />
          <Skeleton className="mt-1 h-4 w-full max-w-[550px]" />
        </div>
      ) : (
        org?.description && (
          <InfoRow
            title="About us"
            className="mx-auto mt-10 max-w-[998px] px-4"
          >
            <p className="whitespace-pre-line font-light leading-[130%] text-neutral-0">
              {org.description}
            </p>
          </InfoRow>
        )
      )}

      {/* UPCOMING EVENTS */}
      <section className="mx-auto w-full max-w-[1201px] px-4 pt-10">
        {isLoading ? (
          <Skeleton className="h-6 w-48 mb-4" />
        ) : upcomingEvents.length > 0 ? (
          <EventCarouselSection
            events={upcomingEvents}
            title="Upcoming Events"
          />
        ) : null}
      </section>

      {/* PAST EVENTS */}
      <section className="mx-auto mt-6 w-full max-w-[1201px] px-4">
        {isLoading ? (
          <Skeleton className="h-6 w-32 mb-4" />
        ) : pastEvents.length > 0 ? (
          <>
            <h2 className="mb-6 text-2xl font-semibold text-neutral-0">
              Past Events
            </h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {pastEvents.map((ev) => (
                <EventCard key={ev.id} {...ev} />
              ))}
            </div>
          </>
        ) : null}
      </section>

      {/* Instagram gallery */}
      <div className="mt-[70px]">
        <InstagramGallery />
      </div>
    </main>
  );
}

/* helper sub-components (unchanged) --------------------------------------- */
function HeroBanner({
  poster,
  alt,
  loading,
}: {
  poster?: string;
  alt: string;
  loading: boolean;
}) {
  return loading ? (
    <Skeleton className="h-40 md:h-56 lg:h-[300px] w-full rounded-none" />
  ) : (
    <div className="relative left-1/2 right-1/2 h-40 w-full -translate-x-1/2 overflow-hidden md:h-56 lg:h-[300px]">
      <div
        className="absolute inset-0 z-0 blur-[24px]"
        style={{
          backgroundImage: `url(${poster})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        aria-hidden
      />
      <div className="absolute inset-0 z-0 bg-[#08080F]/60" />
      <span className="sr-only">{alt}</span>
    </div>
  );
}

function AvatarRing({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative h-35 w-35 rounded-full bg-neutral-950 p-[10px]">
      <div className="relative h-full w-full overflow-hidden rounded-full bg-neutral-800">
        <Image src={src} alt={alt} fill className="object-cover" />
      </div>
    </div>
  );
}
