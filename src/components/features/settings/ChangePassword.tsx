// src/components/features/settings/ChangePassword.tsx
"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/Button";
import LabelledInput from "@/components/ui/LabelledInput";
import { validatePassword } from "@/lib/password";

export default function ChangePassword() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [unlockCurrent, setUnlockCurrent] = useState(false); // block autofill until focus

  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const mismatch =
    next && confirm && next !== confirm ? "Passwords do not match" : null;

  const strength = useMemo(() => {
    if (!next) return null;
    const res = validatePassword(next);
    return res.ok ? null : res.reason;
  }, [next]);

  async function onSave() {
    setSaving(true);
    setError(null);
    setOkMsg(null);
    try {
      const r = await fetch("/api/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current, next }),
      });

      const j = await r.json().catch(() => ({}) as any);
      if (!r.ok) {
        setError(j?.error || "Failed to update password.");
        return;
      }

      setOkMsg("Password updated successfully.");
      setCurrent("");
      setNext("");
      setConfirm("");
      setUnlockCurrent(false);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const canSubmit =
    !!current && !!next && !!confirm && !mismatch && !strength && !saving;

  return (
    <form
      autoComplete="off"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) onSave();
      }}
      className="grid gap-6 md:grid-cols-2"
    >
      <div className="space-y-4 rounded-xl border border-white/10 bg-surface p-4">
        <h3 className="text-lg font-semibold">Change Password</h3>

        {/* Global messages */}
        {error && (
          <div
            role="alert"
            className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
          >
            {error}
          </div>
        )}
        {okMsg && (
          <div
            role="status"
            className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300"
          >
            {okMsg}
          </div>
        )}

        <LabelledInput
          id="password-current"
          label="Current Password"
          type="password"
          name="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          placeholder="Enter current password"
          autoComplete="off" // don't invite autofill here
          readOnly={!unlockCurrent} // anti-autofill guard
          onFocus={() => setUnlockCurrent(true)}
          variant="full"
          size="sm"
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <LabelledInput
            id="password-new"
            label="New Password"
            type="password"
            name="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder="Enter new password"
            autoComplete="new-password" // correct token for new
            variant="full"
            size="sm"
            hint="8+ chars, upper/lower, number & symbol."
            error={strength || undefined}
          />
          <LabelledInput
            id="password-confirm"
            label="Confirm Password"
            type="password"
            name="new-password-confirm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm new password"
            autoComplete="new-password"
            variant="full"
            size="sm"
            error={mismatch || undefined}
          />
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={!canSubmit}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <p className="text-xs text-white/60">
            Tip: You’ll stay signed in. If you want forced logout on all
            devices, we can add a token version check later.
          </p>
        </div>
      </div>
    </form>
  );
}
