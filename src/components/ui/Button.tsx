"use client";

import { forwardRef, ReactNode } from "react";
import clsx from "classnames";
import { Slot } from "@radix-ui/react-slot";
import ElectricBorder from "../ElectricBorder";

type InnerVariants =
  | "primary"
  | "secondary"
  | "ghost"
  | "destructive"
  | "brand"
  | "social"
  | "default";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "ghost"
    | "destructive"
    | "brand"
    | "social"
    | "default"
    | "electric";
  size?: "sm" | "md" | "lg" | "xs" | "icon";
  loading?: boolean;
  asChild?: boolean;
  /** optional leading icon (renders before children) */
  icon?: ReactNode;

  /** ElectricBorder options (only used when variant="electric") */
  electricColor?: string; // default: "#9a51ff"
  electricSpeed?: number; // default: 1
  electricChaos?: number; // default: 0.5
  electricThickness?: number; // default: 2
  electricRadius?: number; // default: pill (9999)
  /**
   * OPTIONAL: override inner look for electric (uses one of the existing variants).
   * If omitted, a unique dark/translucent "electric" styling is applied.
   */
  electricInner?: InnerVariants | undefined;
}

/* ─────────── style maps ─────────── */

const base =
  "inline-flex items-center justify-center gap-2 text-sm leading-[90%] font-medium tracking-[-0.28px] rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";

const variants: Record<
  Exclude<NonNullable<ButtonProps["variant"]>, "electric">,
  string
> = {
  primary: "bg-white text-black hover:bg-neutral-100",
  secondary:
    "border border-white/10 text-white bg-transparent hover:bg-white/5",
  ghost: "bg-[#ffffff12] backdrop-blur-[15px] text-white hover:bg-[#ffffffc]",
  destructive: "bg-error-600 text-white hover:bg-error-700",
  brand: "bg-primary-500 text-white hover:bg-primary-700",
  social: "bg-[#ffffff12] text-white hover:bg-white/20",
  default: "bg-button-primary text-white ",
};

const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "py-2 px-4",
  md: "py-3 px-6",
  lg: "py-4 px-8",
  xs: "py-[13px] px-4",
  icon: "p-2 w-9 h-9",
};

/** Unique inner styling for variant="electric" (dark pill + glow-ready) */
const electricDefaultInner =
  "text-neutral-0 bg-neutral-900/60 hover:bg-neutral-900/80 " +
  "backdrop-blur-md ring-1 ring-white/10 " +
  // subtle inset highlight so the neon border feels integrated
  "shadow-[inset_0_0_0_1px_rgba(154,81,255,0.25),0_0_18px_rgba(154,81,255,0.18)]";

/* ─────────── component ─────────── */

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading,
      children,
      asChild = false,
      icon,
      /* electric-only props with defaults */
      electricColor = "#9a51ff",
      electricSpeed = 1,
      electricChaos = 0.5,
      electricThickness = 2,
      electricRadius,
      electricInner, // undefined -> use electricDefaultInner
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    const Spinner = (
      <svg
        className="-ml-1 h-4 w-4 animate-spin text-current"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        />
      </svg>
    );

    // Decide inner classes
    const innerClasses =
      variant === "electric"
        ? // when electricInner is provided, reuse that variant's visuals; otherwise use our unique electric look
          electricInner
          ? variants[electricInner]
          : electricDefaultInner
        : variants[variant];

    const combined = clsx(base, innerClasses, sizes[size], className);

    const buttonEl = (
      <Comp ref={ref} className={combined} data-variant={variant} {...props}>
        <span className="inline-flex items-center gap-2">
          {loading && Spinner}
          {icon}
          {children}
        </span>
      </Comp>
    );

    if (variant !== "electric") return buttonEl;

    // Wrap with ElectricBorder when variant="electric"
    return (
      <ElectricBorder
        color={electricColor}
        speed={electricSpeed}
        chaos={electricChaos}
        thickness={electricThickness}
        style={{ borderRadius: electricRadius ?? 9999 }}
      >
        {buttonEl}
      </ElectricBorder>
    );
  }
);

Button.displayName = "Button";
