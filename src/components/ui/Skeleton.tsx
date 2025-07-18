import clsx from "classnames";
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={clsx("animate-pulse rounded-md bg-brand-100", className)} />
  );
}
