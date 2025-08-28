import { HTMLAttributes } from "react";
import clsx from "classnames";
export function PageWrapper({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("py-8 sm:py-13", className)} {...props} />;
}
