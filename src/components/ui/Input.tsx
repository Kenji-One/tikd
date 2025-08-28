"use client";

import {
  forwardRef,
  InputHTMLAttributes,
  ReactNode,
  ComponentPropsWithoutRef,
} from "react";
import clsx from "classnames";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
type NativeInput = Omit<InputHTMLAttributes<HTMLInputElement>, "size">;

export interface InputProps extends NativeInput {
  variant?: "transparent" | "frosted" | "full";
  shape?: "default" | "pill";
  size?: "sm" | "md" | "lg";
  icon?: ReactNode; // left icon (unchanged)
  endAdornment?: ReactNode; // 🔹 right icon/adornment (e.g., eye)
  maxWidth?: number | string;
  iconClassName?: string;
  className?: string;
  // NOTE: `className` is not passed to the input element, but to the wrapper div
  // around it. This is to allow for more flexible styling of the input.
}

/* -------------------------------------------------------------------------- */
/*  Static wrapper component (🔑 identity is now stable)                      */
/* -------------------------------------------------------------------------- */
interface WrapperProps extends ComponentPropsWithoutRef<"div"> {
  children: ReactNode;
}
const InputWrapper = ({ children, ...rest }: WrapperProps) => (
  <div {...rest}>{children}</div>
);

/* -------------------------------------------------------------------------- */
/*  Class maps (unchanged, with ARIA error styles)                            */
/* -------------------------------------------------------------------------- */
const base =
  "w-full font-[Gilroy] text-white font-normal text-[14px] leading-[100%] tracking-[-0.28px] " +
  "placeholder:text-white/40 focus:outline-none " +
  "focus-visible:ring focus-visible:ring-primary-500 " +
  "aria-[invalid=true]:border-error-500 " +
  "focus:aria-[invalid=true]:border-error-500 " +
  "focus-visible:aria-[invalid=true]:ring-error-500";

const variantMap: Record<NonNullable<InputProps["variant"]>, string> = {
  transparent: "bg-transparent border border-white/10",
  frosted: "bg-white/5 backdrop-blur-[15px] border border-transparent",
  full: "bg-neutral-900 placeholder:text-neutral-400 border border-transparent min-h-[40px]",
};

const shapeMap: Record<NonNullable<InputProps["shape"]>, string> = {
  default: "rounded-lg",
  pill: "rounded-full",
};

const paddingMap: Record<
  NonNullable<InputProps["size"]>,
  { base: string; iconLeft: string }
> = {
  sm: { base: "py-[8px] px-4", iconLeft: "py-[10px] pl-[58px] pr-3" },
  md: { base: "py-3 px-4", iconLeft: "py-3 pl-[46px] pr-4" },
  lg: { base: "py-4 px-6 text-lg", iconLeft: "py-4 pl-14 pr-5" },
};

/* extra right padding when endAdornment is present */
const rightPadMap: Record<NonNullable<InputProps["size"]>, string> = {
  sm: "pr-12",
  md: "pr-12",
  lg: "pr-14",
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
      endAdornment,
      maxWidth,
      ...props
    },
    ref
  ) => {
    const padding = icon ? paddingMap[size].iconLeft : paddingMap[size].base;
    const rightPad = endAdornment ? rightPadMap[size] : undefined;

    /* width utilities preserved exactly */
    const widthStyle =
      maxWidth === undefined
        ? undefined
        : typeof maxWidth === "number"
          ? { maxWidth: `${maxWidth}px` }
          : maxWidth.startsWith("max-w-")
            ? undefined
            : { maxWidth };

    const utilityWidthClass =
      typeof maxWidth === "string" && maxWidth.startsWith("max-w-")
        ? maxWidth
        : undefined;

    const inputElement = (
      <input
        ref={ref}
        className={clsx(
          base,
          variantMap[variant],
          shapeMap[shape],
          padding,
          rightPad, // 🔹 add space when endAdornment exists
          className
        )}
        {...props}
      />
    );

    return (
      <InputWrapper
        className={clsx("relative w-full", utilityWidthClass, className)}
        style={widthStyle}
      >
        {icon ? (
          <span
            className={clsx(
              "pointer-events-none absolute left-6 top-1/2 -translate-y-1/2 flex items-center justify-center text-white",
              iconClassName
            )}
          >
            {icon}
          </span>
        ) : null}

        {inputElement}

        {endAdornment ? (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            {endAdornment}
          </span>
        ) : null}
      </InputWrapper>
    );
  }
);

Input.displayName = "Input";
