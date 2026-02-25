/* ------------------------------------------------------------------ */
/*  src/app/account/settings/page.tsx – Profile & Settings             */
/* ------------------------------------------------------------------ */
"use client";

import type { ReactNode } from "react";
import { signIn, useSession } from "next-auth/react";
import { UserRound } from "lucide-react";

import { Button } from "@/components/ui/Button";
import SettingsShell from "@/components/features/settings/SettingsShell";

function EmptyState({
  icon,
  title,
  sub,
  cta,
}: {
  icon: ReactNode;
  title: string;
  sub?: string;
  cta?: ReactNode;
}) {
  return (
    <div className="relative mx-auto mt-10 max-w-md overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.03)_100%)] p-8 text-center backdrop-blur-[20px]">
      <div className="pointer-events-none absolute inset-0 opacity-90 [mask-image:radial-gradient(60%_60%_at_50%_20%,#000_70%,transparent_100%)]">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.22)_0%,transparent_65%)] blur-[30px]" />
        <div className="absolute -right-28 -bottom-28 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.16)_0%,transparent_65%)] blur-[30px]" />
      </div>

      <div className="relative">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl border border-white/10 bg-white/5">
          {icon}
        </div>
        <h3 className="text-[18px] font-extrabold tracking-[-0.02em] text-neutral-0">
          {title}
        </h3>
        {sub ? (
          <p className="mt-2 text-[13px] leading-snug text-neutral-300">
            {sub}
          </p>
        ) : null}
        {cta ? <div className="mt-5 flex justify-center">{cta}</div> : null}
      </div>
    </div>
  );
}

export default function AccountSettingsPage() {
  const { status } = useSession();
  const authed = status === "authenticated";

  return (
    <main className="relative min-h-screen overflow-hidden bg-neutral-950 text-neutral-0">
      {/* Atmospheric blobs (like provided HTML) */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute right-0 top-0 h-[800px] w-[800px] blur-[80px]"
          style={{
            background:
              "radial-gradient(circle, rgba(124, 58, 237, 0.08) 0%, transparent 70%)",
            animation: "tikdSettingsFloat 20s ease-in-out infinite",
          }}
        />
        <div
          className="absolute bottom-0 left-0 h-[600px] w-[600px] blur-[80px]"
          style={{
            background:
              "radial-gradient(circle, rgba(99, 102, 241, 0.06) 0%, transparent 70%)",
            animation: "tikdSettingsFloat 25s ease-in-out infinite reverse",
          }}
        />
      </div>

      {/* Vignette */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(900px_520px_at_50%_-10%,rgba(0,0,0,0.35),transparent_62%),radial-gradient(1200px_700px_at_50%_120%,rgba(0,0,0,0.58),transparent_60%)]" />

      <section className="mx-auto max-w-[1400px] px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        {/* Page title */}
        <div className="mb-9">
          <h1 className="text-2xl font-extrabold tracking-[-0.02em] md:text-3xl">
            Profile & Settings
          </h1>
          <p className="mt-1.5 text-[14px] text-white/50">
            Update your profile, security, notifications, password, and payment
            methods.
          </p>
        </div>

        {!authed ? (
          <EmptyState
            icon={<UserRound className="h-5 w-5 text-primary-300" />}
            title="Sign in to manage your account"
            sub="Settings are tied to your account, so you’ll need to log in."
            cta={
              <Button variant="primary" onClick={() => signIn()}>
                Sign in
              </Button>
            }
          />
        ) : (
          <SettingsShell />
        )}
      </section>

      {/* Keyframes for blob float */}
      <style jsx global>{`
        @keyframes tikdSettingsFloat {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-30px) rotate(5deg);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            scroll-behavior: auto !important;
          }
        }
      `}</style>
    </main>
  );
}
