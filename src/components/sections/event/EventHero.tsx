"use client";

/* ------------------------------------------------------------------ */
/*  EventHero                                                         */
/* ------------------------------------------------------------------ */

import Image from "next/image";
import TicketSelector from "@/components/ui/TicketSelector";
import Pill from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";

/* ───────── Types ────────────────────────────────────────────────── */
export interface TicketOpt {
  id: string;
  label: string;
  price: number;
  currency: string;
  qty: number;
  image?: string;
}

export interface Artist {
  _id: string;
  stageName: string;
  avatar?: string;
  isVerified?: boolean;
}

interface Props {
  poster: string;
  title: string;
  category?: string;
  venue: string;
  dateLabel: string;
  ticketOptions: TicketOpt[];
  /** Called when a ticket qty changes */
  onTicketQtyChange?: (ticketTypeId: string, nextQty: number) => void;
  /** When > 0, show checkout CTA */
  selectedCount?: number;
  /** Triggered when user presses checkout CTA */
  onCheckout?: () => void;
  artists?: Artist[];
  attendingCount?: number;
}

/* ───────── Artist chip                                             */
const ArtistChip = ({ artist }: { artist: Artist }) => (
  <div className="flex items-center gap-2 rounded-full bg-neutral-950 p-1 pr-4">
    <div className="relative size-8 overflow-hidden rounded-full">
      <Image
        fill
        sizes="32px"
        src={artist.avatar ?? "/dummy/avatar.png"}
        alt={artist.stageName}
        className="object-cover"
      />
    </div>
    <span className="text-neutral-0">{artist.stageName}</span>
    {artist.isVerified && (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
      >
        <path
          d="M6.38747 7.40833L5.54164 6.57708C5.43469 6.47013 5.30111 6.41666 5.14089 6.41666C4.98067 6.41666 4.84203 6.47499 4.72497 6.59166C4.61803 6.6986 4.56455 6.83471 4.56455 6.99999C4.56455 7.16527 4.61803 7.30138 4.72497 7.40833L5.97914 8.66249C6.0958 8.77916 6.23192 8.83749 6.38747 8.83749C6.54303 8.83749 6.67914 8.77916 6.7958 8.66249L9.27497 6.18333C9.39164 6.06666 9.44744 5.93055 9.44239 5.77499C9.43733 5.61944 9.38153 5.48333 9.27497 5.36666C9.1583 5.24999 9.01986 5.18933 8.85964 5.18466C8.69942 5.17999 8.56078 5.2358 8.44372 5.35208L6.38747 7.40833ZM4.75414 12.6875L3.9083 11.2583L2.30414 10.9083C2.1583 10.8792 2.04164 10.8039 1.95414 10.6826C1.86664 10.5612 1.83261 10.4275 1.85205 10.2812L2.01247 8.63333L0.918722 7.37916C0.821499 7.27221 0.772888 7.14583 0.772888 6.99999C0.772888 6.85416 0.821499 6.72777 0.918722 6.62083L2.01247 5.36666L1.85205 3.71874C1.83261 3.57291 1.86664 3.43913 1.95414 3.31741C2.04164 3.19569 2.1583 3.12044 2.30414 3.09166L3.9083 2.74166L4.75414 1.31249C4.83192 1.1861 4.93886 1.10094 5.07497 1.05699C5.21108 1.01305 5.34719 1.02044 5.4833 1.07916L6.99997 1.72083L8.51664 1.07916C8.65275 1.02083 8.78886 1.01344 8.92497 1.05699C9.06108 1.10055 9.16803 1.18571 9.2458 1.31249L10.0916 2.74166L11.6958 3.09166C11.8416 3.12083 11.9583 3.19627 12.0458 3.31799C12.1333 3.43971 12.1673 3.5733 12.1479 3.71874L11.9875 5.36666L13.0812 6.62083C13.1784 6.72777 13.2271 6.85416 13.2271 6.99999C13.2271 7.14583 13.1784 7.27221 13.0812 7.37916L11.9875 8.63333L12.1479 10.2812C12.1673 10.4271 12.1333 10.5609 12.0458 10.6826C11.9583 10.8043 11.8416 10.8795 11.6958 10.9083L10.0916 11.2583L9.2458 12.6875C9.16803 12.8139 9.06108 12.899 8.92497 12.943C8.78886 12.9869 8.65275 12.9795 8.51664 12.9208L6.99997 12.2792L5.4833 12.9208C5.34719 12.9792 5.21108 12.9865 5.07497 12.943C4.93886 12.8994 4.83192 12.8143 4.75414 12.6875Z"
          fill="#518BFF"
        />
      </svg>
    )}
  </div>
);

