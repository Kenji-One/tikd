"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import clsx from "classnames";

import { Button } from "@/components/ui/Button";
import useSessionStorage from "@/hooks/useSessionStorage";
import { toast } from "@/components/ui/Toast";

/** Form type matches API payload */
type ProfileForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  zip: string;
  defaultAddress: boolean;
};

const empty: ProfileForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  country: "",
  zip: "",
  defaultAddress: false,
};

const COUNTRIES: Array<{ label: string; value: string }> = [
  { label: "Choose country", value: "" },
  { label: "United States", value: "United States" },
  { label: "United Kingdom", value: "United Kingdom" },
  { label: "Canada", value: "Canada" },
  { label: "Australia", value: "Australia" },
  { label: "Germany", value: "Germany" },
  { label: "France", value: "France" },
  { label: "Japan", value: "Japan" },
];

function Label({ children }: { children: string }) {
  // HTML: 0.875rem label, weight 500, white/70
  return (
    <label className="mb-2.5 text-[14px] font-medium text-white/70">
      {children}
    </label>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete={autoComplete}
      className={clsx(
        "w-full rounded-xl border border-white/10 bg-white/[0.03] leading-[100%]",
        "px-5 py-3.5 text-[14px] text-white outline-none",
        "placeholder:text-white/30",
        "transition",
        "hover:border-white/20",
        "focus:border-[#7c3aed]/50 focus:bg-white/[0.06]",
        "focus:ring-0",
      )}
    />
  );
}

function Select({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={clsx(
        "w-full appearance-none rounded-xl border border-white/10 bg-white/[0.03] leading-[118%]",
        "px-5 py-3.5 pr-12 text-[14px] text-white outline-none",
        "transition",
        "hover:border-white/20",
        "focus:border-[#7c3aed]/50 focus:bg-white/[0.06]",
        "focus:ring-0",
      )}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='rgba(255,255,255,0.3)'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 16px center",
        backgroundSize: "20px",
      }}
    >
      {COUNTRIES.map((c) => (
        <option
          key={c.value || "empty"}
          value={c.value}
          className="bg-[#1a1a24]"
        >
          {c.label}
        </option>
      ))}
    </select>
  );
}

function DefaultAddressCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  // keep your HTML-style checkbox
  return (
    <label className="flex cursor-pointer items-center gap-3 text-[14px] text-white/70">
      <span className="relative inline-flex">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="absolute inset-0 h-5 w-5 cursor-pointer opacity-0"
          aria-label="Make this the default address"
        />
        <span
          className={clsx(
            "relative h-5 w-5 rounded-[6px] border-2 transition",
            checked
              ? "border-transparent bg-[linear-gradient(135deg,#7c3aed,#6366f1)]"
              : "border-white/20 bg-white/5",
          )}
        >
          <svg
            viewBox="0 0 24 24"
            className={clsx(
              "absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2",
              "transition-opacity",
              checked ? "opacity-100" : "opacity-0",
            )}
            fill="none"
            stroke="white"
            strokeWidth={3}
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
      </span>
      Make this the default address
    </label>
  );
}

function FieldSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-3 w-24 rounded-md bg-white/10" />
      <div className="h-12 w-full rounded-xl bg-white/6 ring-1 ring-white/8" />
    </div>
  );
}

export default function ProfileSettings() {
  const { data: session } = useSession();
  const userId = session?.user?.id || "anon";
  const storageKey = useMemo(() => `tikd:settings:profile:${userId}`, [userId]);

  const [form, setForm, _clearCache, meta] = useSessionStorage<ProfileForm>(
    storageKey,
    empty,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onChange = (k: keyof ProfileForm, v: string | boolean) =>
    setForm((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await fetch("/api/settings/profile", { cache: "no-store" });
        if (!r.ok) throw new Error("Failed to load profile");
        const data: ProfileForm = await r.json();

        if (mounted && !meta.hadCache) setForm((s) => ({ ...s, ...data }));
        setError(null);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to load profile";
        setError(msg);
        toast.error(msg);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit() {
    setSaving(true);
    setError(null);
    try {
      const r = await fetch("/api/settings/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(
          (j as { error?: string })?.error || "Failed to save profile",
        );
      }
      toast.success("Your profile was saved.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Save failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full">
      <h2 className="mb-8 text-[20px] font-semibold tracking-[-0.01em] text-white">
        Profile Settings
      </h2>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <FieldSkeleton />
            <FieldSkeleton />
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <FieldSkeleton />
            <FieldSkeleton />
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <FieldSkeleton />
            <FieldSkeleton />
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <FieldSkeleton />
            <FieldSkeleton />
          </div>
          <div className="mt-3 h-5 w-56 rounded bg-white/10" />
          <div className="mt-6 flex justify-end">
            <div className="h-12 w-36 rounded-xl bg-white/10" />
          </div>
        </div>
      ) : (
        <>
          {/* HTML spacing: gap 1.5rem between fields */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="flex flex-col">
              <Label>First Name</Label>
              <Input
                value={form.firstName}
                onChange={(v) => onChange("firstName", v)}
                placeholder="Enter first name"
                autoComplete="given-name"
              />
            </div>

            <div className="flex flex-col">
              <Label>Last Name</Label>
              <Input
                value={form.lastName}
                onChange={(v) => onChange("lastName", v)}
                placeholder="Enter last name"
                autoComplete="family-name"
              />
            </div>

            <div className="flex flex-col">
              <Label>Email Address</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(v) => onChange("email", v)}
                placeholder="Enter email"
                autoComplete="email"
              />
            </div>

            <div className="flex flex-col">
              <Label>Phone Number</Label>
              <Input
                type="tel"
                value={form.phone}
                onChange={(v) => onChange("phone", v)}
                placeholder="Enter phone"
                autoComplete="tel"
              />
            </div>

            <div className="flex flex-col">
              <Label>Address</Label>
              <Input
                value={form.address}
                onChange={(v) => onChange("address", v)}
                placeholder="Enter address"
                autoComplete="street-address"
              />
            </div>

            <div className="flex flex-col">
              <Label>City</Label>
              <Input
                value={form.city}
                onChange={(v) => onChange("city", v)}
                placeholder="Enter city"
                autoComplete="address-level2"
              />
            </div>

            <div className="flex flex-col">
              <Label>Country</Label>
              <Select
                value={form.country}
                onChange={(v) => onChange("country", v)}
              />
            </div>

            <div className="flex flex-col">
              <Label>ZIP</Label>
              <Input
                value={form.zip}
                onChange={(v) => onChange("zip", v)}
                placeholder="Enter ZIP"
                autoComplete="postal-code"
              />
            </div>
          </div>

          <div className="mt-8">
            <DefaultAddressCheckbox
              checked={form.defaultAddress}
              onChange={(v) => onChange("defaultAddress", v)}
            />
          </div>

          {error ? (
            <p className="mt-4 text-[12px] leading-snug text-error-500">
              {error}
            </p>
          ) : null}

          {/* HTML aligns button to right */}
          <div className="mt-8 flex justify-end">
            <Button
              type="button"
              variant="premium"
              size="md"
              className="rounded-xl py-4 px-6"
              onClick={onSubmit}
              disabled={saving}
              animation
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
