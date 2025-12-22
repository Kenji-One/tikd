"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import LabelledInput from "@/components/ui/LabelledInput";
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

export default function ProfileSettings() {
  const { data: session } = useSession();
  const userId = session?.user?.id || "anon";
  const storageKey = useMemo(() => `tikd:settings:profile:${userId}`, [userId]);

  const [form, setForm, clearCache, meta] = useSessionStorage<ProfileForm>(
    storageKey,
    empty
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onChange = (k: keyof ProfileForm, v: string | boolean) =>
    setForm((s) => ({ ...s, [k]: v }));

  // Hydrate from API unless we already had sessionStorage cache
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await fetch("/api/settings/profile", { cache: "no-store" });
        if (!r.ok) throw new Error("Failed to load profile");
        const data: ProfileForm = await r.json();

        if (mounted && !meta.hadCache) {
          setForm((s) => ({ ...s, ...data }));
        }
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
    <div className="grid gap-6 w-full">
      <div className="space-y-3 rounded-xl border border-white/10 bg-surface p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Profile Settings</h3>
          {savedAt && (
            <span className="text-xs text-white/50">
              Saved {new Date(savedAt).toLocaleTimeString()}
            </span>
          )}
        </div>

        {loading ? (
          <p className="text-sm text-white/60">Loading…</p>
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

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

            <label
              htmlFor="profile-default-address"
              className="flex items-center gap-2 text-sm"
            >
              <input
                id="profile-default-address"
                type="checkbox"
                checked={form.defaultAddress}
                onChange={(e) => onChange("defaultAddress", e.target.checked)}
                className="h-4 w-4 accent-brand-500"
              />
              Make this the default address
            </label>

            {error && (
              <p className="text-xs leading-snug text-error-500">{error}</p>
            )}

            <div className="flex items-center gap-2 pt-2">
              <Button onClick={onSubmit} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Button variant="ghost" onClick={resetLocal} disabled={saving}>
                Reset
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
