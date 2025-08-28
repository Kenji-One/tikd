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

  /** Split title into two lines if it has two words */
  splitTitle?: boolean;
}

export function InfoRow({
  title,
  children,
  className,
  classNameCont,
  splitTitle = false,
}: InfoRowProps) {
  return (
    <div
      className={clsx(
        "w-full flex items-start gap-[112px] border-b border-[#FFFFFF1A] py-8",
        className
      )}
    >
      <h2 className="text-2xl font-medium leading-[90%] tracking-[-0.48px] text-neutral-0 text-right w-full max-w-[187px]">
        {title.split(" ").length === 2 && splitTitle ? (
          <>
            {title.split(" ")[0]}
            <br />
            {title.split(" ")[1]}
          </>
        ) : (
          title
        )}
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
