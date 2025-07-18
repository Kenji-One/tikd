"use client";

import React from "react";
import clsx from "classnames";

export interface InfoRowProps {
  /** The main heading text */
  title: string;
  /** Right-aligned content (e.g. pills, buttons, etc.) */
  children?: React.ReactNode;
  /** Additional classes on the container */
  className?: string;
  classNameCont?: string;
}

export function InfoRow({
  title,
  children,
  className,
  classNameCont,
}: InfoRowProps) {
  return (
    <div
      className={clsx(
        "w-full flex items-start justify-between gap-4 border-b border-[#FFFFFF1A] py-8",
        className
      )}
    >
      <h2 className="text-2xl font-semibold leading-[90%] tracking-[-0.48px] text-neutral-0 text-right lg:w-[187px]">
        {title}
      </h2>
      {children && (
        <div className={clsx("w-full max-w-[694px]", classNameCont)}>
          {children}
        </div>
      )}
    </div>
  );
}

InfoRow.displayName = "InfoRow";
export default InfoRow;
