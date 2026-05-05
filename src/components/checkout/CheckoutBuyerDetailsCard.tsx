// src\components\checkout\CheckoutBuyerDetailsCard.tsx
"use client";

import clsx from "clsx";

import {
  CHECKOUT_GENDER_VALUES,
  type CheckoutGender,
  type CheckoutRequirementsSnapshot,
} from "@/types/checkout";

export type BuyerDetailsFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  facebookProfile: string;
  instagramProfile: string;
  gender: CheckoutGender | "";
  dateOfBirth: string;
  declaredAge: string;
};

export type BuyerDetailsFormErrors = Partial<
  Record<keyof BuyerDetailsFormValues, string>
>;

type Props = {
  requiredFields: CheckoutRequirementsSnapshot;
  values: BuyerDetailsFormValues;
  errors: BuyerDetailsFormErrors;
  isAuthenticated: boolean;
  isProfileLoading: boolean;
  hasAnyValidationError: boolean;
  onChange: <K extends keyof BuyerDetailsFormValues>(
    field: K,
    value: BuyerDetailsFormValues[K],
  ) => void;
};

function FieldLabel({
  label,
  required = false,
}: {
  label: string;
  required?: boolean;
}) {
  return (
    <label className="mb-2 block text-sm font-medium tracking-[-0.2px] text-neutral-100">
      {label}
      {required ? <span className="ml-1 text-error-400">*</span> : null}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-2 text-xs text-error-400">{message}</p>;
}

function InputShell({
  hasError,
  children,
}: {
  hasError?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={clsx(
        "rounded-xl border bg-neutral-950/70 transition-colors",
        hasError
          ? "border-error-500/40"
          : "border-white/10 focus-within:border-primary-500/60",
      )}
    >
      {children}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  disabled = false,
  type = "text",
  autoComplete,
  inputMode,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  type?: React.HTMLInputTypeAttribute;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <input
      type={type}
      value={value}
      disabled={disabled}
      autoComplete={autoComplete}
      inputMode={inputMode}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={clsx(
        "h-11 w-full rounded-xl bg-transparent px-3 text-sm text-neutral-0 outline-none",
        "placeholder:text-neutral-500",
        disabled && "cursor-not-allowed opacity-70",
      )}
    />
  );
}

function SelectInput({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={clsx(
        "h-11 w-full rounded-xl bg-transparent px-3 text-sm text-neutral-0 outline-none",
        disabled && "cursor-not-allowed opacity-70",
      )}
    >
      <option value="" className="bg-neutral-950 text-neutral-400">
        Select gender
      </option>
      {CHECKOUT_GENDER_VALUES.map((value) => (
        <option
          key={value}
          value={value}
          className="bg-neutral-950 text-neutral-0"
        >
          {value.replaceAll("_", " ")}
        </option>
      ))}
    </select>
  );
}

export default function CheckoutBuyerDetailsCard({
  requiredFields,
  values,
  errors,
  isAuthenticated,
  isProfileLoading,
  hasAnyValidationError,
  onChange,
}: Props) {
  const shouldShowCard =
    requiredFields.requireFullName ||
    requiredFields.requireEmail ||
    requiredFields.requirePhone ||
    requiredFields.requireFacebook ||
    requiredFields.requireInstagram ||
    requiredFields.requireGender ||
    requiredFields.requireDob ||
    requiredFields.requireAge;

  if (!shouldShowCard) {
    return (
      <section className="rounded-2xl border border-white/12 bg-neutral-900/70 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.36px] text-neutral-0">
              Buyer Details
            </h2>
            <p className="mt-2 text-sm leading-6 text-neutral-400">
              No additional checkout information is required for the currently
              selected ticket types.
            </p>
          </div>

          {isProfileLoading ? (
            <span className="text-xs text-neutral-500">Loading profile…</span>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-white/12 bg-neutral-900/70 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-[-0.36px] text-neutral-0">
            Buyer Details
          </h2>
          <p className="mt-2 text-sm leading-6 text-neutral-400">
            These fields are required by the selected ticket type
            {requiredFields.requireFullName ||
            requiredFields.requireEmail ||
            requiredFields.requirePhone ||
            requiredFields.requireFacebook ||
            requiredFields.requireInstagram ||
            requiredFields.requireGender ||
            requiredFields.requireDob ||
            requiredFields.requireAge
              ? "s"
              : ""}
            . Prefill is loaded from the signed-in account where available.
          </p>
        </div>

        {isProfileLoading ? (
          <span className="shrink-0 text-xs text-neutral-500">
            Loading profile…
          </span>
        ) : null}
      </div>

      {hasAnyValidationError ? (
        <div className="mt-4 rounded-xl border border-error-500/20 bg-error-500/10 px-4 py-3 text-sm text-error-200">
          Complete the required buyer details to continue.
        </div>
      ) : null}

      {!isAuthenticated ? (
        <div className="mt-4 rounded-xl border border-warning-500/20 bg-warning-500/10 px-4 py-3 text-sm text-warning-200">
          Sign in is required before checkout details can be loaded and payment
          can continue.
        </div>
      ) : null}

      <div className="mt-5 space-y-5">
        {requiredFields.requireFullName ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel label="First name" required />
              <InputShell hasError={Boolean(errors.firstName)}>
                <TextInput
                  value={values.firstName}
                  onChange={(value) => onChange("firstName", value)}
                  placeholder="First name"
                  autoComplete="given-name"
                />
              </InputShell>
              <FieldError message={errors.firstName} />
            </div>

            <div>
              <FieldLabel label="Last name" required />
              <InputShell hasError={Boolean(errors.lastName)}>
                <TextInput
                  value={values.lastName}
                  onChange={(value) => onChange("lastName", value)}
                  placeholder="Last name"
                  autoComplete="family-name"
                />
              </InputShell>
              <FieldError message={errors.lastName} />
            </div>
          </div>
        ) : null}

        {requiredFields.requireEmail ? (
          <div>
            <FieldLabel label="Email" required />
            <InputShell hasError={Boolean(errors.email)}>
              <TextInput
                value={values.email}
                onChange={(value) => onChange("email", value)}
                placeholder="Email"
                autoComplete="email"
                type="email"
                disabled={isAuthenticated}
                inputMode="email"
              />
            </InputShell>
            <FieldError message={errors.email} />
            {isAuthenticated ? (
              <p className="mt-2 text-xs text-neutral-500">
                Your account email is used for this checkout flow.
              </p>
            ) : null}
          </div>
        ) : null}

        {requiredFields.requirePhone ? (
          <div>
            <FieldLabel label="Phone number" required />
            <InputShell hasError={Boolean(errors.phone)}>
              <TextInput
                value={values.phone}
                onChange={(value) => onChange("phone", value)}
                placeholder="+995 555 12 34 56"
                autoComplete="tel"
                inputMode="tel"
              />
            </InputShell>
            <FieldError message={errors.phone} />
          </div>
        ) : null}

        {requiredFields.requireFacebook ? (
          <div>
            <FieldLabel label="Facebook profile" required />
            <InputShell hasError={Boolean(errors.facebookProfile)}>
              <TextInput
                value={values.facebookProfile}
                onChange={(value) => onChange("facebookProfile", value)}
                placeholder="facebook.com/yourprofile"
                autoComplete="off"
              />
            </InputShell>
            <FieldError message={errors.facebookProfile} />
          </div>
        ) : null}

        {requiredFields.requireInstagram ? (
          <div>
            <FieldLabel label="Instagram profile" required />
            <InputShell hasError={Boolean(errors.instagramProfile)}>
              <TextInput
                value={values.instagramProfile}
                onChange={(value) => onChange("instagramProfile", value)}
                placeholder="@yourhandle"
                autoComplete="off"
              />
            </InputShell>
            <FieldError message={errors.instagramProfile} />
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          {requiredFields.requireGender ? (
            <div>
              <FieldLabel label="Gender" required />
              <InputShell hasError={Boolean(errors.gender)}>
                <SelectInput
                  value={values.gender}
                  onChange={(value) =>
                    onChange(
                      "gender",
                      value as BuyerDetailsFormValues["gender"],
                    )
                  }
                />
              </InputShell>
              <FieldError message={errors.gender} />
            </div>
          ) : null}

          {requiredFields.requireDob ? (
            <div>
              <FieldLabel label="Date of birth" required />
              <InputShell hasError={Boolean(errors.dateOfBirth)}>
                <TextInput
                  value={values.dateOfBirth}
                  onChange={(value) => onChange("dateOfBirth", value)}
                  type="date"
                  autoComplete="bday"
                />
              </InputShell>
              <FieldError message={errors.dateOfBirth} />
            </div>
          ) : null}

          {requiredFields.requireAge ? (
            <div>
              <FieldLabel label="Age" required />
              <InputShell hasError={Boolean(errors.declaredAge)}>
                <TextInput
                  value={values.declaredAge}
                  onChange={(value) => onChange("declaredAge", value)}
                  placeholder="18"
                  type="number"
                  inputMode="numeric"
                />
              </InputShell>
              <FieldError message={errors.declaredAge} />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
