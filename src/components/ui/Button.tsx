"use client";

import { forwardRef } from "react";
import clsx from "classnames";
import { Slot } from "@radix-ui/react-slot";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * • `primary`    → solid white (✱ Sign up)
   * • `secondary`  → transparent + subtle white border (✱ Log in / Load More)
   * • `ghost`      → solid dark bg (✱ View all)
   * • `destructive`→ solid red (kept for future)
   */
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  /**
   * sm ≈ 32 h md ≈ 44 h lg ≈ 52 h
   * All pills share the same 999 px radius.
   */
  size?: "sm" | "md" | "lg" | "xs";
  loading?: boolean;
  asChild?: boolean;
}

/* ────────────────────────────────── */
/*  Style maps                                                             */
/* ────────────────────────────────── */

const base =
  "inline-flex items-center justify-center gap-2 text-sm leading-[100%] font-medium tracking-[-0.28px] rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:pointer-events-none disabled:opacity-50 cursor-pointer";

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-white text-black hover:bg-neutral-100",
  secondary:
    "border border-white/10 text-white bg-transparent hover:bg-white/5",
  ghost: "bg-[#ffffff12] backdrop-blur-[15px] text-white hover:bg-[#ffffffc]",
  destructive: "bg-red-600 text-white hover:bg-red-700",
};

const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "py-2 px-4 text-sm",
  md: "py-3 px-6 text-base",
  lg: "py-4 px-8 text-lg",
  xs: "py-[13px] px-4",
};

/* ────────────────────────────────── */
/*  Component                                                              */
/* ────────────────────────────────── */

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading,
      children,
      asChild = false,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    /* A tiny unobtrusive spinner */
    const Spinner = (
      <svg
        className="-ml-1 h-4 w-4 animate-spin text-current"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
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

    const combined = clsx(base, variants[variant], sizes[size], className);

    return (
      <Comp ref={ref} className={combined} {...props}>
        <span className="inline-flex items-center gap-2">
          {loading && Spinner}
          {children}
        </span>
      </Comp>
    );
  }
);

Button.displayName = "Button";
