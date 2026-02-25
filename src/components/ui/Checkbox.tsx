"use client";

import * as React from "react";
import clsx from "clsx";

type Size = "sm" | "md" | "lg";
type Variant = "default" | "settings";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "type"> {
  size?: Size;
  variant?: Variant;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: React.ReactNode;
  error?: string;
  className?: string;
}

const SIZE_MAP: Record<Size, string> = {
  sm: "h-5 w-5",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

const RADIUS_MAP: Record<Size, string> = {
  sm: "rounded-[6px]",
  md: "rounded-[7px]",
  lg: "rounded-[8px]",
};

const AFTER_INSET: Record<Size, string> = {
  sm: "after:inset-[2px] after:rounded-[6px]",
  md: "after:inset-[3px] after:rounded-[7px]",
  lg: "after:inset-[4px] after:rounded-[8px]",
};

export default function Checkbox({
  id,
  name,
  value,
  size = "md",
  variant = "default",
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  className,
  label,
  error,
  ...rest
}: CheckboxProps) {
  const reactId = React.useId();
  const inputId = id ?? reactId;

  const controlled = typeof checked === "boolean";
  const [internal, setInternal] = React.useState(!!defaultChecked);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.checked;
    if (!controlled) setInternal(next);
    onCheckedChange?.(next);
  }

  const isChecked = controlled ? !!checked : internal;

  const boxDefault = clsx(
    "relative grid place-items-center overflow-hidden transition-all",
    SIZE_MAP[size],
    RADIUS_MAP[size],
    "border border-neutral-600 bg-neutral-900",
    "peer-checked:border-[1.5px] peer-checked:border-primary-700 peer-checked:bg-[#181828]",
    "outline-none ring-0 peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500/55",
    "after:content-[''] after:absolute after:pointer-events-none after:transition-all after:opacity-0 after:z-[1]",
    "after:left-1/2 after:top-1/2 after:-translate-x-1/2 after:-translate-y-1/2",
    "after:h-[17px] after:w-[18px] after:bg-primary-500",
    AFTER_INSET[size],
    "peer-checked:after:opacity-100",
    "peer-checked:[&>svg]:opacity-100 peer-checked:[&>svg]:scale-100",
  );

  // HTML “settings” checkbox look:
  // - 20px box (sm)
  // - border 2px rgba white/20
  // - checked: purple->indigo gradient, border transparent
  // - white checkmark
  const boxSettings = clsx(
    "relative grid place-items-center transition-all",
    SIZE_MAP[size],
    "rounded-[8px]",
    "border-2 bg-white/5",
    isChecked
      ? "border-transparent bg-[linear-gradient(135deg,#7c3aed,#6366f1)]"
      : "border-white/20 bg-white/5",
    "outline-none ring-0 peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500/40",
    "hover:border-white/30",
    "peer-checked:hover:border-transparent",
  );

  return (
    <div
      className={clsx("inline-flex flex-col gap-1.5", disabled && "opacity-60")}
    >
      <label
        htmlFor={inputId}
        className={clsx(
          "group inline-flex select-none items-center gap-3",
          disabled ? "cursor-not-allowed" : "cursor-pointer",
        )}
      >
        <input
          id={inputId}
          name={name}
          value={value}
          type="checkbox"
          className="sr-only peer"
          disabled={disabled}
          checked={controlled ? checked : undefined}
          defaultChecked={controlled ? undefined : internal}
          onChange={handleChange}
          {...rest}
        />

        <span
          aria-hidden
          className={clsx(
            variant === "settings" ? boxSettings : boxDefault,
            className,
          )}
        >
          {/* Checkmark */}
          {variant === "settings" ? (
            <svg
              viewBox="0 0 24 24"
              className={clsx(
                "transition-opacity",
                isChecked ? "opacity-100" : "opacity-0",
                size === "sm" && "h-3.5 w-3.5",
                size === "md" && "h-4 w-4",
                size === "lg" && "h-5 w-5",
              )}
              fill="none"
              stroke="white"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg
              className={clsx(
                "relative z-[2] transition-[opacity,transform] duration-150 opacity-0 scale-75",
                size === "sm" && "h-3.5 w-3.5",
                size === "md" && "h-4 w-4",
                size === "lg" && "h-3.5 w-3.5",
              )}
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
            >
              <path
                d="M5.25009 9.43247L2.81759 6.99997L1.98926 7.82247L5.25009 11.0833L12.2501 4.0833L11.4276 3.2608L5.25009 9.43247Z"
                fill="#08080F"
              />
            </svg>
          )}
        </span>

        {label && (
          <span className="text-sm leading-5 text-white/90 group-hover:text-white">
            {label}
          </span>
        )}
      </label>

      {error && (
        <span role="alert" className="text-xs text-rose-400">
          {error}
        </span>
      )}
    </div>
  );
}
