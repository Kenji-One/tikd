// src/components/dashboard/cards/KpiCard.tsx
"use client";

import type { PropsWithChildren, ReactNode } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Button } from "@/components/ui/Button";

type Props = PropsWithChildren<{
  title: string;
  value: string;

  /** Optional icon shown next to the main value */
  valueIcon?: ReactNode;

  /** e.g. "+24.6%" or "-24.6%" */
  delta?: string;
  /** gradient classes for the background glow */
  accent?: string;
  className?: string;
  /** Optional toolbar (date-range button, etc.) displayed beside delta */
  toolbar?: ReactNode;
  /** If true, the chart slot will flex to fill the card's remaining height */
  stretchChart?: boolean;

  /** ✅ Detailed view behavior */
  detailsHref?: string;
  onDetailedView?: () => void;
  hideDetails?: boolean;
  detailsLabel?: string;
}>;

export default function KpiCard({
  title,
  value,
  valueIcon,
  delta,
  accent = "from-[#7C3AED] to-[#9333EA]",
  className,
  toolbar,
  children,
  stretchChart = false,
  detailsHref,
  onDetailedView,
  hideDetails = false,
  detailsLabel = "Detailed View",
}: Props) {
  const router = useRouter();

  const rawDelta = (delta ?? "").trim();
  const isNegative = rawDelta.startsWith("-");
  // remove leading + or - for display (keep for logic)
  const deltaText = rawDelta.replace(/^[-+]\s*/, "");

  const deltaColor = isNegative
    ? "bg-error-900 text-error-500 border-error-800"
    : "bg-success-900 text-success-500 border-success-800";

  const deltaIcon = isNegative ? (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M14.6133 11.5867C14.5457 11.7496 14.4162 11.879 14.2533 11.9467C14.1732 11.9808 14.0871 11.9989 14 12H10.6667C10.4899 12 10.3203 11.9298 10.1953 11.8047C10.0702 11.6797 10 11.5101 10 11.3333C10 11.1565 10.0702 10.987 10.1953 10.8619C10.3203 10.7369 10.4899 10.6667 10.6667 10.6667H12.3933L8.66667 6.94L6.47333 9.14C6.41136 9.20249 6.33762 9.25208 6.25638 9.28593C6.17515 9.31977 6.08801 9.3372 6 9.3372C5.91199 9.3372 5.82486 9.31977 5.74362 9.28593C5.66238 9.25208 5.58864 9.20249 5.52667 9.14L1.52667 5.14C1.46418 5.07802 1.41458 5.00429 1.38074 4.92305C1.34689 4.84181 1.32947 4.75467 1.32947 4.66667C1.32947 4.57866 1.34689 4.49152 1.38074 4.41028C1.41458 4.32904 1.46418 4.25531 1.52667 4.19333C1.58864 4.13085 1.66238 4.08125 1.74362 4.04741C1.82486 4.01356 1.91199 3.99613 2 3.99613C2.08801 3.99613 2.17514 4.01356 2.25638 4.04741C2.33762 4.08125 2.41136 4.13085 2.47333 4.19333L6 7.72667L8.19333 5.52667C8.25531 5.46418 8.32904 5.41459 8.41028 5.38074C8.49152 5.34689 8.57866 5.32947 8.66667 5.32947C8.75467 5.32947 8.84181 5.34689 8.92305 5.38074C9.00429 5.41459 9.07802 5.46418 9.14 5.52667L13.3333 9.72667V8C13.3333 7.82319 13.4036 7.65362 13.5286 7.5286C13.6536 7.40357 13.8232 7.33333 14 7.33333C14.1768 7.33333 14.3464 7.40357 14.4714 7.5286C14.5964 7.65362 14.6667 7.82319 14.6667 8V11.3333C14.6656 11.4205 14.6475 11.5065 14.6133 11.5867Z"
        fill="#FF454A"
      />
    </svg>
  ) : (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M14.6133 4.41333C14.5457 4.25043 14.4162 4.12098 14.2533 4.05333C14.1732 4.01917 14.0871 4.00105 14 4H10.6667C10.4899 4 10.3203 4.07024 10.1953 4.19526C10.0702 4.32029 10 4.48986 10 4.66667C10 4.84348 10.0702 5.01305 10.1953 5.13807C10.3203 5.2631 10.4899 5.33333 10.6667 5.33333H12.3933L8.66667 9.06L6.47333 6.86C6.41136 6.79751 6.33762 6.74792 6.25638 6.71407C6.17515 6.68023 6.08801 6.6628 6 6.6628C5.91199 6.6628 5.82486 6.68023 5.74362 6.71407C5.66238 6.74792 5.58864 6.79751 5.52667 6.86L1.52667 10.86C1.46418 10.922 1.41458 10.9957 1.38074 11.0769C1.34689 11.1582 1.32947 11.2453 1.32947 11.3333C1.32947 11.4213 1.34689 11.5085 1.38074 11.5897C1.41458 11.671 1.46418 11.7447 1.52667 11.8067C1.58864 11.8692 1.66238 11.9187 1.74362 11.9526C1.82486 11.9864 1.91199 12.0039 2 12.0039C2.08801 12.0039 2.17514 11.9864 2.25638 11.9526C2.33762 11.9187 2.41136 11.8692 2.47333 11.8067L6 8.27333L8.19333 10.4733C8.25531 10.5358 8.32904 10.5854 8.41028 10.6193C8.49152 10.6531 8.57866 10.6705 8.66667 10.6705C8.75467 10.6705 8.84181 10.6531 8.92305 10.6193C9.00429 10.5854 9.07802 10.5358 9.14 10.4733L13.3333 6.27333V8C13.3333 8.17681 13.4036 8.34638 13.5286 8.4714C13.6536 8.59643 13.8232 8.66667 14 8.66667C14.1768 8.66667 14.3464 8.59643 14.4714 8.4714C14.5964 8.34638 14.6667 8.17681 14.6667 8V4.66667C14.6656 4.57955 14.6475 4.49348 14.6133 4.41333Z"
        fill="#45FF79"
      />
    </svg>
  );

  const FooterAction = () => {
    if (hideDetails) return null;

    // ✅ Make detailsHref always work (avoid asChild + Slot wrapper issues)
    if (detailsHref) {
      return (
        <Button
          type="button"
          variant="viewAction"
          size="sm"
          onClick={() => router.push(detailsHref)}
        >
          {detailsLabel}
        </Button>
      );
    }

    if (onDetailedView) {
      return (
        <Button
          type="button"
          onClick={onDetailedView}
          variant="viewAction"
          size="sm"
        >
          {detailsLabel}
        </Button>
      );
    }

    return (
      <Button type="button" variant="viewAction" size="sm" disabled>
        {detailsLabel}
      </Button>
    );
  };

  return (
    <div
      className={clsx(stretchChart ? "h-full flex flex-col" : "", className)}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="space-y-2 w-full">
          <div className="font-bold uppercase text-neutral-400">{title}</div>

          <div className="flex items-center gap-3 justify-between w-full">
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1.5">
                {valueIcon ? (
                  <span className="inline-flex items-center justify-center">
                    {valueIcon}
                  </span>
                ) : null}

                <div className="text-[24px] font-extrabold tracking-[-0.48px] leading-[100%] text-white">
                  {value}
                </div>
              </div>

              <div className="flex items-center gap-0.5">
                {delta ? (
                  <span
                    className={clsx(
                      "flex items-center gap-0.5 rounded-md px-1.5 py-1 text-[12px] font-semibold leading-none",
                      "border",
                      deltaColor,
                    )}
                    aria-label={`Change ${deltaText}${
                      isNegative ? " decrease" : " increase"
                    }`}
                  >
                    {deltaIcon}
                    <span className="tabular-nums">{deltaText}</span>
                  </span>
                ) : null}
              </div>
            </div>

            {toolbar}
          </div>
        </div>
      </div>

      {/* Chart area */}
      <div className={clsx("relative", stretchChart && "flex-1 min-h-0")}>
        <div className={clsx("relative", stretchChart && "h-full")}>
          {children}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-2 flex items-center justify-end">
        <FooterAction />
      </div>
    </div>
  );
}
