/* ------------------------------------------------------------------ */
/*  src/components/dashboard/modals/RolesPermissionsModal.tsx          */
/* ------------------------------------------------------------------ */
"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import {
  ArrowLeft,
  BadgeCheck,
  Bolt,
  Calendar,
  Camera,
  Check,
  ClipboardList,
  Crown,
  Eye,
  Flag,
  Gem,
  Globe,
  GripVertical,
  KeyRound,
  Link as LinkIcon,
  Lock,
  Megaphone,
  Mic,
  Plus,
  Rocket,
  ScanLine,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Star,
  Ticket,
  Upload,
  User,
  Users as UsersIcon,
  Wallet,
  Wrench,
  X,
  RotateCcw,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { type RoleIconKey } from "@/lib/roleIcons";
import TikdColorPicker from "@/components/ui/TikdColorPicker";

/* ------------------------------ Icon helpers ------------------------ */
type IconItem = { key: RoleIconKey; label: string; icon: ReactNode };

const ICONS: IconItem[] = [
  { key: "user", label: "User", icon: <User className="h-4 w-4" /> },
  { key: "users", label: "Users", icon: <UsersIcon className="h-4 w-4" /> },
  {
    key: "shield",
    label: "Shield",
    icon: <ShieldCheck className="h-4 w-4" />,
  },
  { key: "badge", label: "Badge", icon: <BadgeCheck className="h-4 w-4" /> },
  { key: "ticket", label: "Ticket", icon: <Ticket className="h-4 w-4" /> },
  {
    key: "megaphone",
    label: "Promo",
    icon: <Megaphone className="h-4 w-4" />,
  },
  { key: "scanner", label: "Scan", icon: <ScanLine className="h-4 w-4" /> },
  { key: "crown", label: "Crown", icon: <Crown className="h-4 w-4" /> },
  { key: "gem", label: "Gem", icon: <Gem className="h-4 w-4" /> },
  { key: "wrench", label: "Tools", icon: <Wrench className="h-4 w-4" /> },
  {
    key: "settings",
    label: "Settings",
    icon: <Settings2 className="h-4 w-4" />,
  },
  { key: "star", label: "Star", icon: <Star className="h-4 w-4" /> },
  {
    key: "sparkles",
    label: "Sparkles",
    icon: <Sparkles className="h-4 w-4" />,
  },
  { key: "bolt", label: "Bolt", icon: <Bolt className="h-4 w-4" /> },
  { key: "rocket", label: "Rocket", icon: <Rocket className="h-4 w-4" /> },
  { key: "lock", label: "Lock", icon: <Lock className="h-4 w-4" /> },
  { key: "key", label: "Key", icon: <KeyRound className="h-4 w-4" /> },
  { key: "wallet", label: "Wallet", icon: <Wallet className="h-4 w-4" /> },
  { key: "eye", label: "Eye", icon: <Eye className="h-4 w-4" /> },
  { key: "globe", label: "Globe", icon: <Globe className="h-4 w-4" /> },
  { key: "flag", label: "Flag", icon: <Flag className="h-4 w-4" /> },
  { key: "camera", label: "Camera", icon: <Camera className="h-4 w-4" /> },
  { key: "mic", label: "Mic", icon: <Mic className="h-4 w-4" /> },
  {
    key: "clipboard",
    label: "Clipboard",
    icon: <ClipboardList className="h-4 w-4" />,
  },
];

/* ----------------------------- Types ----------------------------- */
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

type CreateRoleBody = {
  name: string;
  key?: string;
  color?: string;
  iconKey?: RoleIconKey | null;
  iconUrl?: string | null;
  permissions?: Partial<OrgPermissions>;
};

