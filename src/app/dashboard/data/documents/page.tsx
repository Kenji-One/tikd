/* ------------------------------------------------------------------ */
/*  src/app/dashboard/data/documents/page.tsx                         */
/* ------------------------------------------------------------------ */
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/Button";

import DashboardDataTable, {
  type DashboardTableColumn,
  TableAvatar,
} from "@/components/dashboard/tables/DashboardDataTable";

type Row = {
  id: string;
  name: string;
  type: string;
  sizeMb: number;
  downloads: number;
  dateCreated: string;
  avatarBg?: string;
};

type SortKey = "id" | "name" | "type" | "sizeMb" | "downloads" | "dateCreated";
type SortDir = "asc" | "desc";

const ROWS: Row[] = Array.from({ length: 10 }).map((_, i) => ({
  id: `#DOC-${2935 + i}`,
  name:
    i % 3 === 0
      ? "Event Brief - Avalon Yacht"
      : i % 3 === 1
        ? "Guest List Export"
        : "Venue Contract Draft",
  type: i % 2 === 0 ? "PDF" : "DOCX",
  sizeMb: i % 4 === 0 ? 12.4 : i % 4 === 1 ? 4.8 : i % 4 === 2 ? 1.3 : 8.9,
  downloads: 40 + i * 7,
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

export default function DataDocumentsPage() {
  const [sortBy, setSortBy] = useState<SortKey>("dateCreated");
  const [dir, setDir] = useState<SortDir>("desc");

  const sorted = useMemo(() => {
    const arr = [...ROWS];
    arr.sort((a, b) => {
      const A = a[sortBy] as any;
      const B = b[sortBy] as any;

      if (sortBy === "sizeMb" || sortBy === "downloads") {
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
      key: "type",
      header: "Type",
      sortable: true,
      sortValue: (r) => r.type,
      cell: (r) => <span className="text-neutral-0">{r.type}</span>,
    },
    {
      key: "sizeMb",
      header: "Size",
      sortable: true,
      sortValue: (r) => r.sizeMb,
      cell: (r) => <span className="text-neutral-0">{r.sizeMb} MB</span>,
    },
    {
      key: "downloads",
      header: "Downloads",
      sortable: true,
      sortValue: (r) => r.downloads,
      cell: (r) => <span className="text-neutral-0">{r.downloads}</span>,
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
        title="Documents"
        subtitle="PDFs, contracts, exports and other document files."
        rows={sorted}
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
