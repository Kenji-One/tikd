// src/app/dashboard/events/[eventId]/settings/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import clsx from "classnames";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Globe,
  MousePointerClick,
  Percent,
  Trash2,
  Puzzle,
  ShieldAlert,
} from "lucide-react";

type IntegrationKey = "fb" | "tt" | "gtm";

type IntegrationItem = {
  key: IntegrationKey;
  title: string;
  desc: string;
  icon: React.ReactNode;
  cta: string;
};

type FeeMode = "org" | "custom";

/* ------------------------------------------------------------------ */
/*  Shared “Tikd Settings” visual language (matches Account Settings)  */
/*  - icon chip: slightly less radius (requested)                      */
/*  - header wash: remove top "padding" gap by not expanding upwards   */
/* ------------------------------------------------------------------ */

function GlassPanel({
  children,
  className,
  wash = "default",
}: {
  children: React.ReactNode;
  className?: string;
  wash?: "default" | "danger";
}) {
  const danger = wash === "danger";

  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-xl border backdrop-blur-[12px]",
        "shadow-[0_18px_45px_rgba(0,0,0,0.7)]",
        danger
          ? "border-error-500/22 bg-neutral-950/50"
          : "border-white/10 bg-neutral-950/45",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-95"
        style={{
          background: danger
            ? "radial-gradient(1000px 420px at 18% 0%, rgba(255,69,74,0.16), transparent 62%)," +
              "radial-gradient(900px 420px at 92% 28%, rgba(154,70,255,0.08), transparent 62%)," +
              "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0))"
            : "radial-gradient(1000px 420px at 18% 0%, rgba(154,70,255,0.14), transparent 62%)," +
              "radial-gradient(900px 420px at 92% 28%, rgba(88,101,242,0.10), transparent 62%)," +
              "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0))",
        }}
      />

      <div className="pointer-events-none absolute inset-0 opacity-70 bg-[radial-gradient(900px_380px_at_50%_-10%,rgba(0,0,0,0.34),transparent_65%),radial-gradient(1100px_520px_at_50%_120%,rgba(0,0,0,0.60),transparent_60%)]" />

      <div className="relative">{children}</div>
    </div>
  );
}

/* Premium icon chip (lower radius) */
function IconBlock({
  children,
  tone = "default",
  size = "md",
}: {
  children: React.ReactNode;
  tone?: "default" | "danger";
  size?: "sm" | "md";
}) {
  const danger = tone === "danger";
  const dims = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const r = size === "sm" ? "rounded-md" : "rounded-lg";

  return (
    <span
      className={clsx(
        "relative inline-flex shrink-0 items-center justify-center border",
        "shadow-[0_14px_34px_rgba(0,0,0,0.45)]",
        dims,
        r,
        danger
          ? "border-error-500/22 bg-error-950/45 text-error-100"
          : "border-white/10 bg-neutral-950/35 text-primary-200",
      )}
    >
      <span
        aria-hidden
        className={clsx(
          "pointer-events-none absolute inset-0 opacity-95",
          r,
          danger
            ? "bg-[radial-gradient(closest-side,rgba(255,69,74,0.20),transparent_72%)]"
            : "bg-[radial-gradient(closest-side,rgba(154,70,255,0.22),transparent_72%)]",
        )}
      />
      <span
        aria-hidden
        className={clsx(
          "pointer-events-none absolute inset-0 ring-1 ring-white/10",
          r,
        )}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -top-1.5 left-1.5 h-6 w-6 rounded-full bg-white/10 blur-[10px]"
      />
      <span
        aria-hidden
        className={clsx("pointer-events-none absolute inset-0 opacity-60", r)}
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.10), transparent 45%, rgba(255,255,255,0.04))",
        }}
      />
      <span className="relative">{children}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Section header                                                     */
