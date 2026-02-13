// src/app/dashboard/organizations/[id]/members/page.tsx
"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import {
  Search,
  MoreVertical,
  Trash2,
  ShieldCheck,
  Megaphone,
  ScanLine,
  Users as UsersIcon,
  CalendarDays,
  Eye,
  Ticket,
  CircleDollarSign,
  Plus,
  Crown,
  BadgeCheck,
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
  Globe,
  Flag,
  Camera,
  Mic,
  ClipboardList,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import InviteTeamModal, {
  type InvitePayload,
  type Role as InviteRole,
} from "@/components/bits/InviteTeamModal";
import RolesPermissionsModal from "@/components/dashboard/modals/RolesPermissionsModal";
import type { RoleIconKey } from "@/lib/roleIcons";

/* ----------------------------- Types ----------------------------- */
type Role = InviteRole | "member" | "owner";
type Status = "invited" | "active" | "revoked" | "expired";

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
  iconKey?: RoleIconKey | null;
  iconUrl?: string | null;
  isSystem: boolean;
  order: number;
  permissions: Partial<OrgPermissions>;
  membersCount: number;
};

type TeamMember = {
  _id: string;
  organizationId: string;
  email: string;
  name?: string;
  userId?: string | null;

  // system role (backwards compatibility)
  role: Role;

  // custom role (optional)
  roleId?: string | null;

  status: Status;
  temporaryAccess: boolean;
  expiresAt?: string;
  scope?: "full" | "checkin" | "promo" | "custom";
  createdAt: string;
  updatedAt: string;
};

type UpdateBody = Partial<{
  role: Role;
  roleId: string;
  status: Status;
  temporaryAccess: boolean;
  expiresAt?: string;
  action: "resend";
}>;