/* ───────── Component                                              */
export function EventHero({
  poster,
  title,
  venue,
  dateLabel,
  ticketOptions,
  onTicketQtyChange,
  selectedCount = 0,
  onCheckout,
  artists = [],
  attendingCount,
}: Props) {
  return (
    <section className="relative w-full overflow-hidden">
      {/* Blur-bg + veil */}
      <div
        className="absolute inset-0 z-0 blur-[24px]"
        style={{
          backgroundImage: `url(${poster})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="absolute inset-0 z-0 bg-[#08080F]/60" />

      {/* Content wrapper */}
      <div className="relative mx-auto w-full max-w-[848px] px-4 pt-[72px] pb-[82px] sm:py-[120px] lg:flex lg:items-center lg:gap-[70px] lg:py-[186px]">
        {/* Poster */}
        <div className="relative h-[275px] w-[220px] overflow-hidden rounded-xl sm:h-[325px] sm:w-[260px] md:h-[375px] md:w-[300px] lg:h-[428px] lg:w-[342px]">
          <Image
            fill
            src={poster}
            alt={title}
            priority
            sizes="(max-width: 640px) 220px,(max-width: 768px) 260px,(max-width: 1024px) 300px,342px"
            className="object-cover rounded-xl"
          />
        </div>

        {/* Right side */}
        <div className="mt-4 flex w-full max-w-[436px] flex-col text-center lg:mt-0 lg:text-left">
          <h1 className="text-2xl font-black leading-[90%] tracking-[-1.04px] text-white sm:text-4xl lg:text-[52px] uppercase italic">
            {title}
          </h1>

          {/* Venue & date pills */}
          <div className="mt-4 flex flex-wrap justify-center gap-2 md:justify-start">
            <Pill
              text={venue}
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <path
                    d="M7.99998 7.66668C7.55795 7.66668 7.13403 7.49108 6.82147 7.17852C6.50891 6.86596 6.33331 6.44204 6.33331 6.00001C6.33331 5.55798 6.50891 5.13406 6.82147 4.8215C7.13403 4.50894 7.55795 4.33334 7.99998 4.33334C8.44201 4.33334 8.86593 4.50894 9.17849 4.8215C9.49105 5.13406 9.66665 5.55798 9.66665 6.00001C9.66665 6.21888 9.62354 6.43561 9.53978 6.63782C9.45602 6.84002 9.33325 7.02376 9.17849 7.17852C9.02373 7.33329 8.83999 7.45605 8.63779 7.53981C8.43558 7.62357 8.21885 7.66668 7.99998 7.66668ZM7.99998 1.33334C6.7623 1.33334 5.57532 1.82501 4.70015 2.70018C3.82498 3.57535 3.33331 4.76233 3.33331 6.00001C3.33331 9.50001 7.99998 14.6667 7.99998 14.6667C7.99998 14.6667 12.6666 9.50001 12.6666 6.00001C12.6666 4.76233 12.175 3.57535 11.2998 2.70018C10.4246 1.82501 9.23766 1.33334 7.99998 1.33334Z"
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
                    d="M4.66666 2V4M11.3333 2V4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              }
            />
          </div>

          {/* Artists */}
          {artists.length > 0 && (
            <div className="mt-6 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="font-bold italic text-neutral-0">
                  Get Ready For!
                </p>
                {typeof attendingCount === "number" && (
                  <p className="text-primary-999">
                    {attendingCount.toLocaleString()} Attending
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                {artists.map((a) => (
                  <ArtistChip key={a._id} artist={a} />
                ))}
              </div>
            </div>
          )}

          {/* Tickets */}
          <div className="mt-6 rounded-2xl overflow-hidden bg-white">
            {ticketOptions.map((t, i) => (
              <div
                key={t.id}
                className={i ? "border-t border-[#08080F1A]" : ""}
              >
                <TicketSelector
                  label={t.label}
                  price={t.price}
                  qty={t.qty}
                  img={t.image ?? poster}
                  onChange={(n) => onTicketQtyChange?.(t.id, n)}
                />
              </div>
            ))}

            {selectedCount > 0 && (
              <div className="border-t border-[#08080F1A] p-3">
                <Button
                  className="w-full"
                  size="lg"
                  variant="brand"
                  onClick={onCheckout}
                >
                  Proceed to Checkout ({selectedCount})
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
