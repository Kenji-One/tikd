import React, { ReactNode } from "react";
import { Input, InputProps } from "@/components/ui/Input";

export interface LabelledInputProps extends Omit<InputProps, "className"> {
  label?: string;
  noLabel?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "transparent" | "frosted" | "full";
  className?: string;
  /** Optional helper text shown when there is no error */
  hint?: string;
  /** Error text shown under the input and styles the input as invalid */
  error?: string | null;
  /** Element rendered on the right inside the input (e.g., show/hide eye) */
  endAdornment?: ReactNode;
}

export default function LabelledInput({
  label,
  noLabel,
  size = "sm",
  variant = "full",
  className,
  hint,
  error,
  id,
  endAdornment,
  ...inputProps
}: LabelledInputProps) {
  return (
    <div className="space-y-1">
      {!noLabel && label && (
        <label
          htmlFor={id}
          className="block leading-[90%] font-normal text-white mb-2"
        >
          {label}
        </label>
      )}

      <Input
        id={id}
        {...inputProps}
        size={size}
        variant={variant}
        className={className}
        aria-invalid={error ? true : undefined}
        aria-describedby={id ? `${id}-desc` : undefined}
        endAdornment={endAdornment}
      />

      {error ? (
        <p
          id={id ? `${id}-desc` : undefined}
          className="text-xs leading-snug text-error-500"
        >
          {error}
        </p>
      ) : hint ? (
        <p
          id={id ? `${id}-desc` : undefined}
          className="text-xs leading-snug text-neutral-400"
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}
