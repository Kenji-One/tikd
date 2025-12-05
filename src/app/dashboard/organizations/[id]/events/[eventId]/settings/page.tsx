// src/app/dashboard/organizations/[id]/events/[eventId]/settings/page.tsx

import {
  Globe,
  MousePointerClick,
  Percent,
  AlertTriangle,
  Trash2,
} from "lucide-react";

export default function EventSettingsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-sm font-semibold text-neutral-0">Settings</h2>
        <p className="mt-1 text-xs text-neutral-400">
          Override organization defaults for pixels, fees and advanced options.
        </p>
      </header>

      {/* Integrations */}
      <section className="space-y-4 rounded-card border border-white/8 bg-neutral-948/90 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.7)]">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Page integrations
        </h3>

        <div className="space-y-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 text-neutral-300">
                <Globe className="h-3.5 w-3.5" />
              </span>
              <div>
                <p className="text-sm font-medium text-neutral-0">
                  Facebook Pixel
                </p>
                <p className="text-[11px] text-neutral-400">
                  Track purchases for this event with your Facebook Pixel ID.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-neutral-950 px-4 py-2 text-[11px] font-medium text-neutral-200 hover:border-primary-500 hover:text-primary-200"
            >
              Add pixel
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 text-neutral-300">
                <MousePointerClick className="h-3.5 w-3.5" />
              </span>
              <div>
                <p className="text-sm font-medium text-neutral-0">
                  TikTok Pixel
                </p>
                <p className="text-[11px] text-neutral-400">
                  Send purchase events to TikTok Ads Manager.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-neutral-950 px-4 py-2 text-[11px] font-medium text-neutral-200 hover:border-primary-500 hover:text-primary-200"
            >
              Add pixel
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 text-neutral-300">
                <Percent className="h-3.5 w-3.5" />
              </span>
              <div>
                <p className="text-sm font-medium text-neutral-0">
                  Google Tag Manager
                </p>
                <p className="text-[11px] text-neutral-400">
                  Inject a GTM container for advanced tracking.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-neutral-950 px-4 py-2 text-[11px] font-medium text-neutral-200 hover:border-primary-500 hover:text-primary-200"
            >
              Add container
            </button>
          </div>
        </div>
      </section>

      {/* Service fees */}
      <section className="space-y-4 rounded-card border border-white/8 bg-neutral-948/90 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.7)]">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Service fees
        </h3>
        <p className="text-xs text-neutral-400">
          Decide who absorbs Stripe + platform fees for this event.
        </p>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            className="rounded-2xl border border-primary-600 bg-primary-950/40 px-4 py-3 text-left text-xs text-neutral-100"
          >
            <p className="font-semibold text-neutral-0">
              Use organization defaults
            </p>
            <p className="mt-1 text-[11px] text-neutral-300">
              Inherit whatever Astro Hospitality uses for other events.
            </p>
          </button>

          <button
            type="button"
            className="rounded-2xl border border-white/10 bg-neutral-950 px-4 py-3 text-left text-xs text-neutral-100"
          >
            <p className="font-semibold text-neutral-0">Custom for event</p>
            <p className="mt-1 text-[11px] text-neutral-300">
              Override fees only for this event (coming soon).
            </p>
          </button>
        </div>
      </section>

      {/* Dangerous actions */}
      <section className="space-y-3 rounded-card border border-white/8 bg-neutral-948/90 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.7)]">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Danger zone
        </h3>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning-500" />
            <div>
              <p className="font-medium text-neutral-0">Archive event</p>
              <p className="text-[11px] text-neutral-400">
                Hide this event from public pages without deleting its data.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-full border border-warning-500/60 bg-warning-950 px-4 py-2 text-[11px] font-medium text-warning-100 hover:bg-warning-900/80"
          >
            Archive
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-error-500" />
            <div>
              <p className="font-medium text-neutral-0">Delete event</p>
              <p className="text-[11px] text-neutral-400">
                Permanently remove this event and all associated tickets.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-full border border-error-500/70 bg-error-950 px-4 py-2 text-[11px] font-medium text-error-50 hover:bg-error-900/80"
          >
            Delete
          </button>
        </div>
      </section>
    </div>
  );
}
