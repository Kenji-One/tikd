import Image from "next/image";
import { HTMLAttributes } from "react";
import clsx from "classnames";

export function Avatar({
  src,
  alt,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { src?: string; alt?: string }) {
  return (
    <div
      className={clsx(
        "relative h-10 w-10 overflow-hidden rounded-full bg-brand-200",
        className
      )}
      {...props}
    >
      {src ? (
        <Image src={src} alt={alt || "avatar"} fill sizes="40px" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-sm font-medium text-brand-600">
          {alt?.[0] ?? "?"}
        </span>
      )}
    </div>
  );
}
