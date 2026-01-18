/* ------------------------------------------------------------------ */
/*  src/app/dashboard/data/others/page.tsx                            */
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
  kind: string;
  sizeMb: number;
  dateCreated: string;
  avatarBg?: string;
};

const ROWS: Row[] = Array.from({ length: 10 }).map((_, i) => ({
  id: `#OTH-${2935 + i}`,
  name:
    i % 3 === 0
      ? "Export Bundle"
      : i % 3 === 1
        ? "Backup Snapshot"
        : "Misc Attachment",
  kind: i % 2 === 0 ? "ZIP" : "TXT",
  sizeMb: i % 4 === 0 ? 24.6 : i % 4 === 1 ? 3.2 : i % 4 === 2 ? 0.7 : 12.8,
  dateCreated: "Sep 19, 2025",
  avatarBg:
    i % 3 === 0
      ? "bg-gradient-to-br from-indigo-500 to-cyan-400"
      : i % 3 === 1
        ? "bg-gradient-to-br from-fuchsia-500 to-rose-500"
        : "bg-gradient-to-br from-primary-500 to-purple-500",
}));

function dateToMs(label: string) {
  const ms = Date.parse(label);
  return Number.isFinite(ms) ? ms : 0;
}

export default function DataOthersPage() {
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
      key: "kind",
      header: "Kind",
      sortable: true,
      sortValue: (r) => r.kind,
      cell: (r) => <span className="text-neutral-0">{r.kind}</span>,
    },
    {
      key: "sizeMb",
      header: "Size",
      sortable: true,
      sortValue: (r) => r.sizeMb,
      cell: (r) => <span className="text-neutral-0">{r.sizeMb} MB</span>,
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
      <div className="mb-3 flex items-center justify-between">
        <Button asChild variant="secondary" size="sm">
          <Link href="/dashboard/data">
            <span className="inline-flex items-center gap-2">
              <ArrowLeft size={16} />
              Back to Data
            </span>
          </Link>
        </Button>
      </div>

      <DashboardDataTable
        title="Others"
        subtitle="Backups, archives and uncategorized attachments."
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
