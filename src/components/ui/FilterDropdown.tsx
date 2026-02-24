"use client";

import { Fragment } from "react";
import { Menu, Transition } from "@headlessui/react";
import clsx from "clsx";

export type FilterOption =
  | string
  | {
      label: string;
      value: string;
      disabled?: boolean;
    };

type Props = {
  value: string;
  options: FilterOption[];
  onSelect: (v: string) => void;

  /** Optional footer content (e.g., places autocomplete input) */
  footer?: React.ReactNode;

  /**
   * Optional explicit width for dropdown panel
   * - if omitted we use a compact default that fits filter usage
   */
  widthClassName?: string;

  /**
   * Optional: force dropdown alignment (useful if you want center/right)
   * default = left aligned
   */
  align?: "left" | "right";
};

function normalizeOption(opt: FilterOption): {
  label: string;
  value: string;
  disabled: boolean;
} {
  if (typeof opt === "string")
    return { label: opt, value: opt, disabled: false };
  return {
    label: opt.label,
    value: opt.value,
    disabled: Boolean(opt.disabled),
  };
}

export default function FilterDropdown({
  value,
  options,
  onSelect,
  footer,
  widthClassName,
  align = "left",
}: Props) {
  return (
    <Menu
      as="div"
      className={clsx(
        "relative inline-block text-left",
        // Create a local stacking context so z-index works predictably
        "isolate z-[60]",
      )}
    >
      {/* ---------- Trigger ---------- */}
      <Menu.Button
        className={clsx(
          "flex items-center gap-2 py-1 text-sm leading-[100%] font-medium",
          "text-white/70 hover:text-white/90 transition",
          "cursor-pointer select-none",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-0",
        )}
      >
        <span className="max-w-[180px] truncate">{value}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="11"
          height="6"
          viewBox="0 0 11 6"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M9.29165 1.10413L5.49998 4.89579L1.70831 1.10413"
            stroke="white"
            strokeOpacity="0.9"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Menu.Button>

      {/* ---------- Items ---------- */}
      <Transition
        as={Fragment}
        enter="transition ease-out duration-120"
        enterFrom="opacity-0 translate-y-1 scale-[0.98]"
        enterTo="opacity-100 translate-y-0 scale-100"
        leave="transition ease-in duration-90"
        leaveFrom="opacity-100 translate-y-0 scale-100"
        leaveTo="opacity-0 translate-y-1 scale-[0.98]"
      >
        <Menu.Items
          className={clsx(
            "absolute top-full mt-2 origin-top",
            align === "right" ? "right-0" : "left-0",
            // higher than cards/hero overlays
            "z-[9999]",
            // ✅ compact default width for filter dropdowns
            widthClassName ?? "w-44",
            "rounded-xl border border-white/10 p-2",
            "shadow-[0_22px_70px_rgba(0,0,0,0.65)]",
            "bg-neutral-950/95 backdrop-blur-xl",
            "focus:outline-none",
          )}
        >
          {options.map((raw) => {
            const opt = normalizeOption(raw);

            return (
              <Menu.Item key={`${opt.value}`}>
                {({ active }) => (
                  <button
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => {
                      if (opt.disabled) return;
                      onSelect(opt.value);
                    }}
                    className={clsx(
                      "w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition",
                      "cursor-pointer",
                      opt.disabled && "cursor-not-allowed opacity-45",
                      !opt.disabled &&
                        (active
                          ? "bg-primary-900/40 text-white"
                          : "bg-transparent text-white/80 hover:text-white"),
                    )}
                    title={opt.disabled ? "Coming soon" : undefined}
                  >
                    {opt.label}
                  </button>
                )}
              </Menu.Item>
            );
          })}

          {footer ? <div className="mt-2">{footer}</div> : null}
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
