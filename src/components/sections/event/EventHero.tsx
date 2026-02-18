/* ------------------------------------------------------------------ */
/*  src/components/sections/event/EventHero.tsx                        */
/* ------------------------------------------------------------------ */
"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

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
  feesIncluded?: boolean;
}

type OrgLite = {
  id: string;
  name: string;
  logo?: string;
  website?: string;
};

interface Props {
  poster: string;
  title: string;
  venue: string;
  dateLabel: string;

  organization?: OrgLite;

  ticketOptions: TicketOpt[];
  onTicketQtyChange?: (ticketTypeId: string, nextQty: number) => void;

  selectedCount?: number;
  onCheckout?: () => void;

  children?: ReactNode;
}

export function EventHero({
  poster,
  title,
  venue,
  dateLabel,
  organization,
  ticketOptions,
  onTicketQtyChange,
  selectedCount = 0,
  onCheckout,
  children,
}: Props) {
  const hasTickets = ticketOptions.length > 0;

  return (
    <div className="relative">
      {/* Full-page blurred poster background (behind header too) */}
      <div
        className="fixed inset-0 -z-10 blur-[26px] scale-[1.08] opacity-95"
        style={{
          backgroundImage: `url(${poster})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="fixed inset-0 -z-10 bg-[#08080F]/70" />
      <div
        className="fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(900px 540px at 14% 12%, rgba(154,70,255,.26), transparent 58%)," +
            "radial-gradient(760px 520px at 88% 16%, rgba(167,112,255,.18), transparent 60%)," +
            "radial-gradient(780px 560px at 52% 102%, rgba(255,255,255,.06), transparent 60%)",
        }}
      />

      {/* Content wrapper */}
      <div className="mx-auto w-full max-w-[1360px] px-4 pt-[112px] pb-16 md:pt-[124px]">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-x-8 xl:gap-x-10">
          {/* Left (sticky poster) */}
          <div className="lg:col-span-4 xl:col-span-5">
            <div className="lg:sticky lg:top-[112px] md:lg:top-[124px] lg:flex lg:justify-end">
              <div className="relative">
                <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[28px] bg-black/20 blur-2xl" />
                <div className="relative h-[275px] w-[220px] overflow-hidden rounded-xl sm:h-[325px] sm:w-[260px] md:h-[375px] md:w-[300px] lg:h-[428px] lg:w-[342px]">
                  <Image
                    fill
                    src={poster}
                    alt={title}
                    priority
                    sizes="(max-width: 640px) 220px,(max-width: 768px) 260px,(max-width: 1024px) 300px,342px"
                    className="object-cover rounded-xl"
                  />
                  <div className="pointer-events-none absolute inset-0 ring-1 ring-white/10 rounded-xl" />
                </div>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="lg:col-span-8 xl:col-span-7">
            {/* Title */}
            <h1 className="text-3xl sm:text-4xl lg:text-[56px] font-black leading-[92%] tracking-[-1.04px] text-white uppercase italic">
              {title}
            </h1>

            {/* Organization line */}
            {organization?.name ? (
              <div className="mt-3 flex items-center gap-2 text-white/80">
                {organization.logo ? (
                  <Link
                    href={`/org/${organization.id}`}
                    className="relative size-5 overflow-hidden rounded-full bg-white/10 border border-white/10"
                    aria-label={organization.name}
                  >
                    <Image
                      src={organization.logo}
                      alt=""
                      fill
                      sizes="20px"
                      className="object-cover"
                    />
                  </Link>
                ) : (
                  <span className="inline-block size-5 rounded-full bg-white/10 border border-white/10" />
                )}

                <Link
                  href={`/org/${organization.id}`}
                  className="text-sm hover:text-primary-500 transition"
                >
                  {organization.name}
                </Link>
              </div>
            ) : null}

            {/* Venue + date pills */}
            <div className="mt-4 flex flex-wrap gap-2">
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

            {/* ------------------------------------------------------------------ */}
            {/* Tickets — SIMPLE + PRETTY (rows only, small header, 1 CTA)          */}
            {/* ------------------------------------------------------------------ */}
            <div className="mt-7">
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-neutral-950/45 shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                {/* light subtle glow (minimal) */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-80"
                  style={{
                    background:
                      "radial-gradient(860px 300px at 18% 0%, rgba(154,70,255,0.14), transparent 60%)," +
                      "radial-gradient(860px 320px at 92% 30%, rgba(199,160,255,0.10), transparent 62%)",
                  }}
                />

                <div className="relative">
                  {/* Small header (fixed height feel; pill never changes header height) */}
                  <div className="flex h-[52px] items-center justify-between gap-3 border-b border-white/10 px-4 sm:px-5">
                    <p className="text-sm font-extrabold tracking-[-0.2px] text-white">
                      Tickets
                    </p>

                    {/* Always rendered to keep header height identical */}
                    <span
                      className={[
                        "inline-flex items-center rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90",
                        selectedCount > 0
                          ? "opacity-100"
                          : "opacity-0 pointer-events-none select-none",
                      ].join(" ")}
                      aria-hidden={selectedCount <= 0}
                    >
                      {selectedCount} selected
                    </span>
                  </div>

                  {/* Rows */}
                  <div className="p-3 sm:p-4">
                    {!hasTickets ? (
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                        Tickets are not available for this event.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {ticketOptions.map((t) => (
                          <TicketSelector
                            key={t.id}
                            label={t.label}
                            price={t.price}
                            currency={t.currency}
                            qty={t.qty}
                            feesIncluded={Boolean(t.feesIncluded)}
                            onChange={(n) => onTicketQtyChange?.(t.id, n)}
                          />
                        ))}
                      </div>
                    )}

                    {/* Single CTA (no totals panel) */}
                    <div className="mt-4">
                      <Button
                        className="w-full"
                        size="lg"
                        variant="brand"
                        onClick={onCheckout}
                        disabled={selectedCount <= 0}
                        animation
                      >
                        {selectedCount > 0 ? "Checkout" : "Select tickets"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right column remainder (Details/Lineup/etc) */}
            <div className="mt-7">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
