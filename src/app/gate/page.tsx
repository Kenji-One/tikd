// src/app/gate/page.tsx
"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";

export default function GatePage() {
  const sp = useSearchParams();
  const nextParam = sp.get("next") || "/";

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const safeNext = useMemo(() => {
    // Prevent open-redirects. Only allow same-site paths.
    if (!nextParam.startsWith("/")) return "/";
    return nextParam;
  }, [nextParam]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const res = await fetch("/api/gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, next: safeNext }),
      });

      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setErr(j?.error || "Incorrect password.");
        setLoading(false);
        return;
      }

      // Cookie is httpOnly; redirect to requested page
      window.location.href = safeNext;
    } catch {
      setErr("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-[520px]">
        <div
          className={clsx(
            "rounded-2xl border border-white/10 bg-white/5 backdrop-blur",
            "shadow-[0_24px_80px_rgba(0,0,0,0.6)]",
          )}
        >
          <div className="px-6 sm:px-8 pt-8 pb-6 border-b border-white/10">
            <div className="flex items-center justify-center">
              <div className="relative w-[110px] h-[44px]">
                <Image
                  src="/Logo.svg"
                  alt="Tikd."
                  fill
                  priority
                  className="object-contain"
                />
              </div>
            </div>

            <h1 className="mt-6 text-center text-xl font-semibold tracking-[-0.4px]">
              This site is temporarily protected
            </h1>
            <p className="mt-2 text-center text-sm text-white/70">
              Enter the password to continue.
            </p>
          </div>

          <form onSubmit={onSubmit} className="px-6 sm:px-8 py-6 space-y-4">
            <label className="block">
              <span className="block text-sm text-white/80 mb-2">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={clsx(
                  "w-full h-[46px] rounded-xl px-4",
                  "bg-neutral-950/60 border border-white/10",
                  "text-white placeholder:text-white/30",
                  "outline-none focus:ring-2 focus:ring-primary-600/40",
                )}
                placeholder="Enter password"
                autoFocus
              />
            </label>

            {err && (
              <p className="text-sm text-red-400" role="alert">
                {err}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || password.trim().length === 0}
              className={clsx(
                "w-full h-[46px] rounded-xl font-semibold",
                "bg-primary-600 hover:bg-primary-500 transition",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              {loading ? "Checking..." : "Continue"}
            </button>

            <p className="text-[12px] text-white/50 text-center">
              Protected preview mode
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
