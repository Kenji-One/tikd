/* ------------------------------------------------------------------ */
/*  src/components/ui/UnderConstruction.tsx                            */
/* ------------------------------------------------------------------ */
"use client";

import clsx from "clsx";
import { Construction, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

type Props = {
  title?: string;
  description?: string;
  backLabel?: string;
  backHref?: string; // if not provided, router.back()
  className?: string;
};

export default function UnderConstruction({
  title = "Under Construction",
  description = "We’re updating this page. Please check back soon.",
  backLabel = "Go Back",
  backHref,
  className,
}: Props) {
  const router = useRouter();

  return (
    <div className={clsx("w-full px-4 py-8 sm:px-6 sm:py-12", className)}>
      <div className="mx-auto w-full max-w-[920px]">
        <div className="relative overflow-hidden rounded-card border border-neutral-800/70 bg-neutral-948/70 p-6 sm:p-8">
          {/* Soft Tikd glow */}
          <div
            className="pointer-events-none absolute inset-0 opacity-90"
            style={{
              background:
                "radial-gradient(900px 520px at 0% 0%, rgba(154,70,255,0.36), transparent 60%), radial-gradient(700px 520px at 100% 25%, rgba(69,255,121,0.14), transparent 58%), radial-gradient(780px 620px at 45% 120%, rgba(255,123,69,0.10), transparent 65%)",
            }}
          />

          <div className="relative flex flex-col items-center text-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-neutral-950/55 ring-1 ring-neutral-800/70">
              <Construction className="h-6 w-6 text-primary-300" />
            </div>

            <h1 className="mt-4 text-[22px] font-extrabold tracking-[-0.04em] text-neutral-50 sm:text-[26px]">
              {title}
            </h1>

            <p className="mt-3 max-w-[52ch] text-[13px] leading-[1.35] tracking-[-0.02em] text-neutral-300">
              {description}
            </p>

            <div className="mt-5">
              <Button
                type="button"
                onClick={() =>
                  backHref ? router.push(backHref) : router.back()
                }
              >
                <ArrowLeft className=" h-4 w-4" />
                {backLabel}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
