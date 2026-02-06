// src/app/dashboard/tracking-links/members/[memberId]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CircleDollarSign,
  Eye,
  Link2,
  Ticket,
  Users,
} from "lucide-react";

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

type TrackingLinkMember = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

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

function initials(nameOrEmail: string) {
  const s = (nameOrEmail || "").trim();
  if (!s) return "M";
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase();
}

async function fetchMember(
  memberId: string,
): Promise<TrackingLinkMember | null> {
  // ✅ Now supported by the new API route
  const url = `/api/tracking-links/members/${encodeURIComponent(memberId)}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json().catch(() => null)) as any;
    const item = json?.member ?? null;
    if (!item || typeof item !== "object") return null;

    return {
      id: String(item.id ?? memberId),
      name: String(item.name ?? ""),
      email: String(item.email ?? ""),
      image: item.image ?? null,
    };
  } catch {
    return null;
  }
}

async function fetchTrackingLinksForMember(
  memberId: string,
): Promise<TrackingLinkRow[]> {
  const res = await fetch(
    `/api/tracking-links?createdBy=${encodeURIComponent(memberId)}`,
    { cache: "no-store" },
  );

  if (!res.ok) throw new Error("Failed to fetch member tracking links");

  const json = (await res.json().catch(() => null)) as any;
  const rows =
    (Array.isArray(json?.rows) ? json.rows : null) ??
    (Array.isArray(json?.data) ? json.data : null) ??
    (Array.isArray(json?.trackingLinks) ? json.trackingLinks : null) ??
    (Array.isArray(json?.links) ? json.links : null) ??
    [];

  return rows as TrackingLinkRow[];
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
  icon: React.ReactNode;
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

/* ------------------------------ Page ------------------------------ */
export default function MemberTrackingLinksPage() {
  const { memberId } = useParams<{ memberId: string }>();

  const [member, setMember] = useState<TrackingLinkMember | null>(null);
  const [rows, setRows] = useState<TrackingLinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setErr(null);

    try {
      const [m, r] = await Promise.all([
        fetchMember(memberId),
        fetchTrackingLinksForMember(memberId),
      ]);

      setMember(m);
      setRows(r);
      setLoading(false);
    } catch (e) {
      setLoading(false);
      setErr(
        e instanceof Error ? e.message : "Failed to load member tracking links",
      );
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId]);

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

    return { totalLinks, revenue, ticketsSold, pageViews };
  }, [rows]);

  const memberTitle =
    member?.name || member?.email || (loading ? "Loading member…" : "Member");

  return (
    <div className="relative overflow-hidden bg-neutral-950 text-neutral-0">
      <section className="w-full py-4 sm:py-6">
        <div className="mx-auto w-full max-w-[1600px] px-4 md:px-6 space-y-5">
          {/* Header */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Button
                asChild
                variant="secondary"
                size="sm"
                icon={<ArrowLeft className="h-4 w-4" />}
              >
                <Link href="/dashboard/tracking-links">Back</Link>
              </Button>

              {err ? (
                <button
                  type="button"
                  onClick={load}
                  className="text-xs text-error-400 hover:text-error-300 underline underline-offset-4 cursor-pointer"
                >
                  Failed to load — Retry
                </button>
              ) : null}
            </div>

            <div>
              <h1 className="text-3xl font-bold tracking-[-0.03em] text-neutral-50">
                Tracking Links
              </h1>
              <p className="mt-1 text-[13px] tracking-[-0.02em] text-neutral-400">
                {memberTitle} — tracking links created by this member.
              </p>
            </div>

            {/* ✅ Member card: avatar + name */}
            <div
              className={clsx(
                "inline-flex w-fit items-center gap-3 rounded-2xl",
                "border border-white/10 bg-neutral-948/55 px-3.5 py-3",
                "shadow-[0_18px_60px_rgba(0,0,0,0.45)]",
              )}
            >
              <div className="relative h-10 w-10 overflow-hidden rounded-xl ring-1 ring-white/10 bg-white/5">
                {member?.image ? (
                  <Image
                    src={member.image}
                    alt={memberTitle}
                    fill
                    className="object-cover"
                    sizes="40px"
                    priority
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center">
                    <span className="text-[13px] font-semibold text-neutral-100">
                      {initials(memberTitle)}
                    </span>
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <div className="text-[14px] font-semibold text-neutral-0 truncate max-w-[520px]">
                  {memberTitle}
                </div>
                <div className="text-[12px] text-neutral-400 truncate max-w-[520px]">
                  {member?.email
                    ? member.email
                    : "Showing only tracking links created by this member"}
                </div>
              </div>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              tone="primary"
              icon={<Link2 className="h-5 w-5" />}
              label="Total Tracking Links"
              value={loading ? "—" : fmtNum(totals.totalLinks)}
              sublabel={
                err ? "Failed to load totals" : "Links created by member"
              }
            />
            <SummaryCard
              tone="success"
              icon={<CircleDollarSign className="h-5 w-5" />}
              label="Revenue"
              value={loading ? "—" : formatMoneyUSD(totals.revenue)}
              sublabel="Total tracked revenue"
            />
            <SummaryCard
              tone="warm"
              icon={<Ticket className="h-5 w-5" />}
              label="Tickets Sold"
              value={loading ? "—" : fmtNum(totals.ticketsSold)}
              sublabel="Total tickets attributed"
            />
            <SummaryCard
              tone="cool"
              icon={<Eye className="h-5 w-5" />}
              label="Page Views"
              value={loading ? "—" : fmtNum(totals.pageViews)}
              sublabel="Total tracking link views"
            />
          </div>

          {/* Table */}
          <div className="pt-1">
            <TrackingLinksTable scope="all" showViewAll={false} />

            {err ? (
              <div className="mt-4 flex items-center justify-center">
                <Button type="button" variant="secondary" onClick={load}>
                  Retry loading member tracking links
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
