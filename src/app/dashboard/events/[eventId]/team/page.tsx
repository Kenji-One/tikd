"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import {
  Plus,
  Mail,
  Trash2,
  ChevronDown,
  RefreshCw,
  ShieldCheck,
  Megaphone,
  ScanLine,
  Users as UsersIcon,
} from "lucide-react";

import { Skeleton } from "@/components/ui/Skeleton";
import ShineCard from "@/components/bits/ShineCard";
import InviteTeamModal, {
  InvitePayload,
  Role as InviteRole,
} from "@/components/bits/InviteTeamModal";
import { Button } from "@/components/ui/Button";

import { fetchEventById, type EventWithMeta } from "@/lib/api/events";

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

function prettyDate(d?: string) {
  if (!d) return "";
  return new Date(d).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ------------------------- Bits-style tab underline -------------- */
function useFluidTabIndicator(
  containerRef: { current: HTMLElement | null },
  indicatorRef: { current: HTMLElement | null },
  tab: string
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

/* ----------------------------- Pills / Select -------------------- */
function StatusPill({ status }: { status: Status }) {
  const map: Record<Status, string> = {
    invited:
      "bg-primary-900/30 text-primary-300 ring-primary-700/30 shadow-[inset_0_0_0_1px_rgba(154,70,255,.16)]",
    active:
      "bg-white/10 text-neutral-0 ring-white/15 shadow-[inset_0_0_0_1px_rgba(255,255,255,.08)]",
    revoked:
      "bg-error-900/40 text-error-300 ring-error-700/40 shadow-[inset_0_0_0_1px_rgba(220,0,19,.16)]",
    expired:
      "bg-warning-900/40 text-warning-300 ring-warning-700/40 shadow-[inset_0_0_0_1px_rgba(212,88,0,.16)]",
  };
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm ring-1 ring-inset",
        map[status]
      )}
    >
      {status === "invited" ? (
        <>
          <Mail className="h-3.5 w-3.5" /> Invitation Pending
        </>
      ) : (
        status.charAt(0).toUpperCase() + status.slice(1)
      )}
    </span>
  );
}

const ROLE_ICONS: Record<Role, ReactNode> = {
  admin: <ShieldCheck className="h-5 w-5" />,
  promoter: <Megaphone className="h-5 w-5" />,
  scanner: <ScanLine className="h-5 w-5" />,
  collaborator: <UsersIcon className="h-5 w-5" />,
};

