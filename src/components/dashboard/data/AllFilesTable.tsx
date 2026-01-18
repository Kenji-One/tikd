/* ------------------------------------------------------------------ */
/*  src/components/dashboard/data/AllFilesTable.tsx                    */
/* ------------------------------------------------------------------ */
"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { Trash2 } from "lucide-react";

import DashboardDataTable, {
  type DashboardTableColumn,
  TableActionIconButton,
  TableAvatar,
} from "@/components/dashboard/tables/DashboardDataTable";
import { Button } from "@/components/ui/Button";
import UploadFileModal from "@/components/dashboard/data/UploadFileModal";

type Row = {
  id: string;
  name: string;
  kind: "pdf" | "sketch";
  lastEdit: string; // "Jul 23, 2024"
  sizeMb: number; // 0.9
  members: { id: string; avatar?: string | null; bg?: string }[];
};

type SortKey = "name" | "lastEdit" | "size" | "members";
type SortDir = "asc" | "desc";

const ROWS: Row[] = Array.from({ length: 7 }).map((_, i) => ({
  id: `file-${i}`,
  name:
    i % 2 === 0
      ? "CaDas_Dashboard UI Kit.sketch"
      : "CaDas_Dashboard UI Kit.PDF",
  kind: i % 2 === 0 ? "sketch" : "pdf",
  lastEdit: "Jul 23, 2024",
  sizeMb: 0.9,
  members: [
    { id: "m1", bg: "bg-white/10" },
    { id: "m2", bg: "bg-white/10" },
    { id: "m3", bg: "bg-white/10" },
    { id: "m4", bg: "bg-white/10" },
    { id: "m5", bg: "bg-white/10" },
  ].map((m, idx) => ({
    ...m,
    bg:
      idx % 3 === 0
        ? "bg-gradient-to-br from-indigo-500 to-cyan-400"
        : idx % 3 === 1
          ? "bg-gradient-to-br from-fuchsia-500 to-rose-500"
          : "bg-gradient-to-br from-primary-500 to-purple-500",
  })),
}));

function dateToMs(label: string) {
  const ms = Date.parse(label);
  return Number.isFinite(ms) ? ms : 0;
}

function FileBadge({ kind }: { kind: Row["kind"] }) {
  return (
    <div
      className={clsx(
        "h-7 w-7 shrink-0 rounded-md",
        "grid place-items-center",
        "bg-[#FF5A2A]",
      )}
      aria-hidden
    >
      <span className="text-[10px] font-extrabold tracking-wide text-white">
        PDF
      </span>
    </div>
  );
}