/*  - fix top gap: keep wash inside header box (no negative top)       */
/* ------------------------------------------------------------------ */
function SectionHeader({
  icon,
  title,
  subtitle,
  tone = "default",
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  tone?: "default" | "danger";
}) {
  const danger = tone === "danger";

  return (
    <div className="relative">
      <div className="relative flex items-start gap-3">
        <IconBlock tone={danger ? "danger" : "default"}>{icon}</IconBlock>

        <div className="min-w-0">
          <h3 className="text-[15px] font-extrabold tracking-[-0.03em] text-neutral-0">
            {title}
          </h3>
          {subtitle ? (
            <p className="mt-1 max-w-[80ch] text-[12px] leading-[1.35] text-neutral-300">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 h-px w-full bg-white/8" />
    </div>
  );
}

function IntegrationRow({
  item,
  onClick,
}: {
  item: IntegrationItem;
  onClick?: (key: IntegrationKey) => void;
}) {
  return (
    <div
      className={clsx(
        "group flex flex-wrap items-center justify-between gap-3 rounded-lg border",
        "border-white/10 bg-white/[0.03] px-3 py-2.5",
        "transition-[background-color,border-color,transform] duration-200",
        "hover:border-white/14 hover:bg-white/[0.05]",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={clsx(
            "relative inline-flex h-9 w-9 items-center justify-center rounded-xl border",
            "border-white/10 bg-neutral-950/30 text-neutral-200",
            "shadow-[0_10px_22px_rgba(0,0,0,0.35)]",
          )}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-lg opacity-90"
            style={{
              background:
                "radial-gradient(closest-side, rgba(154,70,255,0.20), transparent 72%)," +
                "linear-gradient(135deg, rgba(255,255,255,0.08), transparent 60%)",
            }}
          />
          <span className="relative">{item.icon}</span>
        </span>

        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold tracking-[-0.01em] text-neutral-0">
            {item.title}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-neutral-400">
            {item.desc}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="hidden text-[11px] font-semibold text-neutral-500 group-hover:text-neutral-300 sm:inline-flex">
          Manage
        </span>

        <button
          type="button"
          onClick={() => onClick?.(item.key)}
          className={clsx(
            "inline-flex items-center gap-1.5 rounded-full border px-3 pr-2 py-2",
            "text-[11px] font-semibold text-neutral-200",
            "border-white/10 bg-neutral-950/40",
            "hover:border-primary-500/35 hover:bg-neutral-900/30 hover:text-neutral-0",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30",
            "cursor-pointer",
          )}
        >
          {item.cta}
          <ChevronRight className="h-3.5 w-3.5 opacity-70" />
        </button>
      </div>
    </div>
  );
}

function FeeChoiceCard({
  title,
  desc,
  active,
  onClick,
  badge,
}: {
  title: string;
  desc: string;
  active: boolean;
  onClick: () => void;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "group relative w-full overflow-hidden rounded-xl border p-4 text-left",
        "transition-[transform,box-shadow,background-color,border-color,filter] duration-200",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 cursor-pointer",
        "active:translate-y-[1px]",
        active
          ? clsx(
              "border-primary-500/35 bg-primary-950/28",
              "shadow-[0_18px_48px_rgba(154,70,255,0.12)]",
            )
          : "border-white/10 bg-neutral-950/40 hover:bg-neutral-900/22 hover:border-white/14",
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background: active
            ? "radial-gradient(720px 220px at 18% 0%, rgba(154,70,255,0.16), transparent 62%)," +
              "radial-gradient(680px 220px at 92% 10%, rgba(88,101,242,0.08), transparent 62%)," +
              "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0))"
            : "radial-gradient(720px 220px at 18% 0%, rgba(154,70,255,0.09), transparent 62%)," +
              "linear-gradient(180deg, rgba(255,255,255,0.015), rgba(255,255,255,0))",
        }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-[13px] font-extrabold tracking-[-0.02em] text-neutral-0">
              {title}
            </p>
            {badge ? (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-extrabold text-neutral-200">
                {badge}
              </span>
            ) : null}
          </div>

          <p className="mt-1 text-[11px] leading-[1.35] text-neutral-300">
            {desc}
          </p>
        </div>

        <span
          className={clsx(
            "mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full border",
            active
              ? "border-primary-500/35 bg-primary-500/18 text-primary-200"
              : "border-white/10 bg-white/5 text-neutral-400 group-hover:text-neutral-200",
          )}
        >
          <Check className="h-4 w-4" />
        </span>
      </div>
    </button>
  );
}

function DangerRow({
  tone,
  title,
  desc,
  icon,
  cta,
}: {
  tone: "warning" | "error";
  title: string;
  desc: string;
  icon: React.ReactNode;
  cta: string;
}) {
  const isWarn = tone === "warning";

  return (
    <div
      className={clsx(
        "flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3",
        isWarn
          ? "border-warning-500/18 bg-warning-950/18"
          : "border-error-500/18 bg-error-950/18",
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <IconBlock tone={isWarn ? "default" : "danger"} size="sm">
          {icon}
        </IconBlock>

        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold tracking-[-0.01em] text-neutral-0">
            {title}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-neutral-400">{desc}</p>
        </div>
      </div>

      <button
        type="button"
        className={clsx(
          "rounded-md border px-3 py-2 text-[12px] font-extrabold",
          isWarn
            ? clsx(
                "border-warning-500/45 bg-warning-950/55 text-warning-100",
                "hover:bg-warning-900/55 hover:border-warning-500/60",
                "focus-visible:ring-warning-500/25",
              )
            : clsx(
                "border-error-500/55 bg-error-950/60 text-error-50",
                "hover:bg-error-900/55 hover:border-error-500/70",
                "focus-visible:ring-error-500/25",
              ),
          "focus:outline-none focus-visible:ring-2 cursor-pointer",
        )}
      >
        {cta}
      </button>
    </div>
  );
}

export default function EventSettingsPage() {
  const [feeMode, setFeeMode] = useState<FeeMode>("org");

  const integrations: IntegrationItem[] = useMemo(
    () => [
      {
        key: "fb",
        title: "Facebook Pixel",
        desc: "Track purchases for this event with your Facebook Pixel ID.",
        icon: <Globe className="h-4 w-4" />,
        cta: "Add pixel",
      },
      {
        key: "tt",
        title: "TikTok Pixel",
        desc: "Send purchase events to TikTok Ads Manager.",
        icon: <MousePointerClick className="h-4 w-4" />,
        cta: "Add pixel",
      },
      {
        key: "gtm",
        title: "Google Tag Manager",
        desc: "Inject a GTM container for advanced tracking.",
        icon: <Percent className="h-4 w-4" />,
        cta: "Add container",
      },
    ],
    [],
  );

  function onIntegrationAction(_key: IntegrationKey) {
    // TODO: wire to dialogs / routes later
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <header className="">
        <h1 className="text-[20px] font-extrabold tracking-[-0.03em] text-neutral-0 sm:text-2xl">
          Settings
        </h1>
        <p className="text-sm leading-[1.35] text-neutral-400">
          Override organization defaults for pixels, fees and advanced options.
        </p>
      </header>

      <GlassPanel className="p-4">
        <SectionHeader
          icon={<Puzzle className="h-4 w-4" />}
          title="Page Integrations"
          subtitle="Connect tracking pixels and analytics tools to monitor your event performance."
        />

        <div className="mt-4 space-y-3">
          {integrations.map((it) => (
            <IntegrationRow
              key={it.key}
              item={it}
              onClick={onIntegrationAction}
            />
          ))}
        </div>
      </GlassPanel>

      <GlassPanel className="p-4">
        <SectionHeader
          icon={<Percent className="h-4 w-4" />}
          title="Service Fees"
          subtitle="Decide who absorbs Stripe + platform fees for this event."
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <FeeChoiceCard
            title="Use organization defaults"
            desc="Inherit whatever your organization uses for other events."
            active={feeMode === "org"}
            onClick={() => setFeeMode("org")}
            badge="Recommended"
          />
          <FeeChoiceCard
            title="Custom for event"
            desc="Override fees only for this event (coming soon)."
            active={feeMode === "custom"}
            onClick={() => setFeeMode("custom")}
            badge="Soon"
          />
        </div>
      </GlassPanel>

      <GlassPanel className="p-4" wash="danger">
        <SectionHeader
          icon={<ShieldAlert className="h-4 w-4" />}
          title="Danger Zone"
          subtitle="Irreversible actions that permanently affect your event data."
          tone="danger"
        />

        <div className="mt-4 space-y-3">
          <DangerRow
            tone="warning"
            title="Archive event"
            desc="Hide this event from public pages without deleting its data."
            icon={<AlertTriangle className="h-4 w-4" />}
            cta="Archive"
          />
          <DangerRow
            tone="error"
            title="Delete event"
            desc="Permanently remove this event and all associated tickets."
            icon={<Trash2 className="h-4 w-4" />}
            cta="Delete"
          />
        </div>
      </GlassPanel>
    </div>
  );
}