export default function RolesPermissionsModal({
  open,
  onClose,
  orgId,
}: {
  open: boolean;
  onClose: () => void;
  orgId: string;
}) {
  /* ---------------------------- Helpers ---------------------------- */
  async function json<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
    const res = await fetch(input, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  function fmtNum(n: number) {
    return n.toLocaleString(undefined);
  }

  function makeEmptyPerms(): OrgPermissions {
    return {
      "members.view": false,
      "members.invite": false,
      "members.remove": false,
      "members.assignRoles": false,
      "events.create": false,
      "events.edit": false,
      "events.publish": false,
      "events.delete": false,
      "links.createTrackingLinks": false,
    };
  }

  const DEFAULT_ROLE_COLORS = useMemo(
    () => [
      "#8B5CF6",
      "#7C3AED",
      "#A855F7",
      "#4F46E5",
      "#3B82F6",
      "#06B6D4",
      "#14B8A6",
      "#22C55E",
      "#84CC16",
      "#F59E0B",
      "#F97316",
      "#FB7185",
      "#EF4444",
      "#94A3B8",
    ],
    [],
  );

  function clampHex(input: string) {
    const raw = String(input || "").trim();
    if (!raw) return "";
    const withHash = raw.startsWith("#") ? raw : `#${raw}`;
    const cleaned = withHash.replace(/[^#0-9a-fA-F]/g, "");
    return cleaned.slice(0, 7).toUpperCase();
  }

  function isValidHex(hex: string) {
    return /^#([0-9A-F]{6}|[0-9A-F]{3})$/.test(hex.toUpperCase());
  }

  function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const h = hex.replace("#", "").trim();
    if (!h) return null;

    if (h.length === 3) {
      const r = parseInt(h[0] + h[0], 16);
      const g = parseInt(h[1] + h[1], 16);
      const b = parseInt(h[2] + h[2], 16);
      if ([r, g, b].some((v) => Number.isNaN(v))) return null;
      return { r, g, b };
    }

    if (h.length === 6) {
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      if ([r, g, b].some((v) => Number.isNaN(v))) return null;
      return { r, g, b };
    }

    return null;
  }

  function RolePillPreview({
    name,
    color,
    icon,
  }: {
    name: string;
    color?: string | null;
    icon: ReactNode;
  }) {
    const rgb = color ? hexToRgb(color) : null;

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
        aria-label={`Role: ${name}`}
      >
        <span className="inline-flex items-center justify-center">{icon}</span>
        <span className="leading-none">{name}</span>
      </span>
    );
  }

  function rgba(rgb: { r: number; g: number; b: number }, a: number) {
    return `rgba(${rgb.r},${rgb.g},${rgb.b},${a})`;
  }

  /* ---------------------------- Permissions UI ---------------------------- */
  const PERMISSION_SECTIONS: Array<{
    title: string;
    icon: ReactNode;
    items: Array<{
      key: OrgPermissionKey;
      label: string;
      description?: string;
    }>;
  }> = [
    {
      title: "Member & Team Management",
      icon: <UsersIcon className="h-4 w-4" />,
      items: [
        { key: "members.view", label: "View Members" },
        { key: "members.invite", label: "Invite Members" },
        { key: "members.remove", label: "Remove Members" },
        { key: "members.assignRoles", label: "Assign Roles" },
      ],
    },
    {
      title: "Event Management",
      icon: <Calendar className="h-4 w-4" />,
      items: [
        { key: "events.create", label: "Create Events" },
        { key: "events.edit", label: "Edit Events" },
        { key: "events.publish", label: "Publish / Unpublish Events" },
        { key: "events.delete", label: "Delete Events" },
      ],
    },
    {
      title: "Links & Tracking",
      icon: <LinkIcon className="h-4 w-4" />,
      items: [
        { key: "links.createTrackingLinks", label: "Create Tracking Links" },
      ],
    },
  ];

  const ROLE_META: Record<
    string,
    { label: string; icon: ReactNode; blurb: string }
  > = {
    owner: {
      label: "Owner",
      icon: <Crown className="h-4 w-4" />,
      blurb: "Organization owner",
    },
    admin: {
      label: "Admin",
      icon: <ShieldCheck className="h-4 w-4" />,
      blurb: "Full access",
    },
    promoter: {
      label: "Promoter",
      icon: <Megaphone className="h-4 w-4" />,
      blurb: "Marketing & promos",
    },
    scanner: {
      label: "Scanner",
      icon: <ScanLine className="h-4 w-4" />,
      blurb: "Check-in access",
    },
    collaborator: {
      label: "Collaborator",
      icon: <UsersIcon className="h-4 w-4" />,
      blurb: "Limited collaboration",
    },
    member: {
      label: "Member",
      icon: <User className="h-4 w-4" />,
      blurb: "Standard access",
    },
  };

  /* -------------------------- Toggle (refined) -------------------------- */
  function PermissionToggle({
    checked,
    onChange,
    disabled,
  }: {
    checked: boolean;
    onChange: (v: boolean) => void;
    disabled?: boolean;
  }) {
    return (
      <button
        type="button"
        aria-pressed={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={clsx(
          "relative inline-flex h-6 w-[46px] items-center rounded-full cursor-pointer",
          "border border-white/10 bg-white/5",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
          "transition",
          disabled && "opacity-60 cursor-not-allowed",
        )}
      >
        <span
          className={clsx(
            "absolute inset-0 rounded-full",
            checked
              ? "bg-[radial-gradient(56px_36px_at_30%_20%,rgba(154,70,255,0.32),transparent_60%),radial-gradient(60px_36px_at_90%_80%,rgba(66,139,255,0.22),transparent_60%)]"
              : "bg-[radial-gradient(60px_36px_at_20%_20%,rgba(255,255,255,0.08),transparent_55%)]",
          )}
        />
        <span
          className={clsx(
            "absolute left-[3px] top-1/2 -translate-y-1/2",
            "h-[18px] w-[18px] rounded-full",
            "bg-neutral-0/95",
            "shadow-[0_8px_18px_rgba(0,0,0,0.35)]",
            "transition-transform duration-200 ease-out",
            checked && "translate-x-[22px]",
          )}
        />
      </button>
    );
  }

  /* ----------------- Pencil + Trash (same as Tracking Links) ----------------- */
  function TikdEditIcon() {
    return (
      <svg
        className="tikdEditSvg"
        height="1em"
        viewBox="0 0 512 512"
        aria-hidden="true"
      >
        <path d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231zM160 399.4l-9.1 22.7c-4 3.1-8.5 5.4-13.3 6.9L59.4 452l23-78.1c1.4-4.9 3.8-9.4 6.9-13.3l22.7-9.1v32c0 8.8 7.2 16 16 16h32zM362.7 18.7L348.3 33.2 325.7 55.8 314.3 67.1l33.9 33.9 62.1 62.1 33.9 33.9 11.3-11.3 22.6-22.6 14.5-14.5c25-25 25-65.5 0-90.5L453.3 18.7c-25-25-65.5-25-90.5 0zm-47.4 168l-144 144c-6.2 6.2-16.4 6.2-22.6 0s-6.2-16.4 0-22.6l144-144c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6z"></path>
      </svg>
    );
  }

  function TikdTrashIcon() {
    return (
      <span className="tikdTrashWrap" aria-hidden="true">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 69 14"
          className="svgIcon bin-top"
        >
          <g clipPath="url(#clip0_35_24)">
            <path
              fill="black"
              d="M20.8232 2.62734L19.9948 4.21304C19.8224 4.54309 19.4808 4.75 19.1085 4.75H4.92857C2.20246 4.75 0 6.87266 0 9.5C0 12.1273 2.20246 14.25 4.92857 14.25H64.0714C66.7975 14.25 69 12.1273 69 9.5C69 6.87266 66.7975 4.75 64.0714 4.75H49.8915C49.5192 4.75 49.1776 4.54309 49.0052 4.21305L48.1768 2.62734C47.3451 1.00938 45.6355 0 43.7719 0H25.2281C23.3645 0 21.6549 1.00938 20.8232 2.62734ZM64.0023 20.0648C64.0397 19.4882 63.5822 19 63.0044 19H5.99556C5.4178 19 4.96025 19.4882 4.99766 20.0648L8.19375 69.3203C8.44018 73.0758 11.6746 76 15.5712 76H53.4288C57.3254 76 60.5598 73.0758 60.8062 69.3203L64.0023 20.0648Z"
            ></path>
          </g>
          <defs>
            <clipPath id="clip0_35_24">
              <rect fill="white" height="14" width="69"></rect>
            </clipPath>
          </defs>
        </svg>

        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 69 57"
          className="svgIcon bin-bottom"
        >
          <g clipPath="url(#clip0_35_22)">
            <path
              fill="black"
              d="M20.8232 -16.3727L19.9948 -14.787C19.8224 -14.4569 19.4808 -14.25 19.1085 -14.25H4.92857C2.20246 -14.25 0 -12.1273 0 -9.5C0 -6.8727 2.20246 -4.75 4.92857 -4.75H64.0714C66.7975 -4.75 69 -6.8727 69 -9.5C69 -12.1273 66.7975 -14.25 64.0714 -14.25H49.8915C49.5192 -14.25 49.1776 -14.4569 49.0052 -14.787L48.1768 -16.3727C47.3451 -17.9906 45.6355 -19 43.7719 -19H25.2281C23.3645 -19 21.6549 -17.9906 20.8232 -16.3727ZM64.0023 1.0648C64.0397 0.4882 63.5822 0 63.0044 0H5.99556C5.4178 0 4.96025 0.4882 4.99766 1.0648L8.19375 50.3203C8.44018 54.0758 11.6746 57 15.5712 57H53.4288C57.3254 57 60.5598 54.0758 60.8062 50.3203L64.0023 1.0648Z"
            ></path>
          </g>
          <defs>
            <clipPath id="clip0_35_22">
              <rect fill="white" height="57" width="69"></rect>
            </clipPath>
          </defs>
        </svg>
      </span>
    );
  }

  const iconByKey = useMemo(() => {
    const m = new Map<RoleIconKey, ReactNode>();
    for (const it of ICONS) m.set(it.key, it.icon);
    return m;
  }, []);

  /* ------------------------------ State ------------------------ */
  const qc = useQueryClient();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const bodyScrollRef = useRef<HTMLDivElement | null>(null);

  const [q, setQ] = useState("");
  const [view, setView] = useState<"list" | "editor">("list");
  const [activeRoleId, setActiveRoleId] = useState<string | null>(null);
  const [editorTab, setEditorTab] = useState<"manager" | "permissions">(
    "manager",
  );

  const [draftName, setDraftName] = useState("");
  const [draftColor, setDraftColor] = useState<string>("");
  const [draftIconKey, setDraftIconKey] = useState<RoleIconKey | null>(null);
  const [draftIconUrl, setDraftIconUrl] = useState<string | null>(null);

  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [colorPickerPt, setColorPickerPt] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  function openColorPickerAt(e: React.PointerEvent | React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const { clientX, clientY } = e;

    setColorPickerPt({ x: clientX, y: clientY });
    setColorPickerOpen(true);

    requestAnimationFrame(() => {
      (document.activeElement as HTMLElement | null)?.blur?.();
    });
  }

  const [draftPerms, setDraftPerms] =
    useState<OrgPermissions>(makeEmptyPerms());

  const [createErr, setCreateErr] = useState<string | null>(null);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);

  /* --------------------------- Query --------------------------- */
  const rolesQuery = useQuery<OrgRoleRow[]>({
    queryKey: ["org-roles", orgId],
    enabled: open,
    queryFn: () => json<OrgRoleRow[]>(`/api/organizations/${orgId}/roles`),
    staleTime: 15_000,
  });

  const roles = rolesQuery.data ?? [];

  /* ---------------------- Display-only Owner role ---------------------- */
  const OWNER_PSEUDO_ID = "__owner__";

  const ownerDisplayRole: OrgRoleRow = useMemo(
    () => ({
      _id: OWNER_PSEUDO_ID,
      key: "owner",
      name: ROLE_META.owner.label,
      color: "#8B5CF6",
      iconKey: null,
      iconUrl: null,
      isSystem: true,
      order: -10_000,
      permissions: makeEmptyPerms(),
      membersCount: 1,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const displayRoles = useMemo(() => {
    const hasOwner = roles.some((r) => r.key === "owner");
    const list = hasOwner ? [...roles] : [ownerDisplayRole, ...roles];

    const rank = (r: OrgRoleRow) => {
      if (r.key === "owner") return -2;
      if (r.key === "admin") return -1;
      return 0;
    };

    return list.sort((a, b) => {
      const ra = rank(a);
      const rb = rank(b);
      if (ra !== rb) return ra - rb;

      const ao = a.order ?? 0;
      const bo = b.order ?? 0;
      if (ao !== bo) return ao - bo;

      return a.name.localeCompare(b.name);
    });
  }, [roles, ownerDisplayRole]);

  const rolesCountLabel = useMemo(
    () => `ROLES — ${displayRoles.length}`,
    [displayRoles.length],
  );

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return displayRoles;
    return displayRoles.filter((r) => r.name.toLowerCase().includes(qq));
  }, [displayRoles, q]);

  const activeRole = useMemo(() => {
    if (!activeRoleId) return null;
    return roles.find((r) => r._id === activeRoleId) ?? null;
  }, [roles, activeRoleId]);

  /* ------------------------ Reset on open ------------------------ */
  useEffect(() => {
    if (!open) return;

    // Always open to the main roles list view (fresh start).
    setView("list");
    setEditorTab("manager");
    setQ("");
    setCreateErr(null);
    setUploadErr(null);
    setColorPickerOpen(false);
    setActiveRoleId(null);

    requestAnimationFrame(() => {
      bodyScrollRef.current?.scrollTo({ top: 0 });
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (roles.length && !activeRoleId) {
      const admin = roles.find((r) => r.key === "admin");
      setActiveRoleId((admin ?? roles[0])!._id);
    }
  }, [open, roles, activeRoleId]);

  useEffect(() => {
    if (!activeRole) return;

    setDraftName(activeRole.name);
    setDraftColor(activeRole.color || "");
    setDraftIconKey(activeRole.iconKey ?? null);
    setDraftIconUrl(activeRole.iconUrl ?? null);

    const base = makeEmptyPerms();
    setDraftPerms({
      ...base,
      ...(activeRole.permissions as Partial<OrgPermissions>),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRole?._id]);

  useEffect(() => {
    if (!open) setColorPickerOpen(false);
  }, [open]);

  useEffect(() => {
    if (view === "list") setColorPickerOpen(false);
  }, [view]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (view === "editor") {
          setView("list");
          setEditorTab("manager");
          return;
        }
        onClose();
      }
    };

    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, view]);

  /* -------------------------- Mutations -------------------------- */
  const createRoleMutation = useMutation({
    mutationFn: (body: CreateRoleBody) =>
      json<OrgRoleRow>(`/api/organizations/${orgId}/roles`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (created) => {
      setCreateErr(null);
      qc.setQueryData<OrgRoleRow[]>(["org-roles", orgId], (prev) => {
        const list = prev ?? [];
        return [...list, created].sort(
          (a, b) => (a.order ?? 0) - (b.order ?? 0),
        );
      });
      setActiveRoleId(created._id);
      setView("editor");
      setEditorTab("manager"); // ✅ Create Role opens on Display/Manager first
      setQ("");
    },
    onError: (err: unknown) => {
      const raw =
        err instanceof Error
          ? err.message
          : String(err ?? "Failed to create role");

      try {
        const parsed = JSON.parse(raw) as { error?: string };
        setCreateErr(parsed?.error ?? raw);
      } catch {
        setCreateErr(raw);
      }
    },
  });

  const patchRoleMutation = useMutation({
    mutationFn: (args: { roleId: string; body: Partial<CreateRoleBody> }) =>
      json<OrgRoleRow>(`/api/organizations/${orgId}/roles/${args.roleId}`, {
        method: "PATCH",
        body: JSON.stringify(args.body),
      }),
    onSuccess: (updated) => {
      qc.setQueryData<OrgRoleRow[]>(["org-roles", orgId], (prev) => {
        const list = prev ?? [];
        return list.map((r) => (r._id === updated._id ? updated : r));
      });

      if (updated._id === activeRoleId) {
        setDraftName(updated.name);
        setDraftColor(updated.color || "");
        setDraftIconKey(updated.iconKey ?? null);
        setDraftIconUrl(updated.iconUrl ?? null);

        const base = makeEmptyPerms();
        setDraftPerms({
          ...base,
          ...(updated.permissions as Partial<OrgPermissions>),
        });
      }
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (roleId: string) =>
      json<{ ok: boolean }>(`/api/organizations/${orgId}/roles/${roleId}`, {
        method: "DELETE",
      }),
    onSuccess: (_res, roleId) => {
      qc.setQueryData<OrgRoleRow[]>(["org-roles", orgId], (prev) => {
        const list = prev ?? [];
        return list.filter((r) => r._id !== roleId);
      });

      setActiveRoleId((cur) => {
        if (cur !== roleId) return cur;
        const left = (qc.getQueryData<OrgRoleRow[]>(["org-roles", orgId]) ??
          []) as OrgRoleRow[];
        return left[0]?._id ?? null;
      });

      if (view === "editor") {
        setView("list");
        setEditorTab("manager");
      }
    },
  });

  const saving =
    createRoleMutation.isPending ||
    patchRoleMutation.isPending ||
    deleteRoleMutation.isPending;

  const canDelete = (r: OrgRoleRow) => !r.isSystem;

  const onCreateRole = () => {
    setCreateErr(null);

    const base = "New role";
    const existingNames = new Set(
      roles.map((r) => r.name.trim().toLowerCase()),
    );

    let name = base;
    let i = 2;
    while (existingNames.has(name.toLowerCase())) {
      name = `${base} ${i++}`;
    }

    createRoleMutation.mutate({
      name,
      color: "",
      iconKey: null,
      iconUrl: null,
      permissions: makeEmptyPerms(),
    });
  };

  const onOpenEditor = (roleId: string) => {
    setActiveRoleId(roleId);
    setView("editor");
    setEditorTab("manager"); // ✅ Edit opens on Display/Manager first
  };

  const onTogglePerm = (k: OrgPermissionKey, v: boolean) => {
    const roleId = activeRoleId;
    if (!roleId) return;

    const next = { ...draftPerms, [k]: v };
    setDraftPerms(next);

    queueMicrotask(() => {
      patchRoleMutation.mutate({
        roleId,
        body: { permissions: next },
      });
    });
  };

  const onSaveMeta = () => {
    const roleId = activeRoleId;
    if (!roleId) return;

    patchRoleMutation.mutate({
      roleId,
      body: {
        name: draftName.trim(),
        color: draftColor.trim(),
        iconKey: draftIconKey ?? null,
        iconUrl: draftIconUrl ?? null,
      },
    });
  };

  async function uploadRoleIcon(file: File) {
    setUploadErr(null);
    setUploadingIcon(true);

    try {
      const id = `temp/orgs/${orgId}/role-icons/${crypto.randomUUID()}`;

      const params = new URLSearchParams({
        public_id: id,
        overwrite: "1",
      }).toString();

      const { timestamp, signature } = (await fetch(
        `/api/cloudinary/sign?${params}`,
      ).then((r) => r.json())) as { timestamp: number; signature: string };

      const form = new FormData();
      form.append("file", file);
      form.append("public_id", id);
      form.append("timestamp", String(timestamp));
      form.append("signature", signature);
      form.append(
        "api_key",
        process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY as string,
      );
      form.append("overwrite", "1");
      form.append("invalidate", "1");

      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

      const res = await fetch(uploadUrl, { method: "POST", body: form });
      if (!res.ok) throw new Error(await res.text());

      const uploaded = (await res.json()) as { secure_url?: string };
      if (!uploaded.secure_url)
        throw new Error("Upload succeeded but no secure_url returned");

      setDraftIconUrl(uploaded.secure_url);
      setDraftIconKey(null);
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : String(e ?? "Failed to upload icon");
      setUploadErr(msg);
    } finally {
      setUploadingIcon(false);
    }
  }

  const selectedIconNode = useMemo(() => {
    if (draftIconUrl) {
      return (
        <img
          src={draftIconUrl}
          alt="Role icon"
          className="h-4 w-4 rounded-sm object-cover"
        />
      );
    }
    if (draftIconKey) return iconByKey.get(draftIconKey) ?? null;
    return <UsersIcon className="h-4 w-4" />;
  }, [draftIconUrl, draftIconKey, iconByKey]);

  const resolvedColor = useMemo(() => {
    const c = clampHex(draftColor);
    return isValidHex(c) ? c : "";
  }, [draftColor]);

  const colorRgb = useMemo(() => {
    if (!resolvedColor) return null;
    return hexToRgb(resolvedColor);
  }, [resolvedColor]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center px-3 py-5"
      role="dialog"
      aria-modal="true"
      aria-label="Roles"
    >
      <style jsx>{`
        :global(.tikdIconBtn) {
          position: relative;
          overflow: hidden;
        }

        :global(.tikdIconBtn--edit) {
          isolation: isolate;
        }

        :global(.tikdIconBtn--edit::before) {
          content: "";
          position: absolute;
          inset: -60%;
          border-radius: 999px;
          background: rgba(154, 70, 255, 0.22);
          filter: blur(12px);
          transform: scale(0);
          transition: transform 0.28s ease;
          z-index: 1;
          pointer-events: none;
        }

        :global(.tikdIconBtn--edit:hover::before) {
          transform: scale(1);
        }

        :global(.tikdEditMotion) {
          position: relative;
          z-index: 3;
          display: inline-flex;
          align-items: center;
          justify-content: center;

          transition: transform 0.2s;
          transform-origin: bottom;
          will-change: transform;
        }

        :global(.tikdEditMotion::after) {
          content: "";
          position: absolute;

          width: 30px;
          height: 1px;

          bottom: 0px;
          right: 14px;

          background: rgba(255, 255, 255, 0.9);
          border-radius: 2px;
          pointer-events: none;

          transform: scaleX(0);
          transform-origin: right;
          transition: transform 0.5s ease-out;
        }

        :global(.tikdIconBtn--edit:hover .tikdEditMotion) {
          transform: translateX(6px);
        }

        :global(.tikdIconBtn--edit:hover .tikdEditMotion::after) {
          transform: scaleX(1);
        }

        :global(.tikdIconBtn--edit .tikdEditSvg) {
          height: 15px;
          fill: rgba(255, 255, 255, 0.92);

          position: relative;
          top: -1px;

          z-index: 3;
          transition: all 0.2s;
          transform-origin: bottom;
          will-change: transform;
          display: block;
        }

        :global(.tikdIconBtn--edit:hover .tikdEditSvg) {
          transform: rotate(-15deg);
        }

        :global(.tikdTrashWrap) {
          display: inline-flex;
          flex-direction: column;
          gap: 2px;
          position: relative;
          z-index: 2;
        }

        :global(.tikdIconBtn--trash .svgIcon) {
          width: 11px;
          transition: transform 0.3s ease;
        }

        :global(.tikdIconBtn--trash .svgIcon path) {
          fill: rgba(255, 255, 255, 0.9);
        }

        :global(.tikdIconBtn--trash .bin-top) {
          transform-origin: bottom right;
        }

        :global(.tikdIconBtn--trash:hover .bin-top) {
          transition-duration: 0.5s;
          transform: rotate(160deg);
        }

        :global(.tikdTrashWrap) {
          gap: 1px;
        }
      `}</style>

      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={clsx("absolute inset-0 bg-black/60 backdrop-blur-[10px]")}
      />

      <div
        ref={panelRef}
        className={clsx(
          "relative w-full max-w-[1040px] overflow-hidden rounded-2xl",
          "border border-white/10 bg-neutral-950/80",
          "shadow-[0_30px_120px_rgba(0,0,0,0.75)]",
          "h-[calc(100vh-40px)] md:h-[calc(100vh-56px)]",
          "flex flex-col",
        )}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-100"
          style={{
            background:
              "radial-gradient(1100px 520px at 18% -10%, rgba(154,70,255,0.20), transparent 60%), radial-gradient(900px 520px at 100% 20%, rgba(66,139,255,0.10), transparent 62%), linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
          }}
        />

        {/* Header */}
        <div className="relative flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div
              className={clsx(
                "inline-flex h-10 w-10 items-center justify-center rounded-lg",
                "bg-primary-500/15 text-primary-200 ring-1 ring-primary-500/20",
              )}
            >
              <ShieldCheck className="h-5.5 w-5.5" />
            </div>

            <div>
              <div className="text-[16px] font-semibold tracking-[-0.2px] text-neutral-0">
                Roles & Permissions
              </div>
              <div className="mt-1 text-[12px] text-neutral-400">
                Create roles and edit permissions for your team members.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className={clsx(
              "inline-flex h-9 w-9 items-center justify-center rounded-full",
              "border border-white/10 bg-white/5 text-neutral-200 hover:bg-white/10",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
            )}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div
          ref={bodyScrollRef}
          className="relative flex-1 overflow-y-auto no-scrollbar px-5 pb-5"
        >
          <div
            className={clsx(
              "rounded-2xl border border-white/10",
              "bg-neutral-950/35",
              "shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
              "p-4 md:p-5",
            )}
          >
            {view === "list" ? (
              <>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="w-full sm:max-w-[520px]">
                    <Input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Search Roles"
                      variant="full"
                      size="md"
                      icon={<Search className="h-4 w-4 text-white/80" />}
                    />
                  </div>

                  <Button
                    type="button"
                    variant="primary"
                    icon={<Plus className="h-4 w-4" />}
                    onClick={onCreateRole}
                    animation
                    disabled={saving}
                  >
                    Create Role
                  </Button>
                </div>

                {createErr ? (
                  <div className="mt-3 rounded-xl border border-error-500/25 bg-error-500/10 px-4 py-3 text-[12px] text-error-200">
                    {createErr}
                  </div>
                ) : null}

                <div className="mt-3 text-[12px] text-neutral-400">
                  Members use the color of the highest role they have on this
                  list.
                </div>

                <div className="mt-4 rounded-xl border border-white/10 bg-neutral-950/35 overflow-hidden">
                  <div className="px-4 py-3">
                    <div className="grid grid-cols-[1fr_140px_88px] items-center gap-3 text-[12px] font-semibold text-neutral-400">
                      <div>{rolesCountLabel}</div>
                      <div className="text-left">MEMBERS</div>
                      <div className="text-right"> </div>
                    </div>
                  </div>

                  <div className="border-t border-white/10" />

                  <div className="overflow-auto no-scrollbar">
                    {rolesQuery.isLoading ? (
                      <div className="p-4 space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div
                            key={i}
                            className="h-[52px] rounded-xl border border-white/10 bg-neutral-950/35"
                          />
                        ))}
                      </div>
                    ) : filtered.length ? (
                      filtered.map((r) => {
                        const isDefault = r.isSystem;
                        const isOwnerRow =
                          r._id === OWNER_PSEUDO_ID || r.key === "owner";

                        const icon = r.iconUrl ? (
                          <img
                            src={r.iconUrl}
                            alt=""
                            className="h-4 w-4 rounded-sm object-cover"
                          />
                        ) : r.iconKey ? (
                          (iconByKey.get(r.iconKey) ?? (
                            <UsersIcon className="h-4 w-4" />
                          ))
                        ) : r.key in ROLE_META ? (
                          ROLE_META[r.key]?.icon
                        ) : (
                          <UsersIcon className="h-4 w-4" />
                        );

                        return (
                          <div
                            key={r._id}
                            className={clsx(
                              "group px-4 py-3",
                              "grid grid-cols-[1fr_140px_88px] items-center gap-3",
                              "border-t border-white/10",
                              "bg-transparent hover:bg-white/[0.03]",
                              "transition-colors",
                            )}
                          >
                            <div className="min-w-0 flex items-center gap-3">
                              <div
                                className={clsx(
                                  "relative h-9 w-9 shrink-0 overflow-hidden rounded-xl",
                                  "border border-white/10 bg-neutral-950/45",
                                  "shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
                                )}
                              >
                                <div
                                  className="absolute inset-0 opacity-100"
                                  style={{
                                    background:
                                      "radial-gradient(120px 80px at 25% 20%, rgba(154,70,255,0.28), transparent 58%), radial-gradient(100px 70px at 90% 80%, rgba(66,139,255,0.16), transparent 62%)",
                                  }}
                                />
                                <div className="relative flex h-full w-full items-center justify-center text-primary-200">
                                  {icon}
                                </div>
                              </div>

                              <div className="min-w-0">
                                <div className="truncate text-[13px] font-semibold text-neutral-0">
                                  {r.name}
                                </div>
                                <div className="mt-0.5 text-[11px] text-neutral-500">
                                  {isDefault ? "Default role" : "Custom role"}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 text-[13px] text-neutral-200">
                              <span className="font-semibold text-neutral-100">
                                {fmtNum(r.membersCount ?? 0)}
                              </span>
                              <UsersIcon className="h-4 w-4 text-neutral-500" />
                            </div>

                            <div className="inline-flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  if (isOwnerRow) return;
                                  onOpenEditor(r._id);
                                }}
                                title="Edit role"
                                aria-label="Edit role"
                                className={clsx(
                                  "inline-flex items-center justify-center",
                                  "h-9 w-9 rounded-md border border-white/10 bg-neutral-950/40",
                                  "text-white/80 hover:bg-neutral-950/55 hover:border-white/20",
                                  "focus:outline-none focus:ring-1 focus:ring-primary-600/35",
                                  "transition cursor-pointer",
                                  "tikdIconBtn tikdIconBtn--edit",
                                  isOwnerRow &&
                                    "opacity-50 pointer-events-none",
                                )}
                                disabled={isOwnerRow}
                              >
                                <span
                                  className="tikdEditMotion"
                                  aria-hidden="true"
                                >
                                  <TikdEditIcon />
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={() => deleteRoleMutation.mutate(r._id)}
                                title={
                                  r.isSystem
                                    ? "System roles cannot be deleted"
                                    : "Delete role"
                                }
                                aria-label="Delete role"
                                disabled={!canDelete(r) || saving}
                                className={clsx(
                                  "inline-flex items-center justify-center",
                                  "h-9 w-9 rounded-md border border-white/10 bg-neutral-950/40",
                                  "text-white/80 hover:bg-error-500/15 hover:border-error-500/35",
                                  "focus:outline-none focus:ring-1 focus:ring-primary-600/35",
                                  "transition cursor-pointer",
                                  "tikdIconBtn tikdIconBtn--trash cursor-pointer",
                                  (!canDelete(r) || saving) &&
                                    "opacity-50 pointer-events-none",
                                )}
                              >
                                <TikdTrashIcon />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="px-4 py-10 text-center">
                        <div className="text-[13px] font-semibold text-neutral-100">
                          No roles found
                        </div>
                        <div className="mt-1 text-[12px] text-neutral-500">
                          Try a different search, or create a new role.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Editor view */}
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setView("list");
                      setEditorTab("manager");
                    }}
                    className={clsx(
                      "inline-flex items-center gap-2 rounded-xl px-3 py-2",
                      "border border-white/10 bg-neutral-950/45 text-neutral-200 hover:bg-neutral-950/60",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 cursor-pointer",
                    )}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="text-[12px] font-semibold">Back</span>
                  </button>

                  <div className="text-[12px] text-neutral-500">
                    {activeRole?.isSystem ? (
                      <span>System role</span>
                    ) : (
                      <span>Custom role</span>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
                  {/* Left sidebar */}
                  <div
                    className={clsx(
                      "rounded-2xl border border-white/10",
                      "bg-neutral-950/45",
                      "shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
                      "overflow-hidden",
                      "flex flex-col",
                      "min-h-[520px]",
                    )}
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                      <div className="text-[12px] font-semibold text-neutral-200">
                        Roles
                      </div>
                      <button
                        type="button"
                        onClick={onCreateRole}
                        className={clsx(
                          "inline-flex h-8 w-8 items-center justify-center rounded-lg",
                          "border border-white/10 bg-neutral-950/40 text-neutral-200 hover:bg-neutral-950/55",
                          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 cursor-pointer",
                          saving && "opacity-60 pointer-events-none",
                        )}
                        aria-label="Create role"
                        title="Create role"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex-1 overflow-auto no-scrollbar p-2 space-y-2">
                      {displayRoles.map((r) => {
                        const isOwnerRow =
                          r._id === OWNER_PSEUDO_ID || r.key === "owner";
                        const active = r._id === activeRoleId;

                        const icon = r.iconUrl ? (
                          <img
                            src={r.iconUrl}
                            alt=""
                            className="h-4 w-4 rounded-sm object-cover"
                          />
                        ) : r.iconKey ? (
                          (iconByKey.get(r.iconKey) ?? (
                            <UsersIcon className="h-4 w-4" />
                          ))
                        ) : r.key in ROLE_META ? (
                          ROLE_META[r.key]?.icon
                        ) : (
                          <UsersIcon className="h-4 w-4" />
                        );

                        return (
                          <button
                            key={r._id}
                            type="button"
                            onClick={() => {
                              if (isOwnerRow) return;
                              setActiveRoleId(r._id);
                            }}
                            className={clsx(
                              "w-full rounded-xl px-3 py-2.5 text-left cursor-pointer",
                              "border border-white/10",
                              "flex items-center gap-2.5",
                              isOwnerRow && "opacity-70 cursor-default",
                              active
                                ? "bg-[linear-gradient(90deg,rgba(154,70,255,0.16),rgba(66,139,255,0.08))] text-primary-100 ring-1 ring-primary-500/20"
                                : "bg-neutral-950/35 text-neutral-200 hover:bg-neutral-950/50",
                              isOwnerRow && "hover:bg-neutral-950/35",
                              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
                              "transition",
                            )}
                            aria-disabled={isOwnerRow}
                            disabled={isOwnerRow}
                          >
                            <span
                              className={clsx(
                                "inline-flex h-8 w-8 items-center justify-center rounded-xl",
                                active
                                  ? "bg-primary-500/16 text-primary-200 ring-1 ring-primary-500/22"
                                  : "bg-neutral-950/35 text-neutral-200 ring-1 ring-white/10",
                              )}
                            >
                              {icon}
                            </span>

                            <div className="min-w-0 flex-1">
                              <div className="truncate text-[12px] font-semibold">
                                {r.name}
                              </div>
                              <div className="text-[11px] text-neutral-500">
                                {r.isSystem ? "Default" : "Custom"} •{" "}
                                {fmtNum(r.membersCount ?? 0)} members
                              </div>
                            </div>

                            <GripVertical className="h-4 w-4 text-neutral-600" />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right panel */}
                  <div
                    className={clsx(
                      "rounded-2xl border border-white/10 bg-neutral-950/35",
                      "shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
                      "overflow-hidden",
                      "flex flex-col",
                      "min-h-[520px]",
                    )}
                  >
                    <div className="relative border-b border-white/10 bg-neutral-950/45 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-semibold text-neutral-200">
                          {activeRole?.name ?? "Role"}
                        </div>

                        <div className="inline-flex items-center rounded-full border border-white/10 bg-neutral-950/55 p-1">
                          <button
                            type="button"
                            onClick={() => setEditorTab("manager")}
                            className={clsx(
                              "rounded-full px-3 py-1.5 text-[12px] font-semibold cursor-pointer",
                              editorTab === "manager"
                                ? "bg-white/10 text-neutral-0"
                                : "text-neutral-300 hover:text-neutral-0",
                            )}
                          >
                            Display
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditorTab("permissions")}
                            className={clsx(
                              "rounded-full px-3 py-1.5 text-[12px] font-semibold cursor-pointer",
                              editorTab === "permissions"
                                ? "bg-white/10 text-neutral-0"
                                : "text-neutral-300 hover:text-neutral-0",
                            )}
                          >
                            Permissions
                          </button>
                        </div>
                      </div>
                    </div>

                    {editorTab === "manager" ? (
                      <div className="flex-1 overflow-auto no-scrollbar">
                        <div className="p-4">
                          <div className="text-[12px] text-neutral-400">
                            Display settings. (Permissions are in the next tab.)
                          </div>

                          {/* Preview */}
                          <div className="mt-4">
                            <div className="flex items-center gap-2">
                              <div className="text-[12px] font-semibold text-neutral-200">
                                Preview
                              </div>
                              <div className="text-[10px] text-neutral-400">
                                Exactly how it appears in the table.
                              </div>
                            </div>

                            <div className="mt-2">
                              <RolePillPreview
                                name={draftName?.trim() || "Role"}
                                color={resolvedColor || null}
                                icon={selectedIconNode}
                              />
                            </div>
                          </div>

                          <div className="mt-6 space-y-4">
                            {/* Role name */}
                            <div>
                              <div className="text-[12px] font-semibold text-neutral-200">
                                Role name
                              </div>
                              <div className="mt-2">
                                <Input
                                  value={draftName}
                                  onChange={(e) => setDraftName(e.target.value)}
                                  placeholder="Role name"
                                  variant="full"
                                  size="md"
                                  disabled={saving}
                                />
                              </div>
                            </div>

                            {/* Role color */}
                            <div>
                              <div className="text-[12px] font-semibold text-neutral-200">
                                Role color
                              </div>
                              <div className="mt-1 text-[12px] text-neutral-500">
                                Members use the color of the highest role they
                                have on the roles list.
                              </div>

                              <div className="mt-2 flex items-center gap-2">
                                <div
                                  className={clsx(
                                    "relative flex-1 rounded-xl p-[1px]",
                                    "shadow-[0_10px_28px_rgba(0,0,0,0.35)]",
                                  )}
                                  style={{
                                    background: resolvedColor
                                      ? `linear-gradient(90deg, ${rgba(
                                          colorRgb ?? { r: 154, g: 70, b: 255 },
                                          0.85,
                                        )}, ${rgba(
                                          colorRgb ?? { r: 66, g: 139, b: 255 },
                                          0.55,
                                        )})`
                                      : "linear-gradient(90deg, rgba(154,70,255,0.55), rgba(66,139,255,0.35))",
                                  }}
                                >
                                  <div
                                    className={clsx(
                                      "rounded-lg border border-white/10 bg-neutral-950/60",
                                      "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
                                    )}
                                  >
                                    <Input
                                      value={draftColor}
                                      onChange={(e) =>
                                        setDraftColor(clampHex(e.target.value))
                                      }
                                      placeholder="#7C3AED"
                                      disabled={saving}
                                      variant="full"
                                      size="md"
                                      endAdornment={
                                        <button
                                          type="button"
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                          }}
                                          onPointerDown={(e) =>
                                            openColorPickerAt(e)
                                          }
                                          onClick={(e) => openColorPickerAt(e)}
                                          aria-label="Pick role color"
                                          title="Pick role color"
                                          className={clsx(
                                            "inline-flex items-center justify-center",
                                            "h-6 w-6",
                                            "rounded-md",
                                            "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
                                            "cursor-pointer",
                                          )}
                                        >
                                          <span
                                            className={clsx(
                                              "inline-flex h-5 w-5 rounded-md border border-white/15",
                                              "shadow-[0_10px_22px_rgba(0,0,0,0.35)]",
                                            )}
                                            style={{
                                              background: resolvedColor
                                                ? resolvedColor
                                                : "linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.03))",
                                            }}
                                          />
                                        </button>
                                      }
                                    />
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setDraftColor("");
                                    setColorPickerOpen(false);
                                  }}
                                  disabled={saving}
                                  className={clsx(
                                    "inline-flex items-center justify-center",
                                    "h-[44px] w-[44px] shrink-0 rounded-lg",
                                    "border border-white/10 bg-neutral-950/45 text-neutral-0",
                                    "hover:bg-neutral-950/60 hover:border-white/20 transition",
                                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
                                    "disabled:opacity-60 disabled:pointer-events-none cursor-pointer",
                                  )}
                                  title="Reset color"
                                  aria-label="Reset color"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </button>
                              </div>

                              <TikdColorPicker
                                popoverOnly
                                value={resolvedColor || ""}
                                onChange={(next) => setDraftColor(next)}
                                defaultColor="#7C3AED"
                                open={colorPickerOpen}
                                onOpenChange={setColorPickerOpen}
                                anchorPoint={colorPickerPt}
                                showAlpha={false}
                              />

                              <div className="mt-3 flex flex-wrap gap-1.5">
                                {DEFAULT_ROLE_COLORS.map((c) => {
                                  const active = resolvedColor === c;
                                  const rgb = hexToRgb(c);
                                  const ring = rgb
                                    ? `0 0 0 2px ${rgba(rgb, 0.85)}`
                                    : "0 0 0 2px rgba(255,255,255,0.55)";
                                  const glow = rgb
                                    ? `0 12px 26px ${rgba(rgb, 0.22)}`
                                    : "0 12px 26px rgba(0,0,0,0.35)";

                                  return (
                                    <button
                                      key={c}
                                      type="button"
                                      onClick={() => setDraftColor(c)}
                                      disabled={saving}
                                      className={clsx(
                                        "h-[26px] w-[26px] rounded-md",
                                        "border border-white/10",
                                        "transition",
                                        "cursor-pointer hover:border-white",
                                        saving && "opacity-70",
                                      )}
                                      style={{
                                        background: c,
                                        boxShadow: active
                                          ? `${ring}, ${glow}`
                                          : "0 0 0 1px rgba(255,255,255,0.10)",
                                        transform: active
                                          ? "scale(1.01)"
                                          : undefined,
                                      }}
                                      aria-label={`Set color ${c}`}
                                      title={c}
                                    >
                                      {active ? (
                                        <span className="pointer-events-none grid h-full w-full place-items-center">
                                          <Check className="h-3.5 w-3.5 text-white/95 drop-shadow-[0_6px_14px_rgba(0,0,0,0.55)]" />
                                        </span>
                                      ) : null}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Role icon */}
                            <div>
                              <div className="text-[12px] font-semibold text-neutral-200">
                                Role icon
                              </div>
                              <div className="mt-2 rounded-2xl border border-white/10 bg-neutral-950/45 p-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                    <div
                                      className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-neutral-950/60"
                                      style={{
                                        boxShadow:
                                          "inset 0 1px 0 rgba(255,255,255,0.06)",
                                      }}
                                    >
                                      <span className="text-primary-200">
                                        {selectedIconNode}
                                      </span>
                                    </div>

                                    <div className="min-w-0">
                                      <div className="text-[12px] font-semibold text-neutral-100">
                                        {draftIconUrl
                                          ? "Custom icon"
                                          : draftIconKey
                                            ? `Lucide: ${draftIconKey}`
                                            : "Default"}
                                      </div>
                                      <div className="mt-0.5 text-[11px] text-neutral-500">
                                        Pick a default icon or upload your own.
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <label
                                      className={clsx(
                                        "inline-flex items-center gap-2",
                                        "rounded-xl border border-white/10 bg-neutral-950/45 px-3 py-2",
                                        "text-[12px] font-semibold text-neutral-0",
                                        "hover:bg-neutral-950/60 cursor-pointer",
                                        "focus-within:ring-2 focus-within:ring-primary-500/60",
                                        uploadingIcon &&
                                          "opacity-60 pointer-events-none",
                                      )}
                                    >
                                      <Upload className="h-4 w-4" />
                                      {uploadingIcon
                                        ? "Uploading..."
                                        : "Upload"}
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          const f = e.target.files?.[0];
                                          if (!f) return;
                                          uploadRoleIcon(f);
                                          e.currentTarget.value = "";
                                        }}
                                      />
                                    </label>

                                    <Button
                                      type="button"
                                      variant="secondary"
                                      size="sm"
                                      className="rounded-xl"
                                      disabled={saving}
                                      onClick={() => {
                                        setDraftIconUrl(null);
                                        setDraftIconKey(null);
                                      }}
                                    >
                                      Clear
                                    </Button>
                                  </div>
                                </div>

                                {uploadErr ? (
                                  <div className="mt-3 rounded-xl border border-error-500/25 bg-error-500/10 px-3 py-2 text-[12px] text-error-200">
                                    {uploadErr}
                                  </div>
                                ) : null}

                                <div className="mt-3 grid grid-cols-10 gap-1.5 sm:grid-cols-12 md:grid-cols-14">
                                  {ICONS.map((it) => {
                                    const active =
                                      draftIconKey === it.key && !draftIconUrl;
                                    return (
                                      <button
                                        key={it.key}
                                        type="button"
                                        onClick={() => {
                                          setDraftIconKey(it.key);
                                          setDraftIconUrl(null);
                                        }}
                                        className={clsx(
                                          "h-9 w-9 rounded-lg grid place-items-center",
                                          "border border-white/10 bg-neutral-950/55",
                                          "hover:bg-neutral-950/65 hover:border-white/20 transition cursor-pointer",
                                          active &&
                                            "ring-2 ring-primary-500/55 bg-[radial-gradient(140px_90px_at_30%_20%,rgba(154,70,255,0.22),transparent_60%),radial-gradient(140px_90px_at_90%_80%,rgba(66,139,255,0.14),transparent_60%)]",
                                        )}
                                        aria-label={`Icon ${it.label}`}
                                        title={it.label}
                                      >
                                        <span className="text-neutral-0/90">
                                          {it.icon}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>

                            <div className="rounded-xl border border-white/10 bg-neutral-950/45 p-4">
                              <div className="text-[12px] font-semibold text-neutral-200">
                                Notes
                              </div>
                              <div className="mt-1 text-[12px] text-neutral-500">
                                System roles can be edited, but cannot be
                                deleted. Custom roles can be deleted any time.
                              </div>
                            </div>
                          </div>
                        </div>

                        <div
                          className={clsx(
                            "sticky bottom-0 z-[2]",
                            "border-t border-white/10",
                            "bg-neutral-950/65 backdrop-blur-[12px]",
                          )}
                        >
                          <div className="flex items-center justify-between gap-2 px-4 py-3">
                            {activeRole && !activeRole.isSystem ? (
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() =>
                                  deleteRoleMutation.mutate(activeRole._id)
                                }
                                className={clsx(
                                  "inline-flex items-center gap-2 rounded-xl px-3 py-2",
                                  "border border-error-500/25 bg-error-500/10 text-error-200",
                                  "hover:bg-error-500/14 hover:border-error-500/35 transition",
                                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-error-500/40 cursor-pointer",
                                  saving && "opacity-60 pointer-events-none",
                                )}
                                aria-label="Delete role"
                                title="Delete role"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="text-[12px] font-semibold">
                                  Delete
                                </span>
                              </button>
                            ) : (
                              <div />
                            )}

                            <Button
                              type="button"
                              variant="primary"
                              size="md"
                              className={clsx(
                                "rounded-xl",
                                "bg-[linear-gradient(90deg,rgba(154,70,255,0.95),rgba(66,139,255,0.55))]",
                                "hover:bg-[linear-gradient(90deg,rgba(154,70,255,1),rgba(66,139,255,0.62))]",
                                "shadow-[0_18px_40px_rgba(154,70,255,0.18)]",
                              )}
                              disabled={saving || !activeRoleId}
                              onClick={onSaveMeta}
                              icon={<Check className="h-4 w-4" />}
                              animation
                            >
                              Save changes
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 overflow-auto no-scrollbar p-4">
                        <div className="text-[12px] text-neutral-400">
                          Toggle what this role can do.
                        </div>

                        <div className="mt-4 space-y-3">
                          {PERMISSION_SECTIONS.map((sec) => (
                            <div
                              key={sec.title}
                              className={clsx(
                                "rounded-2xl border border-white/10 bg-neutral-950/45",
                                "shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
                                "overflow-hidden",
                              )}
                            >
                              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
                                <span
                                  className={clsx(
                                    "inline-flex h-8 w-8 items-center justify-center rounded-xl",
                                    "bg-primary-500/14 text-primary-200 ring-1 ring-primary-500/20",
                                  )}
                                >
                                  {sec.icon}
                                </span>
                                <div className="text-[12px] font-semibold text-neutral-200">
                                  {sec.title}
                                </div>
                              </div>

                              <div className="divide-y divide-white/10">
                                {sec.items.map((p) => (
                                  <div
                                    key={p.key}
                                    className={clsx(
                                      "flex items-center justify-between gap-3 px-4 py-3",
                                      "bg-transparent hover:bg-white/[0.025] transition-colors",
                                    )}
                                  >
                                    <div className="min-w-0">
                                      <div className="text-[12px] font-semibold text-neutral-100">
                                        {p.label}
                                      </div>
                                      {p.description ? (
                                        <div className="mt-0.5 text-[11px] text-neutral-500">
                                          {p.description}
                                        </div>
                                      ) : null}
                                    </div>

                                    <PermissionToggle
                                      checked={!!draftPerms[p.key]}
                                      onChange={(v) => onTogglePerm(p.key, v)}
                                      disabled={!activeRoleId || saving}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="mt-4 text-[11px] text-neutral-500">
                          Changes save automatically.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {rolesQuery.isError ? (
            <div className="mt-3 rounded-xl border border-error-500/25 bg-error-500/10 px-4 py-3 text-[12px] text-error-200">
              Failed to load roles. Please refresh.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