export default function AllFilesTable() {
  const [sortBy, setSortBy] = useState<SortKey>("lastEdit");
  const [dir, setDir] = useState<SortDir>("desc");

  // ✅ upload modal state
  const [uploadOpen, setUploadOpen] = useState(false);

  const sorted = useMemo(() => {
    const arr = [...ROWS];

    arr.sort((a, b) => {
      let A: string | number = "";
      let B: string | number = "";

      if (sortBy === "name") {
        A = a.name;
        B = b.name;
      } else if (sortBy === "lastEdit") {
        A = dateToMs(a.lastEdit);
        B = dateToMs(b.lastEdit);
      } else if (sortBy === "size") {
        A = a.sizeMb;
        B = b.sizeMb;
      } else if (sortBy === "members") {
        A = a.members.length;
        B = b.members.length;
      }

      if (typeof A === "number" && typeof B === "number") {
        return dir === "asc" ? A - B : B - A;
      }
      return dir === "asc"
        ? String(A).localeCompare(String(B))
        : String(B).localeCompare(String(A));
    });

    return arr;
  }, [sortBy, dir]);

  const toggleSort = (key: SortKey) => {
    if (key === sortBy) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setDir("desc");
    }
  };

  const columns: DashboardTableColumn<Row>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      sortValue: (r) => r.name,
      cell: (r) => (
        <div className="min-w-0 flex items-center gap-3">
          <FileBadge kind={r.kind} />
          <span className="truncate text-neutral-0" title={r.name}>
            {r.name}
          </span>
        </div>
      ),
    },
    {
      key: "lastEdit",
      header: "Last Edit",
      sortable: true,
      sortValue: (r) => dateToMs(r.lastEdit),
      cell: (r) => <span className="text-neutral-0">{r.lastEdit}</span>,
    },
    {
      key: "size",
      header: "Size",
      sortable: true,
      headerAlign: "left",
      sortValue: (r) => r.sizeMb,
      cell: (r) => (
        <span className="text-neutral-0">{r.sizeMb.toFixed(1)} MB</span>
      ),
    },
    {
      key: "members",
      header: "Members",
      sortable: false,
      sortValue: (r) => r.members.length,
      cell: (r) => (
        <div className="flex items-center gap-3">
          {r.members.slice(0, 5).map((m) => (
            <TableAvatar key={m.id} src={m.avatar} bgClassName={m.bg} />
          ))}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      headerAlign: "right",
      align: "right",
      width: 110,
      sortable: false,
      headerInteractive: true,
      cell: () => (
        <div className="inline-flex items-center gap-1.5">
          <TableActionIconButton title="History" onClick={() => {}}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
            >
              <path
                d="M13.6667 6.79398H11.7401C10.1601 6.79398 8.87341 5.50732 8.87341 3.92732V2.00065C8.87341 1.63398 8.57341 1.33398 8.20675 1.33398H5.38008C3.32675 1.33398 1.66675 2.66732 1.66675 5.04732V10.954C1.66675 13.334 3.32675 14.6673 5.38008 14.6673H10.6201C12.6734 14.6673 14.3334 13.334 14.3334 10.954V7.46065C14.3334 7.09398 14.0334 6.79398 13.6667 6.79398ZM8.18675 10.5207L6.85341 11.854C6.80675 11.9007 6.74675 11.9407 6.68675 11.9607C6.62675 11.9873 6.56675 12.0007 6.50008 12.0007C6.43341 12.0007 6.37341 11.9873 6.31341 11.9607C6.26008 11.9407 6.20675 11.9007 6.16675 11.8607C6.16008 11.854 6.15341 11.854 6.15341 11.8473L4.82008 10.514C4.62675 10.3207 4.62675 10.0007 4.82008 9.80732C5.01341 9.61399 5.33341 9.61399 5.52675 9.80732L6.00008 10.294V7.50065C6.00008 7.22732 6.22675 7.00065 6.50008 7.00065C6.77341 7.00065 7.00008 7.22732 7.00008 7.50065V10.294L7.48008 9.81398C7.67341 9.62065 7.99341 9.62065 8.18675 9.81398C8.38008 10.0073 8.38008 10.3273 8.18675 10.5207Z"
                fill="#A7A7BC"
              />
              <path
                d="M11.62 5.87365C12.2533 5.88032 13.1333 5.88032 13.8866 5.88032C14.2666 5.88032 14.4666 5.43365 14.2 5.16699C13.24 4.20032 11.52 2.46032 10.5333 1.47365C10.26 1.20032 9.78662 1.38699 9.78662 1.76699V4.09365C9.78662 5.06699 10.6133 5.87365 11.62 5.87365Z"
                fill="#A7A7BC"
              />
            </svg>
          </TableActionIconButton>

          <TableActionIconButton title="Delete" onClick={() => {}}>
            <Trash2 size={14} />
          </TableActionIconButton>
        </div>
      ),
    },
  ];

  return (
    <div className="">
      {/* ✅ Modal mounted here */}
      <UploadFileModal
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        // optional: you can narrow this later
        accept="image/*,.pdf,.sketch,.png,.jpg,.jpeg,.webp"
        onUpload={async ({ name, file }) => {
          // ✅ TEMP: just proving we have a working last step before backend
          console.log("UPLOAD READY:", { name, file });

          // next step later:
          // 1) request presigned url (or Cloudinary signed upload)
          // 2) upload file
          // 3) save metadata to DB
          // 4) refresh table (react-query or local state)
        }}
      />

      <div className="flex justify-between gap-3 items-center mb-3.5">
        <h2 className="text-[22px] font-semibold tracking-[-0.55px] text-neutral-0">
          All Files
        </h2>

        <Button
          onClick={() => setUploadOpen(true)}
          type="button"
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
            >
              <path
                d="M13.6667 6.79398H11.74C10.16 6.79398 8.87335 5.50732 8.87335 3.92732V2.00065C8.87335 1.63398 8.57335 1.33398 8.20669 1.33398H5.38002C3.32669 1.33398 1.66669 2.66732 1.66669 5.04732V10.954C1.66669 13.334 3.32669 14.6673 5.38002 14.6673H10.62C12.6734 14.6673 14.3334 13.334 14.3334 10.954V7.46065C14.3334 7.09398 14.0334 6.79398 13.6667 6.79398ZM7.68669 9.02065C7.58669 9.12065 7.46002 9.16732 7.33335 9.16732C7.20669 9.16732 7.08002 9.12065 6.98002 9.02065L6.50002 8.54065V11.334C6.50002 11.6073 6.27335 11.834 6.00002 11.834C5.72669 11.834 5.50002 11.6073 5.50002 11.334V8.54065L5.02002 9.02065C4.82669 9.21398 4.50669 9.21398 4.31335 9.02065C4.12002 8.82732 4.12002 8.50732 4.31335 8.31398L5.64669 6.98065C5.69335 6.94065 5.74002 6.90732 5.79335 6.88065C5.80669 6.87398 5.82669 6.86732 5.84002 6.86065C5.88002 6.84732 5.92002 6.84065 5.96669 6.83398C5.98669 6.83398 6.00002 6.83398 6.02002 6.83398C6.07335 6.83398 6.12669 6.84732 6.18002 6.86732C6.18669 6.86732 6.18669 6.86732 6.19335 6.86732C6.24669 6.88732 6.30002 6.92732 6.34002 6.96732C6.34669 6.97398 6.35335 6.97398 6.35335 6.98065L7.68669 8.31398C7.88002 8.50732 7.88002 8.82732 7.68669 9.02065Z"
                fill="white"
              />
              <path
                d="M11.62 5.87365C12.2533 5.88032 13.1333 5.88032 13.8867 5.88032C14.2667 5.88032 14.4667 5.43365 14.2 5.16699C13.24 4.20032 11.52 2.46032 10.5333 1.47365C10.26 1.20032 9.78668 1.38699 9.78668 1.76699V4.09365C9.78668 5.06699 10.6133 5.87365 11.62 5.87365Z"
                fill="white"
              />
            </svg>
          }
          animation
        >
          Upload
        </Button>
      </div>

      <DashboardDataTable
        title="All Files"
        rows={sorted}
        columns={columns}
        getRowKey={(r) => r.id}
        initialSort={{ key: "lastEdit", dir: "desc" }}
        showBottomFade={false}
        showRowSeparators={true}
        className="pt-2"
        tableClassName="text-[13px]"
      />
    </div>
  );
}
