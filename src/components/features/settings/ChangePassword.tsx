"use client";

import { useMemo, useState } from "react";
import clsx from "classnames";

import { Button } from "@/components/ui/Button";
import { validatePassword } from "@/lib/password";

function Label({ children }: { children: string }) {
  return (
    <label className="mb-2.5 text-[14px] font-semibold text-white/70">
      {children}
    </label>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  autoComplete,
  readOnly,
  onFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  readOnly?: boolean;
  onFocus?: () => void;
}) {
  return (
    <input
      type="password"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete={autoComplete}
      readOnly={readOnly}
      onFocus={onFocus}
      className={clsx(
        "w-full rounded-xl border border-white/10 bg-white/[0.03] leading-[100%]",
        "px-4 py-3 text-[14px] text-white outline-none",
        "placeholder:text-white/30",
        "transition",
        "hover:border-white/20",
        "focus:border-primary-500/50 focus:bg-white/[0.06]",
        "focus:ring-0",

        readOnly ? "cursor-text" : "",
      )}
    />
  );
}

export default function ChangePassword() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [unlockCurrent, setUnlockCurrent] = useState(false);

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
      const j: PasswordResponse = await r.json().catch(() => ({}));

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
      <h2 className="mb-8 text-[20px] font-semibold tracking-[-0.01em] text-white">
        Change Password
      </h2>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-300">
          {error}
        </div>
      ) : null}

      {okMsg ? (
        <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-[13px] text-emerald-300">
          {okMsg}
        </div>
      ) : null}

      <div className="mb-6 flex flex-col">
        <Label>Current Password</Label>
        <Input
          value={current}
          onChange={setCurrent}
          placeholder="Enter current password"
          autoComplete="off"
          readOnly={!unlockCurrent}
          onFocus={() => setUnlockCurrent(true)}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="flex flex-col">
          <Label>New Password</Label>
          <Input
            value={next}
            onChange={setNext}
            placeholder="Enter new password"
            autoComplete="new-password"
          />
          {strength ? (
            <p className="mt-2 text-[12px] text-warning-400">{strength}</p>
          ) : null}
        </div>

        <div className="flex flex-col">
          <Label>Confirm Password</Label>
          <Input
            value={confirm}
            onChange={setConfirm}
            placeholder="Confirm new password"
            autoComplete="new-password"
          />
          {mismatch ? (
            <p className="mt-2 text-[12px] text-error-500">{mismatch}</p>
          ) : null}
        </div>
      </div>

      <p className="mt-3 text-[13px] text-white/50">
        8+ chars, upper/lower, number &amp; symbol.
      </p>

      <div className="mt-8 flex justify-end">
        <Button
          type="submit"
          disabled={!canSubmit}
          variant="premium"
          size="md"
          className="rounded-xl py-4 px-6"
          animation
        >
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
