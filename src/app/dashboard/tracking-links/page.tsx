// src/app/dashboard/tracking-links/page.tsx
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import clsx from "clsx";
import Link from "next/link";
import { Users, Link2, CircleDollarSign, Ticket, Eye } from "lucide-react";

import TrackingLinksTable from "@/components/dashboard/tables/TrackingLinksTable";
import { Button } from "@/components/ui/Button";

/* ----------------------------- Types ------------------------------ */
type DestinationKind = "Event" | "Organization";
type Status = "Active" | "Paused" | "Disabled";

type TrackingLinkRow = {
  id: string;
  name: string;
  organizationId: string;
  destinationKind: DestinationKind;
  destinationId: string;
  destinationTitle: string;
  url: string;
  iconKey?: string | null;
  iconUrl?: string | null;
  views: number;
  ticketsSold: number;
  revenue: number;
  status: Status;
  created: string;
};

type MemberStatus = "invited" | "active" | "revoked" | "expired";
type MemberRole = "admin" | "promoter" | "scanner" | "collaborator";

type TrackingLinkMember = {
  id: string; // memberId
  name: string;
  email: string;
  role: MemberRole;
  status: MemberStatus;
  dateAdded: string;

  // aggregated metrics (for the member)
  pageViews: number;
  ticketsSold: number;
  revenue: number;
};

/** What the API currently returns from /api/tracking-links/members */
type MembersApiRow = {
  userId: string;
  name: string;
  email: string;
  image?: string | null;

  role?: string; // could be "admin", etc, or "—"
  status?: string; // could be "active", etc, or "—"

  links: number;
  views: number;
  ticketsSold: number;
  revenue: number;

  lastLinkCreatedAt?: string | null;
};

type MembersApiResponse = { rows: MembersApiRow[] } | MembersApiRow[];

