import clsx from "classnames";
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={clsx("animate-pulse rounded-lg bg-neutral-800/40", className)}
    />
  );
}
