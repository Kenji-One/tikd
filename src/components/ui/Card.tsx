import { HTMLAttributes } from "react";
import clsx from "classnames";
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "rounded-lg border border-brand-200 bg-white p-4 shadow-sm",
        className
      )}
      {...props}
    />
  );
}