/* ----------------------------- Helpers ---------------------------- */
function formatMoneyUSD(amount: number) {
  const n = Number.isFinite(amount) ? amount : 0;
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function fmtNum(n: number) {
  return (Number.isFinite(n) ? n : 0).toLocaleString("en-US");
}

function safeLower(s: unknown) {
  return typeof s === "string" ? s.toLowerCase() : "";
}

function asMemberRole(v: unknown): MemberRole {
  const s = safeLower(v);
  if (s === "admin") return "admin";
  if (s === "promoter") return "promoter";
  if (s === "scanner") return "scanner";
  if (s === "collaborator") return "collaborator";
  // fallback so UI never crashes
  return "collaborator";
}

function asMemberStatus(v: unknown): MemberStatus {
  const s = safeLower(v);
  if (s === "invited") return "invited";
  if (s === "active") return "active";
  if (s === "revoked") return "revoked";
  if (s === "expired") return "expired";
  // default that won’t look scary; also won’t crash
  return "active";
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function pickArray(
  obj: Record<string, unknown>,
  key: string,
): unknown[] | null {
  const val = obj[key];
  return Array.isArray(val) ? val : null;
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function asNumber(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function asNullableString(v: unknown): string | null | undefined {
  if (v === null) return null;
  if (typeof v === "string") return v;
  return undefined;
}

/**
 * We accept multiple backend shapes (rows/data/trackingLinks/links),
 * and coerce unknown rows to our UI shape with safe defaults.
 */
function parseTrackingLinksResponse(json: unknown): TrackingLinkRow[] {
  let raw: unknown[] = [];

  if (Array.isArray(json)) {
    raw = json;
  } else if (isRecord(json)) {
    raw =
      pickArray(json, "rows") ??
      pickArray(json, "data") ??
      pickArray(json, "trackingLinks") ??
      pickArray(json, "links") ??
      [];
  }

  return raw
    .map((item): TrackingLinkRow | null => {
      if (!isRecord(item)) return null;

      const id =
        asString(item.id) ||
        asString(item._id) ||
        asString(item.linkId) ||
        asString(item.trackingLinkId);

      if (!id) return null;

      const destinationKindRaw = asString(item.destinationKind);
      const destinationKind: DestinationKind =
        destinationKindRaw === "Organization" ? "Organization" : "Event";

      const statusRaw = asString(item.status);
      const status: Status =
        statusRaw === "Paused"
          ? "Paused"
          : statusRaw === "Disabled"
            ? "Disabled"
            : "Active";

      return {
        id,
        name: asString(item.name),
        organizationId: asString(item.organizationId),
        destinationKind,
        destinationId: asString(item.destinationId),
        destinationTitle: asString(item.destinationTitle),
        url: asString(item.url),
        iconKey: asNullableString(item.iconKey),
        iconUrl: asNullableString(item.iconUrl),
        views: asNumber(item.views),
        ticketsSold: asNumber(item.ticketsSold),
        revenue: asNumber(item.revenue),
        status,
        created: asString(item.created, new Date().toISOString()),
      };
    })
    .filter((x): x is TrackingLinkRow => Boolean(x));
}

function parseMembersResponse(json: unknown): MembersApiRow[] {
  if (Array.isArray(json)) return json as MembersApiRow[];
  if (isRecord(json)) {
    const rows = pickArray(json, "rows");
    if (rows) return rows as MembersApiRow[];
    const members = pickArray(json, "members");
    if (members) return members as MembersApiRow[];
  }
  return [];
}

async function fetchAllTrackingLinks(): Promise<TrackingLinkRow[]> {
  const res = await fetch("/api/tracking-links", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch tracking links");

  const json: unknown = await res.json().catch(() => null);
  return parseTrackingLinksResponse(json);
}

/**
 * Members endpoint (expected):
 * GET /api/tracking-links/members
 *
 * Backend currently returns: { rows: MemberRow[] }
 * (and MemberRow has: userId, name, email, views, ticketsSold, revenue, role?, status?, lastLinkCreatedAt?)
 */
async function fetchTrackingLinkMembers(): Promise<MembersApiRow[]> {
  const res = await fetch("/api/tracking-links/members", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch members");

  const json: unknown = await res.json().catch(() => null);
  return parseMembersResponse(json) as MembersApiRow[];
}

/* ----------------------------- UI Bits ---------------------------- */
type SummaryTone = "primary" | "warm" | "success" | "cool";

function SummaryCard({
  icon,
  label,
  value,
  sublabel,
  tone = "primary",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sublabel?: string;
  tone?: SummaryTone;
}) {
  const bg =
    tone === "warm"
      ? [
          "radial-gradient(920px 420px at 18% 12%, rgba(255,123,69,0.20), transparent 62%)",
          "radial-gradient(860px 460px at 86% 18%, rgba(255,90,220,0.14), transparent 62%)",
          "radial-gradient(900px 520px at 55% 120%, rgba(154,70,255,0.10), transparent 64%)",
          "linear-gradient(180deg, rgba(18,18,32,0.78), rgba(8,8,15,0.55))",
        ].join(",")
      : tone === "success"
        ? [
            "radial-gradient(920px 420px at 18% 12%, rgba(69,255,121,0.18), transparent 62%)",
            "radial-gradient(860px 460px at 86% 18%, rgba(255,123,69,0.10), transparent 62%)",
            "radial-gradient(900px 520px at 55% 120%, rgba(154,70,255,0.08), transparent 64%)",
            "linear-gradient(180deg, rgba(18,18,32,0.78), rgba(8,8,15,0.55))",
          ].join(",")
        : tone === "cool"
          ? [
              "radial-gradient(920px 420px at 18% 12%, rgba(66,139,255,0.14), transparent 62%)",
              "radial-gradient(860px 460px at 86% 18%, rgba(154,70,255,0.12), transparent 62%)",
              "radial-gradient(900px 520px at 55% 120%, rgba(43,217,255,0.08), transparent 64%)",
              "linear-gradient(180deg, rgba(18,18,32,0.78), rgba(8,8,15,0.55))",
            ].join(",")
          : [
              "radial-gradient(920px 420px at 18% 12%, rgba(154,70,255,0.20), transparent 62%)",
              "radial-gradient(860px 460px at 86% 18%, rgba(255,123,69,0.10), transparent 64%)",
              "radial-gradient(900px 520px at 55% 120%, rgba(255,90,220,0.08), transparent 66%)",
              "linear-gradient(180deg, rgba(18,18,32,0.78), rgba(8,8,15,0.55))",
            ].join(",");

  const orb =
    tone === "warm"
      ? "from-warning-500/60 via-primary-300/18 to-white/10"
      : tone === "success"
        ? "from-success-500/55 via-warning-500/14 to-white/10"
        : tone === "cool"
          ? "from-[#428BFF]/45 via-primary-300/18 to-white/10"
          : "from-primary-500/70 via-warning-500/12 to-white/10";

  const ringTone =
    tone === "warm"
      ? "ring-warning-500/18"
      : tone === "success"
        ? "ring-success-500/16"
        : tone === "cool"
          ? "ring-[#428BFF]/16"
          : "ring-primary-500/18";

  const iconTone =
    tone === "warm"
      ? "text-warning-100"
      : tone === "success"
        ? "text-success-100"
        : tone === "cool"
          ? "text-[#A9C9FF]"
          : "text-primary-100";

  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-2xl",
        "border border-white/10 bg-neutral-948/65",
        "shadow-[0_18px_60px_rgba(0,0,0,0.55)]",
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-95"
        style={{ background: bg }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(1000px 650px at 50% 120%, rgba(0,0,0,0.62), transparent 62%)",
        }}
      />

      <div className="relative p-4 sm:p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[12px] font-semibold text-neutral-300">
              {label}
            </div>
            <div className="mt-2 text-[28px] leading-none font-extrabold tracking-[-0.04em] text-neutral-0">
              {value}
            </div>
          </div>

          <div className="relative h-12 w-12">
            <div
              className={clsx(
                "absolute inset-0 rounded-full bg-gradient-to-br",
                orb,
              )}
            />
            <div
              className={clsx(
                "absolute inset-0 rounded-full ring-1 ring-inset",
                ringTone,
                "shadow-[0_18px_42px_rgba(0,0,0,0.48)]",
              )}
            />
            <div className="absolute inset-[2px] rounded-full bg-neutral-950/25 backdrop-blur-xl" />
            <div
              className={clsx(
                "absolute inset-0 grid place-items-center",
                iconTone,
              )}
            >
              {icon}
            </div>
          </div>
        </div>

        {sublabel ? (
          <div className="mt-3 text-[12px] tracking-[-0.02em] text-neutral-400">
            {sublabel}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: MemberStatus | string | undefined }) {
  const s = safeLower(status);

  const map: Record<MemberStatus, string> = {
    invited:
      "bg-primary-500/12 text-primary-200 ring-primary-500/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
    active:
      "bg-white/8 text-neutral-50 ring-white/14 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
    revoked:
      "bg-error-500/12 text-error-200 ring-error-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
    expired:
      "bg-warning-500/12 text-warning-200 ring-warning-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
  };

  const normalized = asMemberStatus(s);

  const label =
    normalized === "invited"
      ? "Invitation Pending"
      : normalized.charAt(0).toUpperCase() + normalized.slice(1);

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1",
        "text-[13px] font-semibold ring-1 ring-inset",
        map[normalized],
      )}
    >
      {label}
    </span>
  );
}

function RolePill({ role }: { role: MemberRole | string | undefined }) {
  const s = safeLower(role);
  const normalized = asMemberRole(s);

  const map: Record<MemberRole, string> = {
    admin:
      "bg-primary-500/12 text-primary-200 ring-primary-500/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
    promoter:
      "bg-[#428BFF]/12 text-[#A9C9FF] ring-[#428BFF]/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
    scanner:
      "bg-emerald-500/12 text-emerald-200 ring-emerald-500/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
    collaborator:
      "bg-white/8 text-neutral-100 ring-white/14 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
  };

  const label = normalized.charAt(0).toUpperCase() + normalized.slice(1);

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-3 py-1.5",
        "text-[13px] font-semibold ring-1 ring-inset",
        map[normalized],
      )}
    >
      {label}
    </span>
  );
}

