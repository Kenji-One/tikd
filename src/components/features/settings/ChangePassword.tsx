// src/components/features/settings/ChangePassword.tsx
"use client";

import { useMemo, useState } from "react";
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

      type PasswordResponse = { error?: string };

      const j: PasswordResponse = await r
        .json()
        .catch(() => ({}) as PasswordResponse);

      if (!r.ok) {
        setError(j.error || "Failed to update password.");
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
      className="w-full"
    >
      <h3 className="text-[16px] font-extrabold tracking-[-0.02em] text-neutral-0">
        Change Password
      </h3>

      {/* Inner panel (matches client screenshot “big card inside”) */}
      <div className="mt-7">
        {/* Global messages */}
        {error && (
          <div
            role="alert"
            className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-300"
          >
            {error}
          </div>
        )}
        {okMsg && (
          <div
            role="status"
            className="mb-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[12px] text-emerald-300"
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
          autoComplete="off"
          readOnly={!unlockCurrent}
          onFocus={() => setUnlockCurrent(true)}
          variant="full"
          size="sm"
        />

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <LabelledInput
            id="password-new"
            label="New Password"
            type="password"
            name="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder="Enter new password"
            autoComplete="new-password"
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

        <div className="mt-4 flex justify-end">
          <Button type="submit" disabled={!canSubmit} animation>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </form>
  );
}
