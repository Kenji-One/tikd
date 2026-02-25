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
  Camera,
} from "lucide-react";

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

function TabButton({
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
        "group relative flex w-full items-center justify-center gap-2",
        "rounded-xl px-4 py-3 text-[14px] font-semibold",
        "transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/35",
        active
          ? clsx(
              "text-white",
              "bg-[linear-gradient(135deg,rgba(124,58,237,0.20),rgba(99,102,241,0.20))]",
              "border border-white/20",
              "shadow-[0_4px_20px_rgba(124,58,237,0.20)]",
            )
          : "text-white/50 hover:text-white/80",
      )}
    >
      <span
        className={clsx(
          "inline-flex items-center justify-center",
          active ? "text-white" : "text-white/50 group-hover:text-white/80",
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
    <div
      role="tablist"
      aria-label="Settings tabs"
      className={clsx(
        "relative mb-8",
        "rounded-2xl border border-white/10 bg-white/5 p-2 backdrop-blur-[20px]",
      )}
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {tabs.map((t) => (
          <TabButton
            key={t.id}
            label={t.label}
            icon={t.icon}
            active={active === t.id}
            onClick={() => onChange(t.id)}
          />
        ))}
      </div>
    </div>
  );
}

export default function SettingsShell() {
  const [active, setActive] = useState<TabId>("profile");
  const [avatarOpen, setAvatarOpen] = useState(false);
  const { data: session } = useSession();

  const displayName = useMemo(() => {
    const n = session?.user?.name || "Test User";
    return n.length ? n : "Test User";
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
    <div>
      {/* Profile header card (matches new HTML style) */}
      <div
        className={clsx(
          "relative mb-8 overflow-hidden rounded-[24px]",
          "border border-white/10 backdrop-blur-[20px]",
          "bg-[linear-gradient(135deg,rgba(124,58,237,0.15)_0%,rgba(99,102,241,0.10)_50%,rgba(20,20,30,0.40)_100%)]",
          "shadow-[0_20px_60px_rgba(0,0,0,0.30)]",
        )}
      >
        <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex items-center gap-6">
            {/* Avatar */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setAvatarOpen(true)}
                className={clsx(
                  "group relative h-24 w-24 overflow-hidden rounded-2xl cursor-pointer",
                  "transition-transform duration-300 hover:scale-[1.05]",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/35",
                )}
                aria-label="Open avatar dialog"
              >
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={`${displayName} profile picture`}
                    fill
                    sizes="96px"
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="absolute inset-0 grid place-items-center text-white">
                    <UserRound className="h-10 w-10 opacity-90" />
                  </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 grid place-items-center rounded-2xl bg-black/60 opacity-0 backdrop-blur-[4px] transition-opacity duration-300 group-hover:opacity-100">
                  <Camera className="h-6 w-6 text-white/90" />
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAvatarOpen(true)}
                className={clsx(
                  "mt-2 block w-full rounded-lg",
                  "border border-white/15 bg-white/8 px-3 py-1.5 cursor-pointer",
                  "text-center text-[12px] font-semibold text-white/80",
                  "transition hover:bg-white/15 hover:text-white",
                )}
              >
                Change
              </button>
            </div>

            {/* Name + desc */}
            <div className="min-w-0 pb-2">
              <div className="text-2xl font-semibold tracking-[-0.01em]">
                {displayName}
              </div>
              <p className="mt-1 text-[14px] text-white/60">
                Manage your profile, security, notifications, and payment
                methods.
              </p>
            </div>
          </div>

          {/* My Tickets */}
          <div className="flex items-center justify-start sm:justify-end">
            <Link href="/account/my-tickets" className="inline-flex">
              <span
                className={clsx(
                  "inline-flex items-center gap-2",
                  "rounded-full border border-white/10 bg-white/5 px-5 py-2.5",
                  "text-[14px] text-white",
                  "transition hover:bg-white/10",
                )}
              >
                <TicketIcon className="h-4 w-4" />
                My Tickets
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <SettingsTabBar tabs={tabs} active={active} onChange={setActive} />

      {/* Content card */}
      <div
        className={clsx(
          "relative overflow-hidden rounded-[24px]",
          "border border-white/10 backdrop-blur-[20px]",
          "bg-[linear-gradient(135deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.03)_100%)]",
          "shadow-[0_20px_60px_rgba(0,0,0,0.30)]",
        )}
      >
        <div className="p-6 sm:p-10">{activeTab?.content}</div>
      </div>

      <AvatarDialog open={avatarOpen} onClose={() => setAvatarOpen(false)} />
    </div>
  );
}
