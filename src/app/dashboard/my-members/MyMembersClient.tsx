// src/app/dashboard/my-members/MyMembersClient.tsx
"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { Users, UserPlus, UserMinus } from "lucide-react";

import MemberStatsChart, {
  type MemberChartTab,
} from "./components/MemberStatsChart";
import MyMembersTable, { type MemberRow } from "./components/MyMembersTable";
import DetailedMemberCard, {
  type DetailedMember,
} from "./components/DetailedMemberCard";

function fmtCompact(n: number) {
  return n.toLocaleString(undefined);
}

function initialsFromName(name: string) {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);

  if (!parts.length) return "MB";

  const first = parts[0]?.[0] ?? "";
  const second = (parts.length > 1 ? parts[1]?.[0] : parts[0]?.[1]) ?? "";
  return `${first}${second}`.toUpperCase() || "MB";
}

type TrackingMemberMetricRow = {
  userId: string;
  name: string;
  email: string;
  image?: string | null;
  role?: string;
  status?: string;
  links: number;
  views: number;
  ticketsSold: number;
  revenue: number;
  lastLinkCreatedAt?: string | null;
};

type TrackingMembersResponse = {
  rows: TrackingMemberMetricRow[];
};

type SummaryVariant = "primary" | "success" | "error";

async function fetchTrackingMembers(): Promise<TrackingMembersResponse> {
  const res = await fetch("/api/tracking-links/members?scope=all", {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    let message = "Failed to load members.";
    try {
      const data = (await res.json()) as { error?: string };
      if (typeof data?.error === "string" && data.error.trim()) {
        message = data.error;
      }
    } catch {
      // ignore non-json error bodies
    }
    throw new Error(message);
  }

  return (await res.json()) as TrackingMembersResponse;
}

export default function MyMembersClient() {
  const [selectedId, setSelectedId] = useState<string>("");

  const { data, isLoading, isError, error } = useQuery<TrackingMembersResponse>(
    {
      queryKey: ["tracking-members", "all"],
      queryFn: fetchTrackingMembers,
      staleTime: 30_000,
    },
  );

  const members: DetailedMember[] = useMemo(() => {
    return (data?.rows ?? []).map((row) => ({
      id: row.userId,
      name: row.name || row.email || "Member",
      role: row.role?.trim() || "Member",
      avatarUrl: row.image ?? null,
      avatarText: initialsFromName(row.name || row.email || "Member"),
      revenue: Number.isFinite(row.revenue) ? row.revenue : 0,
      pageViews: Number.isFinite(row.views) ? row.views : 0,
      ticketsSold: Number.isFinite(row.ticketsSold) ? row.ticketsSold : 0,
      email: row.email || "",
      status: row.status?.trim() || "",
      links: Number.isFinite(row.links) ? row.links : 0,
      lastLinkCreatedAt: row.lastLinkCreatedAt ?? null,
    }));
  }, [data]);

  useEffect(() => {
    if (!members.length) {
      if (selectedId) setSelectedId("");
      return;
    }

    const exists = members.some((member) => member.id === selectedId);
    if (!exists) {
      setSelectedId(members[0]?.id ?? "");
    }
  }, [members, selectedId]);

  const selected = useMemo(() => {
    if (!members.length) return null;
    return (
      members.find((member) => member.id === selectedId) ?? members[0] ?? null
    );
  }, [members, selectedId]);

  const tableRows: MemberRow[] = useMemo(() => {
    return members.map((member) => ({
      id: member.id,
      name: member.name,
      avatarUrl: member.avatarUrl,
      avatarBg: member.avatarBg,
      avatarText: member.avatarText,
      tickets: member.ticketsSold,
      views: member.pageViews,
      earned: member.revenue,
    }));
  }, [members]);

  const totalMembers = members.length;
  const membersWithSales = members.filter(
    (member) => member.ticketsSold > 0 || member.revenue > 0,
  ).length;
  const membersWithoutSales = Math.max(0, totalMembers - membersWithSales);

  return (
    <div className="w-full py-4 sm:py-6">
      <div className="mx-auto w-full max-w-[1600px] space-y-5">
        <div>
          <h1 className="text-3xl font-bold tracking-[-0.03em] text-neutral-50">
            My Members
          </h1>
          <p className="mt-1 text-[13px] tracking-[-0.02em] text-neutral-400">
            Full member performance — revenue, page views, and ticket sales in
            one place.
          </p>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <SummaryCard
            variant="primary"
            title="Total Members"
            value={isLoading ? "—" : fmtCompact(totalMembers)}
            icon={<Users className="h-[18px] w-[18px]" />}
          />
          <SummaryCard
            variant="success"
            title="Members With Sales"
            value={isLoading ? "—" : fmtCompact(membersWithSales)}
            icon={<UserPlus className="h-[18px] w-[18px]" />}
          />
          <SummaryCard
            variant="error"
            title="Members Without Sales"
            value={isLoading ? "—" : fmtCompact(membersWithoutSales)}
            icon={<UserMinus className="h-[18px] w-[18px]" />}
          />
        </section>

        {isError ? (
          <div
            className={clsx(
              "rounded-xl border border-error-500/20 bg-error-500/10 px-4 py-4",
              "text-sm font-medium text-error-100",
            )}
          >
            {error instanceof Error ? error.message : "Failed to load members."}
          </div>
        ) : null}

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-[1.65fr_0.95fr] lg:items-stretch">
          <MyMembersTable
            title="My Members"
            members={tableRows}
            selectedId={selectedId}
            onSelect={(id) => setSelectedId(id)}
          />

          {selected ? (
            <DetailedMemberCard member={selected} />
          ) : (
            <EmptySideCard />
          )}
        </section>

        <section className="grid grid-cols-1">
          {selected ? (
            <MemberStatsChart
              member={selected}
              defaultTab={"revenue" satisfies MemberChartTab}
            />
          ) : (
            <EmptyChartCard />
          )}
        </section>
      </div>
    </div>
  );
}

function EmptySideCard() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-neutral-800/70 bg-neutral-948/70 p-5">
      <div
        className="pointer-events-none absolute inset-0 opacity-95"
        style={{
          background: [
            "radial-gradient(1000px 640px at 20% 0%, rgba(154,70,255,0.20), transparent 62%)",
            "radial-gradient(900px 620px at 120% 40%, rgba(255,123,69,0.08), transparent 66%)",
            "linear-gradient(180deg, rgba(18,18,32,0.74), rgba(8,8,15,0.58))",
          ].join(","),
        }}
      />
      <div className="relative flex h-full min-h-[280px] items-center justify-center text-center">
        <div>
          <div className="text-[16px] font-extrabold tracking-[-0.03em] text-neutral-50">
            No members yet
          </div>
          <p className="mt-2 text-[13px] text-neutral-400">
            Member performance will appear here when live tracking data becomes
            available.
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyChartCard() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-neutral-800/70 bg-neutral-948/70 p-4 sm:p-5">
      <div
        className="pointer-events-none absolute inset-0 opacity-85"
        style={{
          background:
            "radial-gradient(1100px 620px at 0% 0%, rgba(154,70,255,0.22), transparent 58%), radial-gradient(900px 640px at 100% 20%, rgba(154,70,255,0.10), transparent 62%)",
        }}
      />
      <div className="relative flex min-h-[320px] items-center justify-center text-center">
        <div>
          <div className="text-[16px] font-extrabold tracking-[-0.03em] text-neutral-50">
            No chart data yet
          </div>
          <p className="mt-2 text-[13px] text-neutral-400">
            Select a member after live data becomes available.
          </p>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  variant,
  title,
  value,
  icon,
}: {
  variant: SummaryVariant;
  title: string;
  value: string;
  icon: ReactNode;
}) {
  const bg =
    variant === "primary"
      ? [
          "radial-gradient(900px 520px at 18% 10%, rgba(154,70,255,0.38), transparent 62%)",
          "radial-gradient(780px 480px at 85% 20%, rgba(167,115,255,0.20), transparent 62%)",
          "linear-gradient(180deg, rgba(18,18,32,0.75), rgba(8,8,15,0.55))",
        ].join(",")
      : variant === "success"
        ? [
            "radial-gradient(900px 520px at 18% 10%, rgba(69,255,121,0.22), transparent 62%)",
            "radial-gradient(780px 480px at 85% 20%, rgba(154,70,255,0.14), transparent 64%)",
            "linear-gradient(180deg, rgba(18,18,32,0.75), rgba(8,8,15,0.55))",
          ].join(",")
        : [
            "radial-gradient(900px 520px at 18% 10%, rgba(255,69,74,0.18), transparent 62%)",
            "radial-gradient(780px 480px at 85% 20%, rgba(154,70,255,0.14), transparent 64%)",
            "linear-gradient(180deg, rgba(18,18,32,0.75), rgba(8,8,15,0.55))",
          ].join(",");

  const orb =
    variant === "primary"
      ? "from-primary-500/70 via-primary-300/20 to-white/10"
      : variant === "success"
        ? "from-success-500/55 via-primary-300/18 to-white/10"
        : "from-error-500/50 via-primary-300/16 to-white/10";

  const iconTone =
    variant === "primary"
      ? "text-primary-100"
      : variant === "success"
        ? "text-success-100"
        : "text-error-100";

  return (
    <div className="relative overflow-hidden rounded-xl border border-neutral-800/70 bg-neutral-948/70 p-4">
      <div
        className="pointer-events-none absolute inset-0 opacity-95"
        style={{ background: bg }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-55"
        style={{
          background:
            "radial-gradient(1000px 650px at 50% 120%, rgba(0,0,0,0.60), transparent 62%)",
        }}
      />

      <div className="relative flex items-center justify-between gap-3">
        <div>
          <div className="text-[12px] font-semibold text-neutral-300">
            {title}
          </div>
          <div className="mt-2 text-[26px] font-extrabold tracking-[-0.04em] text-neutral-50">
            {value}
          </div>
        </div>

        <div className="relative h-11 w-11">
          <div
            className={clsx(
              "absolute inset-0 rounded-full bg-gradient-to-br",
              orb,
            )}
          />
          <div className="absolute inset-0 rounded-full ring-1 ring-white/14 shadow-[0_18px_40px_rgba(0,0,0,0.45)]" />
          <div className="absolute inset-[2px] rounded-full bg-neutral-950/30 backdrop-blur-xl" />
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
    </div>
  );
}
