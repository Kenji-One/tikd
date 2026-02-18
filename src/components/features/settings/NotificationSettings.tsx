// src/components/features/settings/NotificationSettings.tsx
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
      <h3 className="text-[16px] font-extrabold tracking-[-0.02em] text-neutral-0">
        Notifications
      </h3>

      {isLoading ? (
        <div className="mt-6 animate-pulse space-y-4">
          <div className="h-10 w-44 rounded-xl bg-white/8" />

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="h-4 w-56 rounded bg-white/10" />
            <div className="mt-4 space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 rounded-xl bg-white/6" />
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="h-4 w-40 rounded bg-white/10" />
            <div className="mt-4 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-white/6" />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Matrix panel */}
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-[13px] text-neutral-200">
                <thead className="text-[12px] text-neutral-400">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Notifications</th>
                    <th className="px-3 py-2 text-center font-semibold">
                      Call
                    </th>
                    <th className="px-3 py-2 text-center font-semibold">
                      Email
                    </th>
                    <th className="px-3 py-2 text-center font-semibold">SMS</th>
                  </tr>
                </thead>
                <tbody>
                  {rowMeta.map(({ key, label }) => (
                    <tr
                      key={key}
                      className="border-t border-white/10 hover:bg-white/[0.02]"
                    >
                      <td className="px-3 py-3">{label}</td>
                      {(["call", "email", "sms"] as Channel[]).map((ch) => (
                        <td key={ch} className="px-3 py-3">
                          <div className="flex justify-center">
                            <Checkbox
                              size="md"
                              aria-label={`${label} via ${ch}`}
                              checked={matrix[key][ch]}
                              onCheckedChange={(val) =>
                                onMatrixChange(key, ch, !!val)
                              }
                            />
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-[11px] text-neutral-400">
              Tip: “Email” channel is recommended for critical alerts.
            </p>
          </div>

          {/* Marketing panel */}
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
            <div className="divide-y divide-white/10">
              {(Object.keys(toggleMeta) as MarketingKey[]).map((key) => {
                const { title, desc } = toggleMeta[key];
                return (
                  <div
                    key={key}
                    className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <h4 className="truncate text-[13px] font-semibold text-neutral-0">
                        {title}
                      </h4>
                      <p className="mt-0.5 truncate text-[11px] text-neutral-400">
                        {desc}
                      </p>
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
          </div>
        </>
      )}
    </div>
  );
}
