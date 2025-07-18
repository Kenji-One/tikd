"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";
import clsx from "classnames";

/* -------------------------------------------------------------------------- */
/*  Props                                                                     */
/* -------------------------------------------------------------------------- */

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={clsx(
          "w-full rounded-md border border-brand-300 bg-white px-3 py-2 text-sm text-brand-900 focus:border-brand-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
          className
        )}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = "Select";
