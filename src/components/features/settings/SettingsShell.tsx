"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { Tabs } from "@/components/ui/Tabs";
import ProfileSettings from "./ProfileSettings";
import SecuritySettings from "./SecuritySettings";
import ChangePassword from "./ChangePassword";
import NotificationSettings from "./NotificationSettings";
import PaymentMethods from "./PaymentMethods";
import AvatarDialog from "./AvatarDialog";

/**
 * SettingsShell
 * - Live avatar from session.user.image (NextAuth)
 * - Default gradient banner (no user banner yet)
 * - Nested tabs for Profile / Security / Password / Notifications / Payments
 */
export default function SettingsShell() {
  const [active, setActive] = useState<string>("profile");
  const [avatarOpen, setAvatarOpen] = useState(false);
  const { data: session } = useSession();

  const displayName = useMemo(() => {
    const n = session?.user?.name || "Your Profile";
    // Make it nicer in the header (capitalize if username is lowercase)
    return n.length ? n[0].toUpperCase() + n.slice(1) : "Your Profile";
  }, [session?.user?.name]);

  const avatarUrl = session?.user?.image || "";

  const tabs = [
    { id: "profile", label: "Profile", content: <ProfileSettings /> },
    { id: "security", label: "Security", content: <SecuritySettings /> },
    { id: "password", label: "Password", content: <ChangePassword /> },
    {
      id: "notifications",
      label: "Notifications",
      content: <NotificationSettings />,
    },
    { id: "payments", label: "Payment Methods", content: <PaymentMethods /> },
  ];

  return (
    <div className="space-y-4">
      {/* ---------- Header with gradient banner + avatar ---------- */}
      <div className="relative overflow-hidden rounded-2xl">
        {/* Gradient banner (tailored to our brand-ish purple on dark) */}
        <div className="relative h-36 w-full md:h-46">
          <div
            className="
              absolute inset-0
              bg-[radial-gradient(120%_120%_at_0%_0%,#6d28d9_0%,#312e81_36%,#0b0b12_80%)]
            "
          />
          {/* Soft shine + fade */}
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.06),rgba(0,0,0,0.45))]" />
          {/* <div className="absolute right-4 top-4">
            <Button
              size="sm"
              variant="ghost"
              className="backdrop-blur bg-white/5"
              onClick={() => setAvatarOpen(true)}
            >
              Change cover
            </Button>
          </div> */}
        </div>

        {/* Avatar card */}
        <div className="relative -mt-21 px-4 pb-4 md:-mt-33 md:px-6">
          <div className="mx-auto max-w-5xl rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur-md md:flex md:items-start md:gap-6">
            <div className="flex items-center gap-3 flex-col">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full ring-4 ring-black/60 md:h-24 md:w-24">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={`${displayName} profile picture`}
                    fill
                    sizes="(max-width: 768px) 96px, 112px"
                    className="object-cover"
                    priority
                  />
                ) : (
                  // Graceful fallback: gradient circle with initial
                  <div className="absolute inset-0 grid place-items-center bg-[conic-gradient(from_220deg_at_50%_50%,#6d28d9, #3b82f6, #111827)] text-white">
                    <span className="text-2xl font-semibold">
                      {displayName?.[0]?.toUpperCase() ?? "U"}
                    </span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setAvatarOpen(true)}
                className="rounded-full bg-white/85 px-2 py-0.5 text-[11px] font-medium text-black hover:bg-white"
              >
                Change
              </button>
            </div>
            <div className="mt-3 md:mt-6">
              <h2 className="text-xl font-semibold text-white md:text-2xl">
                {displayName}
              </h2>
              <p className="text-sm text-white/70">
                Manage your profile, security, notifications, and payment
                methods.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Settings tabs – now beautifully centered ---------- */}
      <div className="mt-4 flex flex-col items-center">
        <div className="w-full max-w-3xl">
          {" "}
          {/* Adjust max-w as needed: 3xl ≈ 768px, or use 2xl/4xl */}
          <Tabs tabs={tabs} activeId={active} onChange={setActive} />
        </div>
      </div>

      {/* ---------- Avatar dialog ---------- */}
      <AvatarDialog open={avatarOpen} onClose={() => setAvatarOpen(false)} />
    </div>
  );
}
