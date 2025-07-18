"use client";
import { ReactNode, useState } from "react";
import clsx from "classnames";

interface Tab {
  id: string;
  label: string;
  content: ReactNode;
}

export function Tabs({ tabs, defaultId }: { tabs: Tab[]; defaultId?: string }) {
  const [activeId, setActiveId] = useState<string>(defaultId || tabs[0].id);
  return (
    <div>
      <div className="flex border-b border-brand-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={clsx(
              "px-4 py-2 text-sm font-medium",
              activeId === t.id
                ? "border-b-2 border-brand-500 text-brand-600"
                : "text-brand-500 hover:text-brand-600"
            )}
            onClick={() => setActiveId(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="pt-4">{tabs.find((t) => t.id === activeId)?.content}</div>
    </div>
  );
}
