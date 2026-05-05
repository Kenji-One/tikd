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
        className="fixed inset-0 -z-10 scale-[1.08] blur-[26px] opacity-95"
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
          "mx-auto flex w-full max-w-[1360px] flex-col gap-6 px-4 pt-[96px] sm:gap-7 sm:px-6 sm:pt-[104px] md:px-8 md:pt-[124px] lg:flex-row lg:justify-center lg:gap-8 xl:gap-x-10 2xl:px-14",
          showCheckoutBar ? "pb-28 sm:pb-32" : "pb-14 sm:pb-16",
        ].join(" ")}
      >
        {/* Left (sticky poster) */}
        <div className="w-full lg:w-auto">
          <div className="flex justify-center lg:sticky lg:top-[112px] lg:justify-end md:lg:top-[124px]">
            <div className="relative w-full max-w-[342px]">
              <div className="pointer-events-none absolute -inset-4 -z-10 rounded-[28px] bg-black/20 blur-2xl sm:-inset-6" />
              <div className="relative mx-auto h-[280px] w-[220px] overflow-hidden rounded-xl sm:h-[325px] sm:w-[260px] md:h-[375px] md:w-[300px] lg:h-[428px] lg:w-[342px]">
                <Image
                  fill
                  src={poster}
                  alt={title}
                  priority
                  sizes="(max-width: 640px) 220px, (max-width: 768px) 260px, (max-width: 1024px) 300px, 342px"
                  className="rounded-xl object-cover"
                />
                <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-white/10" />
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="w-full flex-1 lg:max-w-[760px]">
          {/* Title */}
          <h1 className="text-[32px] font-black leading-[92%] tracking-[-0.72px] text-white uppercase italic sm:text-4xl sm:tracking-[-0.9px] lg:text-[56px] lg:tracking-[-1.04px]">
            {title}
          </h1>

          {/* Organization line */}
          {organization?.name ? (
            <div className="mt-3 flex items-center gap-2 text-white/90">
              {organization.logo ? (
                <Link
                  href={`/org/${organization.id}`}
                  className="relative size-8 overflow-hidden rounded-full border border-white/10 bg-white/10"
                  aria-label={organization.name}
                >
                  <Image
                    src={organization.logo}
                    alt=""
                    fill
                    sizes="32px"
                    className="object-cover"
                  />
                </Link>
              ) : (
                <span className="inline-block size-8 rounded-full border border-white/10 bg-white/10" />
              )}

              <Link
                href={`/org/${organization.id}`}
                className="text-base font-medium transition hover:text-primary-500 hover:underline sm:text-lg"
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

          {/* Tickets */}
          <div className="mt-6 sm:mt-7">
            {!hasTickets ? (
              <p className="text-sm text-white/65">
                Tickets are not available for this event.
              </p>
            ) : (
              <div className="space-y-2.5">
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
          <div className="mt-6 sm:mt-7">{children}</div>
        </div>
      </div>

      {/* Fixed “Checkout — PRICE” bar */}
      {showCheckoutBar ? (
        <div className="fixed inset-x-0 bottom-4 z-[70] flex justify-center px-3 sm:bottom-6 sm:px-4">
          <div className="group relative w-full max-w-[780px]">
            <div
              aria-hidden="true"
              className={[
                "pointer-events-none absolute -inset-6 -z-[1] rounded-[999px] opacity-70 blur-2xl",
                "transition-opacity duration-300",
                "group-hover:opacity-95",
                "sm:-inset-8",
              ].join(" ")}
              style={{
                background:
                  "radial-gradient(520px 180px at 50% 35%, rgba(154,81,255,.25), transparent 65%)," +
                  "radial-gradient(520px 200px at 30% 80%, rgba(255,90,220,.10), transparent 62%)," +
                  "radial-gradient(520px 220px at 70% 85%, rgba(43,217,255,.08), transparent 66%)",
              }}
            />

            <button
              type="button"
              onClick={onCheckout}
              className={[
                "relative w-full overflow-hidden rounded-full",
                "min-h-[56px] sm:min-h-[60px]",
                "border border-white/12",
                "bg-neutral-900/58 backdrop-blur-2xl",
                "px-5 py-4 pr-[62px] sm:px-7 sm:pr-[76px]",
                "shadow-[0_22px_70px_rgba(0,0,0,0.62)]",
                "cursor-pointer",
                "transition-[transform,filter,background-color,border-color,box-shadow] duration-200",
                "hover:bg-neutral-800/62 hover:border-white/18",
                "group-hover:shadow-[0_26px_84px_rgba(0,0,0,0.70)]",
                "active:scale-[0.996]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
              ].join(" ")}
              aria-label={`Checkout — ${sym}${selectedTotal.toFixed(2)}`}
            >
              <span
                aria-hidden="true"
                className={[
                  "pointer-events-none absolute inset-0 rounded-full",
                  "opacity-0 transition-opacity duration-200",
                  "group-hover:opacity-100",
                ].join(" ")}
                style={{
                  boxShadow:
                    "inset 0 0 0 1px rgba(154,81,255,.32), inset 0 0 0 2px rgba(154,81,255,.10), 0 0 22px rgba(154,81,255,.18)",
                }}
              />

              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent"
              />

              <span
                aria-hidden="true"
                className={[
                  "pointer-events-none absolute -inset-y-8 left-[-60%] w-[55%]",
                  "rotate-[18deg]",
                  "bg-gradient-to-r from-transparent via-white/18 to-transparent",
                  "opacity-0 blur-[0.2px]",
                  "transition-[transform,opacity] duration-500 ease-out",
                  "group-hover:translate-x-[220%] group-hover:opacity-100",
                ].join(" ")}
              />

              <span
                aria-hidden="true"
                className={[
                  "pointer-events-none absolute -inset-10 opacity-70 blur-2xl",
                  "transition-opacity duration-200",
                  "group-hover:opacity-90",
                ].join(" ")}
                style={{
                  background:
                    "radial-gradient(520px 160px at 50% 30%, rgba(154,81,255,.22), transparent 60%)," +
                    "radial-gradient(520px 200px at 18% 92%, rgba(255,90,220,.08), transparent 62%)," +
                    "radial-gradient(620px 220px at 50% 120%, rgba(255,255,255,.06), transparent 60%)",
                }}
              />

              <span className="relative z-[1] block text-center text-[14px] font-extrabold tracking-[-0.15px] text-white/92 sm:text-[16px]">
                Checkout{" "}
                <span className="mx-1.5 font-black text-white/55">—</span>
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
                "grid size-10 place-items-center rounded-full sm:right-3 sm:size-[44px]",
                "cursor-pointer text-white/72 hover:text-white",
                "bg-white/0 hover:bg-white/8 active:bg-white/10",
                "transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
              ].join(" ")}
              aria-label="Dismiss checkout bar"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
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
