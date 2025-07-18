"use client";
import { TextareaHTMLAttributes, forwardRef } from "react";
import clsx from "classnames";

export interface TextAreaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={clsx(
        "w-full rounded-md border border-brand-300 bg-white px-3 py-2 text-sm placeholder-brand-400 focus:border-brand-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
        className
      )}
      {...props}
    />
  )
);
TextArea.displayName = "TextArea";
