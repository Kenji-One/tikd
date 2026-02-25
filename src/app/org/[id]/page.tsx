// src/app/org/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, Globe } from "lucide-react";

import InfoRow from "@/components/ui/InfoRow";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EventCard } from "@/components/ui/EventCard";

/* ───────── helpers & DTOs ───────── */
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

const getStaticMapUrl = (
  address: string,
  width = 1000,
  height = 560,
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

const chunk = <T,>(arr: T[], size: number): T[][] => {
  if (size <= 0) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

interface OrgDTO {
  _id: string;
  name: string;
  description?: string;

  /** backend fields */
  banner?: string; // Cloudinary URL
  logo?: string; // Cloudinary URL
  website?: string;
  location?: string;
  accentColor?: string; // used to tint EventCard date

  /** optional future fields (safe if absent) */
  hoursLabel?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  lat?: number;
  lng?: number;
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

type UiEventCard = {
  id: string;
  title: string;
  dateLabel: string;
  venue: string;
  img: string;
  category: string;
};

const toCard = (e: EventDTO): UiEventCard => ({
  id: e._id,
  title: e.title,
  dateLabel: formatDate(e.date),
  venue: e.location,
  img: e.image || "",
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

  /* events (upcoming) ----------------------------------------------------- */
  const {
    data: upcomingRes,
    isLoading: upLoading,
    error: upErr,
  } = useQuery<EventsPageDTO>({
    queryKey: ["org-events-upcoming", id],
    queryFn: () =>
      fetchJSON<EventsPageDTO>(
        `/api/organizations/${id}/events?status=upcoming&limit=80`,
      ),
    enabled: !!id,
  });

  /* compute states ------------------------------------------------------- */
  const isLoading = orgLoading || upLoading;
  const hasError = !isLoading && (orgErr || upErr || !org);

  /* derived -------------------------------------------------------------- */
  const orgName = org?.name ?? "Organization";
  const avatarSrc = org?.logo || "";
  const heroSrc = org?.banner || org?.logo || "";
  const website = (org?.website ?? "").trim();
  const locationStr = (org?.location ?? "").trim();
  const orgAccent = (org?.accentColor ?? "").trim() || undefined;

  const upcomingEvents = useMemo(
    () => (upcomingRes?.items ?? []).map(toCard),
    [upcomingRes?.items],
  );

  /**
   * ✅ REQUIRED BEHAVIOR
   * - Desktop (lg+): ALWAYS 4 columns.
   * - Up to 8 events visible (2 rows max on desktop).
   * - If >8 events: carousel activates, 8 events per slide (4x2 on desktop).
   */
  const PAGE_SIZE = 8;

  const pages = useMemo(() => {
    if (upcomingEvents.length <= PAGE_SIZE) return [upcomingEvents];
    return chunk(upcomingEvents, PAGE_SIZE);
  }, [upcomingEvents]);

  const isCarousel = pages.length > 1;

  const [pageIdx, setPageIdx] = useState(0);

  // keep index valid when data changes
  useEffect(() => {
    setPageIdx(0);
  }, [id, pages.length]);

  const safePageIdx = Math.min(pageIdx, Math.max(0, pages.length - 1));
  const pageEvents = pages[safePageIdx] ?? [];

  const goPrev = () => setPageIdx((p) => Math.max(0, p - 1));
  const goNext = () => setPageIdx((p) => Math.min(pages.length - 1, p + 1));

  /* location helpers ----------------------------------------------------- */
  const addressText = useMemo(() => {
    if (!org) return "";

    const structured = [
      org.addressLine1,
      org.addressLine2,
      [org.city, org.region].filter(Boolean).join(", "),
      org.postalCode,
      org.country,
    ]
      .map((v) => (v ?? "").trim())
      .filter(Boolean)
      .join(" · ");

    return structured || locationStr;
  }, [org, locationStr]);

  const mapsHref = useMemo(() => {
    if (!org) return "";
    if (typeof org.lat === "number" && typeof org.lng === "number") {
      return `https://www.google.com/maps?q=${encodeURIComponent(
        `${org.lat},${org.lng}`,
      )}`;
    }
    const q = addressText || orgName;
    return `https://www.google.com/maps?q=${encodeURIComponent(q)}`;
  }, [org, addressText, orgName]);

  /* static map (same pattern as event page) ------------------------------ */
  const MAP_W = 1000;
  const MAP_H = 560;

  const mapUrl = useMemo(() => {
    const addr = addressText || locationStr || orgName;
    return getStaticMapUrl(addr, MAP_W, MAP_H) || "/dummy/map.png";
  }, [addressText, locationStr, orgName]);

  /* render ---------------------------------------------------------------- */
  if (hasError) {
    return (
      <main className="min-h-dvh bg-neutral-950 px-4 py-20 text-center text-red-400">
        Failed to load organization data.
      </main>
    );
  }

  return (
    <main className="relative min-h-dvh bg-neutral-950 text-neutral-0">
      {/* HERO BACKDROP (keep large) */}
      <HeroBackdrop poster={heroSrc} />

      <div className="relative">
        {/* top center block */}
        <section className="mx-auto w-full max-w-[1201px] px-4 pt-28 sm:pt-40">
          <div className="flex flex-col items-center text-center">
            {isLoading ? (
              <Skeleton className="h-[140px] w-[140px] rounded-full" />
            ) : (
              <AvatarRing src={avatarSrc} alt={orgName} />
            )}

            {isLoading ? (
              <Skeleton className="mt-6 h-10 w-72" />
            ) : (
              <h1 className="mt-6 text-[40px] font-black italic leading-[92%] tracking-[-1px] text-neutral-0 sm:text-[44px]">
                {orgName.toUpperCase()}
                <span className="align-top text-[12px] font-extrabold opacity-80">
                  {" "}
                  ™
                </span>
              </h1>
            )}

            {/* actions (variants only) */}
            {isLoading ? (
              <div className="mt-6 flex items-center justify-center gap-2.5">
                <Skeleton className="h-10 w-32 rounded-full" />
                <Skeleton className="h-10 w-10 rounded-full" />
              </div>
            ) : (
              <div className="mt-6 flex items-center justify-center gap-2.5">
                <Button variant="ghost" animation>
                  Message us
                </Button>

                {website ? (
                  <Button variant="secondary" size="icon" asChild>
                    <a href={website} target="_blank" rel="noreferrer">
                      <Globe className="h-4 w-4" />
                    </a>
                  </Button>
                ) : (
                  <Button variant="secondary" size="icon" disabled>
                    <Globe className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </section>

        {/* UPCOMING EVENTS */}
        <section className="mx-auto w-full max-w-[1201px] px-4 pt-10">
          <div className="flex items-center justify-between">
            {isLoading ? (
              <Skeleton className="h-6 w-44" />
            ) : upcomingEvents.length > 0 ? (
              <h2 className="text-[24px] font-semibold text-neutral-0">
                Upcoming events
              </h2>
            ) : null}

            {/* ✅ Only show arrows when carousel is active (>8 events) */}
            {!isLoading && upcomingEvents.length > 0 && isCarousel ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={goPrev}
                  disabled={safePageIdx === 0}
                  aria-label="Previous events"
                  title="Previous"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>

                <Button
                  variant="secondary"
                  size="icon"
                  onClick={goNext}
                  disabled={safePageIdx >= pages.length - 1}
                  aria-label="Next events"
                  title="Next"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            ) : null}
          </div>

          {isLoading ? (
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-[188px] w-full rounded-[18px]" />
              ))}
            </div>
          ) : upcomingEvents.length > 0 ? (
            <div className="mt-5">
              {/* ✅ If <=8: static grid (still 4 cols on desktop). If >8: carousel slides of 8. */}
              {isCarousel ? (
                <div className="overflow-hidden">
                  <div
                    className="flex transition-transform duration-300 ease-out"
                    style={{
                      transform: `translate3d(-${safePageIdx * 100}%, 0, 0)`,
                    }}
                  >
                    {pages.map((slide, idx) => (
                      <div key={`slide-${idx}`} className="w-full shrink-0">
                        <UpcomingGrid
                          events={slide}
                          orgAccent={orgAccent}
                          // keep desktop at 4 cols; max 8 items already via chunk()
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <UpcomingGrid events={pageEvents} orgAccent={orgAccent} />
              )}
            </div>
          ) : null}
        </section>

        {/* INFO ROWS */}
        <div className="mx-auto w-full max-w-[1201px] px-4 pt-10">
          {isLoading ? (
            <>
              <InfoRow title="About us">
                <div>
                  <Skeleton className="h-4 w-full max-w-[640px]" />
                  <Skeleton className="mt-2 h-4 w-full max-w-[600px]" />
                  <Skeleton className="mt-2 h-4 w-full max-w-[520px]" />
                  <Skeleton className="mt-6 h-4 w-24" />
                  <Skeleton className="mt-2 h-4 w-44" />
                </div>
              </InfoRow>

              <InfoRow title="Location">
                <Skeleton className="h-[320px] w-full rounded-[18px]" />
              </InfoRow>
            </>
          ) : (
            <>
              {org?.description ? (
                <InfoRow title="About us">
                  <div>
                    <p className="whitespace-pre-line text-[13px] leading-[1.65] text-white/60">
                      {org.description}
                    </p>

                    {org.hoursLabel ? (
                      <div className="mt-6">
                        <div className="text-[13px] font-semibold text-white/85">
                          Hours:
                        </div>
                        <div className="mt-2 text-[13px] text-white/55">
                          {org.hoursLabel}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </InfoRow>
              ) : null}

              {addressText ? (
                <InfoRow title="Location">
                  <div className="w-full">
                    <div className="overflow-hidden rounded-[14px] border border-[#FFFFFF1A] bg-[#ffffff08]">
                      <div className="relative h-[298px] w-full sm:h-[386px]">
                        <Image
                          src={mapUrl}
                          alt={`Map for ${addressText}`}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1200px) 800px, 1000px"
                          className="object-cover"
                          unoptimized
                        />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                        <div className="pointer-events-none absolute inset-0 ring-1 ring-white/10" />
                      </div>
                    </div>
                    <div className="pt-4">
                      <div className="text-[16px] leading-[130%] tracking-[-2%] text-white">
                        {orgName}
                      </div>
                      <div className="text-[16px] leading-[130%] tracking-[-2%] text-white">
                        {addressText}
                      </div>

                      <div className="mt-4">
                        <Button variant="secondary" animation asChild>
                          <a href={mapsHref} target="_blank" rel="noreferrer">
                            Open in Maps
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                </InfoRow>
              ) : null}
            </>
          )}
        </div>

        <div className="h-10" />
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/*  Upcoming grid (desktop: always 4 cols)                                     */
/* -------------------------------------------------------------------------- */
function UpcomingGrid({
  events,
  orgAccent,
}: {
  events: UiEventCard[];
  orgAccent?: string;
}) {
  return (
    <div
      className={clsx(
        "grid gap-4",
        // ✅ mobile responsive, but ALWAYS 4 columns on desktop
        "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
      )}
    >
      {events.map((ev) => (
        <div key={ev.id} className="min-w-0">
          <EventCard {...ev} dateAccentColor={orgAccent} />
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                             */
/* -------------------------------------------------------------------------- */

function HeroBackdrop({ poster }: { poster: string }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-[760px] overflow-hidden sm:h-[860px]">
      <div
        className="absolute inset-0 scale-[1.08] blur-[22px]"
        style={{
          backgroundImage: `url(${poster})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        aria-hidden
      />

      <div className="absolute inset-0 bg-[#08080F]/50" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(1200px 520px at 50% 16%, rgba(255,255,255,0.12), transparent 62%), radial-gradient(1100px 760px at 50% 46%, rgba(154,70,255,0.16), transparent 66%)",
        }}
        aria-hidden
      />

      <div
        className="absolute inset-x-0 bottom-0 h-[380px]"
        style={{
          background:
            "linear-gradient(to bottom, rgba(8,8,15,0) 0%, rgba(8,8,15,0.55) 38%, rgba(8,8,15,1) 100%)",
        }}
        aria-hidden
      />
    </div>
  );
}

function AvatarRing({ src, alt }: { src: string; alt: string }) {
  return (
    <div
      className={clsx(
        "relative h-[140px] w-[140px] rounded-full p-[9px]",
        "bg-neutral-950 ring-1 ring-white/10",
        "shadow-[0_22px_90px_rgba(0,0,0,0.65)]",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-7 rounded-full opacity-70 blur-2xl"
        style={{
          background:
            "radial-gradient(circle at 50% 55%, rgba(154,70,255,0.24), transparent 62%)",
        }}
      />

      <div className="relative h-full w-full overflow-hidden rounded-full bg-neutral-800 ring-1 ring-white/10">
        <Image src={src} alt={alt} fill className="object-cover" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(255,255,255,0.14), transparent 42%)",
          }}
        />
      </div>
    </div>
  );
}
