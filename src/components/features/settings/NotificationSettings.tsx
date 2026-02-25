"use client";

import { useEffect, useState } from "react";
import clsx from "classnames";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Checkbox, Toggle } from "@/components/ui";
import { toast } from "@/components/ui/Toast";

/* canonical keys used by API */
type Channel = "call" | "email" | "sms";
type RowKey = "apiLimits" | "reminders" | "storage" | "securityAlerts";
type MarketingKey = "sales" | "special" | "weekly" | "outlet";
type ChannelPrefs = Record<Channel, boolean>;
type Matrix = Record<RowKey, ChannelPrefs>;
type SettingsPayload = {
  channels: Matrix;
  marketing: Record<MarketingKey, boolean>;
};

type MatrixUpdate = {
  type: "matrix";
  row: RowKey;
  channel: Channel;
  value: boolean;
};
type ToggleUpdate = { type: "toggle"; key: MarketingKey; value: boolean };
type MutationBody = MatrixUpdate | ToggleUpdate;

/* display labels */
const rowMeta: Array<{ key: RowKey; label: string }> = [
  { key: "apiLimits", label: "API Limits" },
  { key: "reminders", label: "Reminders" },
  { key: "storage", label: "Storage" },
  { key: "securityAlerts", label: "Security Alerts" },
];

const toggleMeta: Record<MarketingKey, { title: string; desc: string }> = {
  sales: {
    title: "Sales And Promotions",
    desc: "Email Notifications about Sales and Promotions!",
  },
  special: {
    title: "Special Promotions",
    desc: "Email Notifications about Special offers!",
  },
  weekly: {
    title: "Weekly Suggestions",
    desc: "Email Notifications of our weekly newsletter",
  },
  outlet: { title: "Outlet", desc: "Email Notifications of our Outlet" },
};

async function fetchJSON(url: string) {
  const r = await fetch(url, { credentials: "same-origin" });
  if (!r.ok) {
    const msg = await r.text().catch(() => "");
    throw new Error(msg || `Request failed: ${r.status}`);
  }
  return r.json();
}

export default function NotificationSettings() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<SettingsPayload>({
    queryKey: ["settings", "notifications"],
    queryFn: () => fetchJSON("/api/settings/notifications"),
    refetchOnWindowFocus: false,
  });

  const [matrix, setMatrix] = useState<Matrix>({
    apiLimits: { call: false, email: true, sms: false },
    reminders: { call: false, email: true, sms: false },
    storage: { call: false, email: true, sms: false },
    securityAlerts: { call: false, email: true, sms: false },
  });

  const [toggles, setToggles] = useState<Record<MarketingKey, boolean>>({
    sales: false,
    special: false,
    weekly: false,
    outlet: true,
  });

  useEffect(() => {
    if (data?.channels) setMatrix(data.channels);
    if (data?.marketing) setToggles(data.marketing);
  }, [data?.channels, data?.marketing]);

  const patchMutation = useMutation<SettingsPayload, Error, MutationBody>({
    mutationFn: async (body: MutationBody) => {
      const r = await fetch("/api/settings/notifications", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const msg = await r.text().catch(() => "");
        throw new Error(msg || "Failed to update");
      }
      return (await r.json()) as SettingsPayload;
    },
    onSuccess: (server) => {
      setMatrix(server.channels);
      setToggles(server.marketing);
      qc.setQueryData(["settings", "notifications"], server);
      toast.success("Notification preference updated.");
    },
    onError: (err) => {
      toast.error(
        typeof err.message === "string"
          ? err.message
          : "Could not update preference.",
      );
    },
  });

  function onMatrixChange(row: RowKey, channel: Channel, next: boolean) {
    setMatrix((m) => ({ ...m, [row]: { ...m[row], [channel]: next } }));
    patchMutation.mutate(
      { type: "matrix", row, channel, value: next },
      {
        onError: () => {
          setMatrix((m) => ({ ...m, [row]: { ...m[row], [channel]: !next } }));
        },
      },
    );
  }

  function onToggleChange(key: MarketingKey, next: boolean) {
    setToggles((t) => ({ ...t, [key]: next }));
    patchMutation.mutate(
      { type: "toggle", key, value: next },
      {
        onError: () => setToggles((t) => ({ ...t, [key]: !next })),
      },
    );
  }

  return (
    <div className="w-full">
      <h2 className="mb-8 text-[20px] font-semibold tracking-[-0.01em] text-white">
        Notifications
      </h2>

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-44 rounded bg-white/10" />
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <div className="h-12 rounded-xl bg-white/6" />
            <div className="mt-3 space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 rounded-xl bg-white/6" />
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <div className="h-6 w-56 rounded bg-white/10" />
            <div className="mt-4 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-white/6" />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Matrix table (HTML style) */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02]">
            <div className="grid grid-cols-4 gap-4 rounded-t-2xl border-b border-white/10 bg-white/[0.02] px-6 py-4 text-[13px] font-semibold text-white/70">
              <div>Notifications</div>
              <div className="text-center">Call</div>
              <div className="text-center">Email</div>
              <div className="text-center">SMS</div>
            </div>

            {rowMeta.map(({ key, label }, idx) => (
              <div
                key={key}
                className={clsx(
                  "grid grid-cols-4 gap-4 px-6 py-4 transition",
                  "bg-white/[0.02] hover:bg-white/[0.04]",
                  idx !== rowMeta.length - 1 ? "border-b border-white/10" : "",
                  idx === rowMeta.length - 1 ? "rounded-b-2xl" : "",
                )}
              >
                <div className="flex items-center text-[14px] text-white">
                  {label}
                </div>

                {(["call", "email", "sms"] as Channel[]).map((ch) => (
                  <div key={ch} className="flex items-center justify-center">
                    <Checkbox
                      size="sm"
                      variant="settings"
                      aria-label={`${label} via ${ch}`}
                      checked={matrix[key][ch]}
                      onCheckedChange={(val) => onMatrixChange(key, ch, !!val)}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>

          <p className="mt-4 text-[13px] text-white/50">
            Tip: “Email” channel is recommended for critical alerts.
          </p>

          {/* Marketing toggles */}
          <div className="mt-8 space-y-4">
            {(Object.keys(toggleMeta) as MarketingKey[]).map((k) => {
              const meta = toggleMeta[k];
              return (
                <div
                  key={k}
                  className={clsx(
                    "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
                    "rounded-2xl border border-white/10 bg-white/[0.02] p-5",
                    "transition hover:bg-white/[0.04] hover:border-white/15",
                  )}
                >
                  <div className="min-w-0">
                    <div className="text-[15px] font-semibold text-white">
                      {meta.title}
                    </div>
                    <div className="mt-1 text-[13px] text-white/50">
                      {meta.desc}
                    </div>
                  </div>

                  <Toggle
                    size="sm"
                    variant="settings"
                    checked={toggles[k]}
                    onCheckedChange={(v) => onToggleChange(k, v)}
                    aria-label={`${meta.title} toggle`}
                  />
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
