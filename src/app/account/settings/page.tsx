/* ------------------------------------------------------------------ */
/*  src/app/account/settings/page.tsx – Profile & Settings             */
/* ------------------------------------------------------------------ */
"use client";

import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { Ticket as TicketIcon, UserRound } from "lucide-react";

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
    <div className="mx-auto mt-10 max-w-md rounded-2xl border border-white/10 bg-neutral-950/70 p-10 text-center">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-primary-900/50 ring-1 ring-primary-700/40">
        {icon}
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
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
      {/* Subtle page mesh */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-80"
        style={{
          background:
            "radial-gradient(1100px 520px at 10% 5%, rgba(130,46,255,.22), transparent 60%), radial-gradient(900px 520px at 90% 0%, rgba(88,101,242,.18), transparent 60%)",
        }}
      />

      <section className="mx-auto max-w-[1232px] px-4 pb-20 pt-6 md:pt-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold md:text-3xl">
              Profile & Settings
            </h1>
            <p className="mt-2 max-w-prose text-sm text-neutral-300">
              Update your profile, security, notifications, password, and
              payment methods.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/account/my-tickets">
              <Button variant="ghost" size="sm">
                <TicketIcon className="mr-2 h-4 w-4" />
                My Tickets
              </Button>
            </Link>
          </div>
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
