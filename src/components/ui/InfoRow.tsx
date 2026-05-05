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
        "w-full flex flex-col gap-4 border-b border-[#FFFFFF1A] py-6 md:flex-row md:items-start md:gap-[112px] md:py-8",
        className,
      )}
    >
      <h2 className="w-full text-left text-[22px] font-medium leading-[95%] tracking-[-0.44px] text-neutral-0 md:max-w-[187px] md:text-right md:text-2xl md:tracking-[-0.48px]">
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
        <div
          className={clsx("w-full max-w-none md:max-w-[694px]", classNameCont)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

InfoRow.displayName = "InfoRow";
export default InfoRow;
