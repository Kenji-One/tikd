"use client";
import { SelectHTMLAttributes, forwardRef } from "react";
import clsx from "classnames";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
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
  )
);
Select.displayName = "Select";
