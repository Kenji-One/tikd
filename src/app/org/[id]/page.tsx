/* -------------------------------------------------------------------------- */
/*  Organizer detail page                                                     */
/* -------------------------------------------------------------------------- */
"use client";

import Image from "next/image";
import { useRef } from "react";
import { ChevronLeft, ChevronRight, MessageCircle, Plus } from "lucide-react";
import InfoRow from "@/components/ui/InfoRow";

import { Button } from "@/components/ui/Button";
import { EventCard } from "@/components/ui/EventCard";
import EventCarouselSection, {
  Event,
} from "@/components/sections/Landing/EventCarouselSection";
import InstagramGallery from "@/components/sections/event/InstagramGallery";
/* -------------------------------------------------------------------------- */
/*  Dummy data                                                                */
/* -------------------------------------------------------------------------- */
const organizer = {
  id: "orange-apple",
  name: "ORANGE APPLE",
  avatar: "/dummy/event-1.png",
  /** Hero/cover used for the blurred background */
  cover: "/dummy/event-1.png",
  about: `Sit back and unwind at Daylight Beach Club at The Mandalay Bay, where you can ease into summer with a sprawling 50,000 square feet of space - there’s not a bad seat on the deck! Boasting a 4,400 square-foot main pool with two additional private pools for cabana guests, and table side daybed service on the pool level. Daylight Beach Club is the place to be for a luxuriously entertaining pool experience. Sip on a hand crafted cocktail and enjoy some delicious, made-to-order, beach-side bites while soaking in the long-awaited summertime vibes.`,
};

const events: Event[] = [
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
    title: "NYC Highschool Party",
    dateLabel: "May 23, 2025 6:00 PM",
    venue: "Brooklyn, NY",
    img: "/dummy/event-2.png",
    category: "Shows",
  },
  {
    id: "18",
    title: "NYC Highschool Party",
    dateLabel: "May 23, 2025 6:00 PM",
    venue: "Brooklyn, NY",
    img: "/dummy/event-3.png",
    category: "Shows",
  },
  {
    id: "19",
    title: "NYC Highschool Party",
    dateLabel: "May 23, 2025 6:00 PM",
    venue: "Brooklyn, NY",
    img: "/dummy/event-4.png",
    category: "Shows",
  },
  {
    id: "12",
    title: "NYC Highschool Party",
    dateLabel: "May 23, 2025 6:00 PM",
    venue: "Brooklyn, NY",
    img: "/dummy/event-5.png",
    category: "Shows",
  },
];
/* -------------------------------------------------------------------------- */

export default function OrganizerPage() {
  return (
    <main>
      {/* ------------------------------------------------------------------ */}
      {/*  HERO (full-bleed blurred bg) + avatar/name                         */}
      {/* ------------------------------------------------------------------ */}
      <HeroBanner poster={organizer.cover} />

      <div className="-mt-16 flex flex-col items-center px-4 text-center">
        <AvatarRing src={organizer.avatar} alt={organizer.name} />

        <h1 className="flex items-start gap-4 mt-[14px] text-2xl font-black uppercase text-neutral-0 md:text-[40px] leading-[90%] tracking-[-0.8px] italic">
          {organizer.name}{" "}
          <span className="mt-[3px]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
            >
              <path
                d="M8 8V2H10L12 4L14 2H16V8H14V4L12 6L10 4V8M2 8V4H0V2H6V4H4V8"
                fill="white"
              />
            </svg>
          </span>
        </h1>

        <div className="mt-6 w-full flex gap-2 align-center justify-center">
          <Button variant="secondary">Message&nbsp;us</Button>
          <Button className="w-full max-w-[125px]">Follow</Button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/*  ABOUT                                                             */}
      {/* ------------------------------------------------------------------ */}

      <InfoRow title="About us" className="mt-10 max-w-[998px] mx-auto px-4">
        <p className="whitespace-pre-line text-neutral-0 font-light leading-[130%]">
          {organizer.about}
        </p>
      </InfoRow>
      {/* ------------------------------------------------------------------ */}
      {/*  UPCOMING EVENTS – horizontal scroll                               */}
      {/* ------------------------------------------------------------------ */}
      {/* ───────── Related Events ───────── */}
      <section className="mx-auto w-full max-w-[1201px] px-4 pt-10 pb-6">
        <EventCarouselSection events={events} title="Upcoming Events" />
      </section>

      {/* ------------------------------------------------------------------ */}
      {/*  PAST EVENTS – grid + Load More                                    */}
      {/* ------------------------------------------------------------------ */}

      <section className="mb-20 mx-auto w-full max-w-[1201px] px-4">
        <div className="mb-6 flex items-center gap-2">
          <h2 className="text-2xl font-semibold text-neutral-0">Past Events</h2>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {events.map((ev) => (
            <EventCard key={ev.id} {...ev} />
          ))}
        </div>
      </section>
      <InstagramGallery />
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/*  Helper components                                                         */
/* -------------------------------------------------------------------------- */

/** Bleeds full-width while living inside the centered article */
function HeroBanner({ poster }: { poster: string }) {
  return (
    <div className="relative left-1/2 right-1/2 h-40 w-full -translate-x-1/2 overflow-hidden md:h-56 lg:h-[300px]">
      {/* blurred background ------------------------------------------------ */}
      <div
        className="absolute inset-0 z-0 blur-[24px]"
        style={{
          backgroundImage: `url(${poster})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      {/* dark veil --------------------------------------------------------- */}
      <div className="absolute inset-0 z-0 bg-[#08080F]/60" />
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