function MembersTable({
  members,
  loading,
  error,
  onRetry,
}: {
  members: TrackingLinkMember[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const GRID =
    "md:grid md:items-center md:gap-6 md:grid-cols-[minmax(320px,2.2fr)_minmax(140px,1fr)_minmax(140px,1fr)_minmax(160px,1fr)_minmax(140px,1fr)_minmax(150px,1fr)_minmax(220px,1fr)]";

  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-2xl border border-white/10",
        "bg-neutral-950/70 shadow-[0_18px_60px_rgba(0,0,0,0.55)]",
      )}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(900px 320px at 25% 0%, rgba(154,70,255,0.10), transparent 60%), radial-gradient(900px 320px at 90% 110%, rgba(255,123,69,0.06), transparent 55%)",
        }}
      />

      <div className="relative p-4 md:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-base font-semibold tracking-[0.18em] text-neutral-300 uppercase">
              Members
            </div>
            <div className="mt-1 text-neutral-400">
              Members who have created tracking links
            </div>
          </div>

          {loading ? (
            <span className="text-xs text-neutral-500">Loading…</span>
          ) : error ? (
            <button
              type="button"
              onClick={onRetry}
              className="text-xs text-error-400 hover:text-error-300 underline underline-offset-4 cursor-pointer"
            >
              Failed to load — Retry
            </button>
          ) : (
            <div className="hidden md:inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-neutral-300">
              <span className="text-neutral-400">Members:</span>{" "}
              <span className="font-semibold text-neutral-100">
                {members.length}
              </span>
            </div>
          )}
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
          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-10 text-center text-neutral-400">
              Loading members…
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-10 text-center">
              <div className="text-[13px] font-semibold text-neutral-100">
                Couldn’t load members
              </div>
              <div className="mt-1 text-[12px] text-neutral-500">
                Backend endpoint missing or errored. Expected{" "}
                <span className="text-neutral-300 font-semibold">
                  /api/tracking-links/members
                </span>
                .
              </div>
              <div className="mt-5 flex justify-center">
                <Button type="button" variant="secondary" onClick={onRetry}>
                  Retry
                </Button>
              </div>
            </div>
          ) : members.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-10 text-center">
              <div className="text-[13px] font-semibold text-neutral-100">
                No members yet
              </div>
              <div className="mt-1 text-[12px] text-neutral-500">
                Once members create tracking links, they’ll appear here.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((m) => {
                const title = m.name || m.email;

                return (
                  <Link
                    key={m.id}
                    href={`/dashboard/tracking-links/members/${encodeURIComponent(
                      m.id,
                    )}`}
                    className={clsx(
                      "block",
                      "relative rounded-[12px] border border-white/10 bg-white/5 px-4 py-3",
                      "hover:bg-white/7 transition-colors",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
                    )}
                    title={`View ${title}'s tracking links`}
                  >
                    <div className="hidden md:block">
                      <div className={GRID}>
                        <div className="min-w-0">
                          <div className="truncate text-[14px] font-semibold text-neutral-0">
                            {title}
                          </div>
                          <div className="truncate text-[13px] text-neutral-400">
                            {m.email}
                          </div>
                        </div>

                        <div className="text-[13px] text-neutral-200">
                          <span className="font-semibold text-neutral-100">
                            {fmtNum(m.pageViews)}
                          </span>
                        </div>

                        <div className="text-[13px] text-neutral-200">
                          <span className="font-semibold text-neutral-100">
                            {fmtNum(m.ticketsSold)}
                          </span>
                        </div>

                        <div className="text-[13px] text-neutral-200">
                          <span className="font-semibold text-neutral-100">
                            {formatMoneyUSD(m.revenue)}
                          </span>
                        </div>

                        <div className="text-[13px] text-neutral-200">
                          <RolePill role={m.role} />
                        </div>

                        <div className="text-[13px] text-neutral-400">
                          {new Date(m.dateAdded).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <StatusPill status={m.status} />
                          <span className="text-[12px] font-semibold text-neutral-400">
                            View →
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="md:hidden">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-[14px] font-semibold text-neutral-0">
                            {title}
                          </div>
                          <div className="truncate text-[13px] text-neutral-400">
                            {m.email}
                          </div>
                        </div>
                        <StatusPill status={m.status} />
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-2 rounded-lg px-2.5 py-2 border border-white/10 bg-white/5 text-[13px] text-neutral-200">
                          <Eye className="h-4 w-4 text-primary-300" />
                          <span className="text-neutral-400">Views:</span>
                          <span className="font-semibold text-neutral-100">
                            {fmtNum(m.pageViews)}
                          </span>
                        </span>

                        <span className="inline-flex items-center gap-2 rounded-lg px-2.5 py-2 border border-white/10 bg-white/5 text-[13px] text-neutral-200">
                          <Ticket className="h-4 w-4 text-primary-300" />
                          <span className="text-neutral-400">Tickets:</span>
                          <span className="font-semibold text-neutral-100">
                            {fmtNum(m.ticketsSold)}
                          </span>
                        </span>

                        <span className="inline-flex items-center gap-2 rounded-lg px-2.5 py-2 border border-white/10 bg-white/5 text-[13px] text-neutral-200">
                          <CircleDollarSign className="h-4 w-4 text-primary-300" />
                          <span className="text-neutral-400">Revenue:</span>
                          <span className="font-semibold text-neutral-100">
                            {formatMoneyUSD(m.revenue)}
                          </span>
                        </span>

                        <span className="inline-flex items-center gap-2 rounded-lg px-2.5 py-2 border border-white/10 bg-white/5 text-[13px] text-neutral-200">
                          <Users className="h-4 w-4 text-primary-300" />
                          <span className="text-neutral-400">Role:</span>
                          <span className="font-semibold text-neutral-100">
                            {m.role}
                          </span>
                        </span>
                      </div>

                      <div className="mt-3 text-[12px] text-neutral-500">
                        Tap to view tracking links →
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Page ------------------------------ */
export default function TrackingLinksAllPage() {
  const [view, setView] = useState<"links" | "members">("links");

  const [rows, setRows] = useState<TrackingLinkRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [rowsError, setRowsError] = useState<string | null>(null);

  const [members, setMembers] = useState<TrackingLinkMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);

  const loadRows = useCallback(async () => {
    setLoadingRows(true);
    setRowsError(null);
    try {
      const r = await fetchAllTrackingLinks();
      setRows(r);
      setLoadingRows(false);
    } catch (e) {
      setLoadingRows(false);
      setRowsError(
        e instanceof Error ? e.message : "Failed to load tracking links",
      );
    }
  }, []);

  const loadMembers = useCallback(async () => {
    setLoadingMembers(true);
    setMembersError(null);
    try {
      const apiRows = await fetchTrackingLinkMembers();

      // Map backend shape -> UI shape (TrackingLinkMember)
      const mapped: TrackingLinkMember[] = apiRows.map((r) => ({
        id: r.userId, // IMPORTANT: UI expects id
        name: r.name ?? "",
        email: r.email ?? "",
        role: asMemberRole(r.role),
        status: asMemberStatus(r.status),
        // UI expects a dateAdded; backend gives lastLinkCreatedAt
        dateAdded: r.lastLinkCreatedAt ?? new Date().toISOString(), // safe fallback
        pageViews: Number.isFinite(r.views) ? r.views : 0,
        ticketsSold: Number.isFinite(r.ticketsSold) ? r.ticketsSold : 0,
        revenue: Number.isFinite(r.revenue) ? r.revenue : 0,
      }));

      setMembers(mapped);
      setLoadingMembers(false);
    } catch (e) {
      setLoadingMembers(false);
      setMembersError(
        e instanceof Error ? e.message : "Failed to load members",
      );
    }
  }, []);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    if (view !== "members") return;
    if (members.length) return;
    if (loadingMembers) return;
    loadMembers();
  }, [view, members.length, loadingMembers, loadMembers]);

  const totals = useMemo(() => {
    const totalLinks = rows.length;
    const revenue = rows.reduce(
      (a, b) => a + (Number.isFinite(b.revenue) ? b.revenue : 0),
      0,
    );
    const ticketsSold = rows.reduce(
      (a, b) => a + (Number.isFinite(b.ticketsSold) ? b.ticketsSold : 0),
      0,
    );
    const pageViews = rows.reduce(
      (a, b) => a + (Number.isFinite(b.views) ? b.views : 0),
      0,
    );

    return {
      totalLinks,
      revenue,
      ticketsSold,
      pageViews,
    };
  }, [rows]);

  const membersToggleBtn = (
    <button
      type="button"
      onClick={() => setView((v) => (v === "links" ? "members" : "links"))}
      className={clsx(
        "inline-flex items-center justify-center",
        "h-8 w-8 rounded-md",
        "border border-neutral-500 bg-neutral-700 text-white",
        "hover:text-white hover:border-white",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
        "cursor-pointer",
      )}
      title={
        view === "links"
          ? "Switch to Members view"
          : "Switch to Tracking Links view"
      }
      aria-label={
        view === "links"
          ? "Switch to Members view"
          : "Switch to Tracking Links view"
      }
    >
      <Users size={16} />
    </button>
  );

  return (
    <div className="relative overflow-hidden bg-neutral-950 text-neutral-0">
      <section className="w-full py-4 sm:py-6">
        <div className="mx-auto w-full max-w-[1600px] px-4 md:px-6 space-y-5">
          {/* Header (match My Members styling) */}
          <div>
            <h1 className="text-3xl font-bold tracking-[-0.03em] text-neutral-50">
              Tracking Links
            </h1>
            <p className="mt-1 text-[13px] tracking-[-0.02em] text-neutral-400">
              All links performance, plus a member breakdown for who’s creating
              them.
            </p>
          </div>

          {/* Summary cards */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              tone="primary"
              icon={<Link2 className="h-5 w-5" />}
              label="Total Tracking Links"
              value={loadingRows ? "—" : fmtNum(totals.totalLinks)}
              sublabel={
                rowsError ? "Failed to load totals" : "Total links created"
              }
            />
            <SummaryCard
              tone="success"
              icon={<CircleDollarSign className="h-5 w-5" />}
              label="Revenue"
              value={loadingRows ? "—" : formatMoneyUSD(totals.revenue)}
              sublabel="Total tracked revenue"
            />
            <SummaryCard
              tone="warm"
              icon={<Ticket className="h-5 w-5" />}
              label="Tickets Sold"
              value={loadingRows ? "—" : fmtNum(totals.ticketsSold)}
              sublabel="Total tickets attributed"
            />
            <SummaryCard
              tone="cool"
              icon={<Eye className="h-5 w-5" />}
              label="Page Views"
              value={loadingRows ? "—" : fmtNum(totals.pageViews)}
              sublabel="Total tracking link views"
            />
          </div>

          {/* Content */}
          <div className="pt-1">
            {view === "links" ? (
              <div>
                <TrackingLinksTable
                  scope="all"
                  showViewAll={false}
                  headerLeftAction={membersToggleBtn}
                />
                {!loadingRows && rowsError ? (
                  <div className="mt-4 flex items-center justify-center">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={loadRows}
                    >
                      Retry loading tracking links
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : (
              <div>
                <MembersTable
                  members={members}
                  loading={loadingMembers}
                  error={membersError}
                  onRetry={loadMembers}
                />

                <div className="mt-4 flex justify-center">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setView("links")}
                    icon={<Link2 className="h-4 w-4" />}
                  >
                    Back to Tracking Links
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
