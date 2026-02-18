// src/components/features/settings/SecuritySettings.tsx
"use client";

import { Button } from "@/components/ui/Button";

type Item = {
  title: string;
  desc: string;
  cta: string;
  onClick?: () => void;
};

function Row({ item }: { item: Item }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold tracking-[-0.01em] text-neutral-0">
          {item.title}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-neutral-400">
          {item.desc}
        </p>
      </div>

      <Button size="sm" variant="secondary" onClick={item.onClick}>
        {item.cta}
      </Button>
    </div>
  );
}

export default function SecuritySettings() {
  const items: Item[] = [
    {
      title: "2-Factor Auth App",
      desc: "Google Authenticator or similar",
      cta: "Setup",
    },
    {
      title: "Notifications Email",
      desc: "Used to send alerts",
      cta: "Setup",
    },
    {
      title: "SMS Recovery",
      desc: "Phone number for account recovery",
      cta: "Setup",
    },
  ];

  return (
    <div className="w-full">
      <h3 className="text-[16px] font-extrabold tracking-[-0.02em] text-neutral-0">
        Security Settings
      </h3>

      <div className="mt-6 space-y-3">
        {items.map((item) => (
          <Row key={item.title} item={item} />
        ))}
      </div>
    </div>
  );
}
