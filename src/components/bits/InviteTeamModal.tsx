// src/components/bits/InviteTeamModal.tsx
"use client";

import Image from "next/image";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type ComponentType,
  type SVGProps,
} from "react";
import clsx from "clsx";
import {
  X,
  Mail,
  ShieldCheck,
  Megaphone,
  ScanLine,
  Users as UsersIcon,
  Clock3,
  Calendar as CalendarIcon,
  Check,
  Sparkles,
  Lock,
  Crown,
  KeyRound,
  Eye,
  Star,
  Bolt,
  Rocket,
  Gem,
  Wrench,
  Settings2,
  Flag,
  Globe,
  Camera,
  Mic,
  ClipboardList,
  User,
  BadgeCheck,
  Ticket,
  Wallet,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { RoleIconKey } from "@/lib/roleIcons";

/* ----------------------------- Types ----------------------------- */
export type Role = "admin" | "promoter" | "scanner" | "collaborator";

/**
 * Backwards compatible:
 * - If inviting system role => send { role }
 * - If inviting custom role => send { roleId } (backend will store role="member")
 */
export type InvitePayload = {
  email: string;
  role?: Role;
  roleId?: string;
  temporaryAccess: boolean;
  expiresAt?: string;
  /** Whether the member gets access to existing and/or future events */
  applyTo?: { existing: boolean; future: boolean };
};

type OrgPermissionKey =
  | "members.view"
  | "members.invite"
  | "members.remove"
  | "members.assignRoles"
  | "events.create"
  | "events.edit"
  | "events.publish"
  | "events.delete"
  | "links.createTrackingLinks";

type OrgPermissions = Record<OrgPermissionKey, boolean>;

type OrgRoleRow = {
  _id: string;
  key: string;
  name: string;
  color?: string;

  /** New roles system fields (matches /api/organizations/:id/roles) */
  iconKey?: RoleIconKey | null;
  iconUrl?: string | null;

  isSystem: boolean;
  order: number;
  permissions: Partial<OrgPermissions>;
  membersCount: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onInvite: (payload: InvitePayload) => void;
  isSubmitting?: boolean;
  orgId: string;
};

/* ----------------------------- Helpers --------------------------- */
async function json<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function validateEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function prettyDate(d?: string) {
  if (!d) return "";
  return new Date(d).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

function accentFromHex(hex?: string) {
  const rgb = hex ? safeHexToRgb(hex) : null;
  if (!rgb) {
    return {
      ring: "rgba(255,255,255,0.12)",
      bg: "rgba(255,255,255,0.06)",
      soft: "rgba(255,255,255,0.06)",
      glow: "rgba(154,70,255,0.0)",
      text: "rgba(245,245,245,0.95)",
    };
  }
  const { r, g, b } = rgb;
  return {
    ring: `rgba(${r},${g},${b},0.28)`,
    bg: `rgba(${r},${g},${b},0.10)`,
    soft: `rgba(${r},${g},${b},0.14)`,
    glow: `rgba(${r},${g},${b},0.24)`,
    text: `rgba(${Math.min(255, r + 120)},${Math.min(
      255,
      g + 120,
    )},${Math.min(255, b + 120)},0.98)`,
  };
}

type RolePillMeta = {
  key: string;
  name: string;
  color?: string;
  iconNode: ReactNode;
};

function rolePillInlineFromHex(hex?: string) {
  const rgb = hex ? safeHexToRgb(hex) : null;

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

  return {
    background: soft,
    borderColor: ring,
    color: text,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
  } as const;
}

function RolePillPreview({ meta }: { meta: RolePillMeta }) {
  const inline = rolePillInlineFromHex(meta.color);

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2.5 pl-2 py-1.5",
        "text-[13px] font-semibold ring-1 ring-inset",
      )}
      style={inline}
      aria-label={`Role: ${meta.name}`}
    >
      <span className="inline-flex items-center justify-center">
        {meta.iconNode}
      </span>
      <span className="leading-none">{meta.name}</span>
    </span>
  );
}

function resolveRoleIconNodeSmall(role: OrgRoleRow): ReactNode {
  if (role.iconUrl) {
    return (
      <Image
        src={role.iconUrl}
        alt=""
        width={16}
        height={16}
        className="h-4 w-4 rounded-sm object-cover"
        draggable={false}
      />
    );
  }

  const key = (role.iconKey ?? null) as RoleIconKey | null;
  if (key && ICONS_BY_KEY[key]) {
    const Icon = ICONS_BY_KEY[key];
    return <Icon className="h-4 w-4" />;
  }

  const idx = hashStringToIndex(
    `${role._id}:${role.key}`,
    FALLBACK_ICON_POOL.length,
  );
  const fallbackKey = FALLBACK_ICON_POOL[idx] ?? "users";
  const FallbackIcon = ICONS_BY_KEY[fallbackKey] ?? UsersIcon;

  return <FallbackIcon className="h-4 w-4" />;
}

