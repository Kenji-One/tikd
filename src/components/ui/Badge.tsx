import { HTMLAttributes } from "react";
import clsx from "classnames";

export type BadgeVariant = "info" | "success" | "warning" | "danger";

export function Badge({
  variant = "info",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  const colors: Record<BadgeVariant, string> = {
    info: "bg-brand-100 text-brand-700",
    success: "bg-success/20 text-success",
    warning: "bg-warning/20 text-warning",
    danger: "bg-danger/20 text-danger",
  };
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
        colors[variant],
        className
      )}
      {...props}
    />
  );
}
