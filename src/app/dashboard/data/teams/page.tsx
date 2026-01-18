/* ------------------------------------------------------------------ */
/*  src/app/dashboard/data/teams/page.tsx                             */
/* ------------------------------------------------------------------ */
"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import DownloadCsvModal from "@/components/dashboard/data/DownloadCsvModal";

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

type SortKey = "id" | "name" | "income" | "views" | "members" | "dateCreated";
type SortDir = "asc" | "desc";

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
  const [sortBy, setSortBy] = useState<SortKey>("dateCreated");
  const [dir, setDir] = useState<SortDir>("desc");

  const [csvOpen, setCsvOpen] = useState(false);
  const [csvEntityName, setCsvEntityName] = useState<string>("");

  const sorted = useMemo(() => {
    const arr = [...ROWS];
    arr.sort((a, b) => {
      const A = a[sortBy] as any;
      const B = b[sortBy] as any;

      if (sortBy === "income" || sortBy === "views" || sortBy === "members") {
        return dir === "asc" ? Number(A) - Number(B) : Number(B) - Number(A);
      }

      if (sortBy === "dateCreated") {
        const ams = dateToMs(a.dateCreated);
        const bms = dateToMs(b.dateCreated);
        return dir === "asc" ? ams - bms : bms - ams;
      }

      const aStr = String(A);
      const bStr = String(B);
      return dir === "asc"
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });
    return arr;
  }, [sortBy, dir]);

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
    {
      key: "actions",
      header: "",
      headerAlign: "right",
      align: "right",
      width: 170,
      headerInteractive: true,
      cell: (r) => (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="secondary"
            size="xs"
            onClick={() => {
              setCsvEntityName(r.name);
              setCsvOpen(true);
            }}
          >
            Download CSV
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <DashboardDataTable
        title="All teams"
        rows={sorted}
        columns={columns}
        getRowKey={(r, i) => `${r.id}-${i}`}
        initialSort={{ key: "dateCreated", dir: "desc" }}
        showBottomFade={false}
        showRowSeparators={true}
        tableClassName="text-[13px]"
        className="pt-2"
      />

      <DownloadCsvModal
        open={csvOpen}
        onOpenChange={setCsvOpen}
        eventName={csvEntityName}
      />
    </div>
  );
}