/* ---------------------------- Icons map -------------------------- */
/**
 * Backend sends:
 * - iconKey: RoleIconKey
 * - iconUrl: optional uploaded URL
 *
 * Render iconUrl if present, else map iconKey -> lucide icon.
 * If neither exists, deterministic fallback so EVERY role still has an icon.
 */
const ICONS_BY_KEY: Record<
  RoleIconKey,
  ComponentType<SVGProps<SVGSVGElement>>
> = {
  user: User,
  users: UsersIcon,
  shield: ShieldCheck,
  badge: BadgeCheck,
  megaphone: Megaphone,
  scanner: ScanLine,
  crown: Crown,
  gem: Gem,
  wrench: Wrench,
  settings: Settings2,

  owner: Crown,

  star: Star,
  sparkles: Sparkles,
  bolt: Bolt,
  rocket: Rocket,
  lock: Lock,
  key: KeyRound,
  eye: Eye,
  globe: Globe,
  flag: Flag,
  camera: Camera,
  mic: Mic,
  clipboard: ClipboardList,
  ticket: Ticket,
  wallet: Wallet,
};

const FALLBACK_ICON_POOL: RoleIconKey[] = [
  "badge",
  "crown",
  "star",
  "sparkles",
  "bolt",
  "rocket",
  "gem",
  "wrench",
  "settings",
  "flag",
  "globe",
  "camera",
  "mic",
  "clipboard",
  "key",
  "eye",
  "users",
  "user",
];

function hashStringToIndex(input: string, mod: number) {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return mod ? h % mod : 0;
}

function resolveRoleIconNode(role: OrgRoleRow): ReactNode {
  if (role.iconUrl) {
    return (
      <Image
        src={role.iconUrl}
        alt=""
        width={20}
        height={20}
        className="h-5 w-5 rounded-[6px] object-cover"
        draggable={false}
      />
    );
  }

  const key = (role.iconKey ?? null) as RoleIconKey | null;
  if (key && ICONS_BY_KEY[key]) {
    const Icon = ICONS_BY_KEY[key];
    return <Icon className="h-5 w-5" />;
  }

  const idx = hashStringToIndex(
    `${role._id}:${role.key}`,
    FALLBACK_ICON_POOL.length,
  );
  const fallbackKey = FALLBACK_ICON_POOL[idx] ?? "users";
  const FallbackIcon = ICONS_BY_KEY[fallbackKey] ?? UsersIcon;

  return <FallbackIcon className="h-5 w-5" />;
}

/* ---------------------------- System roles ----------------------- */
const ROLE_ORDER: Role[] = ["admin", "promoter", "scanner", "collaborator"];

/**
 * NOTE: Owner should NOT be shown here.
 * If you ever add "owner" as a system role key in backend, keep excluding it.
 */