/* ---------------------------- Helpers ---------------------------- */
async function json<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function prettyDateShort(d?: string) {
  if (!d) return "";
  return new Date(d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function initialsFromName(name: string) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return "MB";

  const a = parts[0]?.[0] ?? "";
  const b = (parts.length > 1 ? parts[1]?.[0] : parts[0]?.[1]) ?? "";
  const two = `${a}${b}`.toUpperCase();
  return two || "MB";
}

function hashToInt(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

function fmtNum(n: number) {
  return n.toLocaleString(undefined);
}

function fmtUsd(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
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

/* ----------------------------- Role icon helpers --------------------------- */
const ROLE_ICON_MAP: Record<RoleIconKey, ReactNode> = {
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

type ResolvedRoleMeta = {
  key: string;
  name: string;
  color?: string;
  iconKey?: RoleIconKey | null;
  iconUrl?: string | null;
};

/* ----------------------------- UI bits --------------------------- */
function StatusPill({ status }: { status: Status }) {
  const map: Record<Status, string> = {
    invited:
      "bg-primary-500/12 text-primary-200 ring-primary-500/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
    active:
      "bg-white/8 text-neutral-50 ring-white/14 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
    revoked:
      "bg-error-500/12 text-error-200 ring-error-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
    expired:
      "bg-warning-500/12 text-warning-200 ring-warning-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
  };

  const label =
    status === "invited"
      ? "Invitation Pending"
      : status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1",
        "text-[13px] font-semibold ring-1 ring-inset",
        map[status],
      )}
    >
      {label}
    </span>
  );
}

function RolePill({ meta }: { meta: ResolvedRoleMeta }) {
  // owner stays a special case (not in OrgRole list)
  if (meta.key === "owner") {
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

function MetricChip({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-2 rounded-lg px-2.5 py-2",
        "border border-white/10 bg-white/5",
        "text-[13px] text-neutral-200",
      )}
    >
      <span
        className={clsx(
          "inline-flex h-7 w-7 items-center justify-center rounded-lg",
          "bg-primary-500/15 text-primary-300 ring-1 ring-primary-500/20",
        )}
      >
        {icon}
      </span>
      <span className="text-neutral-400">{label}:</span>
      <span className="font-semibold text-neutral-100">{value}</span>
    </span>
  );
}

/* ----------------------- Actions menu (3 dots) --------------------- */
function MemberActionsMenu({
  canManage,
  member,
  roles,
  rolesById,
  onRemove,
  onChangeRole,
}: {
  canManage: boolean;
  member: TeamMember;
  roles: OrgRoleRow[];
  rolesById: Map<string, OrgRoleRow>;
  onRemove: () => void;
  onChangeRole: (next: { role?: InviteRole; roleId?: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    maxHeight: number;
  } | null>(null);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node | null;
      if (!t) return;

      const btn = btnRef.current;
      const panel = panelRef.current;
      if (btn?.contains(t) || panel?.contains(t)) return;

      setOpen(false);
    };

    const reposition = () => {
      const btn = btnRef.current;
      if (!btn) return;

      const r = btn.getBoundingClientRect();
      const PANEL_W = 230;
      const PAD = 12;

      const maxHeight = Math.max(180, window.innerHeight - PAD * 2);

      let left = r.right - PANEL_W;
      left = Math.max(PAD, Math.min(left, window.innerWidth - PANEL_W - PAD));

      const belowTop = r.bottom + 10;

      setPos({ top: belowTop, left, maxHeight });

      requestAnimationFrame(() => {
        const panel = panelRef.current;
        const hRaw = panel?.offsetHeight ?? 0;
        const h = Math.min(hRaw, maxHeight);

        const maxBottom = window.innerHeight - PAD;

        const belowFits = belowTop + h <= maxBottom;
        const aboveTop = r.top - 10 - h;
        const aboveFits = aboveTop >= PAD;

        let top = belowTop;

        if (belowFits) top = belowTop;
        else if (aboveFits) top = aboveTop;
        else top = PAD;

        top = Math.max(PAD, Math.min(top, maxBottom - h));

        setPos({ top, left, maxHeight });
      });
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("touchstart", onDown);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    reposition();

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("touchstart", onDown);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open]);

  const DEFAULT_SYSTEM_ICON: Record<string, RoleIconKey> = {
    admin: "shield",
    promoter: "megaphone",
    scanner: "scanner",
    collaborator: "users",
    member: "user",
  };

  function roleBadgeStyle(hex?: string, active?: boolean) {
    const rgb = hex ? safeHexToRgb(hex) : null;
    if (!rgb) return null;

    return {
      background: active
        ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.22)`
        : `rgba(${rgb.r},${rgb.g},${rgb.b},0.14)`,
      borderColor: active
        ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.30)`
        : `rgba(${rgb.r},${rgb.g},${rgb.b},0.22)`,
      color: `rgba(${Math.min(255, rgb.r + 120)},${Math.min(
        255,
        rgb.g + 120,
      )},${Math.min(255, rgb.b + 120)},0.98)`,
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
    } as const;
  }

  function resolveRoleIconNode(
    r: { iconUrl?: string | null; iconKey?: RoleIconKey | null },
    fallbackKey: RoleIconKey,
  ) {
    if (r.iconUrl) {
      return (
        <img
          src={r.iconUrl}
          alt=""
          className="h-4 w-4 rounded-sm object-cover"
          draggable={false}
        />
      );
    }

    const key = r.iconKey ?? fallbackKey;
    return ROLE_ICON_MAP[key] ?? <UsersIcon className="h-4 w-4" />;
  }

  if (!canManage) return null;

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        aria-label="More actions"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "inline-flex h-9 w-9 items-center justify-center rounded-full",
          "bg-white/5 text-neutral-200 hover:bg-white/10",
          "border border-white/10",
          "opacity-90 hover:opacity-100",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
        )}
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && typeof document !== "undefined" && pos
        ? createPortal(
            <div
              ref={panelRef}
              style={{ top: pos.top, left: pos.left, maxHeight: pos.maxHeight }}
              className={clsx(
                "fixed z-[9999] w-[230px]",
                "overflow-hidden rounded-xl border border-white/10 bg-neutral-950/95",
                "shadow-[0_18px_70px_rgba(0,0,0,0.60)] backdrop-blur-[10px]",
              )}
            >
              <div className="px-3 py-2.5 border-b border-white/10">
                <div className="text-[12px] font-semibold text-neutral-200">
                  Edit Role
                </div>
                <div className="mt-0.5 text-[11px] text-neutral-500">
                  Current:{" "}
                  <span className="text-neutral-300 font-semibold">
                    {member.roleId
                      ? (rolesById.get(member.roleId)?.name ?? "Custom Role")
                      : String(member.role)}
                  </span>
                </div>
              </div>

              <div className="max-h-[calc(100vh-160px)] overflow-y-auto">
                <div className="p-2 space-y-1">
                  {(
                    ["admin", "promoter", "scanner", "collaborator"] as Role[]
                  ).map((r) => {
                    const active = r === member.role && !member.roleId;

                    const row =
                      (roles ?? []).find((x) => x.isSystem && x.key === r) ??
                      null;

                    const displayName =
                      row?.name ?? r.charAt(0).toUpperCase() + r.slice(1);

                    const badgeInline = roleBadgeStyle(row?.color, active);

                    const iconNode = resolveRoleIconNode(
                      {
                        iconUrl: row?.iconUrl ?? null,
                        iconKey: row?.iconKey ?? null,
                      },
                      DEFAULT_SYSTEM_ICON[String(r)] ?? "users",
                    );

                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          onChangeRole({ role: r as InviteRole });
                          setOpen(false);
                        }}
                        className={clsx(
                          "w-full px-2.5 py-2 rounded-lg text-left",
                          "flex items-center gap-2",
                          "border border-white/10",
                          active
                            ? "bg-primary-500/12 text-primary-100 ring-1 ring-primary-500/20"
                            : "bg-white/5 text-neutral-200 hover:bg-white/10",
                          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
                        )}
                      >
                        <span
                          className={clsx(
                            "inline-flex h-7 w-7 items-center justify-center rounded-lg ring-1",
                            badgeInline
                              ? ""
                              : "bg-white/5 text-neutral-200 ring-white/10",
                          )}
                          style={badgeInline ?? undefined}
                        >
                          {iconNode}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="text-[12px] font-semibold">
                            {displayName}
                          </div>
                          <div className="text-[11px] text-neutral-500">
                            System role
                          </div>
                        </div>

                        {active ? (
                          <span className="text-[11px] font-semibold text-primary-200">
                            Selected
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>

                <div className="border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onRemove();
                    }}
                    className={clsx(
                      "w-full px-3 py-2.5 text-left",
                      "flex items-center gap-2",
                      "text-[12px] font-semibold",
                      "text-red-300 hover:text-red-200",
                      "hover:bg-red-500/10",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 cursor-pointer",
                    )}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                </div>
                {(roles ?? []).some((r) => !r.isSystem) ? (
                  <div className="border-t border-white/10">
                    <div className="px-3 py-2 text-[11px] font-semibold text-neutral-500">
                      Custom roles
                    </div>

                    <div className="p-2 pt-0 space-y-1">
                      {(roles ?? [])
                        .filter((r) => !r.isSystem)
                        .slice()
                        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
                        .map((r) => {
                          const active =
                            !!member.roleId && member.roleId === r._id;

                          return (
                            <button
                              key={r._id}
                              type="button"
                              onClick={() => {
                                onChangeRole({ roleId: r._id }); // ✅ backend sets role="member" + roleId
                                setOpen(false);
                              }}
                              className={clsx(
                                "w-full px-2.5 py-2 rounded-lg text-left",
                                "flex items-center gap-2",
                                "border border-white/10",
                                active
                                  ? "bg-primary-500/10 text-primary-100 ring-1 ring-primary-500/18"
                                  : "bg-white/5 text-neutral-200 hover:bg-white/10",
                                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
                              )}
                            >
                              {(() => {
                                const badgeInline = roleBadgeStyle(
                                  r.color,
                                  active,
                                );
                                const iconNode = resolveRoleIconNode(
                                  {
                                    iconUrl: r.iconUrl ?? null,
                                    iconKey: r.iconKey ?? null,
                                  },
                                  "users",
                                );

                                return (
                                  <span
                                    className={clsx(
                                      "inline-flex h-7 w-7 items-center justify-center rounded-lg",
                                      badgeInline
                                        ? ""
                                        : "bg-white/5 text-neutral-200 ring-1 ring-white/10",
                                    )}
                                    style={badgeInline ?? undefined}
                                  >
                                    {iconNode}
                                  </span>
                                );
                              })()}

                              <div className="min-w-0 flex-1">
                                <div className="text-[12px] font-semibold truncate">
                                  {r.name}
                                </div>
                                <div className="text-[11px] text-neutral-500 truncate">
                                  {r.membersCount
                                    ? `${r.membersCount} members`
                                    : "Custom permissions"}
                                </div>
                              </div>

                              {active ? (
                                <span className="text-[11px] font-semibold text-primary-200">
                                  Selected
                                </span>
                              ) : null}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

/* ------------------------------ Pagination ------------------------ */
function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  const visible = useMemo(() => {
    const max = Math.min(totalPages, 4);
    return Array.from({ length: max }).map((_, i) => i + 1);
  }, [totalPages]);

  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-1">
      <button
        type="button"
        onClick={() => onPage(clamp(page - 1, 1, totalPages))}
        disabled={page <= 1}
        className={clsx(
          "inline-flex h-8 w-8 items-center justify-center rounded-md",
          "border border-white/10 bg-white/5 text-neutral-100",
          "hover:border-primary-500 disabled:opacity-40 disabled:hover:bg-white/5",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
        )}
        aria-label="Previous page"
      >
        ‹
      </button>

      {visible.map((p) => {
        const active = p === page;
        return (
          <button
            key={p}
            type="button"
            onClick={() => onPage(p)}
            className={clsx(
              "inline-flex h-8 w-8 items-center justify-center rounded-md text-[12px] font-semibold",
              "transition-colors",
              active
                ? "bg-primary-500 text-neutral-0"
                : "bg-white/0 text-neutral-200 hover:bg-white/10 hover:border-white/20",
            )}
            aria-current={active ? "page" : undefined}
          >
            {p}
          </button>
        );
      })}

      <button
        type="button"
        onClick={() => onPage(clamp(page + 1, 1, totalPages))}
        disabled={page >= totalPages}
        className={clsx(
          "inline-flex h-8 w-8 items-center justify-center rounded-md",
          "border border-white/10 bg-white/5 text-neutral-100",
          "hover:border-primary-500 disabled:opacity-40 disabled:hover:bg-white/5",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
        )}
        aria-label="Next page"
      >
        ›
      </button>
    </div>
  );
}

/* ------------------------------ Page ------------------------------ */
export default function OrgMembersPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const [tab, setTab] = useState<"active" | "temporary">("active");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [query, setQuery] = useState("");

  const tabBarRef = useRef<HTMLDivElement | null>(null);
  const indicatorRef = useRef<HTMLSpanElement | null>(null);

  function useFluidTabIndicator(
    containerRef: { current: HTMLElement | null },
    indicatorRef_: { current: HTMLElement | null },
    tabKey: string,
  ) {
    useLayoutEffect(() => {
      const c = containerRef.current;
      const i = indicatorRef_.current;
      if (!c || !i) return;
      const active = c.querySelector<HTMLButtonElement>(
        `[data-tab="${tabKey}"]`,
      );
      if (!active) return;
      const { offsetLeft, offsetWidth } = active;
      i.style.transform = `translateX(${offsetLeft}px)`;
      i.style.width = `${offsetWidth}px`;
    }, [containerRef, indicatorRef_, tabKey]);
  }

  useFluidTabIndicator(tabBarRef, indicatorRef, tab);

  const canManageMembers = true;

  const GRID =
    "md:grid md:items-center md:gap-6 md:grid-cols-[minmax(300px,2.2fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(140px,1fr)_minmax(140px,1fr)_minmax(140px,1fr)_minmax(200px,1fr)]";

  const { data: members, isLoading } = useQuery<TeamMember[]>({
    queryKey: ["org-team", id],
    queryFn: () => json<TeamMember[]>(`/api/organizations/${id}/team`),
    staleTime: 30_000,
  });

  const { data: roles } = useQuery<OrgRoleRow[]>({
    queryKey: ["org-roles", id],
    queryFn: () => json<OrgRoleRow[]>(`/api/organizations/${id}/roles`),
    staleTime: 30_000,
  });

  const rolesById = useMemo(() => {
    const map = new Map<string, OrgRoleRow>();
    for (const r of roles ?? []) map.set(r._id, r);
    return map;
  }, [roles]);

  const rolesByKey = useMemo(() => {
    const map = new Map<string, OrgRoleRow>();
    for (const r of roles ?? []) map.set(r.key, r);
    return map;
  }, [roles]);

  function resolveMemberRoleMeta(m: TeamMember): ResolvedRoleMeta {
    if (m.role === "owner") {
      return {
        key: "owner",
        name: "Owner",
        color: "#9A46FF",
        iconKey: "owner",
      };
    }

    // custom role
    if (m.roleId && rolesById.has(m.roleId)) {
      const r = rolesById.get(m.roleId)!;
      return {
        key: r.key,
        name: r.name,
        color: r.color || "",
        iconKey: r.iconKey ?? null,
        iconUrl: r.iconUrl ?? null,
      };
    }

    // system role resolved via roles list too
    const sys = rolesByKey.get(String(m.role));
    if (sys) {
      return {
        key: sys.key,
        name: sys.name,
        color: sys.color || "",
        iconKey: sys.iconKey ?? null,
        iconUrl: sys.iconUrl ?? null,
      };
    }

    // fallback
    const raw = String(m.role || "member");
    return {
      key: raw,
      name: raw.charAt(0).toUpperCase() + raw.slice(1),
      color: "",
      iconKey: "users",
    };
  }

  /**
   * Default sort: highest role -> lowest role
   * We follow the same role ordering users see in the “Roles” popup:
   * Owner (top), then Admin, then by `order`, then by name.
   */
  type OrgRoleRowWithIdx = OrgRoleRow & { __idx: number };

  const roleOrder = useMemo<OrgRoleRowWithIdx[]>(() => {
    const list: OrgRoleRow[] = [...(roles ?? [])];

    // ensure Owner exists as the top-most role even if backend doesn't return it
    if (!list.some((r) => r.key === "owner")) {
      list.unshift({
        _id: "__owner__",
        key: "owner",
        name: "Owner",
        color: "#9A46FF",
        iconKey: "owner",
        iconUrl: null,
        isSystem: true,
        order: -10_000,
        permissions: {},
        membersCount: 0,
      });
    }

    const rank = (r: OrgRoleRow) => {
      if (r.key === "owner") return -2;
      if (r.key === "admin") return -1;
      return 0;
    };

    const sorted = list.slice().sort((a, b) => {
      const ra = rank(a);
      const rb = rank(b);
      if (ra !== rb) return ra - rb;

      const ao = a.order ?? 0;
      const bo = b.order ?? 0;
      if (ao !== bo) return ao - bo;

      return a.name.localeCompare(b.name);
    });

    return sorted.map((r, idx) => ({ ...r, __idx: idx }));
  }, [roles]);

  const roleOrderIdxById = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of roleOrder) m.set(r._id, r.__idx);
    return m;
  }, [roleOrder]);

  const roleOrderIdxByKey = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of roleOrder) m.set(r.key, r.__idx);
    return m;
  }, [roleOrder]);

  const getMemberRoleOrderIndex = useMemo(() => {
    return (m: TeamMember) => {
      // owner (system)
      if (m.role === "owner") return roleOrderIdxByKey.get("owner") ?? 0;

      // custom role
      if (m.roleId && roleOrderIdxById.has(m.roleId)) {
        return roleOrderIdxById.get(m.roleId)!;
      }

      // system role by key
      const key = String(m.role || "member");
      if (roleOrderIdxByKey.has(key)) return roleOrderIdxByKey.get(key)!;

      // fallback to “member” bucket if it exists, else push to bottom
      return roleOrderIdxByKey.get("member") ?? 9_999;
    };
  }, [roleOrderIdxById, roleOrderIdxByKey]);

  const inviteMutation = useMutation({
    mutationFn: (payload: InvitePayload) =>
      json<{ member: TeamMember }>(`/api/organizations/${id}/team`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-team", id] });
      setInviteOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (args: { memberId: string; body: UpdateBody }) =>
      json<TeamMember>(`/api/organizations/${id}/team/${args.memberId}`, {
        method: "PATCH",
        body: JSON.stringify(args.body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org-team", id] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (memberId: string) =>
      json<{ ok: boolean }>(`/api/organizations/${id}/team/${memberId}`, {
        method: "DELETE",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org-team", id] }),
  });

  const [active, temporary] = useMemo(() => {
    const list = members ?? [];
    return [
      list.filter((m) => !m.temporaryAccess),
      list.filter((m) => m.temporaryAccess),
    ];
  }, [members]);

  const baseList = useMemo(
    () => (tab === "active" ? active : temporary),
    [tab, active, temporary],
  );

  // ✅ default sort by highest role -> lowest role (based on Roles popup order)
  const sortedBaseList = useMemo(() => {
    const list = baseList.slice();

    const secondary = (m: TeamMember) =>
      `${(m.name ?? "").trim().toLowerCase()}|${m.email.trim().toLowerCase()}`;

    list.sort((a, b) => {
      const ia = getMemberRoleOrderIndex(a);
      const ib = getMemberRoleOrderIndex(b);
      if (ia !== ib) return ia - ib; // smaller index == higher role (top of list)

      // stable-ish tie-breaker so the table doesn't "shuffle" randomly
      const sa = secondary(a);
      const sb = secondary(b);
      return sa.localeCompare(sb);
    });

    return list;
  }, [baseList, getMemberRoleOrderIndex]);

  const filtered = useMemo(() => {
    const qx = query.trim().toLowerCase();
    if (!qx) return sortedBaseList;
    return sortedBaseList.filter((m) => {
      const hay = `${m.name ?? ""} ${m.email}`.toLowerCase();
      return hay.includes(qx);
    });
  }, [sortedBaseList, query]);

  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setPage(1);
  }, [query, tab]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setPage((p) => clamp(p, 1, totalPages));
  }, [totalPages]);

  const pageSafe = clamp(page, 1, totalPages);

  const slice = useMemo(() => {
    const start = (pageSafe - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageSafe]);

  const showingLabel = useMemo(() => {
    if (!total) return "Showing 0-0 from 0 data";
    const start = (pageSafe - 1) * pageSize + 1;
    const end = Math.min(total, start + pageSize - 1);
    return `Showing ${start}-${end} from ${total} data`;
  }, [total, pageSafe]);

  const metrics = useMemo(() => {
    const map = new Map<
      string,
      { views: number; tickets: number; revenue: number }
    >();
    for (const m of filtered) {
      const seed = hashToInt(`${m._id}:${m.email}`);
      const views = 800 + (seed % 25000);
      const tickets = 10 + (seed % 920);
      const revenue = 250 + (seed % 125000) / 10;
      map.set(m._id, { views, tickets, revenue });
    }
    return map;
  }, [filtered]);

  return (
    <div className="relative overflow-hidden bg-neutral-950 text-neutral-0">
      <section className="pb-16">
        <section
          className={clsx(
            "mt-4 overflow-hidden rounded-2xl border border-white/10",
            "bg-neutral-950/70 shadow-[0_18px_60px_rgba(0,0,0,0.55)]",
          )}
        >
          <div
            className={clsx(
              "relative p-4 md:p-5",
              "bg-[radial-gradient(900px_320px_at_25%_0%,rgba(154,70,255,0.10),transparent_60%),radial-gradient(900px_320px_at_90%_110%,rgba(66,139,255,0.08),transparent_55%)]",
            )}
          >
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-base font-semibold tracking-[0.18em] text-neutral-300 uppercase">
                  Members
                </div>
                <div className="mt-1 text-neutral-400">
                  Manage members, roles, and access for this organization
                </div>
              </div>

              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
                <div
                  className={clsx(
                    "relative w-full sm:w-[420px]",
                    "rounded-lg border border-white/10 bg-white/5 h-10",
                  )}
                >
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-300" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search here"
                    className={clsx(
                      "h-10 w-full rounded-lg bg-transparent",
                      "pl-10 pr-4 text-[12px] text-neutral-100",
                      "placeholder:text-neutral-500",
                      "outline-none border-none focus:ring-1 focus:ring-primary-500",
                    )}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    icon={<ShieldCheck className="h-4 w-4" />}
                    onClick={() => setRolesOpen(true)}
                  >
                    Roles
                  </Button>

                  <Button
                    onClick={() => setInviteOpen(true)}
                    type="button"
                    variant="primary"
                    icon={<UsersIcon className="h-4 w-4" />}
                    animation
                  >
                    Invite Member
                  </Button>
                </div>
              </div>
            </div>

            <div className="mb-4 flex items-center justify-between gap-3">
              <div
                ref={tabBarRef}
                className="relative inline-flex rounded-full border border-white/10 bg-neutral-950"
              >
                <button
                  data-tab="active"
                  className={clsx(
                    "relative z-10 rounded-full px-4 py-2 text-[12px] font-semibold",
                    tab === "active"
                      ? "text-neutral-0"
                      : "text-neutral-300 hover:text-neutral-0",
                  )}
                  onClick={() => setTab("active")}
                >
                  Active Members
                </button>
                <button
                  data-tab="temporary"
                  className={clsx(
                    "relative z-10 rounded-full px-4 py-2 text-[12px] font-semibold",
                    tab === "temporary"
                      ? "text-neutral-0"
                      : "text-neutral-300 hover:text-neutral-0",
                  )}
                  onClick={() => setTab("temporary")}
                >
                  Temporary access
                </button>
                <span
                  ref={indicatorRef}
                  className="absolute left-0 top-0 h-full w-0 rounded-full bg-white/10 ring-1 ring-inset ring-white/15 transition-[transform,width] duration-200 ease-out"
                  aria-hidden="true"
                />
              </div>

              <div className="hidden md:inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-neutral-300">
                <span className="text-neutral-400">Members:</span>{" "}
                <span className="font-semibold text-neutral-100">{total}</span>
              </div>
            </div>

            <div
              className={clsx(
                "hidden md:block",
                "rounded-[12px] border border-white/10 bg-white/5 px-4 py-2.5",
                "text-[13px] font-semibold text-neutral-300",
              )}
            >
              <div className={GRID}>
                <div>Name</div>
                <div>Page Views</div>
                <div>Tickets Sold</div>
                <div>Revenue</div>
                <div>Role</div>
                <div>Date Added</div>
                <div>Status</div>
              </div>
            </div>

            <div className="mt-3">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-[88px] rounded-[12px]" />
                  ))}
                </div>
              ) : slice.length ? (
                <div className="space-y-3">
                  {slice.map((m) => {
                    const title = m.name || m.email;
                    const badge = initialsFromName(title);
                    const met = metrics.get(m._id) ?? {
                      views: 0,
                      tickets: 0,
                      revenue: 0,
                    };

                    const roleMeta = resolveMemberRoleMeta(m);

                    return (
                      <div
                        key={m._id}
                        className={clsx(
                          "relative rounded-[12px] border border-white/10 bg-white/5 px-4 py-3",
                          "hover:bg-white/7 transition-colors",
                        )}
                      >
                        <div className={clsx("hidden md:block")}>
                          <div className={GRID}>
                            <div className="min-w-0">
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="relative">
                                  <div className="h-10 w-10 overflow-hidden rounded-[10px] bg-white/5 ring-1 ring-white/10">
                                    <div className="flex h-full w-full items-center justify-center text-[13px] font-extrabold text-neutral-200">
                                      {badge}
                                    </div>
                                  </div>
                                  <div className="absolute -right-2 -bottom-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary-500/90 text-[10px] font-extrabold text-neutral-0 ring-1 ring-white/10">
                                    {badge}
                                  </div>
                                </div>

                                <div className="min-w-0">
                                  <div className="truncate text-[14px] font-semibold text-neutral-0">
                                    {title}
                                  </div>
                                  <div className="truncate text-[13px] text-neutral-400">
                                    {m.email}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="text-[13px] text-neutral-200">
                              <div className="pl-1 flex items-center gap-1.5 ">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="12"
                                  height="12"
                                  viewBox="0 0 12 12"
                                  fill="none"
                                  className="h-4 w-4"
                                >
                                  <path
                                    fillRule="evenodd"
                                    clipRule="evenodd"
                                    d="M10.8749 6.00001L11.1862 5.84401V5.84251L11.1839 5.84026L11.1794 5.83126L11.1637 5.80126L11.1037 5.69326C11.0304 5.56696 10.9526 5.44338 10.8704 5.32276C10.596 4.91997 10.2806 4.54673 9.92916 4.20901C9.08467 3.39901 7.78491 2.57251 5.99992 2.57251C4.21642 2.57251 2.91592 3.39826 2.07142 4.20901C1.72001 4.54673 1.40457 4.91997 1.13017 5.32276C1.01882 5.48704 0.915692 5.65675 0.821166 5.83126L0.816666 5.84026L0.815166 5.84251V5.84326C0.815166 5.84326 0.814416 5.84401 1.12567 6.00001L0.814416 5.84326C0.790351 5.89188 0.777832 5.94539 0.777832 5.99963C0.777832 6.05388 0.790351 6.10739 0.814416 6.15601L0.813666 6.15751L0.815916 6.15976L0.820416 6.16876C0.843802 6.21562 0.868817 6.26165 0.895416 6.30676C1.21836 6.85232 1.61343 7.35182 2.06992 7.79176C2.91517 8.60176 4.21492 9.42676 5.99992 9.42676C7.78416 9.42676 9.08466 8.60176 9.92991 7.79101C10.2807 7.45289 10.5958 7.07969 10.8704 6.67726C10.9756 6.52242 11.0734 6.36275 11.1637 6.19876L11.1794 6.16876L11.1839 6.15976L11.1854 6.15751V6.15676C11.1854 6.15676 11.1862 6.15601 10.8749 6.00001ZM10.8749 6.00001L11.1862 6.15676C11.2102 6.10814 11.2227 6.05463 11.2227 6.00038C11.2227 5.94614 11.2102 5.89262 11.1862 5.84401L10.8749 6.00001ZM5.95492 4.84801C5.64939 4.84801 5.35637 4.96938 5.14033 5.18542C4.92429 5.40146 4.80292 5.69448 4.80292 6.00001C4.80292 6.30554 4.92429 6.59855 5.14033 6.8146C5.35637 7.03064 5.64939 7.15201 5.95492 7.15201C6.26044 7.15201 6.55346 7.03064 6.7695 6.8146C6.98554 6.59855 7.10691 6.30554 7.10691 6.00001C7.10691 5.69448 6.98554 5.40146 6.7695 5.18542C6.55346 4.96938 6.26044 4.84801 5.95492 4.84801ZM4.10842 6.00001C4.10842 5.50989 4.30311 5.03984 4.64968 4.69328C4.99625 4.34671 5.4663 4.15201 5.95642 4.15201C6.44654 4.15201 6.91658 4.34671 7.26315 4.69328C7.60972 5.03984 7.80442 5.50989 7.80442 6.00001C7.80442 6.49013 7.60972 6.96018 7.26315 7.30674C6.91658 7.65331 6.44654 7.84801 5.95642 7.84801C5.4663 7.84801 4.99625 7.65331 4.64968 7.30674C4.30311 6.96018 4.10842 6.49013 4.10842 6.00001Z"
                                    fill="#A7A7BC"
                                  />
                                </svg>
                                <span className="font-semibold text-neutral-100">
                                  {fmtNum(met.views)}
                                </span>
                              </div>
                            </div>

                            <div className="text-[13px] text-neutral-200">
                              <div className="pl-3 flex items-center gap-1.5 ">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="12"
                                  height="12"
                                  viewBox="0 0 12 12"
                                  fill="none"
                                  className="h-4 w-4"
                                >
                                  <path
                                    fillRule="evenodd"
                                    clipRule="evenodd"
                                    d="M7.00413 9.5015L7.00713 8.5C7.00713 8.36706 7.05994 8.23957 7.15394 8.14556C7.24794 8.05156 7.37544 7.99875 7.50838 7.99875C7.64132 7.99875 7.76881 8.05156 7.86281 8.14556C7.95682 8.23957 8.00963 8.36706 8.00963 8.5V9.4885C8.00963 9.729 8.00963 9.8495 8.08663 9.9235C8.16413 9.997 8.28163 9.992 8.51813 9.982C9.44963 9.9425 10.0221 9.817 10.4251 9.414C10.8301 9.011 10.9556 8.4385 10.9951 7.5055C11.0026 7.3205 11.0066 7.2275 10.9721 7.166C10.9371 7.1045 10.7996 7.0275 10.5236 6.873C10.3682 6.78633 10.2387 6.65971 10.1485 6.50624C10.0584 6.35276 10.0108 6.17799 10.0108 6C10.0108 5.82201 10.0584 5.64724 10.1485 5.49376C10.2387 5.34029 10.3682 5.21367 10.5236 5.127C10.7996 4.973 10.9376 4.8955 10.9721 4.834C11.0066 4.7725 11.0026 4.68 10.9946 4.4945C10.9556 3.5615 10.8296 2.9895 10.4251 2.586C9.98663 2.148 9.34763 2.0375 8.26413 2.0095C8.23095 2.00863 8.19794 2.01442 8.16703 2.02652C8.13613 2.03862 8.10796 2.05678 8.08419 2.07995C8.06043 2.10311 8.04154 2.1308 8.02865 2.16138C8.01575 2.19196 8.00912 2.22481 8.00913 2.258V3.5C8.00913 3.63294 7.95632 3.76043 7.86232 3.85444C7.76831 3.94844 7.64082 4.00125 7.50788 4.00125C7.37494 4.00125 7.24744 3.94844 7.15344 3.85444C7.05944 3.76043 7.00663 3.63294 7.00663 3.5L7.00313 2.2495C7.003 2.18328 6.9766 2.11982 6.92973 2.07305C6.88286 2.02627 6.81934 2 6.75313 2H4.99713C3.10713 2 2.16213 2 1.57463 2.586C1.16963 2.989 1.04413 3.5615 1.00463 4.4945C0.997127 4.6795 0.993127 4.7725 1.02763 4.834C1.06263 4.8955 1.20013 4.973 1.47613 5.127C1.63159 5.21367 1.7611 5.34029 1.85125 5.49376C1.9414 5.64724 1.98893 5.82201 1.98893 6C1.98893 6.17799 1.9414 6.35276 1.85125 6.50624C1.7611 6.65971 1.63159 6.78633 1.47613 6.873C1.20013 7.0275 1.06213 7.1045 1.02763 7.166C0.993127 7.2275 0.997127 7.32 1.00513 7.505C1.04413 8.4385 1.17013 9.011 1.57463 9.414C2.16213 10 3.10713 10 4.99763 10H6.50263C6.73863 10 6.85613 10 6.92963 9.927C7.00313 9.854 7.00363 9.737 7.00413 9.5015ZM8.00913 6.5V5.5C8.00913 5.36706 7.95632 5.23957 7.86232 5.14556C7.76831 5.05156 7.64082 4.99875 7.50788 4.99875C7.37494 4.99875 7.24744 5.05156 7.15344 5.14556C7.05944 5.23957 7.00663 5.36706 7.00663 5.5V6.5C7.00663 6.63301 7.05946 6.76056 7.15351 6.85461C7.24756 6.94866 7.37512 7.0015 7.50813 7.0015C7.64113 7.0015 7.76869 6.94866 7.86274 6.85461C7.95679 6.76056 8.00913 6.63301 8.00913 6.5Z"
                                    fill="#A7A7BC"
                                  />
                                </svg>
                                <span className="font-semibold text-neutral-100">
                                  {fmtNum(met.tickets)}
                                </span>
                              </div>
                            </div>

                            <div className="text-[13px] text-neutral-200">
                              <span className="font-semibold text-neutral-100">
                                {fmtUsd(met.revenue)}
                              </span>
                            </div>

                            <div className="text-[13px] text-neutral-200">
                              <RolePill meta={roleMeta} />
                            </div>

                            <div className="text-[13px] text-neutral-400">
                              {prettyDateShort(m.createdAt)}
                            </div>

                            <div className="flex items-center justify-between gap-3">
                              <StatusPill status={m.status} />
                              <MemberActionsMenu
                                canManage={
                                  canManageMembers && m.role !== "owner"
                                }
                                member={m}
                                roles={roles ?? []}
                                rolesById={rolesById}
                                onRemove={() => deleteMutation.mutate(m._id)}
                                onChangeRole={(next) =>
                                  updateMutation.mutate({
                                    memberId: m._id,
                                    body: next.role
                                      ? { role: next.role }
                                      : { roleId: next.roleId! },
                                  })
                                }
                              />
                            </div>
                          </div>
                        </div>

                        <div className="md:hidden">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="relative">
                                <div className="h-10 w-10 overflow-hidden rounded-[10px] bg-white/5 ring-1 ring-white/10">
                                  <div className="flex h-full w-full items-center justify-center text-[13px] font-extrabold text-neutral-200">
                                    {badge}
                                  </div>
                                </div>
                                <div className="absolute -right-2 -bottom-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary-500/90 text-[10px] font-extrabold text-neutral-0 ring-1 ring-white/10">
                                  {badge}
                                </div>
                              </div>

                              <div className="min-w-0">
                                <div className="truncate text-[14px] font-semibold text-neutral-0">
                                  {title}
                                </div>
                                <div className="truncate text-[13px] text-neutral-400">
                                  {m.email}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <StatusPill status={m.status} />
                              <MemberActionsMenu
                                canManage={
                                  canManageMembers && m.role !== "owner"
                                }
                                member={m}
                                roles={roles ?? []}
                                rolesById={rolesById}
                                onRemove={() => deleteMutation.mutate(m._id)}
                                onChangeRole={(next) =>
                                  updateMutation.mutate({
                                    memberId: m._id,
                                    body: next.role
                                      ? { role: next.role }
                                      : { roleId: next.roleId! },
                                  })
                                }
                              />
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <MetricChip
                              icon={<Eye className="h-4 w-4" />}
                              label="Views"
                              value={fmtNum(met.views)}
                            />
                            <MetricChip
                              icon={<Ticket className="h-4 w-4" />}
                              label="Tickets"
                              value={fmtNum(met.tickets)}
                            />
                            <MetricChip
                              icon={<CircleDollarSign className="h-4 w-4" />}
                              label="Revenue"
                              value={fmtUsd(met.revenue)}
                            />
                            <MetricChip
                              icon={<UsersIcon className="h-4 w-4" />}
                              label="Role"
                              value={roleMeta.name}
                            />
                            <MetricChip
                              icon={<CalendarDays className="h-4 w-4" />}
                              label="Added"
                              value={prettyDateShort(m.createdAt)}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-[12px] text-neutral-300">
                      {showingLabel}
                    </div>
                    <Pagination
                      page={pageSafe}
                      totalPages={totalPages}
                      onPage={setPage}
                    />
                  </div>
                </div>
              ) : (
                <div
                  className={clsx(
                    "rounded-2xl border border-white/10 bg-white/5 px-4 py-12",
                    "text-center",
                  )}
                >
                  <div className="text-[13px] font-semibold text-neutral-100">
                    No members found
                  </div>
                  <div className="mt-1 text-[12px] text-neutral-500">
                    Try a different search or invite a new member.
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setInviteOpen(true)}
              className={clsx(
                "fixed bottom-6 right-6 sm:hidden",
                "relative inline-flex items-center justify-center overflow-hidden rounded-full",
                "bg-primary-700 px-4 py-2 text-sm font-medium text-white",
                "ring-1 ring-primary-600/60 hover:bg-primary-600",
                "focus:outline-none focus:ring-2 focus:ring-primary-500",
                "before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:transition-transform before:duration-700 hover:before:translate-x-full",
              )}
            >
              <Plus className="mr-2 h-4 w-4" />
              Invite
            </button>
          </div>
        </section>
      </section>

      <InviteTeamModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvite={(payload) => inviteMutation.mutate(payload)}
        isSubmitting={inviteMutation.isPending}
        orgId={id}
      />

      <RolesPermissionsModal
        open={rolesOpen}
        onClose={() => setRolesOpen(false)}
        orgId={id}
      />
    </div>
  );
}
