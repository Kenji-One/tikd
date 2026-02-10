/* ------------------------------------------------------------------ */
/*  src/components/connections/ConnectionProfileCard.tsx              */
/* ------------------------------------------------------------------ */
"use client";

import React from "react";
import Link from "next/link";
import clsx from "clsx";
import {
  Building2,
  Landmark,
  Users2,
  ShieldCheck,
  BadgeCheck,
  Ticket,
  Megaphone,
  ScanLine,
  Crown,
  Gem,
  Wrench,
  Settings2,
  Star,
  Sparkles,
  Bolt,
  Rocket,
  Lock,
  KeyRound,
  Wallet,
  Eye,
  Globe,
  Flag,
  Camera,
  Mic,
  ClipboardList,
  User,
  Users as UsersIcon,
  type LucideIcon,
} from "lucide-react";
import { Tilt3d } from "@/components/ui/Tilt3d";
import type { RoleIconKey } from "@/lib/roleIcons";

/* ----------------------------- Types ------------------------------ */
export type ConnectionProfileKind = "establishment" | "organization" | "team";
export type ConnectionProfileCardWidth = "default" | "compact";

export type RoleBadgeMeta = {
  key: string;
  name: string;
  color?: string;
  iconKey?: RoleIconKey | null;
  iconUrl?: string | null;
};

export type ConnectionProfileCardProps = {
  href: string;
  kind: ConnectionProfileKind;

  title: string;
  description: string;

  bannerUrl?: string;
  iconUrl?: string;

  totalMembers?: number;
  joinDateLabel?: string;

  /** ✅ NEW: org/team accent color (hex or CSS var) */
  accentColor?: string;

  /** ✅ NEW (preferred): full meta for role badge */
  userRoleMeta?: RoleBadgeMeta;

  /** backwards compatibility */
  userRoleLabel?: string;

  tilt?: boolean;
  tiltMaxDeg?: number;
  tiltPerspective?: number;
  tiltLiftPx?: number;

  cardWidth?: ConnectionProfileCardWidth;
};

type CssVars = React.CSSProperties & Record<`--${string}`, string>;

const KIND_ICON: Record<ConnectionProfileKind, LucideIcon> = {
  establishment: Landmark,
  organization: Building2,
  team: Users2,
};

const ROLE_ICON_MAP: Record<RoleIconKey, React.ReactElement> = {
  user: <User className="h-4 w-4" />,
  users: <UsersIcon className="h-4 w-4" />,
  shield: <ShieldCheck className="h-4 w-4" />,
  badge: <BadgeCheck className="h-4 w-4" />,
  ticket: <Ticket className="h-4 w-4" />,
  megaphone: <Megaphone className="h-4 w-4" />,
  scanner: <ScanLine className="h-4 w-4" />,
  crown: <Crown className="h-4 w-4" />,
  gem: <Gem className="h-4 w-4" />,
  wrench: <Wrench className="h-4 w-4" />,
  settings: <Settings2 className="h-4 w-4" />,
  owner: <Crown className="h-4 w-4" />,
  star: <Star className="h-4 w-4" />,
  sparkles: <Sparkles className="h-4 w-4" />,
  bolt: <Bolt className="h-4 w-4" />,
  rocket: <Rocket className="h-4 w-4" />,
  lock: <Lock className="h-4 w-4" />,
  key: <KeyRound className="h-4 w-4" />,
  wallet: <Wallet className="h-4 w-4" />,
  eye: <Eye className="h-4 w-4" />,
  globe: <Globe className="h-4 w-4" />,
  flag: <Flag className="h-4 w-4" />,
  camera: <Camera className="h-4 w-4" />,
  mic: <Mic className="h-4 w-4" />,
  clipboard: <ClipboardList className="h-4 w-4" />,
};

function formatMembers(n?: number) {
  if (!n || n <= 0) return "0";
  try {
    return new Intl.NumberFormat(undefined).format(n);
  } catch {
    return String(n);
  }
}

function safeHexToRgb(hex: string) {
  const h = hex.replace("#", "").trim();
  if (!/^[0-9A-Fa-f]{3}$|^[0-9A-Fa-f]{6}$/.test(h)) return null;
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h.toLowerCase();
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return { r, g, b };
}

function clamp255(n: number) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function shadeHex(hex: string, amt: number) {
  const rgb = safeHexToRgb(hex);
  if (!rgb) return hex;
  const r = clamp255(rgb.r + amt);
  const g = clamp255(rgb.g + amt);
  const b = clamp255(rgb.b + amt);
  const out =
    "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return out;
}

