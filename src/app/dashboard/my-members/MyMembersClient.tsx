"use client";

import { useMemo, useState } from "react";
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

/** Dummy “team” under creator/admin/team lead */
const DEMO_MEMBERS: DetailedMember[] = [
  {
    id: "m1",
    name: "Stephanie Nicol",
    role: "Team Lead",
    avatarText: "SN",
    revenue: 18606.81,
    pageViews: 4980,
    ticketsSold: 900,
  },
  {
    id: "m2",
    name: "Dennis Callis",
    role: "Promoter",
    avatarText: "DC",
    revenue: 7678.6,
    pageViews: 2098,
    ticketsSold: 119,
  },
  {
    id: "m3",
    name: "Daniel Hamilton",
    role: "Promoter",
    avatarText: "DH",
    revenue: 4668.37,
    pageViews: 1598,
    ticketsSold: 82,
  },
  {
    id: "m4",
    name: "Jake Mora",
    role: "Manager",
    avatarText: "JM",
    revenue: 16806.81,
    pageViews: 3980,
    ticketsSold: 420,
  },
  {
    id: "m5",
    name: "Mike Tyson",
    role: "Promoter",
    avatarText: "MT",
    revenue: 6806.81,
    pageViews: 1898,
    ticketsSold: 96,
  },
];

type SummaryVariant = "primary" | "success" | "error";

export default function MyMembersClient() {
  const [selectedId, setSelectedId] = useState<string>(
    DEMO_MEMBERS[0]?.id ?? "",
  );

  const selected = useMemo(() => {
    return DEMO_MEMBERS.find((m) => m.id === selectedId) ?? DEMO_MEMBERS[0];
  }, [selectedId]);

  // Summary cards dummy data
  const totalMembers = DEMO_MEMBERS.length;
  const newMembers = 2;
  const resignedMembers = 1;

  const tableRows: MemberRow[] = useMemo(() => {
    return DEMO_MEMBERS.map((m) => ({
      id: m.id,
      name: m.name,
      avatarUrl: m.avatarUrl,
      avatarBg: m.avatarBg,
      avatarText: m.avatarText,
      tickets: m.ticketsSold,
      views: m.pageViews,
      earned: m.revenue,
    }));
  }, []);

  return (
    <div className="w-full py-4 sm:py-6">
      <div className="mx-auto w-full max-w-[1600px] space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-[-0.03em] text-neutral-50">
            My Members
          </h1>
          <p className="mt-1 text-[13px] tracking-[-0.02em] text-neutral-400">
            Full member performance — revenue, page views, and ticket sales in
            one place.
          </p>
        </div>

        {/* Top Summary Cards */}
        <section className="grid gap-4 md:grid-cols-3">
          <SummaryCard
            variant="primary"
            title="Total Members"
            value={fmtCompact(totalMembers)}
            icon={<Users className="h-[18px] w-[18px]" />}
          />
          <SummaryCard
            variant="success"
            title="New Members"
            value={fmtCompact(newMembers)}
            icon={<UserPlus className="h-[18px] w-[18px]" />}
          />
          <SummaryCard
            variant="error"
            title="Resigned Members"
            value={fmtCompact(resignedMembers)}
            icon={<UserMinus className="h-[18px] w-[18px]" />}
          />
        </section>

        {/* Main Layout */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-[1.65fr_0.95fr] lg:items-stretch">
          <MyMembersTable
            title="My Members"
            members={tableRows}
            selectedId={selectedId}
            onSelect={(id) => setSelectedId(id)}
          />

          <DetailedMemberCard member={selected} />
        </section>

        {/* Graph */}
        <section className="grid grid-cols-1">
          <MemberStatsChart
            member={selected}
            defaultTab={"revenue" satisfies MemberChartTab}
          />
        </section>
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
  icon: React.ReactNode;
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

        {/* Better icon orb */}
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
