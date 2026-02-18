"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import clsx from "classnames";
import {
  Bell,
  CreditCard,
  KeyRound,
  ShieldCheck,
  Ticket as TicketIcon,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import ProfileSettings from "./ProfileSettings";
import SecuritySettings from "./SecuritySettings";
import ChangePassword from "./ChangePassword";
import NotificationSettings from "./NotificationSettings";
import PaymentMethods from "./PaymentMethods";
import AvatarDialog from "./AvatarDialog";

type TabId = "profile" | "security" | "password" | "notifications" | "payments";

type TabItem = {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  content: React.ReactNode;
};

function FinanceStyleTabButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={clsx(
        "group relative flex items-center justify-center gap-2",
        "rounded-lg border px-3 py-2.5 text-[13px] font-semibold tracking-[-0.02em] cursor-pointer",
        "outline-none transition",
        "focus-visible:ring-2 focus-visible:ring-primary-500/30",
        active
          ? clsx(
              "border-primary-500/35 bg-neutral-950/30 text-neutral-0",
              "shadow-[0_14px_34px_rgba(154,70,255,0.12)]",
              "ring-1 ring-primary-500/18",
              "shadow-[inset_0_-2px_0_rgba(154,70,255,0.55)]",
            )
          : "border-neutral-800/70 bg-neutral-950/12 text-neutral-300 hover:bg-neutral-900/18 hover:text-neutral-0",
      )}
    >
      <span
        className={clsx(
          "inline-flex items-center justify-center transition",
          active
            ? "text-primary-200"
            : "text-neutral-300 group-hover:text-neutral-0",
        )}
      >
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}

function SettingsTabBar({
  tabs,
  active,
  onChange,
}: {
  tabs: TabItem[];
  active: TabId;
  onChange: (id: TabId) => void;
}) {
  return (
    <div className="w-full">
      <div
        role="tablist"
        aria-label="Settings tabs"
        className={clsx(
          "relative overflow-hidden rounded-xl border border-white/10",
          "bg-neutral-950/35 backdrop-blur-[12px]",
        )}
      >
        {/* light wash behind buttons (keeps it premium without muddy look) */}
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(900px 220px at 18% 0%, rgba(154,70,255,0.12), transparent 62%)," +
              "radial-gradient(720px 220px at 86% 20%, rgba(88,101,242,0.09), transparent 62%)," +
              "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0))",
          }}
        />

        <div className="relative grid grid-cols-2 gap-2 p-3 sm:grid-cols-5">
          {tabs.map((t) => (
            <FinanceStyleTabButton
              key={t.id}
              label={t.label}
              icon={t.icon}
              active={active === t.id}
              onClick={() => onChange(t.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * SettingsShell
 * - Tabs now match Finance graph section (FinanceTabButton style)
 * - Avatar opens dialog on click (avatar itself is clickable)
 * - Single content container
 */
export default function SettingsShell() {
  const [active, setActive] = useState<TabId>("profile");
  const [avatarOpen, setAvatarOpen] = useState(false);
  const { data: session } = useSession();

  const displayName = useMemo(() => {
    const n = session?.user?.name || "Your Profile";
    return n.length ? n[0].toUpperCase() + n.slice(1) : "Your Profile";
  }, [session?.user?.name]);

  const avatarUrl = session?.user?.image || "";

  const tabs: TabItem[] = useMemo(
    () => [
      {
        id: "profile",
        label: "Profile",
        icon: <UserRound className="h-4 w-4" />,
        content: <ProfileSettings />,
      },
      {
        id: "security",
        label: "Security",
        icon: <ShieldCheck className="h-4 w-4" />,
        content: <SecuritySettings />,
      },
      {
        id: "password",
        label: "Password",
        icon: <KeyRound className="h-4 w-4" />,
        content: <ChangePassword />,
      },
      {
        id: "notifications",
        label: "Notifications",
        icon: <Bell className="h-4 w-4" />,
        content: <NotificationSettings />,
      },
      {
        id: "payments",
        label: "Payment Methods",
        icon: <CreditCard className="h-4 w-4" />,
        content: <PaymentMethods />,
      },
    ],
    [],
  );

  const activeTab = tabs.find((t) => t.id === active);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-neutral-950/45 backdrop-blur-[12px]">
        <div
          className="pointer-events-none absolute inset-0 opacity-95"
          style={{
            background:
              "radial-gradient(900px 260px at 0% 0%, rgba(154,70,255,0.18), transparent 62%)," +
              "radial-gradient(800px 240px at 100% 12%, rgba(88,101,242,0.12), transparent 62%)," +
              "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0))",
          }}
        />
        <div className="pointer-events-none absolute inset-0 opacity-70 bg-[radial-gradient(900px_380px_at_50%_-10%,rgba(0,0,0,0.32),transparent_65%),radial-gradient(1100px_520px_at_50%_120%,rgba(0,0,0,0.58),transparent_60%)]" />

        <div className="relative flex flex-col gap-4 p-4 sm:p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            {/* avatar is clickable (opens dialog) */}
            <button
              type="button"
              onClick={() => setAvatarOpen(true)}
              className={clsx(
                "relative h-14 w-14 overflow-hidden rounded-full",
                "ring-1 ring-white/14",
                "shadow-[0_16px_44px_rgba(154,70,255,0.14)]",
                "cursor-pointer",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/35",
              )}
              aria-label="Change avatar"
            >
              <div
                className="pointer-events-none absolute -inset-10 opacity-80"
                style={{
                  background:
                    "radial-gradient(closest-side, rgba(154,70,255,0.26), transparent 68%)",
                }}
              />
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={`${displayName} profile picture`}
                  fill
                  sizes="56px"
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="absolute inset-0 grid place-items-center bg-[conic-gradient(from_220deg_at_50%_50%,rgba(154,70,255,0.95),rgba(88,101,242,0.80),rgba(18,18,28,0.95))] text-white">
                  <span className="text-lg font-semibold">
                    {displayName?.[0]?.toUpperCase() ?? "U"}
                  </span>
                </div>
              )}
            </button>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h2 className="truncate text-[18px] font-extrabold tracking-[-0.03em] text-neutral-0 sm:text-[20px]">
                  {displayName}
                </h2>

                <button
                  type="button"
                  onClick={() => setAvatarOpen(true)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-neutral-200 hover:bg-white/7 cursor-pointer"
                >
                  Change avatar
                </button>
              </div>

              <p className="mt-1 max-w-[56ch] text-[12px] leading-[1.25] text-neutral-300">
                Manage your profile, security, notifications, password, and
                payment methods.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-start gap-2 md:justify-end">
            <Link href="/account/my-tickets">
              <Button variant="ghost" size="sm">
                <TicketIcon className="mr-0.5 h-4 w-4" />
                My Tickets
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <SettingsTabBar tabs={tabs} active={active} onChange={setActive} />

      {/* Content container */}
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-neutral-950/45 p-4 backdrop-blur-[12px] sm:p-5">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(900px 420px at 18% 0%, rgba(154,70,255,0.11), transparent 62%)," +
              "radial-gradient(800px 420px at 92% 30%, rgba(88,101,242,0.08), transparent 62%)," +
              "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0))",
          }}
        />
        <div className="relative">{activeTab?.content}</div>
      </div>

      <AvatarDialog open={avatarOpen} onClose={() => setAvatarOpen(false)} />
    </div>
  );
}