/** ✅ Exported so Organizations list row can reuse exact same pill */
export function RoleBadge({ meta }: { meta: RoleBadgeMeta }) {
  const key = String(meta.key || "member").toLowerCase();

  // owner special (keeps gold vibe)
  if (key === "owner") {
    const rgb = safeHexToRgb("#9A46FF")!;
    const soft = `rgba(${rgb.r},${rgb.g},${rgb.b},0.14)`;
    const ring = `rgba(${rgb.r},${rgb.g},${rgb.b},0.26)`;
    const text = `rgba(${Math.min(255, rgb.r + 120)},${Math.min(
      255,
      rgb.g + 120,
    )},${Math.min(255, rgb.b + 120)},0.98)`;

    return (
      <span
        className={clsx(
          "inline-flex items-center gap-1 rounded-full px-2.5 pl-2 py-1.5",
          "text-[13px] font-semibold ring-1 ring-inset",
        )}
        style={{
          background: soft,
          color: text,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
          borderColor: ring,
        }}
        aria-label="Role: Owner"
      >
        <span className="inline-flex items-center justify-center">
          <Crown className="h-4 w-4" />
        </span>
        <span className="leading-none">Owner</span>
      </span>
    );
  }

  const rgb = meta.color ? safeHexToRgb(meta.color) : null;
  const soft =
    rgb != null
      ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.14)`
      : "rgba(255,255,255,0.08)";
  const ring =
    rgb != null
      ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.26)`
      : "rgba(255,255,255,0.14)";
  const text =
    rgb != null
      ? `rgba(${Math.min(255, rgb.r + 120)},${Math.min(
          255,
          rgb.g + 120,
        )},${Math.min(255, rgb.b + 120)},0.98)`
      : "rgba(245,245,245,0.95)";

  const iconNode = meta.iconUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={meta.iconUrl}
      alt=""
      className="h-4 w-4 rounded-sm object-cover"
      draggable={false}
    />
  ) : meta.iconKey ? (
    (ROLE_ICON_MAP[meta.iconKey] ?? <UsersIcon className="h-4 w-4" />)
  ) : (
    <UsersIcon className="h-4 w-4" />
  );

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2.5 pl-2 py-1.5",
        "text-[13px] font-semibold ring-1 ring-inset",
      )}
      style={{
        background: soft,
        color: text,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
        borderColor: ring,
      }}
      aria-label={`Role: ${meta.name}`}
    >
      <span className="inline-flex items-center justify-center">
        {iconNode}
      </span>
      <span className="leading-none">{meta.name}</span>
    </span>
  );
}

function niceRoleLabel(raw?: string) {
  const v = String(raw || "").trim();
  if (!v) return "Member";
  return v.charAt(0).toUpperCase() + v.slice(1);
}

