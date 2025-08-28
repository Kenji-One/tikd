// src/components/ui/TicketCard.tsx
"use client";

import clsx from "clsx";

export type TicketStatus = "upcoming" | "past" | "refunded" | "transferred";

export interface TicketCardProps {
  title: string;
  dateLabel: string;
  venue: string;
  img?: string; // uses <img> so remote urls work without Next/Image config
  qty?: number; // if provided, shows “X Tickets” on the stub
  badge?: string; // e.g. "SATURDAY MAY 17TH"
  status?: TicketStatus;
  onDetails?: () => void;
  className?: string;
}

/**
 * TicketCard – Figma-accurate
 *  - Poster with centered pill badge
 *  - Bold uppercase title
 *  - Icon rows
 *  - Perforation strip with 6 large dots
 *  - Side notches (true triangular cut-outs)
 *  - Separate white bottom stub with “Order Details”
 */
export default function TicketCard({
  title,
  dateLabel,
  venue,
  img = "/placeholder.jpg",
  qty,
  badge,
  status = "upcoming",
  onDetails,
  className,
}: TicketCardProps) {
  const isMuted = status !== "upcoming";

  return (
    <div
      className={clsx(
        "group relative w-full max-w-[187px] rounded-lg bg-white overflow-hidden",
        " transition-[box-shadow,transform]",
        className
      )}
    >
      {/* ───────────────────── Top ticket (white) ───────────────────── */}
      <div className="relative overflow-hidden text-neutral-950">
        {/* Poster */}
        <div className="relative h-[123px] w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img}
            alt={title}
            className={clsx(
              "h-full w-full object-cover",
              isMuted && "opacity-90"
            )}
          />
          {badge ? (
            <span
              className={clsx(
                "absolute left-1/2 top-3 -translate-x-1/2 rounded-full",
                "px-3 py-1 text-[10px] font-extrabold tracking-wide text-white",
                "bg-[linear-gradient(180deg,#ff7ab6, #d95cff)] shadow-[0_4px_12px_rgba(217,92,255,.35)]",
                "ring-1 ring-white/30"
              )}
            >
              {badge}
            </span>
          ) : null}

          {/* subtle fade to anchor content */}
          {/* <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent" /> */}
        </div>

        {/* Content */}
        <div className="p-3 pb-[6px]">
          <h3 className="mb-3 line-clamp-2 font-extrabold uppercase">
            {title}
          </h3>

          <div className="space-y-2 text-xs leading-[80%] tracking-[0.24px] font-medium">
            <div className="flex items-center gap-1.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
              >
                <path
                  d="M12.6667 4H3.33333C2.59695 4 2 4.59695 2 5.33333V12.6667C2 13.403 2.59695 14 3.33333 14H12.6667C13.403 14 14 13.403 14 12.6667V5.33333C14 4.59695 13.403 4 12.6667 4Z"
                  stroke="#727293"
                  strokeWidth="2"
                />
                <path
                  d="M2 6.66667C2 5.40933 2 4.78133 2.39067 4.39067C2.78133 4 3.40933 4 4.66667 4H11.3333C12.5907 4 13.2187 4 13.6093 4.39067C14 4.78133 14 5.40933 14 6.66667H2Z"
                  fill="#727293"
                />
                <path
                  d="M4.66667 2V4M11.3333 2V4"
                  stroke="#727293"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <span className="text-neutral-800">{dateLabel}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
              >
                <path
                  d="M8 7.66668C7.55797 7.66668 7.13405 7.49108 6.82149 7.17852C6.50893 6.86596 6.33333 6.44204 6.33333 6.00001C6.33333 5.55798 6.50893 5.13406 6.82149 4.8215C7.13405 4.50894 7.55797 4.33334 8 4.33334C8.44203 4.33334 8.86595 4.50894 9.17851 4.8215C9.49107 5.13406 9.66667 5.55798 9.66667 6.00001C9.66667 6.21888 9.62356 6.43561 9.5398 6.63782C9.45604 6.84002 9.33327 7.02376 9.17851 7.17852C9.02375 7.33329 8.84001 7.45605 8.63781 7.53981C8.4356 7.62357 8.21887 7.66668 8 7.66668ZM8 1.33334C6.76232 1.33334 5.57534 1.82501 4.70017 2.70018C3.825 3.57535 3.33333 4.76233 3.33333 6.00001C3.33333 9.50001 8 14.6667 8 14.6667C8 14.6667 12.6667 9.50001 12.6667 6.00001C12.6667 4.76233 12.175 3.57535 11.2998 2.70018C10.4247 1.82501 9.23768 1.33334 8 1.33334Z"
                  fill="#727293"
                />
              </svg>
              <span className="text-neutral-800">{venue}</span>
            </div>
          </div>
        </div>
      </div>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="187"
        height="52"
        viewBox="0 0 187 52"
        fill="none"
      >
        <path d="M161 26L187 52L187 0L161 26Z" fill="#08080F" />
        <path d="M26 26L0 0L0 52L26 26Z" fill="#08080F" />
        <ellipse cx="39" cy="26" rx="6" ry="4" fill="#08080F" />
        <ellipse cx="57" cy="26" rx="6" ry="4" fill="#08080F" />
        <ellipse cx="75" cy="26" rx="6" ry="4" fill="#08080F" />
        <ellipse cx="93" cy="26" rx="6" ry="4" fill="#08080F" />
        <ellipse cx="111" cy="26" rx="6" ry="4" fill="#08080F" />
        <ellipse cx="129" cy="26" rx="6" ry="4" fill="#08080F" />
        <ellipse cx="147" cy="26" rx="6" ry="4" fill="#08080F" />
      </svg>

      {/* ───────────────────── Bottom stub (white) ───────────────────── */}
      <button
        type="button"
        onClick={onDetails}
        className={clsx(
          "relative w-full py-4 text-center",
          "text-base font-semibold tracking-[0.32px] text-neutral-950 leading-[100%]",
          "hover:bg-neutral-50 active:scale-[.995] transition cursor-pointer"
        )}
      >
        {typeof qty === "number"
          ? `${qty} Ticket${qty === 1 ? "" : "s"}`
          : "Order Details"}
      </button>
    </div>
  );
}
