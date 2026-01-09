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
  icon?: ReactNode; // left icon
  endAdornment?: ReactNode; // right icon/adornment (e.g., eye)
  maxWidth?: number | string;
  iconClassName?: string;
  className?: string;
}

/* -------------------------------------------------------------------------- */
/*  Static wrapper component                                                  */
/* -------------------------------------------------------------------------- */
interface WrapperProps extends ComponentPropsWithoutRef<"div"> {
  children: ReactNode;
}
const InputWrapper = ({ children, ...rest }: WrapperProps) => (
  <div {...rest}>{children}</div>
);

/* -------------------------------------------------------------------------- */
/*  Class maps                                                                */
/* -------------------------------------------------------------------------- */
const base =
  "w-full font-[Gilroy] rounded-lg text-white font-normal text-[14px] leading-[100%] tracking-[-0.28px] " +
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

/**
 * Padding presets.
 * iconLeft = when there is a left icon (more left padding, but not huge).
 */
const paddingMap: Record<
  NonNullable<InputProps["size"]>,
  { base: string; iconLeft: string }
> = {
  sm: {
    base: "py-[8px] px-4",
    // tighter left padding when icon is present
    iconLeft: "py-[8px] pl-9 pr-3",
  },
  md: {
    base: "py-3 px-4",
    // 🔧 reduced a lot: text now sits closer to the pin icon
    iconLeft: "py-3 pl-10 pr-4",
  },
  lg: {
    base: "py-4 px-6 text-lg",
    iconLeft: "py-4 pl-12 pr-5",
  },
};

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

    const widthStyle =
      maxWidth === undefined
        ? undefined
        : typeof maxWidth === "number"
          ? { maxWidth: `${maxWidth}px` }
          : typeof maxWidth === "string" && !maxWidth.startsWith("max-w-")
            ? { maxWidth }
            : undefined;

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
          rightPad,
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
              // 🔧 bring icon closer to the left so the text doesn’t feel “pushed”
              "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center text-white",
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