export default function ConnectionProfileCard({
  href,
  kind,
  title,
  description,
  bannerUrl,
  iconUrl,
  totalMembers,
  joinDateLabel,
  userRoleMeta,
  userRoleLabel,
  accentColor,
  tilt = false,
  tiltMaxDeg = 4,
  tiltPerspective = 900,
  tiltLiftPx = 2,
  cardWidth = "default",
}: ConnectionProfileCardProps) {
  const TypeIcon = KIND_ICON[kind];

  // ✅ accent fallback: keep current default look if org has no custom color
  const resolvedAccent =
    String(accentColor || "").trim() || "var(--color-primary-500)";

  // Only compute RGB when it's a true hex; if it's a CSS var, we keep default gradients.
  const accentHex =
    resolvedAccent.startsWith("#") && safeHexToRgb(resolvedAccent)
      ? resolvedAccent
      : null;

  const accentRgb = accentHex ? safeHexToRgb(accentHex) : null;

  const widthClass = cardWidth === "compact" ? "w-full" : "w-full sm:w-[264px]";

  const cardLinkClass = clsx(
    "group relative block",
    widthClass,
    "rounded-[12px]",
    "border border-white/10 bg-neutral-948",
    "transition-all duration-200",
    // ✅ same hover behavior as before, just colorized per org
    "hover:border-[color:var(--cp-accent)]",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--cp-accent)]/60",
  );

  const tiltShellClass = clsx(
    "group relative",
    widthClass,
    "rounded-[12px]",
    "transition-shadow duration-200",
    "hover:shadow-[0_22px_70px_rgba(0,0,0,0.55)]",
  );

  const fallbackBannerBg =
    accentRgb != null
      ? `radial-gradient(520px 180px at 25% 0%, rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.58), transparent 62%),
         radial-gradient(520px 180px at 90% 120%, rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.30), transparent 60%),
         linear-gradient(180deg, rgba(8,8,15,0.25), rgba(18,18,32,1))`
      : "radial-gradient(520px_180px_at_25%_0%,rgba(154,70,255,0.55),transparent_62%),radial-gradient(520px_180px_at_90%_120%,rgba(170,115,255,0.40),transparent_60%),linear-gradient(180deg,rgba(28,0,58,0.85),rgba(18,18,32,1))";

  const Banner = (
    <div className="relative h-[112px] w-full overflow-hidden rounded-t-[12px]">
      {bannerUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={bannerUrl}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          draggable={false}
        />
      ) : (
        <div
          className="h-full w-full"
          style={{ background: fallbackBannerBg }}
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-b from-black/18 via-black/10 to-neutral-948/95" />
    </div>
  );

  const placeholderBg =
    accentHex != null
      ? `conic-gradient(from 220deg at 50% 50%, ${shadeHex(
          accentHex,
          0,
        )}, ${shadeHex(accentHex, -45)}, #0b0b14)`
      : "conic-gradient(from_220deg_at_50%_50%,#9a46ff,#6600b7,#111827)";

  const IconTile = (
    <div className="absolute left-4 top-[74px]">
      <div
        className={clsx(
          "relative h-[52px] w-[52px] overflow-hidden",
          "rounded-lg",
          "border-[3px] border-neutral-948",
          "bg-neutral-900",
        )}
        style={{
          // ✅ subtle “accent aura” behind tile (works even if accent is CSS var)
          boxShadow:
            "0 16px 34px rgba(0,0,0,0.52), 0 0 0 1px rgba(255,255,255,0.06)",
        }}
        aria-hidden="true"
      >
        {/* Accent wash layer */}
        <div
          className="absolute inset-0 opacity-[0.55]"
          style={{
            background:
              accentHex && accentRgb
                ? `radial-gradient(60px 60px at 40% 35%, rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.55), transparent 60%),
                   radial-gradient(70px 70px at 70% 85%, rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.22), transparent 65%)`
                : `radial-gradient(60px 60px at 40% 35%, rgba(154,70,255,0.40), transparent 60%),
                   radial-gradient(70px 70px at 70% 85%, rgba(170,115,255,0.18), transparent 65%)`,
          }}
        />

        {iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={iconUrl}
            alt=""
            className="relative z-1 h-full w-full object-cover"
            loading="lazy"
            draggable={false}
          />
        ) : (
          <div
            className="relative z-1 grid h-full w-full place-items-center"
            style={{ background: placeholderBg }}
          >
            <span className="text-[13px] font-semibold text-neutral-0 tikd-tilt-crisp">
              {title?.[0]?.toUpperCase() ?? "C"}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  const resolvedRoleMeta: RoleBadgeMeta = userRoleMeta?.name
    ? userRoleMeta
    : {
        key: String(userRoleLabel || "member").toLowerCase(),
        name: niceRoleLabel(userRoleLabel),
        color: "",
        iconKey: "users",
        iconUrl: null,
      };

  const showMembers = typeof totalMembers === "number";
  const rightText = showMembers ? (
    <>
      <span className="font-semibold text-neutral-100 mr-1">
        {formatMembers(totalMembers)}
      </span>
      <span className="text-neutral-400">Total Members</span>
    </>
  ) : (
    <span className="truncate text-neutral-400">{joinDateLabel ?? "—"}</span>
  );

  const typeChipStyle =
    accentRgb != null
      ? {
          background: `rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.16)`,
          borderColor: `rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.32)`,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06)`,
        }
      : undefined;

  const typeIconStyle =
    accentRgb != null
      ? {
          color: `rgba(${Math.min(255, accentRgb.r + 120)},${Math.min(
            255,
            accentRgb.g + 120,
          )},${Math.min(255, accentRgb.b + 120)},0.96)`,
        }
      : undefined;

  const CardInner = (
    <>
      {Banner}
      {IconTile}

      <div className="relative px-4 pb-3 pt-7 tikd-tilt-crisp">
        <div className="flex items-start gap-2">
          <span
            className={clsx(
              "mt-[2px] inline-flex h-5 w-5 items-center justify-center rounded-full",
              "ring-1 ring-inset",
              accentRgb == null ? "bg-primary-900/50 ring-primary-500" : "",
            )}
            style={typeChipStyle}
            title={kind}
            aria-hidden="true"
          >
            <TypeIcon
              className={clsx(
                "h-3.5 w-3.5",
                accentRgb == null ? "text-primary-300" : "",
              )}
              style={typeIconStyle}
            />
          </span>

          <div className="min-w-0">
            <div className="truncate text-[14px] font-semibold tracking-[-0.28px] text-neutral-50">
              {title}
            </div>

            <div className="mt-1 line-clamp-2 text-[12px] leading-[1.35] text-neutral-300/90">
              {description}
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2.5 text-[12px] text-neutral-300/90">
          {/* ✅ LEFT: Role pill */}
          <div className="inline-flex items-center gap-2 min-w-0">
            <RoleBadge meta={resolvedRoleMeta} />
          </div>

          {/* ✅ RIGHT: total members */}
          <div className="inline-flex items-center gap-2 text-neutral-400">
            <span
              className="h-2 w-2 rounded-full bg-neutral-700"
              aria-hidden="true"
            />
            <span className="truncate">{rightText}</span>
          </div>
        </div>
      </div>
    </>
  );

  const styleVars: CssVars = {
    "--cp-accent": resolvedAccent,
  };

  if (!tilt) {
    return (
      <Link href={href} className={cardLinkClass} style={styleVars}>
        {CardInner}
      </Link>
    );
  }

  return (
    <Tilt3d
      className={tiltShellClass}
      maxDeg={tiltMaxDeg}
      perspective={tiltPerspective}
      liftPx={tiltLiftPx}
    >
      <Link href={href} className={cardLinkClass} style={styleVars}>
        {CardInner}
      </Link>
    </Tilt3d>
  );
}
