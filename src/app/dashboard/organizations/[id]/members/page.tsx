"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
  X,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import InviteTeamModal, {
  type InvitePayload,
  type Role as InviteRole,
} from "@/components/bits/InviteTeamModal";

/* ----------------------------- Types ----------------------------- */
type Role = InviteRole;
type Status = "invited" | "active" | "revoked" | "expired";

type TeamMember = {
  _id: string;
  organizationId: string;
  email: string;
  name?: string;
  userId?: string | null;
  role: Role;
  status: Status;
  temporaryAccess: boolean;
  expiresAt?: string;
  scope?: "full" | "checkin" | "promo" | "custom";
  createdAt: string;
  updatedAt: string;
};

type UpdateBody = Partial<{
  role: Role;
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
  // Stable, tiny hash for deterministic demo metrics.
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

function useFluidTabIndicator(
  containerRef: { current: HTMLElement | null },
  indicatorRef: { current: HTMLElement | null },
  tab: string,
) {
  useLayoutEffect(() => {
    const c = containerRef.current;
    const i = indicatorRef.current;
    if (!c || !i) return;
    const active = c.querySelector<HTMLButtonElement>(`[data-tab="${tab}"]`);
    if (!active) return;
    const { offsetLeft, offsetWidth } = active;
    i.style.transform = `translateX(${offsetLeft}px)`;
    i.style.width = `${offsetWidth}px`;
  }, [containerRef, indicatorRef, tab]);
}

/* ----------------------------- UI bits --------------------------- */
const ROLE_META: Record<
  Role,
  { label: string; icon: React.ReactNode; blurb: string }
> = {
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
};

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
        "text-[12px] font-semibold ring-1 ring-inset",
        map[status],
      )}
    >
      {label}
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
        "text-[12px] text-neutral-200",
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
  onRemove,
  onChangeRole,
}: {
  canManage: boolean;
  member: TeamMember;
  onRemove: () => void;
  onChangeRole: (r: Role) => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

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

      // right-align to button by default
      let left = r.right - PANEL_W;
      left = Math.max(PAD, Math.min(left, window.innerWidth - PANEL_W - PAD));

      // initial: below the button
      let top = r.bottom + 10;

      setPos({ top, left });

      // after panel mounts, flip up if needed (needs panel height)
      requestAnimationFrame(() => {
        const h = panelRef.current?.offsetHeight ?? 0;
        const maxBottom = window.innerHeight - PAD;
        if (top + h > maxBottom) {
          top = Math.max(PAD, r.top - 10 - h);
          setPos({ top, left });
        }
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
              style={{ top: pos.top, left: pos.left }}
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
                    {ROLE_META[member.role].label}
                  </span>
                </div>
              </div>

              <div className="p-2 space-y-1">
                {(
                  ["admin", "promoter", "scanner", "collaborator"] as Role[]
                ).map((r) => {
                  const active = r === member.role;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        onChangeRole(r);
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
                          "inline-flex h-7 w-7 items-center justify-center rounded-lg",
                          active
                            ? "bg-primary-500/20 text-primary-200 ring-1 ring-primary-500/25"
                            : "bg-white/5 text-neutral-200 ring-1 ring-white/10",
                        )}
                      >
                        {ROLE_META[r].icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-semibold">
                          {ROLE_META[r].label}
                        </div>
                        <div className="text-[11px] text-neutral-500">
                          {ROLE_META[r].blurb}
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
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

/* ------------------------------ Roles Modal ------------------------ */
function RolesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement | null>(null);

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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center px-3 py-6"
      role="dialog"
      aria-modal="true"
      aria-label="Roles"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={clsx("absolute inset-0 bg-black/60 backdrop-blur-[10px]")}
      />

      <div
        ref={panelRef}
        className={clsx(
          "relative w-full max-w-[760px] overflow-hidden rounded-2xl",
          "border border-white/10 bg-neutral-950/80",
          "shadow-[0_30px_120px_rgba(0,0,0,0.75)]",
        )}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-100"
          style={{
            background:
              "radial-gradient(1100px 520px at 18% -10%, rgba(154,70,255,0.20), transparent 60%), radial-gradient(900px 520px at 100% 20%, rgba(66,139,255,0.10), transparent 62%), linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
          }}
        />

        <div className="relative flex items-center justify-between p-5">
          <div className="flex items-center gap-3">
            <div
              className={clsx(
                "inline-flex h-10 w-10 items-center justify-center rounded-xl",
                "bg-primary-500/15 text-primary-200 ring-1 ring-primary-500/20",
              )}
            >
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[16px] font-semibold tracking-[-0.2px] text-neutral-0">
                Roles & Permissions
              </div>
              <div className="mt-1 text-[12px] text-neutral-400">
                Create roles and edit permissions (Discord-style). UI only for
                now.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className={clsx(
              "inline-flex h-10 w-10 items-center justify-center rounded-full",
              "border border-white/10 bg-white/5 text-neutral-200 hover:bg-white/10",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
            )}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative px-5 pb-6">
          <div
            className={clsx(
              "rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5",
              "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
            )}
          >
            <div className="text-[13px] font-semibold text-neutral-100">
              Default roles
            </div>
            <div className="mt-2 grid gap-3 md:grid-cols-2">
              {(["admin", "promoter", "scanner", "collaborator"] as Role[]).map(
                (r) => (
                  <div
                    key={r}
                    className={clsx(
                      "rounded-2xl border border-white/10 bg-neutral-950/35 p-4",
                      "flex items-start gap-3",
                    )}
                  >
                    <div
                      className={clsx(
                        "inline-flex h-10 w-10 items-center justify-center rounded-xl",
                        "bg-primary-500/15 text-primary-200 ring-1 ring-primary-500/20",
                      )}
                    >
                      {ROLE_META[r].icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold text-neutral-0">
                        {ROLE_META[r].label}
                      </div>
                      <div className="mt-1 text-[12px] text-neutral-400">
                        {ROLE_META[r].blurb}
                      </div>
                      <div className="mt-3 text-[11px] text-neutral-500">
                        Permissions editor coming next.
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>

            <div className="mt-4 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                icon={<Plus className="h-4 w-4" />}
              >
                Create Role
              </Button>
            </div>
          </div>
        </div>
      </div>
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
  useFluidTabIndicator(tabBarRef, indicatorRef, tab);

  // TODO: Replace with real permission check (session/ACL).
  const canManageMembers = true;

  /* ---------------------- Shared Grid Template ---------------------- */
  // ✅ One grid template used by BOTH header + rows => consistent spacing/align
  const GRID =
    "md:grid md:items-center md:gap-6 md:grid-cols-[minmax(300px,2.2fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(140px,1fr)_minmax(140px,1fr)_minmax(200px,1fr)]";

  /* --------------------------- Data --------------------------- */
  const { data: members, isLoading } = useQuery<TeamMember[]>({
    queryKey: ["org-team", id],
    queryFn: () => json<TeamMember[]>(`/api/organizations/${id}/team`),
    staleTime: 30_000,
  });

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return baseList;
    return baseList.filter((m) => {
      const hay = `${m.name ?? ""} ${m.email}`.toLowerCase();
      return hay.includes(q);
    });
  }, [baseList, query]);

  /* --------------------------- Pagination --------------------------- */
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

  /* --------------------------- Demo metrics -------------------------- */
  const metrics = useMemo(() => {
    const map = new Map<
      string,
      { views: number; tickets: number; revenue: number }
    >();

    for (const m of filtered) {
      const seed = hashToInt(`${m._id}:${m.email}`);
      const views = 800 + (seed % 25000);
      const tickets = 10 + (seed % 920);
      const revenue = 250 + (seed % 125000) / 10; // 250..12,750.0
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
            {/* Header */}
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

            {/* Tabs */}
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

            {/* Column header */}
            <div
              className={clsx(
                "hidden md:block",
                "rounded-[12px] border border-white/10 bg-white/5 px-4 py-2.5",
                "text-[12px] font-semibold text-neutral-300",
              )}
            >
              <div className={GRID}>
                <div>Name</div>
                <div>Page Views</div>
                <div>Tickets Sold</div>
                <div>Revenue</div>
                <div>Date Added</div>
                <div>Status</div>
              </div>
            </div>

            {/* List */}
            <div className="mt-3">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-[84px] rounded-[12px]" />
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

                    return (
                      <div
                        key={m._id}
                        className={clsx(
                          "relative rounded-[12px] border border-white/10 bg-white/5 px-4 py-3",
                          "hover:bg-white/7 transition-colors",
                        )}
                      >
                        {/* Desktop row */}
                        <div className={clsx("hidden md:block")}>
                          <div className={GRID}>
                            {/* Name */}
                            <div className="min-w-0">
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="relative">
                                  <div className="h-10 w-10 overflow-hidden rounded-[10px] bg-white/5 ring-1 ring-white/10">
                                    <div className="flex h-full w-full items-center justify-center text-[12px] font-extrabold text-neutral-200">
                                      {badge}
                                    </div>
                                  </div>
                                  <div className="absolute -right-2 -bottom-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary-500/90 text-[10px] font-extrabold text-neutral-0 ring-1 ring-white/10">
                                    {badge}
                                  </div>
                                </div>

                                <div className="min-w-0">
                                  <div className="truncate text-[13px] font-semibold text-neutral-0">
                                    {title}
                                  </div>
                                  <div className="truncate text-[12px] text-neutral-400">
                                    {m.email}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Views */}
                            <div className="text-[12px] text-neutral-200">
                              <span className="font-semibold text-neutral-100">
                                {fmtNum(met.views)}
                              </span>
                            </div>

                            {/* Tickets */}
                            <div className="text-[12px] text-neutral-200">
                              <span className="font-semibold text-neutral-100">
                                {fmtNum(met.tickets)}
                              </span>
                            </div>

                            {/* Revenue */}
                            <div className="text-[12px] text-neutral-200">
                              <span className="font-semibold text-neutral-100">
                                {fmtUsd(met.revenue)}
                              </span>
                            </div>

                            {/* Date */}
                            <div className="text-[12px] text-neutral-400">
                              {prettyDateShort(m.createdAt)}
                            </div>

                            {/* Status + menu */}
                            <div className="flex items-center justify-between gap-3">
                              <StatusPill status={m.status} />
                              <MemberActionsMenu
                                canManage={canManageMembers}
                                member={m}
                                onRemove={() => deleteMutation.mutate(m._id)}
                                onChangeRole={(r) =>
                                  updateMutation.mutate({
                                    memberId: m._id,
                                    body: { role: r },
                                  })
                                }
                              />
                            </div>
                          </div>
                        </div>

                        {/* Mobile stacked */}
                        <div className="md:hidden">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="relative">
                                <div className="h-10 w-10 overflow-hidden rounded-[10px] bg-white/5 ring-1 ring-white/10">
                                  <div className="flex h-full w-full items-center justify-center text-[12px] font-extrabold text-neutral-200">
                                    {badge}
                                  </div>
                                </div>
                                <div className="absolute -right-2 -bottom-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary-500/90 text-[10px] font-extrabold text-neutral-0 ring-1 ring-white/10">
                                  {badge}
                                </div>
                              </div>

                              <div className="min-w-0">
                                <div className="truncate text-[13px] font-semibold text-neutral-0">
                                  {title}
                                </div>
                                <div className="truncate text-[12px] text-neutral-400">
                                  {m.email}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <StatusPill status={m.status} />
                              <MemberActionsMenu
                                canManage={canManageMembers}
                                member={m}
                                onRemove={() => deleteMutation.mutate(m._id)}
                                onChangeRole={(r) =>
                                  updateMutation.mutate({
                                    memberId: m._id,
                                    body: { role: r },
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

            {/* Mobile FAB */}
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

      {/* Invite Modal */}
      <InviteTeamModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvite={(payload) => inviteMutation.mutate(payload)}
        isSubmitting={inviteMutation.isPending}
      />

      {/* Roles Modal */}
      <RolesModal open={rolesOpen} onClose={() => setRolesOpen(false)} />
    </div>
  );
}
