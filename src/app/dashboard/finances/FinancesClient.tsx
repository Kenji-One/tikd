/* ------------------------------------------------------------------ */
/*  src/app/dashboard/finances/FinancesClient.tsx                     */
/* ------------------------------------------------------------------ */
"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Clock,
  ExternalLink,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/Button";
import DateRangePicker, {
  type DateRangeValue,
} from "@/components/ui/DateRangePicker";
import SortArrowsIcon from "@/components/ui/SortArrowsIcon";
import { tr } from "zod/v4/locales";

/* ------------------------------ Types ------------------------------ */
type FinanceTab = "withdrew" | "sent" | "received";

type WithdrawRow = {
  id: string;
  provider: "PayPal" | "Bank" | "Payoneer" | "Wise";
  dateLabel: string; // "31 Oct, 11:00pm"
  amount: number; // positive number (we render as negative visually)
};

type TransferRow = {
  id: string;
  name: string; // person/org
  type: "in" | "out"; // Sent In / Sent Out
  amount: number; // signed: in=positive, out=negative
  event: string;
};

type FinanceOverview = {
  availableBalance: number;
  pendingBalance: number;
  withdrawHistory: WithdrawRow[];
  transfers: TransferRow[];
};

type SortKey = "name" | "type" | "amount" | "event";
type SortDir = "asc" | "desc";