type RoleAccentMeta = {
  title: string;
  subtitle: string;
  hint: string;
  color: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const SYSTEM_ROLE_ACCENTS: Record<Role, RoleAccentMeta> = {
  admin: {
    title: "Admin",
    subtitle: "Full organization control",
    hint: "Best for owners / managers",
    color: "#9A46FF",
    Icon: ShieldCheck,
  },
  promoter: {
    title: "Promoter",
    subtitle: "Links & promo tools",
    hint: "Best for marketing",
    color: "#428BFF",
    Icon: Megaphone,
  },
  scanner: {
    title: "Scanner",
    subtitle: "Door check-in (QR tools)",
    hint: "Best for entry team",
    color: "#34D399",
    Icon: ScanLine,
  },
  collaborator: {
    title: "Collaborator",
    subtitle: "Limited collaboration",
    hint: "Best for helpers",
    color: "#A855F7",
    Icon: UsersIcon,
  },
};

/* --------------------------- a11y focus trap --------------------- */
function useFocusTrap(
  active: boolean,
  containerRef: { current: HTMLElement | null },
) {
  useEffect(() => {
    if (!active || !containerRef.current) return;

    const el = containerRef.current;
    const qs = 'a,button,input,textarea,select,[tabindex]:not([tabindex="-1"])';
    const nodes = Array.from(el.querySelectorAll<HTMLElement>(qs)).filter(
      (n) => !n.hasAttribute("disabled"),
    );

    const first = nodes[0];
    const last = nodes[nodes.length - 1];

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      if (!nodes.length) return;

      if (document.activeElement === last && !e.shiftKey) {
        e.preventDefault();
        first?.focus();
      } else if (document.activeElement === first && e.shiftKey) {
        e.preventDefault();
        last?.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    first?.focus();

    return () => document.removeEventListener("keydown", onKey);
  }, [active, containerRef]);
}

/* ------------------------ Galaxy Stepper (same as promo) ------------------------ */
type StepId = "role" | "email" | "apply";

type StepDef = {
  id: StepId;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const steps: StepDef[] = [
  { id: "role", label: "Role", icon: (props) => <ShieldCheck {...props} /> },
  { id: "email", label: "Email", icon: (props) => <Mail {...props} /> },
  { id: "apply", label: "Apply", icon: (props) => <Check {...props} /> },
];

const stepTitles = ["Choose a role", "Add email", "Apply & invite"] as const;

/* --------------------------- Compact Summary ------------------------ */
function SummaryCard({
  roleMeta,
  email,
  temporary,
  expiresAt,
}: {
  roleMeta: RolePillMeta;
  email: string;
  temporary: boolean;
  expiresAt: string;
}) {
  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-xl border border-white/10",
        "bg-white/4",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-100"
        style={{
          background:
            "radial-gradient(900px 220px at 10% -30%, rgba(154,70,255,0.14), transparent 62%), radial-gradient(700px 240px at 90% 120%, rgba(66,139,255,0.08), transparent 60%)",
        }}
      />

      <div className="relative px-4 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={clsx(
                "grid size-9 place-items-center rounded-lg",
                "bg-primary-500/14 text-primary-200 ring-1 ring-primary-500/18",
              )}
            >
              <Sparkles className="h-4 w-4" />
            </div>

            <div className="leading-tight">
              <div className="text-[13px] font-semibold text-neutral-0">
                Invite summary
              </div>
              <div className="mt-0.5 text-[12px] text-neutral-500">
                Quick check before sending.
              </div>
            </div>
          </div>

          <span className="hidden sm:inline-flex">
            <RolePillPreview meta={roleMeta} />
          </span>
        </div>

        <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-neutral-950/35 px-3 py-2.5">
            <div className="flex items-center gap-2 text-[12px] text-neutral-500">
              <Sparkles className="h-4 w-4 text-neutral-600" />
              Role
            </div>
            <div className="mt-1">
              <RolePillPreview meta={roleMeta} />
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-neutral-950/35 px-3 py-2.5">
            <div className="flex items-center gap-2 text-[12px] text-neutral-500">
              <Mail className="h-4 w-4 text-neutral-600" />
              Email
            </div>
            <div
              className="mt-1 truncate text-[13px] font-semibold text-neutral-0"
              title={email || "—"}
            >
              {email || "—"}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-neutral-950/35 px-3 py-2.5">
            <div className="flex items-center gap-2 text-[12px] text-neutral-500">
              <Clock3 className="h-4 w-4 text-neutral-600" />
              Access
            </div>
            <div className="mt-1 truncate text-[13px] font-semibold text-neutral-0">
              {temporary ? "Temporary" : "Permanent"}
            </div>
            <div className="mt-0.5 text-[12px] text-neutral-500">
              {temporary
                ? expiresAt
                  ? `Until ${prettyDate(expiresAt)}`
                  : "—"
                : "No expiration"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------ Compact Role Tile ------------------------ */
function RoleTile({
  active,
  title,
  subtitle,
  hint,
  icon,
  accentHex,
  metaRight,
  onPick,
}: {
  active: boolean;
  title: string;
  subtitle: string;
  hint?: string;
  icon: ReactNode;
  accentHex?: string;
  metaRight?: ReactNode;
  onPick: () => void;
}) {
  const a = accentFromHex(accentHex);

  return (
    <button
      type="button"
      onClick={onPick}
      className={clsx(
        "group relative w-full overflow-hidden rounded-xl text-left",
        "border transition-all duration-200",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/55",
        active
          ? "border-primary-600/35 bg-primary-950/16"
          : "border-white/10 bg-white/4 hover:bg-white/6",
      )}
    >
      <div
        aria-hidden="true"
        className={clsx(
          "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200",
          active && "opacity-100",
        )}
        style={{
          background: `radial-gradient(560px 210px at 82% 0%, ${a.glow}, transparent 62%), radial-gradient(520px 220px at 10% 120%, rgba(66,139,255,0.05), transparent 60%)`,
        }}
      />

      <div className="relative flex items-center gap-3 px-3.5 py-3">
        <div
          className={clsx(
            "relative grid size-10 place-items-center rounded-xl",
            "ring-1 ring-inset",
          )}
          style={{
            background: a.bg,
            borderColor: a.ring,
            boxShadow: active ? `0 0 24px ${a.glow}` : "none",
            color: a.text,
          }}
        >
          {icon}

          <span
            aria-hidden="true"
            className={clsx(
              "absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full border transition-all",
              active
                ? "border-white/10 bg-primary-600 shadow-[0_0_18px_rgba(133,0,255,0.45)]"
                : "border-white/12 bg-neutral-950/50 opacity-0 group-hover:opacity-100",
            )}
          >
            <span
              className={clsx(
                "h-2.5 w-2.5 rounded-full bg-white transition-opacity",
                active ? "opacity-100" : "opacity-0",
              )}
            />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold text-neutral-0">
                {title}
              </div>
            </div>

            {/* keep DOM/layout stable to avoid height jumps on selection */}
            <span
              className={clsx(
                "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                active
                  ? "border-primary-500/25 bg-primary-900/14 text-primary-200 opacity-100"
                  : "border-transparent bg-transparent text-transparent opacity-0",
              )}
              aria-hidden={!active}
            >
              Selected
            </span>
          </div>

          <div className="mt-0.5 truncate text-[12px] text-neutral-400">
            {subtitle}
          </div>

          {hint ? (
            <div className="mt-1 text-[11px] text-neutral-500">{hint}</div>
          ) : null}
        </div>

        {metaRight ? (
          <div className="shrink-0 text-right">{metaRight}</div>
        ) : null}
      </div>

      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 right-0 h-px opacity-70"
        style={{
          background: active
            ? `linear-gradient(90deg, transparent, ${a.ring}, transparent)`
            : "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
        }}
      />
    </button>
  );
}

/* ------------------------------ Modal ---------------------------- */
export default function InviteTeamModal({
  open,
  onClose,
  onInvite,
  isSubmitting,
  orgId,
}: Props) {
  const [step, setStep] = useState<0 | 1 | 2>(0);

  // step burst (same UX candy as promo stepper)
  const [stepBurst, setStepBurst] = useState(false);
  const burstTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (burstTimerRef.current) window.clearTimeout(burstTimerRef.current);
    };
  }, []);

  const triggerStepBurst = useCallback(() => {
    setStepBurst(true);
    if (burstTimerRef.current) window.clearTimeout(burstTimerRef.current);
    burstTimerRef.current = window.setTimeout(() => setStepBurst(false), 260);
  }, []);

  // selection:
  // - system role: selectedRole
  // - custom role: selectedRoleId
  const [selectedRole, setSelectedRole] = useState<Role>("collaborator");
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");

  const [email, setEmail] = useState("");
  const [temporary, setTemporary] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string>("");

  // Apply to which events?
  const [applyExisting, setApplyExisting] = useState(true);
  const [applyFuture, setApplyFuture] = useState(true);

  const overlayRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap(open, panelRef);

  const { data: roles } = useQuery<OrgRoleRow[]>({
    queryKey: ["org-roles", orgId],
    queryFn: () => json<OrgRoleRow[]>(`/api/organizations/${orgId}/roles`),
    enabled: open && !!orgId,
    staleTime: 30_000,
  });

  const customRoles = useMemo(() => {
    const list = roles ?? [];
    return list
      .filter((r) => !r.isSystem)
      .slice()
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  }, [roles]);

  const emailValid = validateEmail(email);
  const hasRoleSelection = Boolean(selectedRoleId) || Boolean(selectedRole);

  const canGoNextFromStep0 = hasRoleSelection;
  const canGoNextFromStep1 = emailValid;
  const canSubmit =
    step === 2 &&
    emailValid &&
    hasRoleSelection &&
    (!temporary || Boolean(expiresAt)) &&
    (applyExisting || applyFuture);

  const goNext = () => setStep((s) => (s < 2 ? ((s + 1) as 0 | 1 | 2) : s));
  const goPrev = () => setStep((s) => (s > 0 ? ((s - 1) as 0 | 1 | 2) : s));

  const selectedLabel = useMemo(() => {
    if (selectedRoleId) {
      const found = customRoles.find((r) => r._id === selectedRoleId);
      return found?.name ?? "Custom role";
    }
    return SYSTEM_ROLE_ACCENTS[selectedRole]?.title ?? "Role";
  }, [selectedRoleId, selectedRole, customRoles]);

  const selectedRoleMeta = useMemo<RolePillMeta>(() => {
    // custom role selected
    if (selectedRoleId) {
      const found = customRoles.find((r) => r._id === selectedRoleId);
      if (found) {
        return {
          key: found.key,
          name: found.name,
          color: found.color,
          iconNode: resolveRoleIconNodeSmall(found),
        };
      }
      // fallback
      return {
        key: "custom",
        name: selectedLabel,
        color: "#9A46FF",
        iconNode: <UsersIcon className="h-4 w-4" />,
      };
    }

    // system role selected
    const sys = SYSTEM_ROLE_ACCENTS[selectedRole];
    return {
      key: selectedRole,
      name: sys?.title ?? selectedLabel,
      color: sys?.color,
      iconNode: sys?.Icon ? (
        <sys.Icon className="h-4 w-4" />
      ) : (
        <UsersIcon className="h-4 w-4" />
      ),
    };
  }, [selectedRoleId, customRoles, selectedRole, selectedLabel]);

  const submit = () =>
    onInvite({
      email: email.trim(),
      ...(selectedRoleId ? { roleId: selectedRoleId } : { role: selectedRole }),
      temporaryAccess: temporary,
      expiresAt: temporary ? expiresAt || undefined : undefined,
      applyTo: { existing: applyExisting, future: applyFuture },
    });

  // Reset most fields when the modal closes
  useEffect(() => {
    if (!open) {
      setStep(0);
      setSelectedRole("collaborator");
      setSelectedRoleId("");
      setEmail("");
      setTemporary(false);
      setExpiresAt("");
    }
  }, [open]);

  // Ensure both checkboxes are checked whenever the modal opens
  useEffect(() => {
    if (open) {
      setApplyExisting(true);
      setApplyFuture(true);
    }
  }, [open]);

  // ESC + scroll lock
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  // stepper aura position (same formula, adjusted for 3 steps)
  const activeLeftExpr =
    steps.length === 1
      ? "50%"
      : `calc(${step / (steps.length - 1)} * (100% - 50px) + 20px)`;

  const title = stepTitles[step];
  const subtitle =
    step === 0
      ? "Pick the permissions level (owner is hidden)."
      : step === 1
        ? "We’ll send an invite link immediately."
        : "Set duration + how it applies to events.";

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className={clsx("fixed inset-0 z-[85] flex items-center justify-center")}
      aria-modal="true"
      role="dialog"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-[10px]"
      />

      <div
        ref={panelRef}
        className={clsx(
          "relative w-full max-w-[920px] overflow-hidden rounded-xl",
          "border border-white/10 bg-neutral-950/80",
          "shadow-[0_30px_120px_rgba(0,0,0,0.75)]",
          "h-[calc(100vh-40px)] md:h-[calc(100vh-56px)]",
          "flex flex-col",
          "mx-3",
        )}
      >
        {/* background wash */}
        <div
          className="pointer-events-none absolute inset-0 opacity-100"
          style={{
            background:
              "radial-gradient(1100px 520px at 18% -10%, rgba(154,70,255,0.18), transparent 60%), radial-gradient(900px 520px at 100% 20%, rgba(66,139,255,0.09), transparent 62%), linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
          }}
        />

        {/* Stepper header at the very top, full width */}
        <div className="relative">
          <div
            className={clsx(
              "tikd-ttw-stepper",
              stepBurst && "tikd-ttw-stepper--burst",
              "rounded-none border-b border-white/10",
            )}
          >
            <div className="tikd-ttw-stepperInner px-6 md:px-8 py-4">
              {/* active aura */}
              <div className="pointer-events-none absolute inset-0 z-0">
                <div
                  style={{ left: activeLeftExpr }}
                  className={clsx(
                    "absolute top-[34px] -translate-x-1/2 -translate-y-1/2",
                    "transition-[left,opacity,transform] duration-500",
                    "ease-[cubic-bezier(0.2,0.85,0.2,1)]",
                  )}
                >
                  <div className="tikd-ttw-aura" />
                </div>
              </div>

              {/* dots + connectors */}
              <div className="relative z-10 flex w-full items-center">
                {steps.map((s, idx) => {
                  const Icon = s.icon;
                  const isActive = step === idx;
                  const isCompleted = step > idx;

                  return (
                    <Fragment key={s.id}>
                      <button
                        type="button"
                        onClick={() => {
                          if (idx > step) {
                            if (step === 0 && !canGoNextFromStep0) return;
                            if (step === 1 && !canGoNextFromStep1) return;
                          }
                          setStep(idx as 0 | 1 | 2);
                          triggerStepBurst();
                        }}
                        className={clsx(
                          "group relative z-10 flex items-center justify-center outline-none",
                          "h-10 w-10 rounded-full",
                          isActive
                            ? "tikd-ttw-dot tikd-ttw-dot--active"
                            : isCompleted
                              ? "tikd-ttw-dot tikd-ttw-dot--done"
                              : "tikd-ttw-dot",
                        )}
                        aria-current={isActive ? "step" : undefined}
                      >
                        <Icon
                          className={clsx(
                            "relative transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
                            isActive ? "h-4 w-4" : "h-[14px] w-[14px]",
                            isActive
                              ? "text-neutral-0"
                              : isCompleted
                                ? "text-primary-600"
                                : "text-neutral-500",
                          )}
                        />
                      </button>

                      {idx < steps.length - 1 && (
                        <div className="flex-1 px-1.5">
                          <div
                            className={clsx(
                              "h-px w-full",
                              step > idx ? "bg-primary-600/45" : "bg-white/10",
                            )}
                          />
                        </div>
                      )}
                    </Fragment>
                  );
                })}
              </div>

              {/* labels row */}
              <div className="relative mt-2 h-6">
                {steps.map((s, idx) => {
                  const isActive = step === idx;
                  const isCompleted = step > idx;

                  const leftExpr =
                    steps.length === 1
                      ? "50%"
                      : `calc(${idx / (steps.length - 1)} * (100% - 40px) + 20px)`;

                  return (
                    <button
                      key={`${s.id}-label`}
                      type="button"
                      onClick={() => {
                        if (idx > step) {
                          if (step === 0 && !canGoNextFromStep0) return;
                          if (step === 1 && !canGoNextFromStep1) return;
                        }
                        setStep(idx as 0 | 1 | 2);
                        triggerStepBurst();
                      }}
                      style={{ left: leftExpr }}
                      className={clsx(
                        "absolute top-0 -translate-x-1/2 text-center font-medium tracking-[0.01em] outline-none",
                        "w-[92px]",
                        isActive
                          ? "text-neutral-0"
                          : isCompleted
                            ? "text-neutral-100"
                            : "text-neutral-300",
                      )}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Close button BELOW the stepper header */}
          <div className="relative px-5 pt-3">
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className={clsx(
                  "inline-flex h-9 w-9 items-center justify-center rounded-full",
                  "border border-white/12 bg-neutral-950/55 text-neutral-100",
                  "hover:bg-neutral-950/80",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
                )}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Body (no big inner container) */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (step === 0) {
              if (canGoNextFromStep0) goNext();
              return;
            }
            if (step === 1) {
              if (canGoNextFromStep1) goNext();
              return;
            }
            if (step === 2) {
              if (canSubmit) submit();
              return;
            }
          }}
          className="relative flex-1 overflow-y-auto no-scrollbar px-5 pb-4 pt-2"
          noValidate
        >
          {/* Title + helper (compact) */}
          <div className="mb-3">
            <h2 className="text-[15px] font-semibold text-neutral-0">
              {title}
            </h2>
            <p className="mt-1 text-[12px] text-neutral-400">{subtitle}</p>
          </div>

          {/* Summary */}
          <SummaryCard
            roleMeta={selectedRoleMeta}
            email={email}
            temporary={temporary}
            expiresAt={expiresAt}
          />

          {/* Step content */}
          <div className="mt-4 min-w-0">
            {/* STEP 0: Role */}
            {step === 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[12px] text-neutral-500">
                    System roles + your custom roles. Owner is hidden.
                  </div>
                  <div className="text-[11px] text-neutral-600">
                    From Roles & Permissions
                  </div>
                </div>

                {/* System roles (exclude Owner implicitly) */}
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {ROLE_ORDER.map((r) => {
                    const meta = SYSTEM_ROLE_ACCENTS[r];
                    const active = !selectedRoleId && selectedRole === r;

                    return (
                      <RoleTile
                        key={r}
                        active={active}
                        title={meta.title}
                        subtitle={meta.subtitle}
                        hint={meta.hint}
                        icon={<meta.Icon className="h-5 w-5" />}
                        accentHex={meta.color}
                        onPick={() => {
                          setSelectedRole(r);
                          setSelectedRoleId("");
                        }}
                      />
                    );
                  })}
                </div>

                {/* Custom roles */}
                <div className="pt-1">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-[12px] font-semibold text-neutral-200">
                      Custom roles
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      {customRoles.length} role
                      {customRoles.length === 1 ? "" : "s"}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {customRoles.map((r) => {
                      const iconNode = resolveRoleIconNode(r);
                      const active = selectedRoleId === r._id;

                      return (
                        <RoleTile
                          key={r._id}
                          active={active}
                          title={r.name}
                          subtitle="Custom permissions role"
                          icon={iconNode}
                          accentHex={r.color}
                          metaRight={
                            <div className="text-[11px] leading-tight">
                              <div className="text-neutral-500">Members</div>
                              <div className="mt-0.5 font-semibold text-neutral-200">
                                {r.membersCount ?? 0}
                              </div>
                            </div>
                          }
                          onPick={() => setSelectedRoleId(r._id)}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 1: Email */}
            {step === 1 && (
              <div className="space-y-3">
                <div className="text-[12px] font-semibold text-neutral-200">
                  Email address
                </div>

                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  variant="full"
                  size="md"
                  icon={<Mail className="h-4 w-4 text-white/80" />}
                />

                {!!email.length && !emailValid && (
                  <p className="text-[12px] text-error-300">
                    Please enter a valid email.
                  </p>
                )}

                <div className="flex items-center gap-2 text-[12px] text-neutral-500">
                  <Mail className="h-4 w-4" />
                  Invite link is sent immediately.
                </div>
              </div>
            )}

            {/* STEP 2: Apply */}
            {step === 2 && (
              <div className="space-y-4">
                {/* Temporary access */}
                <div className="rounded-xl border border-white/10 bg-white/4 p-3">
                  <label className="group flex items-center gap-3 rounded-xl border border-white/10 bg-neutral-950/50 px-3 py-2.5 hover:border-primary-700/40 focus-within:ring-1 focus-within:ring-primary-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={temporary}
                      onChange={(e) => setTemporary(e.target.checked)}
                      className="peer sr-only"
                    />

                    <span className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-neutral-100">
                      <Clock3 className="h-4 w-4 opacity-80" />
                      Temporary access
                    </span>

                    <span
                      aria-hidden="true"
                      className={clsx(
                        "ml-auto grid size-5 place-items-center rounded-[6px] bg-neutral-950 ring-1 ring-inset ring-white/15 transition",
                        "peer-checked:bg-primary-900/25 peer-checked:ring-primary-500",
                        "[&>svg]:opacity-0 [&>svg]:scale-75 [&>svg]:-rotate-6",
                        "peer-checked:[&>svg]:opacity-100 peer-checked:[&>svg]:scale-100 peer-checked:[&>svg]:rotate-0",
                      )}
                    >
                      <Check className="h-3.5 w-3.5 text-primary-400 transition-all duration-200 ease-out" />
                    </span>
                  </label>

                  {temporary && (
                    <div className="mt-3">
                      <div className="text-[12px] font-semibold text-neutral-200">
                        Expires at
                      </div>

                      <div className="mt-2 relative">
                        <CalendarIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-500" />
                        <input
                          id="expires"
                          type="datetime-local"
                          value={expiresAt}
                          onChange={(e) => setExpiresAt(e.target.value)}
                          className={clsx(
                            "h-11 w-full rounded-lg border bg-neutral-950/55 pl-11 pr-12 text-[13px] text-neutral-0 outline-none",
                            "border-white/10 focus:ring-1 focus:ring-primary-500",
                            "appearance-none",
                            "[&::-webkit-calendar-picker-indicator]:hidden",
                            "[&::-webkit-clear-button]:hidden",
                            "[&::-webkit-inner-spin-button]:hidden",
                            "[&::-webkit-datetime-edit]:text-neutral-0",
                          )}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const el = document.getElementById(
                              "expires",
                            ) as HTMLInputElement | null;
                            if (!el) return;

                            const withPicker = el as HTMLInputElement & {
                              showPicker?: () => void;
                            };
                            if (typeof withPicker.showPicker === "function")
                              withPicker.showPicker();
                            else el.focus();
                          }}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 grid size-8 place-items-center rounded-md bg-white/5 ring-1 ring-inset ring-white/10 hover:ring-primary-700/40"
                          aria-label="Open date & time picker"
                          title="Open date & time picker"
                        >
                          <CalendarIcon className="h-[18px] w-[18px] text-neutral-100" />
                        </button>
                      </div>

                      <p className="mt-2 text-[12px] text-neutral-500">
                        After this time the membership becomes <em>expired</em>.
                      </p>
                    </div>
                  )}
                </div>

                {/* Apply to events */}
                <div className="rounded-xl border border-white/10 bg-white/4 p-3">
                  <div className="mb-2">
                    <h4 className="text-[12.5px] font-semibold text-neutral-0">
                      Apply to events
                    </h4>
                    <p className="mt-1 text-[12px] text-neutral-500">
                      Keep at least one checked.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-neutral-950/50 px-3 py-2.5 hover:border-primary-700/40 focus-within:ring-1 focus-within:ring-primary-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={applyExisting}
                        onChange={(e) => setApplyExisting(e.target.checked)}
                        className="peer sr-only"
                      />
                      <span
                        className={clsx(
                          "grid size-5 place-items-center rounded-[6px] bg-neutral-950 ring-1 ring-inset ring-white/15 transition",
                          "peer-checked:bg-primary-900/25 peer-checked:ring-primary-500",
                          "[&>svg]:opacity-0 [&>svg]:scale-75 [&>svg]:-rotate-6",
                          "peer-checked:[&>svg]:opacity-100 peer-checked:[&>svg]:scale-100 peer-checked:[&>svg]:rotate-0",
                        )}
                      >
                        <Check className="h-3.5 w-3.5 text-primary-400 transition-all duration-200 ease-out" />
                      </span>
                      <span className="text-[12.5px] font-semibold text-neutral-100">
                        Existing events
                      </span>
                      <span className="ml-auto text-[12px] text-neutral-500">
                        Add to all current events
                      </span>
                    </label>

                    <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-neutral-950/50 px-3 py-2.5 hover:border-primary-700/40 focus-within:ring-1 focus-within:ring-primary-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={applyFuture}
                        onChange={(e) => setApplyFuture(e.target.checked)}
                        className="peer sr-only"
                      />
                      <span
                        className={clsx(
                          "grid size-5 place-items-center rounded-[6px] bg-neutral-950 ring-1 ring-inset ring-white/15 transition",
                          "peer-checked:bg-primary-900/25 peer-checked:ring-primary-500",
                          "[&>svg]:opacity-0 [&>svg]:scale-75 [&>svg]:-rotate-6",
                          "peer-checked:[&>svg]:opacity-100 peer-checked:[&>svg]:scale-100 peer-checked:[&>svg]:rotate-0",
                        )}
                      >
                        <Check className="h-3.5 w-3.5 text-primary-400 transition-all duration-200 ease-out" />
                      </span>
                      <span className="text-[12.5px] font-semibold text-neutral-100">
                        Future events
                      </span>
                      <span className="ml-auto text-[12px] text-neutral-500">
                        Auto-add to new events
                      </span>
                    </label>

                    {!applyExisting && !applyFuture && (
                      <div className="rounded-lg border border-white/10 bg-neutral-950/35 px-3 py-2 text-[12px] text-neutral-400">
                        Pick at least one option (existing or future).
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="mt-6 border-t border-white/10 pt-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {step > 0 ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    className="rounded-lg"
                    onClick={() => {
                      goPrev();
                      triggerStepBurst();
                    }}
                    disabled={isSubmitting}
                  >
                    Back
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    className="rounded-lg"
                    onClick={onClose}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {step < 2 ? (
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    className={clsx(
                      "rounded-lg",
                      "bg-[linear-gradient(90deg,rgba(154,70,255,0.95),rgba(66,139,255,0.55))]",
                      "hover:bg-[linear-gradient(90deg,rgba(154,70,255,1),rgba(66,139,255,0.62))]",
                      "shadow-[0_18px_40px_rgba(154,70,255,0.18)]",
                    )}
                    onClick={() => {
                      if (step === 0 && !canGoNextFromStep0) return;
                      if (step === 1 && !canGoNextFromStep1) return;
                      goNext();
                      triggerStepBurst();
                    }}
                    disabled={
                      isSubmitting ||
                      (step === 0 ? !canGoNextFromStep0 : !canGoNextFromStep1)
                    }
                    animation
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    className={clsx(
                      "rounded-lg",
                      "bg-[linear-gradient(90deg,rgba(154,70,255,0.95),rgba(66,139,255,0.55))]",
                      "hover:bg-[linear-gradient(90deg,rgba(154,70,255,1),rgba(66,139,255,0.62))]",
                      "shadow-[0_18px_40px_rgba(154,70,255,0.18)]",
                    )}
                    disabled={isSubmitting || !canSubmit}
                    animation
                    icon={<Check className="h-4 w-4" />}
                  >
                    {isSubmitting ? "Inviting…" : "Send invite"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
