/* ------------------------------------------------------------------ */
/*  src/components/ui/TicketSelector.tsx                               */
/* ------------------------------------------------------------------ */
"use client";

type Props = {
  label: string;
  price: number;
  currency?: string;
  qty: number;
  feesIncluded?: boolean;
  onChange: (n: number) => void;
};

function currencySymbol(code?: string): string {
  const c = (code || "").toUpperCase();
  if (c === "USD") return "$";
  if (c === "EUR") return "€";
  if (c === "GBP") return "£";
  if (c === "GEL") return "₾";
  return "$";
}

/**
 * Display-only estimate:
 * - "Fees included" when feesIncluded = true
 * - Otherwise, a consistent estimate based on ticket price.
 */
function estimateFees(price: number): number {
  const pct = 0.115;
  const raw = price * pct;
  const rounded = Math.round(raw * 100) / 100;
  return Math.max(rounded, 0.99);
}

export default function TicketSelector({
  label,
  price,
  currency,
  qty,
  feesIncluded = false,
  onChange,
}: Props) {
  const sym = currencySymbol(currency);
  const decDisabled = qty <= 0;
  const isSelected = qty > 0;

  const feesText = feesIncluded
    ? "Fees included"
    : `+ ${sym}${estimateFees(price).toFixed(2)} est. fees`;

  const lineTotal = price * qty;

  return (
    <div
      className={[
        "relative group overflow-hidden rounded-xl border",
        "transition-[transform,background-color,border-color,box-shadow] duration-200",
        isSelected
          ? "border-primary-951/35 bg-white/10 shadow-[0_18px_55px_rgba(0,0,0,0.45)]"
          : "border-white/10 bg-white/5 hover:bg-white/7 hover:border-white/15",
      ].join(" ")}
    >
      <div
        className={[
          "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200",
          isSelected ? "opacity-100" : "group-hover:opacity-100",
        ].join(" ")}
        style={{
          background:
            "radial-gradient(520px 220px at 16% 30%, rgba(154,70,255,0.18), transparent 62%)," +
            "radial-gradient(520px 260px at 92% 70%, rgba(199,160,255,0.12), transparent 62%)," +
            "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0) 42%)",
        }}
      />

      <div className="relative grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center sm:px-5 sm:py-3.5">
        {/* Left block */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-[15px] font-extrabold tracking-[-0.2px] text-white sm:text-[18px]">
              {label}
            </p>

            {isSelected ? (
              <span className="hidden sm:inline-flex items-center rounded-full border border-primary-951/30 bg-primary-951/15 px-2 py-0.5 text-[12px] font-semibold text-primary-999">
                Added
              </span>
            ) : null}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <p
              className={[
                "text-[13px] tracking-[-0.18px] sm:text-sm",
                feesIncluded ? "text-success-400" : "text-white/75",
              ].join(" ")}
            >
              {feesText}
            </p>

            {isSelected ? (
              <span className="text-[13px] text-white/75 sm:text-sm">
                Line total:{" "}
                <span className="tabular-nums font-semibold text-white/80">
                  {sym}
                  {lineTotal.toFixed(2)}
                </span>
              </span>
            ) : null}
          </div>
        </div>

        {/* Right block: price + stepper */}
        <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
          <div className="text-left sm:text-right">
            <p className="inline-block whitespace-nowrap -mx-[2px] px-[2px] text-[15px] italic font-extrabold tracking-[-0.28px] tabular-nums text-transparent bg-gradient-to-r from-primary-999 via-primary-952 to-primary-951 bg-clip-text sm:text-[20px] sm:tracking-[-0.32px]">
              {sym}
              {price.toFixed(2)}
            </p>
            <p className="text-[12px] text-white/65 sm:text-[13px]">
              per ticket
            </p>
          </div>

          <div
            className={[
              "flex items-center rounded-full border border-white/10 bg-neutral-950/40 px-1.5 py-1 backdrop-blur-xl",
              "shadow-[0_14px_40px_rgba(0,0,0,0.35)]",
              isSelected ? "ring-1 ring-primary-951/25" : "",
            ].join(" ")}
          >
            <button
              type="button"
              onClick={() => onChange(Math.max(0, qty - 1))}
              disabled={decDisabled}
              aria-label="Decrease quantity"
              className={[
                "grid size-7 place-items-center rounded-full transition sm:size-8",
                "cursor-pointer text-white/85",
                decDisabled
                  ? "cursor-not-allowed opacity-35"
                  : "hover:bg-white/10 hover:text-white active:bg-black/20",
              ].join(" ")}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
              >
                <path
                  d="M3.33337 8.66665H12.6667V7.33331H3.33337V8.66665Z"
                  fill="currentColor"
                />
              </svg>
            </button>

            <span className="w-7 text-center font-semibold tabular-nums text-white sm:w-8">
              {qty}
            </span>

            <button
              type="button"
              onClick={() => onChange(qty + 1)}
              aria-label="Increase quantity"
              className="grid size-7 place-items-center rounded-full cursor-pointer text-white/85 transition hover:bg-white/10 hover:text-white active:bg-black/20 sm:size-8"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
              >
                <path
                  d="M7.33337 8.66665H3.33337V7.33331H7.33337V3.33331H8.66671V7.33331H12.6667V8.66665H8.66671V12.6666H7.33337V8.66665Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div
        className={[
          "pointer-events-none absolute inset-x-0 bottom-0 h-px opacity-0 transition-opacity duration-200",
          isSelected ? "opacity-100" : "group-hover:opacity-100",
        ].join(" ")}
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(154,70,255,0.55), rgba(199,160,255,0.35), transparent)",
        }}
      />
    </div>
  );
}
