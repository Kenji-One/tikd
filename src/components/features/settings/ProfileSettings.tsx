"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

import { Button } from "@/components/ui/Button";
import LabelledInput from "@/components/ui/LabelledInput";
import Checkbox from "@/components/ui/Checkbox";
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

function FieldSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-3 w-24 rounded-md bg-white/10" />
      <div className="h-10 w-full rounded-lg bg-white/6 ring-1 ring-white/8" />
    </div>
  );
}

export default function ProfileSettings() {
  const { data: session } = useSession();
  const userId = session?.user?.id || "anon";
  const storageKey = useMemo(() => `tikd:settings:profile:${userId}`, [userId]);

  const [form, setForm, clearCache, meta] = useSessionStorage<ProfileForm>(
    storageKey,
    empty,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
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
        throw new Error(j?.error || "Failed to save profile");
      }
      setSavedAt(Date.now());
      toast.success("Your profile was saved.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Save failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  function resetLocal() {
    clearCache();
    setForm(empty);
    setSavedAt(null);
    toast.info("Local form cache cleared for this tab.");
  }

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-[16px] font-extrabold tracking-[-0.02em] text-neutral-0">
            Profile Settings
          </h3>
          <p className="mt-1 text-[12px] text-neutral-400">
            Keep your account details up to date for smoother checkout and
            receipts.
          </p>
        </div>

        {savedAt ? (
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-neutral-200">
            Saved {new Date(savedAt).toLocaleTimeString()}
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FieldSkeleton />
            <FieldSkeleton />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FieldSkeleton />
            <FieldSkeleton />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FieldSkeleton />
            <FieldSkeleton />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FieldSkeleton />
            <FieldSkeleton />
          </div>

          <div className="mt-2 flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-white/10" />
            <div className="h-3 w-44 rounded bg-white/10" />
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <div className="h-10 w-24 rounded-full bg-white/8" />
            <div className="h-10 w-28 rounded-full bg-white/10" />
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <LabelledInput
              id="profile-first-name"
              label="First Name"
              value={form.firstName}
              onChange={(e) => onChange("firstName", e.target.value)}
              placeholder="Enter first name"
              autoComplete="given-name"
              variant="full"
              size="sm"
            />
            <LabelledInput
              id="profile-last-name"
              label="Last Name"
              value={form.lastName}
              onChange={(e) => onChange("lastName", e.target.value)}
              placeholder="Enter last name"
              autoComplete="family-name"
              variant="full"
              size="sm"
            />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <LabelledInput
              id="profile-email"
              label="Email Address"
              type="email"
              value={form.email}
              onChange={(e) => onChange("email", e.target.value)}
              placeholder="Enter email"
              autoComplete="email"
              variant="full"
              size="sm"
            />
            <LabelledInput
              id="profile-phone"
              label="Phone Number"
              type="tel"
              value={form.phone}
              onChange={(e) => onChange("phone", e.target.value)}
              placeholder="Enter phone"
              autoComplete="tel"
              variant="full"
              size="sm"
            />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <LabelledInput
              id="profile-address"
              label="Address"
              value={form.address}
              onChange={(e) => onChange("address", e.target.value)}
              placeholder="Enter address"
              autoComplete="street-address"
              variant="full"
              size="sm"
            />
            <LabelledInput
              id="profile-city"
              label="City"
              value={form.city}
              onChange={(e) => onChange("city", e.target.value)}
              placeholder="Enter city"
              autoComplete="address-level2"
              variant="full"
              size="sm"
            />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <LabelledInput
              id="profile-country"
              label="Country"
              value={form.country}
              onChange={(e) => onChange("country", e.target.value)}
              placeholder="Choose country"
              autoComplete="country-name"
              variant="full"
              size="sm"
            />
            <LabelledInput
              id="profile-zip"
              label="ZIP"
              value={form.zip}
              onChange={(e) => onChange("zip", e.target.value)}
              placeholder="Enter ZIP"
              autoComplete="postal-code"
              variant="full"
              size="sm"
            />
          </div>

          <div className="mt-4">
            <Checkbox
              id="profile-default-address"
              checked={form.defaultAddress}
              onCheckedChange={(next) => onChange("defaultAddress", next)}
              label="Make this the default address"
              size="sm"
            />
          </div>

          {error ? (
            <p className="mt-3 text-xs leading-snug text-error-500">{error}</p>
          ) : null}

          <div className="mt-5 flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={resetLocal} disabled={saving}>
              Reset
            </Button>

            <Button onClick={onSubmit} disabled={saving} animation>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
