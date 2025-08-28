"use client";

import { Button } from "@/components/ui/Button";

export default function SecuritySettings() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-3 rounded-xl border border-white/10 bg-surface p-4">
        <h3 className="text-lg font-semibold">Security Settings</h3>

        <div className="flex items-center justify-between rounded-lg border border-white/10 p-3">
          <div>
            <p className="font-medium">2-Factor Auth App</p>
            <p className="text-sm text-white/60">
              Google Authenticator or similar
            </p>
          </div>
          <Button size="sm" variant="secondary">
            Setup
          </Button>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-white/10 p-3">
          <div>
            <p className="font-medium">Notifications Email</p>
            <p className="text-sm text-white/60">Used to send alerts</p>
          </div>
          <Button size="sm" variant="secondary">
            Setup
          </Button>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-white/10 p-3">
          <div>
            <p className="font-medium">SMS Recovery</p>
            <p className="text-sm text-white/60">
              Phone number for account recovery
            </p>
          </div>
          <Button size="sm" variant="secondary">
            Setup
          </Button>
        </div>
      </div>
    </div>
  );
}
