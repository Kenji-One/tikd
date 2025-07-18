"use client";

import Image from "next/image";

import { Button } from "@/components/ui/Button";
import Pill from "@/components/ui/Pill";
import { EventHero } from "@/components/sections/event/EventHero";
import InfoRow from "@/components/ui/InfoRow";
import EventCarouselSection, {
  Event,
} from "@/components/sections/Landing/EventCarouselSection";
import InstagramGallery from "@/components/sections/event/InstagramGallery";
/* -------------------------------------------------------------------------- */
/*  Dummy event data — replace with real fetch later                          */
/* -------------------------------------------------------------------------- */
const event = {
  id: "1",
  title: "AVALON NYC: YATCH PARTY",
  poster: "/dummy/event-1.png",
  locations: ["Skyport Marina – AVALON YATCH", "Daylight Beach Club"],
  dateRange: "Jul 12 – 15",
  dateLabel: "May 23, 2025 6:00 PM",
  ageRestriction: "All ages",
  doorsOpen: "Doors open at 06:00 PM",
  description: `Sit back and unwind at Daylight Beach Club at The Mandalay Bay, where you can ease into summer with a sprawling 50,000 square feet of space – there’s not a bad seat on the deck! Boasting a 4,400 square-foot main pool with two additional private pools for cabana guests, and table-side daybed service on the pool level, Daylight Beach Club is the place to be for a luxuriously entertaining pool experience. Sip on hand-crafted cocktails and enjoy beach-side bites while soaking in the long-awaited summertime vibes.`,
  mapImg: "/dummy/map.png",
  venueAddress: "3950 S. Las Vegas Blvd., Las Vegas, NV 89119",
  venueName: "DAYLIGHT Beach Club",
  category: "Shows",
  contact: {
    avatarUrl: "/dummy/event-5.png",
    orgName: "Orange Apple",
    phone: "702-632-4700",
    email: "info@daylightvegas.com",
    website: "https://daylightvegas.com/",
  },
  terms: `All tickets are final sale and cannot be exchanged or refunded.
For guaranteed entry, you must check in to Daylight by 2:00 PM and 12:00 AM for Daylight at Night. In the case of an event cancellation without a rescheduled date, a full refund will be automatically issued to each patron on the credit card used to purchase. By purchasing a ticket to this event, you agree to this purchase policy. Before purchasing your tickets, we urge you to confirm the title, time and location of the event.`,
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

export default function EventDetail() {
  const ticketQty = 1;

  return (
    <>
      {/* ───────── Hero Section ───────── */}
      <EventHero
        poster={event.poster}
        title={event.title}
        venue={event.venueAddress}
        dateLabel={event.dateLabel}
        category={event.category}
        ticketOptions={[
          { label: "General Admission", price: 29.99, qty: 1 },
          { label: "VIP Admission", price: 59.99, qty: 0 },
        ]}
      />
      <article className="mx-auto w-full max-w-[998px] pb-[80px] pt-8">
        {/* ───────── Description ───────── */}
        <InfoRow title="Description">
          <div className="flex flex-col gap-2">
            <div className="mb-4 flex flex-wrap gap-2">
              <Pill
                icon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <path
                      d="M10.6667 11.3333V12.6667H1.33337V11.3333C1.33337 11.3333 1.33337 8.66667 6.00004 8.66667C10.6667 8.66667 10.6667 11.3333 10.6667 11.3333ZM8.33337 5C8.33337 4.53851 8.19653 4.08738 7.94014 3.70367C7.68375 3.31995 7.31933 3.02088 6.89297 2.84428C6.46661 2.66768 5.99745 2.62147 5.54483 2.7115C5.09221 2.80153 4.67645 3.02376 4.35012 3.35008C4.0238 3.67641 3.80157 4.09217 3.71154 4.54479C3.62151 4.99741 3.66772 5.46657 3.84432 5.89293C4.02093 6.31929 4.32 6.68371 4.70371 6.94009C5.08742 7.19649 5.53855 7.33333 6.00004 7.33333C6.61888 7.33333 7.21237 7.0875 7.64996 6.64991C8.08754 6.21233 8.33337 5.61884 8.33337 5ZM10.6267 8.66667C11.0365 8.98383 11.3719 9.38695 11.6092 9.84767C11.8464 10.3084 11.9798 10.8155 12 11.3333V12.6667H14.6667V11.3333C14.6667 11.3333 14.6667 8.91333 10.6267 8.66667ZM10 2.66667C9.54123 2.66453 9.09257 2.80169 8.71337 3.06C9.11833 3.62582 9.33608 4.30419 9.33608 5C9.33608 5.69581 9.11833 6.37417 8.71337 6.94C9.09257 7.19831 9.54123 7.33547 10 7.33333C10.6189 7.33333 11.2124 7.0875 11.65 6.64991C12.0875 6.21233 12.3334 5.61884 12.3334 5C12.3334 4.38116 12.0875 3.78767 11.65 3.35008C11.2124 2.9125 10.6189 2.66667 10 2.66667Z"
                      fill="currentColor"
                    />
                  </svg>
                }
                text={event.ageRestriction}
              />
              <Pill
                icon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <path
                      d="M8.00004 14.6667C4.31804 14.6667 1.33337 11.682 1.33337 8C1.33337 4.318 4.31804 1.33334 8.00004 1.33334C11.682 1.33334 14.6667 4.318 14.6667 8C14.6667 11.682 11.682 14.6667 8.00004 14.6667ZM8.00004 13.3333C9.41453 13.3333 10.7711 12.7714 11.7713 11.7712C12.7715 10.771 13.3334 9.41449 13.3334 8C13.3334 6.58551 12.7715 5.22896 11.7713 4.22877C10.7711 3.22857 9.41453 2.66667 8.00004 2.66667C6.58555 2.66667 5.229 3.22857 4.2288 4.22877C3.22861 5.22896 2.66671 6.58551 2.66671 8C2.66671 9.41449 3.22861 10.771 4.2288 11.7712C5.229 12.7714 6.58555 13.3333 8.00004 13.3333ZM8.66671 8H11.3334V9.33334H7.33337V4.66667H8.66671V8Z"
                      fill="currentColor"
                    />
                  </svg>
                }
                text={event.doorsOpen}
              />
              <Pill
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
                      d="M4.66663 2V4M11.3333 2V4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                }
                text={event.dateLabel}
                color="#C7A0FF"
              />
            </div>
            <p className="text-neutral-0 font-light leading-[130%]">
              {event.description}
            </p>
          </div>
        </InfoRow>

        {/* ───────── Location ───────── */}
        <InfoRow title="Location">
          <div className="flex flex-col gap-4 items-start">
            {/* Map with coloured ring */}
            <div className="overflow-hidden rounded-lg w-full relative">
              <Image
                src={event.mapImg}
                alt="Map"
                width={800}
                height={400}
                className="h-[210px] w-full object-cover sm:h-[250px] lg:h-[328px]"
              />
            </div>

            {/* Address + button */}

            <p className="flex flex-col gap-[2px] font-light text-base text-neutral-0 tracking-[-0.32px] leading-[130%]">
              <span>{event.venueName}</span>
              {event.venueAddress}
            </p>
            <Button asChild variant="secondary">
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(
                  event.venueAddress
                )}`}
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
            <div className="relative w-13 h-13 rounded-full overflow-hidden bg-neutral-800">
              <Image
                src={event.contact.avatarUrl}
                alt={`${event.contact.orgName} logo`}
                fill
                className="object-cover"
              />
            </div>
            <p className="font-semibold text-neutral-0">
              {event.contact.orgName}
            </p>
          </div>
          <div className="">
            <Button variant="secondary" className="mr-4">
              Message us
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="12"
                viewBox="0 0 14 12"
                fill="none"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M6.86988 6.85449C6.47963 6.85449 6.09055 6.72558 5.76505 6.46774L3.1488 4.35841C2.96038 4.20674 2.93122 3.93083 3.0823 3.74299C3.23455 3.55574 3.50988 3.52599 3.69772 3.67708L6.31163 5.78408C6.64005 6.04424 7.10263 6.04424 7.43338 5.78174L10.021 3.67824C10.2089 3.52483 10.4842 3.55399 10.637 3.74183C10.7893 3.92908 10.7607 4.20441 10.5735 4.35724L7.98113 6.46424C7.6533 6.72441 7.2613 6.85449 6.86988 6.85449Z"
                  fill="white"
                />
                <mask
                  id="mask0_479_142"
                  // style="mask-type:luminance"
                  maskUnits="userSpaceOnUse"
                  x="0"
                  y="0"
                  width="14"
                  height="12"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M0.583374 0.166687H13.125V11.5417H0.583374V0.166687Z"
                    fill="white"
                  />
                </mask>
                <g mask="url(#mask0_479_142)">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M3.98934 10.6667H9.71767C9.71884 10.6655 9.7235 10.6667 9.727 10.6667C10.3926 10.6667 10.9829 10.4287 11.4356 9.9766C11.9612 9.45335 12.2499 8.70144 12.2499 7.85969V3.85335C12.2499 2.2241 11.1848 1.04169 9.71767 1.04169H3.9905C2.52342 1.04169 1.45825 2.2241 1.45825 3.85335V7.85969C1.45825 8.70144 1.74759 9.45335 2.27259 9.9766C2.72525 10.4287 3.31617 10.6667 3.98117 10.6667H3.98934ZM3.97942 11.5417C3.07934 11.5417 2.2755 11.215 1.65484 10.5967C0.963585 9.90719 0.583252 8.93535 0.583252 7.85969V3.85335C0.583252 1.7516 2.048 0.166687 3.9905 0.166687H9.71767C11.6602 0.166687 13.1249 1.7516 13.1249 3.85335V7.85969C13.1249 8.93535 12.7446 9.90719 12.0533 10.5967C11.4333 11.2144 10.6288 11.5417 9.727 11.5417H9.71767H3.9905H3.97942Z"
                    fill="white"
                  />
                </g>
              </svg>
            </Button>
            {/* Visit Website */}
            <Button variant="secondary" asChild>
              <a
                href={event.contact.website}
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
          </div>
          {/* Phone / Email / Website rows */}
          {/* <ContactRow label="Phone" value={event.contact.phone} icon={Phone} />
          <ContactRow label="Email" value={event.contact.email} icon={Mail} />
          <ContactRow
            label="Website"
            value={event.contact.website}
            icon={Globe}
          /> */}
        </InfoRow>

        {/* ───────── Terms ───────── */}
        <InfoRow title="Terms" classNameCont="flex flex-col items-start gap-4">
          <p className="whitespace-pre-line text-neutral-0 font-light leading-[130%]">
            {event.terms}
          </p>
          <Button variant="secondary">Read more</Button>
        </InfoRow>
      </article>
      <InstagramGallery />
      {/* ───────── Related Events ───────── */}
      <section className="mx-auto w-full max-w-[1201px] px-4 py-12">
        <EventCarouselSection events={events} title="Similar Events" />
      </section>
    </>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <h2 className="mb-4 border-b border-neutral-800 pb-1 text-xl font-semibold text-neutral-0">
      {title}
    </h2>
  );
}
