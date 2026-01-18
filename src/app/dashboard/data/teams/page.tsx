/* ------------------------------------------------------------------ */
/*  src/app/dashboard/data/teams/page.tsx                             */
/* ------------------------------------------------------------------ */
"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/Button";

import DashboardDataTable, {
  type DashboardTableColumn,
  TableAvatar,
} from "@/components/dashboard/tables/DashboardDataTable";

type Row = {
  id: string;
  name: string;
  income: number;
  views: number;
  members: number;
  dateCreated: string;
  avatarBg?: string;
};

const ROWS: Row[] = Array.from({ length: 10 }).map((_, i) => ({
  id: "#2935",
  name: "Avalon Team: Bla Bla",
  income: 892102,
  views: 1000222,
  members: 20,
  dateCreated: "Sep 19, 2025",
  avatarBg:
    i % 3 === 0
      ? "bg-gradient-to-br from-indigo-500 to-cyan-400"
      : i % 3 === 1
        ? "bg-gradient-to-br from-fuchsia-500 to-rose-500"
        : "bg-gradient-to-br from-primary-500 to-purple-500",
}));

const fmtUsd = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });

function dateToMs(label: string) {
  const ms = Date.parse(label);
  return Number.isFinite(ms) ? ms : 0;
}

export default function DataTeamsPage() {
  const columns: DashboardTableColumn<Row>[] = [
    {
      key: "id",
      header: "Order",
      sortable: true,
      sortValue: (r) => r.id,
      cell: (r) => <span className="text-neutral-300">{r.id}</span>,
    },
    {
      key: "name",
      header: "Name",
      sortable: true,
      sortValue: (r) => r.name,
      tdClassName: "!pl-0",
      cell: (r) => (
        <div className="flex min-w-0 items-center gap-3">
          <TableAvatar src={null} bgClassName={r.avatarBg} />
          <span className="truncate text-neutral-0" title={r.name}>
            {r.name}
          </span>
        </div>
      ),
    },
    {
      key: "income",
      header: "$ Income",
      sortable: true,
      sortValue: (r) => r.income,
      cell: (r) => (
        <span className="font-medium text-success-500">{fmtUsd(r.income)}</span>
      ),
    },
    {
      key: "views",
      header: "Views",
      sortable: true,
      sortValue: (r) => r.views,
      cell: (r) => (
        <span className="text-neutral-0">
          {r.views.toLocaleString("en-US")}
        </span>
      ),
    },
    {
      key: "members",
      header: "Members",
      sortable: true,
      sortValue: (r) => r.members,
      cell: (r) => <span className="text-neutral-0">{r.members}</span>,
    },
    {
      key: "dateCreated",
      header: "Date Created",
      sortable: true,
      sortValue: (r) => dateToMs(r.dateCreated),
      cell: (r) => <span className="text-neutral-0">{r.dateCreated}</span>,
    },
  ];

  return (
    <div>
      <DashboardDataTable
        title="Teams"
        subtitle="Team performance, member count, and visibility."
        rows={ROWS}
        columns={columns}
        getRowKey={(r, i) => `${r.id}-${i}`}
        initialSort={{ key: "dateCreated", dir: "desc" }}
        showBottomFade={false}
        showRowSeparators={true}
        tableClassName="text-[13px]"
        className="pt-2"
      />
    </div>
  );
}
