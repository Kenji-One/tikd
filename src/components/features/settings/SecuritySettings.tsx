"use client";

import clsx from "classnames";
import { Button } from "@/components/ui/Button";

type Item = {
  title: string;
  desc: string;
  cta: string;
  onClick?: () => void;
};

function Row({ item }: { item: Item }) {
  return (
    <div
      className={clsx(
        "flex items-center justify-between gap-4",
        "rounded-xl border border-white/10 bg-white/[0.02] p-6",
        "transition hover:bg-white/[0.04] hover:border-white/15",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold text-white">{item.title}</div>
        <div className="mt-1 text-[13px] text-white/50">{item.desc}</div>
      </div>

      <Button
        size="sm"
        variant="secondary"
        onClick={item.onClick}
        className="rounded-lg"
      >
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
      <h2 className="mb-8 text-[20px] font-semibold tracking-[-0.01em] text-white">
        Security Settings
      </h2>

      <div className="space-y-4">
        {items.map((item) => (
          <Row key={item.title} item={item} />
        ))}
      </div>
    </div>
  );
}
