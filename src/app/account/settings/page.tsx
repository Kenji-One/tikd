/* ------------------------------------------------------------------ */
/*  src/app/account/settings/page.tsx – Profile & Settings             */
/* ------------------------------------------------------------------ */
"use client";

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
  icon: React.ReactNode;
  title: string;
  sub?: string;
  cta?: React.ReactNode;
}) {
  return (
    <div className="mx-auto mt-10 max-w-md rounded-xl border border-white/10 bg-neutral-950/65 p-8 text-center backdrop-blur-[10px]">
      <div className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-lg bg-primary-900/40 ring-1 ring-primary-700/30">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-neutral-0">{title}</h3>
      {sub ? <p className="mt-2 text-sm text-neutral-300">{sub}</p> : null}
      {cta ? <div className="mt-5">{cta}</div> : null}
    </div>
  );
}

export default function AccountSettingsPage() {
  const { status } = useSession();
  const authed = status === "authenticated";

  return (
    <main className="relative overflow-hidden bg-neutral-950 text-neutral-0">
      {/* Page mesh (cleaner / less muddy) */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-95"
        style={{
          background:
            "radial-gradient(900px 420px at 12% 4%, rgba(154,70,255,.16), transparent 60%)," +
            "radial-gradient(820px 420px at 92% 0%, rgba(88,101,242,.10), transparent 58%)," +
            "radial-gradient(900px 520px at 50% 115%, rgba(154,70,255,.08), transparent 62%)",
        }}
      />

      {/* Vignette */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(900px_520px_at_50%_-10%,rgba(0,0,0,0.35),transparent_62%),radial-gradient(1200px_700px_at_50%_120%,rgba(0,0,0,0.58),transparent_60%)]" />

      <section className="mx-auto max-w-[1232px] px-4 pb-20 pt-6 md:pt-8">
        <div className="mb-5">
          <h1 className="text-2xl font-extrabold tracking-[-0.02em] md:text-3xl">
            Profile & Settings
          </h1>
          <p className="mt-2 max-w-prose text-sm text-neutral-300">
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
    </main>
  );
}
