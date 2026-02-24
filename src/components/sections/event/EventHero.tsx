/* ------------------------------------------------------------------ */
/*  src/components/sections/event/EventHero.tsx                        */
/* ------------------------------------------------------------------ */
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import TicketSelector from "@/components/ui/TicketSelector";
import Pill from "@/components/ui/Pill";

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

function currencySymbol(code?: string): string {
  const c = (code || "").toUpperCase();
  if (c === "USD") return "$";
  if (c === "EUR") return "€";
  if (c === "GBP") return "£";
  if (c === "GEL") return "₾";
  return "$";
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

  /* Fixed Checkout bar behavior */
  const [checkoutDismissed, setCheckoutDismissed] = useState(false);

  useEffect(() => {
    if (selectedCount <= 0) setCheckoutDismissed(false);
  }, [selectedCount]);

  const selectedCurrency = useMemo(() => {
    const firstSelected = ticketOptions.find((t) => t.qty > 0);
    return firstSelected?.currency || ticketOptions[0]?.currency || "USD";
  }, [ticketOptions]);

  const selectedTotal = useMemo(() => {
    return ticketOptions.reduce((sum, t) => sum + t.price * t.qty, 0);
  }, [ticketOptions]);

  const sym = currencySymbol(selectedCurrency);
  const showCheckoutBar = selectedCount > 0 && !checkoutDismissed;

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
      <div
        className={[
          "mx-auto w-full max-w-[1360px] px-14 pt-[112px] md:pt-[124px] flex justify-center gap-8 lg:gap-x-8 xl:gap-x-10",
          showCheckoutBar ? "pb-28" : "pb-16",
        ].join(" ")}
      >
        {/* Left (sticky poster) */}
        <div className="">
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
        <div className="flex-1 max-w-[760px]">
          {/* Title */}
          <h1 className="text-3xl sm:text-4xl lg:text-[56px] font-black leading-[92%] tracking-[-1.04px] text-white uppercase italic">
            {title}
          </h1>

          {/* Organization line */}
          {organization?.name ? (
            <div className="mt-3 flex items-center gap-2 text-white/90">
              {organization.logo ? (
                <Link
                  href={`/org/${organization.id}`}
                  className="relative size-8 overflow-hidden rounded-full bg-white/10 border border-white/10"
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
                <span className="inline-block size-7 rounded-full bg-white/10 border border-white/10" />
              )}

              <Link
                href={`/org/${organization.id}`}
                className="text-lg font-medium hover:text-primary-500 hover:underline transition"
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
              textColor="#F3EEFF"
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
          {/* Tickets — ROWS ONLY (no wrapper/title/divider/CTA)                  */}
          {/* ------------------------------------------------------------------ */}
          <div className="mt-7">
            {!hasTickets ? (
              <p className="text-sm text-white/65">
                Tickets are not available for this event.
              </p>
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
          </div>

          {/* Right column remainder (Details/Lineup/etc) */}
          <div className="mt-7">{children}</div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Fixed “Checkout — PRICE” bar (appears after +, stays bottom-fixed)   */}
      {/* ------------------------------------------------------------------ */}
      {showCheckoutBar ? (
        <div className="fixed inset-x-0 bottom-5 z-[70] flex justify-center px-4">
          <div className="relative w-full max-w-[670px]">
            <button
              type="button"
              onClick={onCheckout}
              className={[
                "w-full rounded-full border border-white/12",
                "bg-neutral-900/65 backdrop-blur-2xl",
                "shadow-[0_18px_60px_rgba(0,0,0,0.55)]",
                "px-5 py-3 pr-12 cursor-pointer",
                "transition-[transform,filter,background-color,border-color] duration-200",
                "hover:bg-neutral-800/70 hover:border-white/16 hover:filter hover:brightness-[1.04]",
                "active:scale-[0.995]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
              ].join(" ")}
              aria-label={`Checkout — ${sym}${selectedTotal.toFixed(2)}`}
            >
              <span className="block text-center text-[13px] sm:text-sm font-semibold text-white/90">
                Checkout —{" "}
                <span className="tabular-nums">
                  {sym}
                  {selectedTotal.toFixed(2)}
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCheckoutDismissed(true);
              }}
              className={[
                "absolute right-2 top-1/2 -translate-y-1/2",
                "grid size-9 place-items-center rounded-full cursor-pointer",
                "text-white/70 hover:text-white",
                "hover:bg-white/8 active:bg-white/10",
                "transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
              ].join(" ")}
              aria-label="Dismiss checkout bar"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M12.2 3.8L3.8 12.2M3.8 3.8l8.4 8.4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
