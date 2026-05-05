"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  LogIn,
  Mail,
  ShieldCheck,
  Ticket,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

type InviteScope = "team" | "event";

type InvitePreviewResponse = {
  invite: {
    scope: InviteScope;
    resource: {
      id: string;
      title: string;
    };
    recipientEmail: string;
    inviterName: string;
    role: string;
    roleLabel: string;
    status: "invited";
    temporaryAccess: boolean;
    expiresAt: string | null;
    redirectTo: string;
  };
};

type AcceptInviteResponse = {
  ok: true;
  redirectTo: string;
};

async function json<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return (await res.json()) as T;
}

function normalizeEmail(email?: string | null): string {
  return String(email ?? "")
    .trim()
    .toLowerCase();
}

function prettyDate(date?: string | null): string {
  if (!date) return "No expiry";
  return new Date(date).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function safeErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return "Something went wrong.";

  try {
    const parsed = JSON.parse(error.message) as { error?: string };
    return parsed.error ?? error.message;
  } catch {
    return error.message;
  }
}

function ScopeIcon({ scope }: { scope: InviteScope }) {
  if (scope === "team") {
    return <Users className="h-5 w-5" />;
  }

  return <Ticket className="h-5 w-5" />;
}

export default function InviteAcceptPage() {
  const router = useRouter();
  const params = useParams<{ scope: string; token: string }>();
  const { data: session, status: sessionStatus } = useSession();

  const scope =
    params?.scope === "team" || params?.scope === "event" ? params.scope : null;

  const token = typeof params?.token === "string" ? params.token : "";

  const previewQuery = useQuery<InvitePreviewResponse>({
    queryKey: ["invite-preview", scope, token],
    enabled: !!scope && !!token,
    queryFn: () =>
      json<InvitePreviewResponse>(
        `/api/invites/${scope}/${encodeURIComponent(token)}`,
      ),
    staleTime: 15_000,
    retry: false,
  });

  const acceptMutation = useMutation({
    mutationFn: () =>
      json<AcceptInviteResponse>(
        `/api/invites/${scope}/${encodeURIComponent(token)}/accept`,
        {
          method: "POST",
        },
      ),
    onSuccess: (data) => {
      router.push(data.redirectTo);
    },
  });

  const preview = previewQuery.data?.invite ?? null;

  const invitedEmail = useMemo(
    () => normalizeEmail(preview?.recipientEmail),
    [preview?.recipientEmail],
  );

  const sessionEmail = useMemo(
    () => normalizeEmail(session?.user?.email),
    [session?.user?.email],
  );

  const wrongAccount =
    !!invitedEmail && !!sessionEmail && invitedEmail !== sessionEmail;

  const isLoading = previewQuery.isLoading || sessionStatus === "loading";

  return (
    <div className="min-h-[100svh] bg-neutral-950 px-4 py-8 text-neutral-0">
      <div className="mx-auto max-w-[720px]">
        <div
          className={clsx(
            "relative overflow-hidden rounded-3xl border border-white/10",
            "bg-neutral-950/80 shadow-[0_30px_120px_rgba(0,0,0,0.55)]",
          )}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-100"
            style={{
              background:
                "radial-gradient(900px 420px at 10% -10%, rgba(154,70,255,0.18), transparent 60%), radial-gradient(900px 420px at 100% 30%, rgba(66,139,255,0.10), transparent 62%), linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
            }}
          />

          <div className="relative px-5 py-6 md:px-7 md:py-7">
            <div className="flex items-start gap-4">
              <div
                className={clsx(
                  "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                  "bg-primary-500/15 text-primary-200 ring-1 ring-primary-500/20",
                )}
              >
                {scope ? (
                  <ScopeIcon scope={scope} />
                ) : (
                  <ShieldCheck className="h-5 w-5" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-[18px] font-semibold tracking-[-0.2px] text-neutral-0">
                  Accept Invitation
                </div>
                <div className="mt-1 text-[13px] text-neutral-400">
                  Sign in with the invited email to accept access on Tixsy.
                </div>
              </div>
            </div>

            <div className="mt-6">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 rounded-2xl" />
                  <Skeleton className="h-20 rounded-2xl" />
                  <Skeleton className="h-20 rounded-2xl" />
                </div>
              ) : previewQuery.isError ? (
                <div
                  className={clsx(
                    "rounded-2xl border border-error-500/20 bg-error-500/10 p-4",
                    "text-[13px] text-error-100",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                      <div className="font-semibold">Invite unavailable</div>
                      <div className="mt-1 text-error-200/90">
                        {safeErrorMessage(previewQuery.error)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : preview ? (
                <div
                  className={clsx(
                    "rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5",
                    "shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
                  )}
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    <div
                      className={clsx(
                        "rounded-2xl border border-white/10 bg-neutral-950/45 p-4",
                      )}
                    >
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                        {preview.scope === "team" ? "Team" : "Event"}
                      </div>
                      <div className="mt-2 text-[16px] font-semibold text-neutral-0">
                        {preview.resource.title}
                      </div>
                    </div>

                    <div
                      className={clsx(
                        "rounded-2xl border border-white/10 bg-neutral-950/45 p-4",
                      )}
                    >
                      <div className="flex items-center gap-2 text-[12px] text-neutral-400">
                        <Mail className="h-4 w-4" />
                        Recipient
                      </div>
                      <div className="mt-2 text-[15px] font-semibold text-neutral-0">
                        {preview.recipientEmail}
                      </div>
                    </div>

                    <div
                      className={clsx(
                        "rounded-2xl border border-white/10 bg-neutral-950/45 p-4",
                      )}
                    >
                      <div className="flex items-center gap-2 text-[12px] text-neutral-400">
                        <ShieldCheck className="h-4 w-4" />
                        Role
                      </div>
                      <div className="mt-2 text-[15px] font-semibold text-neutral-0">
                        {preview.roleLabel}
                      </div>
                    </div>

                    <div
                      className={clsx(
                        "rounded-2xl border border-white/10 bg-neutral-950/45 p-4",
                      )}
                    >
                      <div className="flex items-center gap-2 text-[12px] text-neutral-400">
                        <UserRound className="h-4 w-4" />
                        Invited by
                      </div>
                      <div className="mt-2 text-[15px] font-semibold text-neutral-0">
                        {preview.inviterName}
                      </div>
                    </div>

                    <div
                      className={clsx(
                        "rounded-2xl border border-white/10 bg-neutral-950/45 p-4 md:col-span-2",
                      )}
                    >
                      <div className="flex items-center gap-2 text-[12px] text-neutral-400">
                        <Clock3 className="h-4 w-4" />
                        Access
                      </div>
                      <div className="mt-2 text-[15px] font-semibold text-neutral-0">
                        {preview.temporaryAccess
                          ? "Temporary access"
                          : "Ongoing access"}
                      </div>
                      <div className="mt-1 text-[12px] text-neutral-500">
                        {preview.temporaryAccess
                          ? `Member access ends ${prettyDate(preview.expiresAt)}`
                          : "No automatic expiry"}
                      </div>
                    </div>
                  </div>

                  {sessionStatus === "unauthenticated" ? (
                    <div
                      className={clsx(
                        "mt-4 rounded-2xl border border-white/10 bg-white/5 p-4",
                      )}
                    >
                      <div className="text-[13px] font-semibold text-neutral-100">
                        Sign in to continue
                      </div>
                      <div className="mt-1 text-[12px] text-neutral-400">
                        Use{" "}
                        <span className="font-semibold">
                          {preview.recipientEmail}
                        </span>{" "}
                        to accept this invitation.
                      </div>

                      <div className="mt-4">
                        <Button
                          type="button"
                          variant="primary"
                          icon={<LogIn className="h-4 w-4" />}
                          animation
                          onClick={() =>
                            signIn(undefined, {
                              callbackUrl: window.location.href,
                            })
                          }
                        >
                          Sign in to accept
                        </Button>
                      </div>
                    </div>
                  ) : wrongAccount ? (
                    <div
                      className={clsx(
                        "mt-4 rounded-2xl border border-warning-500/20 bg-warning-500/10 p-4",
                      )}
                    >
                      <div className="text-[13px] font-semibold text-warning-100">
                        Wrong account
                      </div>
                      <div className="mt-1 text-[12px] text-warning-200/90">
                        You are signed in as{" "}
                        <span className="font-semibold">{sessionEmail}</span>,
                        but this invite was sent to{" "}
                        <span className="font-semibold">
                          {preview.recipientEmail}
                        </span>
                        .
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() =>
                            signOut({
                              callbackUrl: window.location.href,
                            })
                          }
                        >
                          Sign out
                        </Button>

                        <Button
                          type="button"
                          variant="primary"
                          icon={<LogIn className="h-4 w-4" />}
                          onClick={() =>
                            signIn(undefined, {
                              callbackUrl: window.location.href,
                            })
                          }
                        >
                          Use another account
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      <Button
                        type="button"
                        variant="primary"
                        animation
                        icon={<CheckCircle2 className="h-4 w-4" />}
                        disabled={acceptMutation.isPending}
                        onClick={() => acceptMutation.mutate()}
                      >
                        {acceptMutation.isPending
                          ? "Accepting..."
                          : "Accept invitation"}
                      </Button>

                      <Button
                        type="button"
                        variant="secondary"
                        icon={<CalendarDays className="h-4 w-4" />}
                        onClick={() => router.push(preview.redirectTo)}
                      >
                        {preview.scope === "team" ? "Open team" : "Open event"}
                      </Button>
                    </div>
                  )}

                  {acceptMutation.isError ? (
                    <div
                      className={clsx(
                        "mt-4 rounded-2xl border border-error-500/20 bg-error-500/10 p-4",
                        "text-[13px] text-error-100",
                      )}
                    >
                      {safeErrorMessage(acceptMutation.error)}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
