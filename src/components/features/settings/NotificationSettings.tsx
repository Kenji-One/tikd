"use client";

import { useEffect, useState } from "react";
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

/* strict fetch so 4xx/5xx throw (no silent fallback) */
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

  /* hydrate from server once loaded */
  useEffect(() => {
    if (data?.channels) setMatrix(data.channels);
    if (data?.marketing) setToggles(data.marketing);
  }, [data?.channels, data?.marketing]);

  const patchMutation = useMutation({
    mutationFn: async (body: any) => {
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
      return r.json();
    },
    onSuccess: (server: SettingsPayload) => {
      setMatrix(server.channels);
      setToggles(server.marketing);
      qc.setQueryData(["settings", "notifications"], server);
      toast.success("Notification preference updated.");
    },
    onError: (err: any) => {
      toast.error(
        typeof err?.message === "string"
          ? err.message
          : "Could not update preference."
      );
    },
  });

  function onMatrixChange(row: RowKey, channel: Channel, next: boolean) {
    // optimistic
    setMatrix((m) => ({ ...m, [row]: { ...m[row], [channel]: next } }));
    patchMutation.mutate(
      { type: "matrix", row, channel, value: next },
      {
        onError: () => {
          // rollback
          setMatrix((m) => ({ ...m, [row]: { ...m[row], [channel]: !next } }));
        },
      }
    );
  }

  function onToggleChange(key: MarketingKey, next: boolean) {
    setToggles((t) => ({ ...t, [key]: next }));
    patchMutation.mutate(
      { type: "toggle", key, value: next },
      {
        onError: () => setToggles((t) => ({ ...t, [key]: !next })),
      }
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-surface p-4 md:p-6">
      <h3 className="mb-4 text-xl font-semibold text-white">Notifications</h3>

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-40 rounded bg-white/10" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 rounded bg-white/5" />
          ))}
          <div className="h-px bg-white/10" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 rounded bg-white/5" />
          ))}
        </div>
      ) : (
        <>
          {/* Matrix */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm text-white/90">
              <thead className="text-white/70">
                <tr>
                  <th className="px-3 py-2 font-medium">Notifications</th>
                  <th className="px-3 py-2 font-medium">Call</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">SMS</th>
                </tr>
              </thead>
              <tbody>
                {rowMeta.map(({ key, label }) => (
                  <tr key={key} className="border-t border-white/10">
                    <td className="px-3 py-3">{label}</td>
                    {(["call", "email", "sms"] as Channel[]).map((ch) => (
                      <td key={ch} className="px-3 py-3">
                        <Checkbox
                          size="lg"
                          aria-label={`${label} via ${ch}`}
                          checked={matrix[key][ch]}
                          onCheckedChange={(val) =>
                            onMatrixChange(key, ch, !!val)
                          }
                          className="!h-6 !w-6"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-white/60">
            Tip: “Email” channel is recommended for critical alerts.
          </p>

          <div className="my-6 h-px w-full bg-white/10" />

          {/* Marketing toggles */}
          <div className="divide-y divide-white/10">
            {(Object.keys(toggleMeta) as MarketingKey[]).map((key) => {
              const { title, desc } = toggleMeta[key];
              return (
                <div
                  key={key}
                  className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <h4 className="text-base font-semibold text-white">
                      {title}
                    </h4>
                    <p className="text-sm text-white/60">{desc}</p>
                  </div>
                  <Toggle
                    size="sm"
                    checked={toggles[key]}
                    onCheckedChange={(v) => onToggleChange(key, v)}
                    aria-label={`${title} toggle`}
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
