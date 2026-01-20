/* ------------------------------------------------------------------ */
/*  src/app/dashboard/data/layout.tsx                                 */
/* ------------------------------------------------------------------ */
import type { ReactNode } from "react";
import DataTopbar from "@/components/dashboard/data/DataTopbar";

export default function DataLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      {/* subtle page wash (matches your dark aesthetic) */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-neutral-950" />
        <div className="absolute inset-x-0 top-0 h-[360px] bg-[radial-gradient(900px_280px_at_14%_0%,rgba(255,255,255,0.06),transparent_62%),radial-gradient(900px_320px_at_88%_10%,rgba(154,81,255,0.08),transparent_60%)] opacity-70" />
        <div className="absolute inset-x-0 top-0 h-[420px] bg-[linear-gradient(180deg,rgba(18,18,32,0.55)_0%,rgba(18,18,32,0.18)_55%,rgba(18,18,32,0)_100%)]" />
      </div>

      <div className="mx-auto w-full max-w-[1600px] py-4 sm:py-6">
        <DataTopbar />
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
