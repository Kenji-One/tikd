"use client";

import { forwardRef, InputHTMLAttributes, ReactNode } from "react";
import clsx from "classnames";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

type NativeInput = Omit<InputHTMLAttributes<HTMLInputElement>, "size">;

export interface InputProps extends NativeInput {
  /**
   * visual treatment
   * • `transparent` – no bg, 1 px subtle border (form fields)
   * • `frosted`     – bg-white/7 % + 15 px blur (header search)
   */
  variant?: "transparent" | "frosted";
  /** corner-radius */
  shape?: "default" | "pill";
  /** padding / height presets */
  size?: "sm" | "md" | "lg";
  /** optional leading icon */
  icon?: ReactNode;
  /**
   * Limit the component’s max-width (px / rem / % / Tailwind arbitrary value).
   * e.g. `maxWidth={480}` → 480 px, `maxWidth="32rem"` or `maxWidth="max-w-md"`
   */
  maxWidth?: number | string;
  iconClassName?: string;
}

/* -------------------------------------------------------------------------- */
/*  Class maps                                                                */
/* -------------------------------------------------------------------------- */

const base = [
  "relative",
  "z-8",
  "w-full",
  "text-white",
  'font-["Gilroy"]', // ensure Gilroy even if ancestor changes font
  "font-medium",
  "text-[14px]",
  "leading-none",
  "tracking-[-0.28px]",

  /* placeholder variants */
  "placeholder:font-medium",
  "placeholder:text-[14px]",
  "peer-placeholder",
  "placeholder:leading-none",
  "placeholder:tracking-[-0.28px]",
  "placeholder:[color:rgba(255,255,255,0.4)]",

  /* focus ring */
  "focus:outline-none",
  "focus-visible:ring-1",
  "focus-visible:ring-white/40",
].join(" ");

const variantMap: Record<NonNullable<InputProps["variant"]>, string> = {
  transparent: "bg-transparent border border-white/10",
  frosted: "bg-[#FFFFFF12] backdrop-blur-[15px] border border-transparent",
};

const shapeMap: Record<NonNullable<InputProps["shape"]>, string> = {
  default: "rounded-lg",
  pill: "rounded-full",
};

const paddingMap: Record<
  NonNullable<InputProps["size"]>,
  { base: string; iconLeft: string }
> = {
  sm: { base: "py-[10px] px-4", iconLeft: "py-[10px] pl-[58px] pr-3" },
  md: {
    base: "py-[10px] px-2 text-base",
    iconLeft: "py-3 pl-[46px] pr-4",
  },
  lg: { base: "py-4 px-6 text-lg", iconLeft: "py-4 pl-14 pr-5" },
};

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      iconClassName,
      variant = "transparent",
      shape = "default",
      size = "md",
      icon,
      maxWidth,
      ...props
    },
    ref
  ) => {
    /* choose padding string based on whether we render an icon */
    const padding = icon ? paddingMap[size].iconLeft : paddingMap[size].base;

    /* optional max-width */
    const widthStyle =
      maxWidth === undefined
        ? undefined
        : typeof maxWidth === "number"
          ? { maxWidth: `${maxWidth}px` }
          : maxWidth.startsWith("max-w-") // Tailwind utility
            ? undefined
            : { maxWidth };

    const inputElement = (
      <input
        ref={ref}
        className={clsx(
          base,
          variantMap[variant],
          shapeMap[shape],
          padding,
          className
        )}
        {...props}
      />
    );

    /* Tailwind max-w-* utility? attach to outer div for both cases */
    const utilityWidthClass =
      typeof maxWidth === "string" && maxWidth.startsWith("max-w-")
        ? maxWidth
        : undefined;

    /* render with/without icon but always honour width limits */
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <div
        className={clsx("relative w-full", utilityWidthClass)}
        style={widthStyle}
      >
        {children}
      </div>
    );

    if (icon) {
      return (
        <Wrapper>
          <span
            className={clsx(
              "z-10 pointer-events-none absolute left-6 top-1/2 -translate-y-1/2 flex items-center justify-center text-white",
              iconClassName
            )}
          >
            {icon}
          </span>
          {inputElement}
        </Wrapper>
      );
    }

    return <Wrapper>{inputElement}</Wrapper>;
  }
);

Input.displayName = "Input";
