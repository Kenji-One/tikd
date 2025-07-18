import { HTMLAttributes } from "react";
import clsx from "classnames";
export function Container({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx("mx-auto max-w-6xl px-4", className)} {...props} />
  );
}