/* ----------------------------- Helpers ----------------------------- */
function formatUSD(n: number) {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  return `${sign}$${abs.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatUSDCompact(n: number) {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);

  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

function providerIcon(p: WithdrawRow["provider"]) {
  if (p === "Bank") return <Banknote className="h-4 w-4" />;
  return <Clock className="h-4 w-4" />;
}

function pillClasses(kind: "in" | "out") {
  return clsx(
    "inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-semibold tracking-[-0.02em]",
    kind === "in"
      ? "bg-success-900/35 text-success-400 ring-1 ring-success-700/25"
      : "bg-error-900/30 text-error-400 ring-1 ring-error-700/25",
  );
}

function clampToDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysInMonth(year: number, month0: number) {
  return new Date(year, month0 + 1, 0).getDate();
}

function addDays(d: Date, delta: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + delta);
  return x;
}

function diffDaysInclusive(a: Date, b: Date) {
  const A = clampToDay(a).getTime();
  const B = clampToDay(b).getTime();
  const ms = Math.abs(B - A);
  return Math.floor(ms / (24 * 60 * 60 * 1000)) + 1;
}

function buildDailyDates(start: Date, end: Date) {
  const out: Date[] = [];
  const s = clampToDay(start);
  const e = clampToDay(end);
  const forward = s.getTime() <= e.getTime();
  const a = forward ? s : e;
  const b = forward ? e : s;

  let cur = a;
  while (cur <= b) {
    out.push(new Date(cur));
    cur = addDays(cur, 1);
  }
  return forward ? out : out.reverse();
}

function buildDailyLabels(dates: Date[]) {
  const n = dates.length;
  if (n <= 7) {
    return dates.map((d) =>
      d.toLocaleDateString(undefined, { weekday: "short" }),
    );
  }
  return dates.map((d) =>
    d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
  );
}

function monthLabels(start: Date, end: Date) {
  const labels: string[] = [];
  const d = new Date(start);
  d.setDate(1);
  while (d <= end) {
    labels.push(d.toLocaleDateString(undefined, { month: "short" }));
    d.setMonth(d.getMonth() + 1);
  }
  return labels;
}

function monthDates(start: Date, end: Date) {
  const out: Date[] = [];
  const d = new Date(start);
  d.setDate(21);
  while (d <= end) {
    out.push(new Date(d));
    d.setMonth(d.getMonth() + 1);
  }
  return out;
}

function mapSeriesToCount(vals: number[], count: number) {
  if (count === vals.length) return vals;
  const a = [...vals];
  while (a.length < count) a.push(a[a.length % vals.length]);
  return a.slice(0, count);
}

function dailyizeFromMonthly(monthly: number[], dates: Date[]) {
  return dates.map((d, i) => {
    const m = d.getMonth();
    const y = d.getFullYear();
    const dim = daysInMonth(y, m) || 30;

    const monthTotal = monthly[m % monthly.length] ?? monthly[0] ?? 0;
    const base = monthTotal / dim;

    const wiggle =
      1 +
      0.22 * Math.sin(i * 0.85) +
      0.1 * Math.cos(i * 0.33) +
      0.06 * Math.sin(i * 0.17);

    return Math.max(0, base * wiggle);
  });
}

function fmtFullDate(d?: Date) {
  return d
    ? d.toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";
}

function fmtMonthYearLong(d?: Date) {
  return d
    ? d.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      })
    : "";
}

function compareStrings(a: string, b: string) {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

function sortTransfers(rows: TransferRow[], key: SortKey, dir: SortDir) {
  const mul = dir === "asc" ? 1 : -1;
  const copy = [...rows];

  copy.sort((A, B) => {
    if (key === "amount") return (A.amount - B.amount) * mul;
    if (key === "type") return compareStrings(A.type, B.type) * mul;
    if (key === "event") return compareStrings(A.event, B.event) * mul;
    return compareStrings(A.name, B.name) * mul;
  });

  return copy;
}

function computeNiceTicks(max: number) {
  const safeMax = Math.max(1, max);
  const steps = 4; // 5 labels total (top..0)
  const step = Math.ceil(safeMax / steps / 100) * 100;
  return Array.from({ length: steps + 1 }, (_, i) => step * (steps - i));
}

/* ------------------------------ Data ------------------------------ */
async function getFinanceOverviewDummy(): Promise<FinanceOverview> {
  return {
    availableBalance: 1206.89,
    pendingBalance: 184.25,
    withdrawHistory: [
      {
        id: "w1",
        provider: "PayPal",
        dateLabel: "31 Oct, 11:00pm",
        amount: 500,
      },
      { id: "w2", provider: "Wise", dateLabel: "27 Sep, 10:40am", amount: 200 },
      {
        id: "w3",
        provider: "Payoneer",
        dateLabel: "15 Aug, 08:00am",
        amount: 50,
      },
      { id: "w4", provider: "Bank", dateLabel: "11 Jun, 12:00pm", amount: 800 },
      {
        id: "w5",
        provider: "Payoneer",
        dateLabel: "31 Apr, 11:00am",
        amount: 80,
      },
    ],
    transfers: [
      {
        id: "t1",
        name: "Mahfuzul Nabil",
        type: "in",
        amount: 5850,
        event: "Summer Rooftop Party",
      },
      {
        id: "t2",
        name: "Adom Shafi",
        type: "out",
        amount: -2550,
        event: "Charity Night Run",
      },
      {
        id: "t3",
        name: "Sami Ahmed",
        type: "in",
        amount: 1100,
        event: "Indie Music Fest",
      },
      {
        id: "t4",
        name: "Sajib Rahman",
        type: "out",
        amount: -1550,
        event: "Tech Meetup Tbilisi",
      },
      {
        id: "t5",
        name: "Saiful Islam R.",
        type: "in",
        amount: 4250,
        event: "Food & Wine Expo",
      },
    ],
  };
}

/* ----------------------------- Component --------------------------- */
export default function FinancesClient() {
  const router = useRouter();
  const [tab, setTab] = useState<FinanceTab>("withdrew");

  // ✅ sort state (exact RecentSalesTable behavior)
  const [sortBy, setSortBy] = useState<SortKey>("amount");
  const [dir, setDir] = useState<SortDir>("desc");
  const toggleSort = (key: SortKey) => {
    if (key === sortBy) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setDir("desc");
    }
  };

  const today = useMemo(() => clampToDay(new Date()), []);
  const currentYear = useMemo(() => today.getFullYear(), [today]);

  const ALL_TIME_START = useMemo(
    () => new Date(currentYear, 0, 1),
    [currentYear],
  );
  const ALL_TIME_END = useMemo(
    () => new Date(currentYear, 11, 31),
    [currentYear],
  );

  const [dateRange, setDateRange] = useState<DateRangeValue>({
    start: null,
    end: null,
  });
  const hasChosenRange = !!dateRange.start && !!dateRange.end;

  const effectiveStart = useMemo(
    () => (hasChosenRange ? (dateRange.start as Date) : ALL_TIME_START),
    [hasChosenRange, dateRange.start, ALL_TIME_START],
  );
  const effectiveEnd = useMemo(
    () => (hasChosenRange ? (dateRange.end as Date) : ALL_TIME_END),
    [hasChosenRange, dateRange.end, ALL_TIME_END],
  );

  const rangeDays = useMemo(
    () => diffDaysInclusive(effectiveStart, effectiveEnd),
    [effectiveStart, effectiveEnd],
  );

  const dailyMode = useMemo(() => {
    if (!hasChosenRange) return false;
    return rangeDays <= 31;
  }, [hasChosenRange, rangeDays]);

  const labels = useMemo(() => {
    if (!dailyMode) return monthLabels(effectiveStart, effectiveEnd);
    const ds = buildDailyDates(effectiveStart, effectiveEnd);
    return buildDailyLabels(ds);
  }, [dailyMode, effectiveStart, effectiveEnd]);

  const dates = useMemo(() => {
    if (!dailyMode) return monthDates(effectiveStart, effectiveEnd);
    return buildDailyDates(effectiveStart, effectiveEnd);
  }, [dailyMode, effectiveStart, effectiveEnd]);

  const { data } = useQuery({
    queryKey: ["finances", "overview"],
    queryFn: getFinanceOverviewDummy,
    staleTime: 60_000,
  });
  const overview = data;

  const monthlyWithdraw = useMemo(
    () => [32, 18, 26, 14, 22, 42, 31, 38, 19, 44, 27, 35].map((x) => x * 120),
    [],
  );
  const monthlySent = useMemo(
    () => [20, 28, 16, 24, 36, 30, 44, 26, 40, 34, 22, 46].map((x) => x * 110),
    [],
  );
  const monthlyReceived = useMemo(
    () => [24, 34, 22, 30, 42, 36, 50, 32, 46, 38, 28, 54].map((x) => x * 115),
    [],
  );

  const series = useMemo(() => {
    const monthlyBase =
      tab === "withdrew"
        ? monthlyWithdraw
        : tab === "sent"
          ? monthlySent
          : monthlyReceived;

    if (!dailyMode) return mapSeriesToCount(monthlyBase, labels.length);
    return dailyizeFromMonthly(monthlyBase, dates);
  }, [
    tab,
    dailyMode,
    labels.length,
    dates,
    monthlyWithdraw,
    monthlySent,
    monthlyReceived,
  ]);

  const chartRows = useMemo(() => {
    return labels.map((name, i) => ({
      i,
      name,
      date: dates[i],
      value: series[i] ?? 0,
    }));
  }, [labels, dates, series]);

  const transfersFiltered = useMemo(() => {
    if (!overview) return [];
    if (tab === "sent")
      return overview.transfers.filter((t) => t.type === "out");
    if (tab === "received")
      return overview.transfers.filter((t) => t.type === "in");
    return overview.transfers;
  }, [overview, tab]);

  const transfersSorted = useMemo(() => {
    return sortTransfers(transfersFiltered, sortBy, dir);
  }, [transfersFiltered, sortBy, dir]);

  const chartTotalLabel = useMemo(() => {
    if (tab === "withdrew") {
      const w = (overview?.withdrawHistory ?? []).reduce(
        (acc, x) => acc + x.amount,
        0,
      );
      return formatUSD(-Math.abs(w || series.reduce((a, b) => a + b, 0)));
    }

    const rows = overview?.transfers ?? [];
    const sum =
      tab === "sent"
        ? rows
            .filter((t) => t.type === "out")
            .reduce((acc, x) => acc + x.amount, 0)
        : rows
            .filter((t) => t.type === "in")
            .reduce((acc, x) => acc + x.amount, 0);

    return formatUSD(sum);
  }, [tab, overview?.withdrawHistory, overview?.transfers, series]);

  return (
    <div className="w-full px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto w-full max-w-[1600px]">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-[-0.03em] text-neutral-50">
              Finances
            </h1>
            <p className="mt-1 text-[13px] tracking-[-0.02em] text-neutral-400">
              Track withdrawals and transfers in one place.
            </p>
          </div>

          <Button
            type="button"
            onClick={() => router.push("/dashboard/finances/payout-portal")}
            animation={true}
          >
            <span className="mr-1 inline-flex items-center">
              <ExternalLink className="h-4 w-4" />
            </span>
            Payout Portal
          </Button>
        </div>

        {/* Layout */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr] lg:gap-5">
          {/* LEFT */}
          <div className="flex flex-col gap-4">
            {/* Balance Card */}
            <div className="rounded-xl border border-neutral-800/70 bg-neutral-948/70 p-4">
              {/* Available (improved, cleaner + better gradient) */}
              <div className="relative overflow-hidden rounded-xl border border-neutral-800/70 bg-neutral-950/28 p-4">
                <div
                  className="pointer-events-none absolute inset-0 opacity-100"
                  style={{
                    background:
                      "radial-gradient(840px 380px at 30% 0%, rgba(154,70,255,0.42), transparent 62%), radial-gradient(900px 520px at 110% 20%, rgba(154,70,255,0.14), transparent 62%), linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0))",
                  }}
                />

                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-2">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-neutral-950/55 ring-1 ring-neutral-800/70">
                        <Wallet className="h-4 w-4 text-primary-200" />
                      </span>
                      <span className="text-[12px] font-semibold tracking-[-0.02em] text-neutral-300">
                        Available Balance
                      </span>
                    </div>

                    <span className="rounded-full border border-neutral-800/70 bg-neutral-950/35 px-2 py-1 text-[11px] font-semibold text-neutral-200">
                      USD
                    </span>
                  </div>

                  <div className="mt-3 text-[34px] font-extrabold leading-none tracking-[-0.06em] text-neutral-50">
                    {overview ? formatUSD(overview.availableBalance) : "$—"}
                  </div>

                  <div className="mt-2 text-[12px] text-neutral-400">
                    Ready to withdraw
                  </div>
                </div>
              </div>

              {/* Pending (keep style, simplify content) */}
              <div className="mt-3 rounded-xl border border-neutral-800/70 bg-neutral-950/28 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-neutral-950/55 ring-1 ring-neutral-800/70">
                      <Clock className="h-4 w-4 text-primary-200" />
                    </div>

                    <div className="leading-tight">
                      <div className="flex items-center gap-2">
                        <div className="text-[12px] font-semibold text-neutral-100">
                          Pending Balance
                        </div>
                        <span className="rounded-full bg-primary-900/25 px-2 py-0.5 text-[10px] font-bold text-primary-200 ring-1 ring-primary-700/20">
                          Processing
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[14px] font-extrabold tabular-nums text-neutral-50">
                      {overview ? formatUSD(overview.pendingBalance) : "$—"}
                    </div>
                  </div>
                </div>

                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-neutral-900/60">
                  <div
                    className="h-full w-[58%] rounded-full"
                    style={{
                      background:
                        "linear-gradient(90deg, rgba(154,70,255,0.95), rgba(154,70,255,0.35))",
                    }}
                  />
                </div>
              </div>
              <div className="px-0.5">
                <Button
                  type="button"
                  className={clsx(
                    "mt-4 h-10 w-full rounded-lg font-semibold tracking-[-0.02em]",
                    "bg-primary-500 text-neutral-0 hover:bg-primary-400",
                    "shadow-[0_14px_34px_rgba(154,70,255,0.20)]",
                  )}
                  onClick={() => router.push("/dashboard/finances/withdraw")}
                  animation={true}
                >
                  <span className="mr-1 inline-flex items-center">
                    <ArrowUpRight className="h-4.5 w-4.5" />
                  </span>
                  Withdraw
                </Button>
              </div>
            </div>

            {/* Withdraw History */}
            <div className="rounded-xl border border-neutral-800/70 bg-neutral-948/70 pt-5 pb-4">
              <div className="mb-3 flex items-center justify-between px-5">
                <h2 className="text-[14px] font-bold tracking-[-0.03em] text-neutral-50">
                  Withdraw History
                </h2>
                <button
                  type="button"
                  className="text-[12px] font-semibold text-primary-400 hover:text-primary-300"
                  onClick={() => router.push("/dashboard/finances/withdrawals")}
                >
                  View All
                </button>
              </div>

              <div className="space-y-2 px-4">
                {(overview?.withdrawHistory ?? []).map((w) => (
                  <div
                    key={w.id}
                    className={clsx(
                      "flex items-center justify-between gap-3 rounded-lg",
                      "border border-neutral-800/60 bg-neutral-950/30 px-3 py-2.5",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900/55 ring-1 ring-neutral-800/70">
                        {providerIcon(w.provider)}
                      </div>
                      <div>
                        <div className="text-[13px] font-semibold text-neutral-100">
                          {w.provider} Withdraw
                        </div>
                        <div className="mt-1 text-[12px] text-neutral-400">
                          {w.dateLabel}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[13px] font-bold text-error-400">
                        {formatUSD(-Math.abs(w.amount))}
                      </div>
                    </div>
                  </div>
                ))}

                {!overview?.withdrawHistory?.length && (
                  <div className="rounded-lg border border-dashed border-neutral-800/60 bg-neutral-950/20 p-4 text-center text-[13px] text-neutral-400">
                    No withdrawals yet.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="flex flex-col gap-4">
            {/* Tabs */}
            <div className="rounded-xl border border-neutral-800/70 bg-neutral-948/70 p-3 sm:p-4">
              <div className="grid grid-cols-3 gap-2">
                <FinanceTabButton
                  label="Withdrew"
                  icon={<ArrowUpRight className="h-4 w-4" />}
                  active={tab === "withdrew"}
                  onClick={() => setTab("withdrew")}
                />
                <FinanceTabButton
                  label="Sent"
                  icon={<ArrowUpRight className="h-4 w-4" />}
                  active={tab === "sent"}
                  onClick={() => setTab("sent")}
                />
                <FinanceTabButton
                  label="Received"
                  icon={<ArrowDownLeft className="h-4 w-4" />}
                  active={tab === "received"}
                  onClick={() => setTab("received")}
                />
              </div>
            </div>

            {/* Chart */}
            <div className="relative overflow-hidden rounded-xl border border-neutral-800/70 bg-neutral-948/70 p-4 sm:p-5">
              <div
                className="pointer-events-none absolute inset-0 opacity-85"
                style={{
                  background:
                    "radial-gradient(1100px 620px at 0% 0%, rgba(154,70,255,0.22), transparent 58%), radial-gradient(900px 640px at 100% 20%, rgba(154,70,255,0.10), transparent 62%)",
                }}
              />

              <div className="relative">
                {/* ✅ tighter header spacing/sizing + smaller datepicker */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-[12px] font-semibold text-neutral-300">
                      {tab === "withdrew"
                        ? "Withdrawn"
                        : tab === "sent"
                          ? "Sent Out"
                          : "Received"}
                    </div>

                    <div className="mt-1 text-[24px] font-extrabold leading-none tracking-[-0.04em] text-neutral-50 sm:text-[26px]">
                      {chartTotalLabel}
                    </div>

                    <div className="mt-1 text-[12px] leading-[1.15] text-neutral-400">
                      {dailyMode ? "Daily" : "Monthly"} overview (demo)
                    </div>
                  </div>

                  <div className="w-[min(220px,100%)]">
                    <DateRangePicker
                      value={dateRange}
                      onChange={setDateRange}
                    />
                  </div>
                </div>

                <div className="mt-5 h-[320px] w-full overflow-hidden rounded-xl border border-neutral-800/60 bg-neutral-950/20">
                  <FinanceAreaChart
                    rows={chartRows}
                    dailyMode={dailyMode}
                    tint={
                      tab === "withdrew"
                        ? "error"
                        : tab === "sent"
                          ? "primary"
                          : "success"
                    }
                  />
                </div>
              </div>
            </div>

            {/* Transfers Table */}
            <div className="rounded-xl border border-neutral-800/70 bg-neutral-948/70 overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-neutral-800/70 px-4 py-3">
                <div>
                  <div className="text-base font-bold tracking-[-0.03em] text-neutral-50">
                    Transfers
                  </div>
                  {/* <div className="mt-1 text-[12px] text-neutral-400">
                    Sent In / Sent Out only (no withdrawals).
                  </div> */}
                </div>

                <div className="text-[13px] font-semibold text-neutral-400">
                  {tab === "sent"
                    ? "Showing: Sent Out"
                    : tab === "received"
                      ? "Showing: Sent In"
                      : "Showing: All"}
                </div>
              </div>

              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse font-medium leading-tight">
                  <thead className="text-neutral-400">
                    <tr className="[&>th]:pb-3 [&>th]:pt-3 [&>th]:px-4">
                      <ThSort
                        label="Name"
                        active={sortBy === "name"}
                        dir={dir}
                        onClick={() => toggleSort("name")}
                      />
                      <ThSort
                        label="Type"
                        active={sortBy === "type"}
                        dir={dir}
                        onClick={() => toggleSort("type")}
                      />
                      <ThSort
                        label="Amount"
                        active={sortBy === "amount"}
                        dir={dir}
                        right
                        onClick={() => toggleSort("amount")}
                      />
                      <ThSort
                        label="Event"
                        active={sortBy === "event"}
                        dir={dir}
                        onClick={() => toggleSort("event")}
                        right
                      />
                    </tr>
                  </thead>

                  <tbody className="text-white">
                    {transfersSorted.map((t, i) => (
                      <tr
                        key={t.id}
                        className={clsx(
                          "border-t border-neutral-800/60 hover:bg-neutral-900/25",
                          i % 2 === 0 ? "bg-neutral-950/10" : "bg-transparent",
                        )}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900/55 ring-1 ring-neutral-800/70">
                              {t.type === "in" ? (
                                <ArrowDownLeft className="h-4 w-4 text-success-400" />
                              ) : (
                                <ArrowUpRight className="h-4 w-4 text-error-400" />
                              )}
                            </div>
                            <div className="text-[13px] font-semibold text-neutral-100">
                              {t.name}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span className={pillClasses(t.type)}>
                            {t.type === "in" ? "Sent In" : "Sent Out"}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div
                            className={clsx(
                              "text-[13px] font-bold tabular-nums",
                              t.amount >= 0
                                ? "text-success-400"
                                : "text-error-400",
                            )}
                          >
                            {formatUSD(t.amount)}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="text-[13px] text-neutral-200">
                            {t.event}
                          </div>
                        </td>
                      </tr>
                    ))}

                    {!transfersSorted.length && (
                      <tr className="border-t border-neutral-800/60">
                        <td
                          colSpan={4}
                          className="px-4 py-8 text-center text-[13px] text-neutral-400"
                        >
                          No transfers for this tab.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-[linear-gradient(0deg,#121220_0%,rgba(18,18,32,0)_100%)]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------- Small Components ----------------------- */
function FinanceTabButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "group relative flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-[13px] font-semibold tracking-[-0.02em] transition",
        active
          ? clsx(
              "border-primary-500/35 bg-neutral-950/30 text-neutral-0",
              "shadow-[0_14px_34px_rgba(154,70,255,0.12)]",
              "ring-1 ring-primary-500/18",
              "shadow-[inset_0_-2px_0_rgba(154,70,255,0.55)]",
            )
          : "border-neutral-800/70 bg-neutral-950/12 text-neutral-300 hover:bg-neutral-900/18 hover:text-neutral-0",
      )}
    >
      <span
        className={clsx(
          "inline-flex items-center justify-center transition",
          active
            ? "text-primary-200"
            : "text-neutral-300 group-hover:text-neutral-0",
        )}
      >
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}

function ThSort({
  label,
  active,
  dir,
  onClick,
  right,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  right?: boolean;
}) {
  const base = "font-semibold cursor-pointer select-none hover:text-white/80";
  const cls = right ? `${base} text-right` : `${base} text-left`;

  return (
    <th
      className={clsx(cls, "px-4")}
      onClick={onClick}
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <div
        className={clsx(
          "inline-flex items-center",
          right ? "justify-end w-full" : "justify-start",
        )}
      >
        {label}
        <SortArrowsIcon
          direction={active ? dir : null}
          className="ml-2 -translate-y-[1px]"
        />
      </div>
    </th>
  );
}

function FinanceAreaChart({
  rows,
  dailyMode,
  tint,
}: {
  rows: Array<{ i: number; name: string; date?: Date; value: number }>;
  dailyMode: boolean;
  tint: "primary" | "success" | "error";
}) {
  const id = useMemo(() => `fin-${tint}`, [tint]);

  const stroke =
    tint === "success"
      ? "rgba(69,255,121,0.95)"
      : tint === "error"
        ? "rgba(255,69,74,0.95)"
        : "rgba(154,70,255,0.95)";

  const stops =
    tint === "success"
      ? { a: "rgba(69,255,121,0.38)", b: "rgba(69,255,121,0.02)" }
      : tint === "error"
        ? { a: "rgba(255,69,74,0.34)", b: "rgba(255,69,74,0.02)" }
        : { a: "rgba(154,70,255,0.38)", b: "rgba(154,70,255,0.02)" };

  const yMax = useMemo(() => Math.max(1, ...rows.map((r) => r.value)), [rows]);
  const yTicks = useMemo(() => computeNiceTicks(yMax), [yMax]);

  // ✅ equal spacing, but keep "0" ON the baseline (not glued to the bottom)
  const yLabelStrings = useMemo(
    () => yTicks.map((v) => formatUSDCompact(v)),
    [yTicks],
  );

  return (
    <div className="h-full w-full">
      <div className="flex h-full w-full">
        {/* Equal-spaced Y labels (baseline aligned) */}
        <div className="w-[48px] shrink-0 px-2 pt-[18px] pb-[44px] pr-3">
          <div className="flex h-full flex-col justify-between text-[10px] font-medium tracking-[-0.02em] text-neutral-500">
            {yLabelStrings.map((s, idx) => (
              <div key={`${s}-${idx}`} className="leading-none text-right">
                {s}
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-0 flex-1 pr-3 py-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={rows}
              margin={{ top: 10, right: 0, left: 0, bottom: 8 }}
            >
              <defs>
                <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={stops.a} />
                  <stop offset="100%" stopColor={stops.b} />
                </linearGradient>
              </defs>

              <YAxis
                width={0}
                domain={[0, yTicks[0] ?? yMax]}
                tick={false}
                tickLine={false}
                axisLine={false}
              />

              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={{ stroke: "rgba(44,44,68,1)", strokeWidth: 1 }}
                interval="preserveStartEnd"
                tick={{
                  fill: "var(--color-neutral-500, #727293)",
                  fontFamily: "Gilroy, ui-sans-serif, system-ui",
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: -0.2,
                }}
              />

              <Area
                type="monotone"
                dataKey="value"
                stroke={stroke}
                strokeWidth={2.6}
                fill={`url(#${id}-fill)`}
                dot={false}
                activeDot={{ r: 4, fill: "#FFFFFF", stroke, strokeWidth: 2 }}
                isAnimationActive={false}
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              <Tooltip
                isAnimationActive={false}
                cursor={{ stroke: "rgba(255,255,255,0.12)", strokeWidth: 1 }}
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const p = payload[0]?.payload as
                    | { value?: number; date?: Date; name?: string }
                    | undefined;
                  if (!p) return null;

                  const dateLabel = dailyMode
                    ? fmtFullDate(p.date)
                    : fmtMonthYearLong(p.date);

                  return (
                    <div className="pointer-events-none rounded-xl border border-white/10 bg-neutral-950/85 px-4 py-3 text-neutral-0 backdrop-blur-md shadow-[0_18px_44px_rgba(0,0,0,0.55)]">
                      <div className="text-[18px] font-extrabold tracking-[-0.02em]">
                        {formatUSD(p.value ?? 0)}
                      </div>
                      <div className="mt-1 text-[12px] font-semibold text-neutral-300">
                        {dateLabel || p.name || ""}
                      </div>
                    </div>
                  );
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
