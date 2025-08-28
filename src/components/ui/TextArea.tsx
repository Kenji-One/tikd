/* ------------------------------------------------------------------ */
/*  src/components/ui/TextArea.tsx                                    */
/* ------------------------------------------------------------------ */
"use client";

import {
  forwardRef,
  TextareaHTMLAttributes,
  ReactNode,
  ComponentPropsWithoutRef,
  useRef,
  useEffect,
} from "react";
import clsx from "classnames";

/* ---------- props -------------------------------------------------- */
type NativeTA = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "size">;

export interface TextAreaProps extends NativeTA {
  variant?: "transparent" | "frosted" | "full";
  shape?: "default" | "pill";
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
  maxWidth?: number | string;
  iconClassName?: string;
  className?: string;
}

interface WrapperProps extends ComponentPropsWithoutRef<"div"> {
  children: ReactNode;
}
const Wrapper = ({ children, ...rest }: WrapperProps) => (
  <div {...rest}>{children}</div>
);

/* ---------- class maps (aligned to Input) -------------------------- */
const base =
  "w-full resize-none font-[Gilroy] text-white font-normal text-[14px] leading-[100%] tracking-[-0.28px] " +
  "placeholder:text-white/40 focus:outline-none " +
  "focus-visible:ring-1.5 focus-visible:ring-primary-500 scrollbar-hide";

const variantMap: Record<NonNullable<TextAreaProps["variant"]>, string> = {
  transparent: "bg-transparent border border-white/10",
  frosted: "bg-white/5 backdrop-blur-[15px] border border-transparent",
  full: "bg-neutral-900 placeholder:text-neutral-400 border-1.5 border-transparent",
};

const shapeMap: Record<NonNullable<TextAreaProps["shape"]>, string> = {
  default: "rounded-lg",
  pill: "rounded-full",
};

const paddingMap: Record<
  NonNullable<TextAreaProps["size"]>,
  { base: string; iconLeft: string }
> = {
  sm: { base: "py-[8px] px-4", iconLeft: "py-[10px] pl-[58px] pr-3" },
  md: { base: "py-3 px-4", iconLeft: "py-3 pl-[46px] pr-4" },
  lg: { base: "py-4 px-6 text-lg", iconLeft: "py-4 pl-14 pr-5" },
};

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
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
    const padding = icon ? paddingMap[size].iconLeft : paddingMap[size].base;

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

    /* ---------- auto-grow ----------------------------------------- */
    const internalRef = useRef<HTMLTextAreaElement | null>(null);
    useEffect(() => {
      const el = internalRef.current;
      if (!el) return;
      const grow = () => {
        el.style.height = "auto";
        el.style.height = `${el.scrollHeight}px`;
      };
      grow();
      el.addEventListener("input", grow);
      return () => el.removeEventListener("input", grow);
    }, []);

    const taElement = (
      <textarea
        ref={(node) => {
          internalRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref)
            (
              ref as React.MutableRefObject<HTMLTextAreaElement | null>
            ).current = node;
        }}
        rows={3}
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

    if (icon) {
      return (
        <Wrapper
          className={clsx("relative w-full", utilityWidthClass, className)}
          style={widthStyle}
        >
          <span
            className={clsx(
              "pointer-events-none absolute left-6 top-4 flex items-center justify-center text-white",
              iconClassName
            )}
          >
            {icon}
          </span>
          {taElement}
        </Wrapper>
      );
    }

    return (
      <Wrapper
        className={clsx("relative w-full", utilityWidthClass, className)}
        style={widthStyle}
      >
        {taElement}
      </Wrapper>
    );
  }
);

TextArea.displayName = "TextArea";
