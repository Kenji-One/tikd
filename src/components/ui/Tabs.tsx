"use client";

import Link from "next/link";
import { ReactNode, useId, KeyboardEvent } from "react";
import { Button } from "@/components/ui/Button";
import { CalendarPlus } from "lucide-react";
import clsx from "classnames";

export interface Tab {
  id: string;
  label: string;
  content: ReactNode;
  /** optional small integer badge (e.g., counts) */
  badge?: number;
}

export interface TabsProps {
  tabs: Tab[];
  activeId: string;
  onChange: (newId: string) => void;
  className?: string;
  /** Optional right side slot (e.g., Sort control). When provided, it overrides the default per-tab action button. */
  rightSlot?: ReactNode;
}

/** Brand-aligned tabs: pill bar, scrollable on mobile, a11y roles. */
export function Tabs({
  tabs,
  activeId,
  onChange,
  className,
  rightSlot,
}: TabsProps) {
  const uid = useId();

  function handleKey(e: KeyboardEvent<HTMLButtonElement>, idx: number) {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const dir = e.key === "ArrowRight" ? 1 : -1;
      const next = (idx + dir + tabs.length) % tabs.length;
      onChange(tabs[next].id);
    }
  }

  const activeTab = tabs.find((t) => t.id === activeId);

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="no-scrollbar relative -mx-1 overflow-x-auto pb-1">
          <div
            role="tablist"
            aria-label="Dashboard tabs"
            className="mx-1 inline-flex gap-2 rounded-full border border-white/10 bg-neutral-950/70 p-1"
          >
            {tabs.map((t, i) => {
              const isActive = activeId === t.id;
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`${uid}-${t.id}-panel`}
                  id={`${uid}-${t.id}-tab`}
                  onClick={() => onChange(t.id)}
                  onKeyDown={(e) => handleKey(e, i)}
                  className={clsx(
                    "relative flex items-center gap-2 rounded-full px-4 py-2 text-sm outline-none transition-colors",
                    isActive
                      ? "bg-primary-700/30 text-neutral-0 ring-1 ring-primary-600/40"
                      : "text-neutral-300 hover:text-neutral-0 hover:bg-neutral-900/80"
                  )}
                >
                  <span>{t.label}</span>
                  {typeof t.badge === "number" && (
                    <span
                      className={clsx(
                        "grid min-w-5 place-items-center rounded-full px-1.5 text-[11px]",
                        isActive ? "bg-primary-600/60" : "bg-white/10"
                      )}
                    >
                      {t.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right-side area:
            - If rightSlot is provided, render it (e.g., Sort by)
            - Otherwise show Create Event button when on events/upcoming */}
        <div className="shrink-0">
          {rightSlot ? (
            rightSlot
          ) : activeId === "events" || activeId === "upcoming" ? (
            <Link href="/dashboard/event/new">
              <Button variant="electric">
                <CalendarPlus className="mr-2 h-4 w-4" />
                Create Event
              </Button>
            </Link>
          ) : null}
        </div>
      </div>

      <div
        id={`${uid}-${activeTab?.id}-panel`}
        role="tabpanel"
        aria-labelledby={`${uid}-${activeTab?.id}-tab`}
        className="pt-4"
      >
        {activeTab?.content}
      </div>
    </div>
  );
}
