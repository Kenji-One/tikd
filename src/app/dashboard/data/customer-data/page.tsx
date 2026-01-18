/* ------------------------------------------------------------------ */
/*  src/app/dashboard/data/customer-data/page.tsx                     */
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
  email: string;
  orders: number;
  spent: number;
  dateCreated: string;
  avatarBg?: string;
};

type SortKey = "id" | "name" | "email" | "orders" | "spent" | "dateCreated";
type SortDir = "asc" | "desc";

const ROWS: Row[] = Array.from({ length: 10 }).map((_, i) => ({
  id: `#CUS-${2935 + i}`,
  name:
    i % 3 === 0 ? "Nina Johnson" : i % 3 === 1 ? "Alex Rivera" : "Chris Stone",
  email:
    i % 3 === 0
      ? "nina@tikd.com"
      : i % 3 === 1
        ? "alex@tikd.com"
        : "chris@tikd.com",
  orders: 1 + (i % 6),
  spent: 120 + i * 55,
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

export default function DataCustomerDataPage() {
  const [sortBy, setSortBy] = useState<SortKey>("dateCreated");
  const [dir, setDir] = useState<SortDir>("desc");

  const sorted = useMemo(() => {
    const arr = [...ROWS];
    arr.sort((a, b) => {
      const A = a[sortBy] as any;
      const B = b[sortBy] as any;

      if (sortBy === "orders" || sortBy === "spent") {
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
      key: "email",
      header: "Email",
      sortable: true,
      sortValue: (r) => r.email,
      cell: (r) => (
        <span className="text-neutral-0" title={r.email}>
          {r.email}
        </span>
      ),
    },
    {
      key: "orders",
      header: "Orders",
      sortable: true,
      sortValue: (r) => r.orders,
      cell: (r) => <span className="text-neutral-0">{r.orders}</span>,
    },
    {
      key: "spent",
      header: "Spent",
      sortable: true,
      sortValue: (r) => r.spent,
      cell: (r) => (
        <span className="font-medium text-success-500">{fmtUsd(r.spent)}</span>
      ),
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
        title="Customer Data"
        subtitle="Customer records, orders, and spend history."
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