function RoleSelect({
  role,
  onChange,
}: {
  role: Role;
  onChange: (r: Role) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex w-44 items-center justify-between gap-2 rounded-full bg-neutral-900 px-4 py-2 text-sm ring-1 ring-inset ring-white/10 hover:ring-primary-700/40"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-2 capitalize">
          {ROLE_ICONS[role]}
          {role}
        </span>
        <ChevronDown className="h-4 w-4 opacity-80" />
      </button>

      {open && (
        <div
          ref={menuRef}
          className="absolute z-50 mt-2 w-48 overflow-hidden rounded-xl border border-white/10 bg-neutral-950/95 shadow-xl backdrop-blur-md"
          role="menu"
        >
          {(["admin", "promoter", "scanner", "collaborator"] as Role[]).map(
            (r) => (
              <button
                key={r}
                className={clsx(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm capitalize transition-colors",
                  r === role
                    ? "bg-primary-900/25 text-neutral-0"
                    : "text-neutral-300 hover:bg-white/5"
                )}
                onClick={() => {
                  onChange(r);
                  setOpen(false);
                }}
                role="menuitem"
              >
                {ROLE_ICONS[r]}
                {r}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Page ------------------------------ */
export default function EventTeamPage() {
  const { eventId } = useParams() as { eventId?: string };
  const qc = useQueryClient();

  const [tab, setTab] = useState<"active" | "temporary">("active");
  const [modalOpen, setModalOpen] = useState(false);
  const [query, setQuery] = useState("");

  const tabBarRef = useRef<HTMLDivElement | null>(null);
  const indicatorRef = useRef<HTMLSpanElement | null>(null);
  useFluidTabIndicator(tabBarRef, indicatorRef, tab);

  // 1) Get event -> organizationId (because team is managed at org level in your API)
  const { data: event } = useQuery<EventWithMeta>({
    queryKey: ["event", eventId],
    queryFn: () => fetchEventById(eventId!),
    enabled: !!eventId,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });

  const organizationId = event?.organization?._id;

  /* --------------------------- Data --------------------------- */
  const {
    data: members,
    isLoading,
    isFetching,
    refetch,
  } = useQuery<TeamMember[]>({
    queryKey: ["org-team", organizationId],
    enabled: !!organizationId,
    queryFn: () =>
      json<TeamMember[]>(`/api/organizations/${organizationId}/team`),
    staleTime: 30_000,
  });

  const inviteMutation = useMutation({
    mutationFn: (payload: InvitePayload) =>
      json<{ member: TeamMember }>(
        `/api/organizations/${organizationId}/team`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-team", organizationId] });
      setModalOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (args: { memberId: string; body: UpdateBody }) =>
      json<TeamMember>(
        `/api/organizations/${organizationId}/team/${args.memberId}`,
        {
          method: "PATCH",
          body: JSON.stringify(args.body),
        }
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["org-team", organizationId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (memberId: string) =>
      json<{ ok: boolean }>(
        `/api/organizations/${organizationId}/team/${memberId}`,
        {
          method: "DELETE",
        }
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["org-team", organizationId] }),
  });

  const [active, temporary] = useMemo(() => {
    const list = members ?? [];
    return [
      list.filter((m) => !m.temporaryAccess),
      list.filter((m) => m.temporaryAccess),
    ];
  }, [members]);

  // Client search
  const renderList = useMemo(() => {
    const base = tab === "active" ? active : temporary;
    if (!query.trim()) return base;
    const q = query.toLowerCase();
    return base.filter(
      (m) =>
        m.email.toLowerCase().includes(q) ||
        (m.name || "").toLowerCase().includes(q)
    );
  }, [tab, active, temporary, query]);

  if (!eventId) {
    return (
      <div className="text-error-400">Missing event id in route params.</div>
    );
  }

  if (!organizationId) {
    return (
      <div className="">
        <div className="rounded-card border border-white/8 bg-neutral-948/90 px-6 py-8 text-center text-neutral-300">
          Loading event team…
        </div>
      </div>
    );
  }

  /* ----------------------------- UI ---------------------------- */
  return (
    <div className="">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-neutral-0">Event Team</h2>
          <p className="mt-1 text-neutral-300">
            Invite admins, promoters, scanners, or collaborators who can help
            run this event. Access is managed at the organization level.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              className="w-64 rounded-full border bg-neutral-900/80 px-4 py-2 text-sm outline-none placeholder:text-neutral-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              placeholder="Search by name or email…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search team"
            />
            {query && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-xs text-neutral-400 hover:text-neutral-0"
                onClick={() => setQuery("")}
                type="button"
              >
                Clear
              </button>
            )}
          </div>

          {/* <button
            onClick={() => setModalOpen(true)}
            className="relative inline-flex items-center justify-center overflow-hidden rounded-full bg-primary-700 px-4 py-2 text-sm font-medium text-white ring-1 ring-primary-600/60 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:transition-transform before:duration-700 hover:before:translate-x-full"
            type="button"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add member
          </button> */}

          <Button
            type="button"
            aria-label="Add member"
            onClick={() => setModalOpen(true)}
            animation={true}
          >
            <Plus className="h-4 w-4" />
            Add member
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div
        ref={tabBarRef}
        className="relative mb-5 inline-flex rounded-full border border-white/10 bg-neutral-950"
      >
        <button
          data-tab="active"
          className={clsx(
            "relative z-10 rounded-full px-4 py-2 text-sm",
            tab === "active"
              ? "text-neutral-0"
              : "text-neutral-300 hover:text-neutral-0"
          )}
          onClick={() => setTab("active")}
          type="button"
        >
          Active Members
        </button>
        <button
          data-tab="temporary"
          className={clsx(
            "relative z-10 rounded-full px-4 py-2 text-sm",
            tab === "temporary"
              ? "text-neutral-0"
              : "text-neutral-300 hover:text-neutral-0"
          )}
          onClick={() => setTab("temporary")}
          type="button"
        >
          Temporary access
        </button>
        <span
          ref={indicatorRef}
          className="absolute left-0 top-0 h-full w-0 rounded-full bg-white/10 ring-1 ring-inset ring-white/15 transition-[transform,width] duration-200 ease-out"
          aria-hidden="true"
        />
      </div>

      {/* Table */}
      <ShineCard animated={true}>
        <div className="grid grid-cols-12 gap-2 rounded-xl px-3 py-2 text-xs text-neutral-300">
          <div className="col-span-5">Member</div>
          <div className="col-span-3">Role</div>
          <div className="col-span-3">Status</div>
          <div className="col-span-1 text-right">
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-neutral-300 hover:text-neutral-0"
              title="Refresh"
              type="button"
            >
              <RefreshCw
                className={clsx("h-4 w-4", isFetching && "animate-spin")}
              />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2 p-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {renderList.map((m) => (
              <div
                key={m._id}
                className="grid grid-cols-12 items-center gap-2 px-3 py-3 transition-colors hover:bg-white/5"
              >
                <div className="col-span-5">
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-md bg-neutral-900 ring-1 ring-inset ring-white/10">
                      <span className="text-sm">
                        {(m.name || m.email)[0]?.toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm">
                        {m.name || m.email}
                      </div>
                      <div className="truncate text-xs text-neutral-400">
                        {m.email}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-span-3">
                  <RoleSelect
                    role={m.role}
                    onChange={(r) =>
                      updateMutation.mutate({
                        memberId: m._id,
                        body: { role: r },
                      })
                    }
                  />
                </div>

                <div className="col-span-3">
                  <div className="flex items-center gap-2">
                    <StatusPill status={m.status} />
                    {m.temporaryAccess && (
                      <span className="text-xs text-neutral-400">
                        until {prettyDate(m.expiresAt)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="col-span-1">
                  <div className="flex items-center justify-end gap-2">
                    {m.status === "invited" && (
                      <button
                        className="rounded-full bg-white/10 px-3 py-1 text-xs text-neutral-0 ring-1 ring-inset ring-white/15 hover:bg-white/15"
                        onClick={() =>
                          updateMutation.mutate({
                            memberId: m._id,
                            body: { action: "resend" },
                          })
                        }
                        title="Resend invitation"
                        type="button"
                      >
                        Resend
                      </button>
                    )}
                    <button
                      className="rounded-full bg-error-600/90 p-2 text-neutral-0 ring-1 ring-inset ring-error-700/40 hover:bg-error-600"
                      onClick={() => deleteMutation.mutate(m._id)}
                      title="Remove"
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {renderList.length === 0 && (
              <div className="px-3 py-8 text-center text-sm text-neutral-300">
                No members here yet.
              </div>
            )}
          </div>
        )}
      </ShineCard>

      {/* Mobile FAB */}
      <button
        onClick={() => setModalOpen(true)}
        className="fixed bottom-6 right-6 sm:hidden relative inline-flex items-center justify-center overflow-hidden rounded-full bg-primary-700 px-4 py-2 text-sm font-medium text-white ring-1 ring-primary-600/60 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:transition-transform before:duration-700 hover:before:translate-x-full"
        type="button"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add
      </button>

      {/* Invite Modal */}
      <InviteTeamModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onInvite={(payload) => inviteMutation.mutate(payload)}
        isSubmitting={inviteMutation.isPending}
      />
    </div>
  );
}
