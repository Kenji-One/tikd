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

import { Button } from "@/components/ui/Button";

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

/* ----------------------------- Helpers ----------------------------- */
function formatUSD(n: number) {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  return `${sign}$${abs.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function providerIcon(p: WithdrawRow["provider"]) {
  // Simple + consistent (no brand icons yet)
  if (p === "Bank") return <Banknote className="h-4 w-4" />;
  return <Clock className="h-4 w-4" />;
}

function pillClasses(kind: "in" | "out") {
  return clsx(
    "inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-semibold tracking-[-0.02em]",
    kind === "in"
      ? "bg-success-900/40 text-success-400 ring-1 ring-success-700/30"
      : "bg-error-900/35 text-error-400 ring-1 ring-error-700/30"
  );
}

/* ------------------------------ Data ------------------------------ */
/**
 * Dummy data via React Query so it’s plug-and-play once your API exists.
 * Replace the queryFn with a real fetch later.
 */
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
      {
        id: "w2",
        provider: "Wise",
        dateLabel: "27 Sep, 10:40am",
        amount: 200,
      },
      {
        id: "w3",
        provider: "Payoneer",
        dateLabel: "15 Aug, 08:00am",
        amount: 50,
      },
      {
        id: "w4",
        provider: "Bank",
        dateLabel: "11 Jun, 12:00pm",
        amount: 800,
      },
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

  const { data } = useQuery({
    queryKey: ["finances", "overview"],
    queryFn: getFinanceOverviewDummy,
    staleTime: 60_000,
  });

  const overview = data;

  const transfersFiltered = useMemo(() => {
    if (!overview) return [];
    if (tab === "sent")
      return overview.transfers.filter((t) => t.type === "out");
    if (tab === "received")
      return overview.transfers.filter((t) => t.type === "in");
    // Withdrew tab still shows *transfers only* (requirement: no withdrawals in table)
    return overview.transfers;
  }, [overview, tab]);

  return (
    <div className="w-full px-4 py-4 sm:px-6 sm:py-6">
      {/* Page shell */}
      <div className="mx-auto w-full max-w-[1400px]">
        {/* Top header row (lightweight; your dashboard may already have a global header) */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-[18px] font-bold tracking-[-0.03em] text-neutral-50 sm:text-[20px]">
              Finances
            </h1>
            <p className="mt-1 text-[13px] tracking-[-0.02em] text-neutral-400">
              Track withdrawals and transfers in one place.
            </p>
          </div>

          <Button
            type="button"
            onClick={() => router.push("/dashboard/finances/payout-portal")}
            className={clsx(
              "h-10 rounded-card px-4 text-[13px] font-semibold tracking-[-0.02em]",
              "bg-primary-500 text-neutral-0 hover:bg-primary-400",
              "shadow-[0_12px_30px_rgba(154,70,255,0.18)]"
            )}
          >
            <span className="mr-2 inline-flex items-center">
              <ExternalLink className="h-4 w-4" />
            </span>
            Payout Portal
          </Button>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr] lg:gap-5">
          {/* LEFT COLUMN */}
          <div className="flex flex-col gap-4">
            {/* Balance Card */}
            <div
              className={clsx(
                "relative overflow-hidden rounded-card border border-neutral-800/70",
                "bg-neutral-948/70",
                "p-4 sm:p-5"
              )}
            >
              {/* Gradient wash */}
              <div
                className="pointer-events-none absolute inset-0 opacity-80"
                style={{
                  background:
                    "radial-gradient(1200px 600px at 0% 0%, rgba(154,70,255,0.45), transparent 60%), radial-gradient(900px 500px at 100% 30%, rgba(69,255,121,0.22), transparent 55%), radial-gradient(800px 600px at 30% 120%, rgba(255,123,69,0.14), transparent 60%)",
                }}
              />
              <div className="relative">
                <div className="flex items-start justify-between">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-neutral-950/60 ring-1 ring-neutral-800/70">
                    <Wallet className="h-5 w-5 text-neutral-50" />
                  </div>

                  <div className="text-right">
                    <div className="text-[12px] font-medium text-neutral-300">
                      Available Balance
                    </div>
                    <div className="mt-1 text-[28px] font-extrabold tracking-[-0.04em] text-neutral-50">
                      {overview ? formatUSD(overview.availableBalance) : "$—"}
                    </div>
                    <div className="mt-1 text-[12px] text-neutral-400">USD</div>
                  </div>
                </div>

                {/* Pending balance indicator (requested) */}
                <div className="mt-4 rounded-card border border-neutral-800/70 bg-neutral-950/40 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-warning-900/30 ring-1 ring-warning-700/25">
                        <Clock className="h-4 w-4 text-warning-400" />
                      </div>
                      <div>
                        <div className="text-[12px] font-semibold text-neutral-200">
                          Pending Balance
                        </div>
                        <div className="text-[12px] text-neutral-400">
                          Funds not cleared yet
                        </div>
                      </div>
                    </div>

                    <div className="text-[13px] font-bold text-neutral-50">
                      {overview ? formatUSD(overview.pendingBalance) : "$—"}
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  className={clsx(
                    "mt-4 h-10 w-full rounded-card text-[13px] font-semibold tracking-[-0.02em]",
                    "bg-success-600 text-neutral-950 hover:bg-success-500"
                  )}
                  onClick={() => router.push("/dashboard/finances/withdraw")}
                >
                  <span className="mr-2 inline-flex items-center">
                    <ArrowUpRight className="h-4 w-4" />
                  </span>
                  Withdraw
                </Button>
              </div>
            </div>

            {/* Withdraw History (requested rename + withdrawals only) */}
            <div
              className={clsx(
                "rounded-card border border-neutral-800/70 bg-neutral-948/70 p-4 sm:p-5"
              )}
            >
              <div className="mb-3 flex items-center justify-between">
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

              <div className="space-y-2">
                {(overview?.withdrawHistory ?? []).map((w) => (
                  <div
                    key={w.id}
                    className={clsx(
                      "flex items-center justify-between gap-3 rounded-card",
                      "border border-neutral-800/60 bg-neutral-950/35 px-3 py-2.5"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900/60 ring-1 ring-neutral-800/70">
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
                      <div className="mt-1 text-[12px] text-neutral-500">
                        Completed
                      </div>
                    </div>
                  </div>
                ))}

                {!overview?.withdrawHistory?.length && (
                  <div className="rounded-card border border-dashed border-neutral-800/60 bg-neutral-950/20 p-4 text-center text-[13px] text-neutral-400">
                    No withdrawals yet.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div
            className={clsx(
              "rounded-card border border-neutral-800/70 bg-neutral-948/70",
              "p-4 sm:p-5"
            )}
          >
            {/* Tabs (requested rename) */}
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="no-scrollbar flex w-full gap-2 overflow-x-auto sm:w-auto">
                <TabButton
                  label="Withdrew"
                  active={tab === "withdrew"}
                  onClick={() => setTab("withdrew")}
                />
                <TabButton
                  label="Sent"
                  active={tab === "sent"}
                  onClick={() => setTab("sent")}
                />
                <TabButton
                  label="Received"
                  active={tab === "received"}
                  onClick={() => setTab("received")}
                />
              </div>

              {/* Optional small “range” chip to mimic the reference layout */}
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <div className="inline-flex items-center gap-2 rounded-full border border-neutral-800/70 bg-neutral-950/35 px-3 py-2 text-[12px] text-neutral-300">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary-900/30 ring-1 ring-primary-700/25">
                    <ArrowDownLeft className="h-3.5 w-3.5 text-primary-300" />
                  </span>
                  From Jan 2026 to Aug 2026
                </div>
              </div>
            </div>

            {/* Main “statistic” / chart-like panel */}
            <div
              className={clsx(
                "relative overflow-hidden rounded-card border border-neutral-800/70",
                "bg-neutral-950/35 p-4 sm:p-5"
              )}
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-70"
                style={{
                  background:
                    "radial-gradient(900px 500px at 0% 0%, rgba(154,70,255,0.25), transparent 55%), radial-gradient(700px 500px at 85% 20%, rgba(69,255,121,0.12), transparent 60%)",
                }}
              />

              <div className="relative">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-[12px] font-semibold text-neutral-300">
                      {tab === "withdrew"
                        ? "Withdrawn"
                        : tab === "sent"
                          ? "Sent Out"
                          : "Received"}
                    </div>
                    <div className="mt-1 text-[20px] font-extrabold tracking-[-0.04em] text-neutral-50">
                      {tab === "withdrew"
                        ? formatUSD(
                            -Math.abs(
                              (overview?.withdrawHistory ?? []).reduce(
                                (acc, x) => acc + x.amount,
                                0
                              )
                            )
                          )
                        : tab === "sent"
                          ? formatUSD(
                              transfersFiltered.reduce(
                                (acc, x) => acc + x.amount,
                                0
                              )
                            )
                          : formatUSD(
                              transfersFiltered.reduce(
                                (acc, x) => acc + x.amount,
                                0
                              )
                            )}
                    </div>
                    <div className="mt-1 text-[12px] text-neutral-400">
                      Monthly snapshot (dummy)
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-neutral-800/70 bg-neutral-950/40 px-3 py-2 text-[12px] text-neutral-300">
                      <span className="h-2 w-2 rounded-full bg-success-500" />
                      Stable
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-neutral-800/70 bg-neutral-950/40 px-3 py-2 text-[12px] text-neutral-300">
                      <span className="h-2 w-2 rounded-full bg-primary-400" />
                      Trend
                    </div>
                  </div>
                </div>

                {/* Minimal chart-like SVG (no dependency risk) */}
                <div className="mt-5">
                  <MiniAreaChart />
                </div>
              </div>
            </div>

            {/* Transfers Table (requested headers + type values; excludes withdrawals by design) */}
            <div className="mt-4 rounded-card border border-neutral-800/70 bg-neutral-950/25">
              <div className="flex items-center justify-between gap-3 border-b border-neutral-800/70 px-4 py-3">
                <div>
                  <div className="text-[13px] font-bold tracking-[-0.03em] text-neutral-50">
                    Transfers
                  </div>
                  <div className="mt-1 text-[12px] text-neutral-400">
                    Sent/received transactions only (no withdrawals).
                  </div>
                </div>

                <div className="text-[12px] font-semibold text-neutral-400">
                  {tab === "sent"
                    ? "Showing: Sent Out"
                    : tab === "received"
                      ? "Showing: Sent In"
                      : "Showing: All"}
                </div>
              </div>

              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse">
                  <thead>
                    <tr className="text-left">
                      <th className="px-4 py-3 text-[12px] font-semibold text-neutral-400">
                        Name
                      </th>
                      <th className="px-4 py-3 text-[12px] font-semibold text-neutral-400">
                        Type
                      </th>
                      <th className="px-4 py-3 text-[12px] font-semibold text-neutral-400">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-[12px] font-semibold text-neutral-400">
                        Event
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {transfersFiltered.map((t) => (
                      <tr
                        key={t.id}
                        className="border-t border-neutral-800/60 hover:bg-neutral-900/30"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900/60 ring-1 ring-neutral-800/70">
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

                        <td className="px-4 py-3">
                          <div
                            className={clsx(
                              "text-[13px] font-bold",
                              t.amount >= 0
                                ? "text-success-400"
                                : "text-error-400"
                            )}
                          >
                            {formatUSD(t.amount)}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="text-[13px] text-neutral-200">
                            {t.event}
                          </div>
                        </td>
                      </tr>
                    ))}

                    {!transfersFiltered.length && (
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
              </div>
            </div>

            {/* Small note: Withdrew tab still keeps table transfers-only (explicit) */}
            {tab === "withdrew" && (
              <div className="mt-3 rounded-card border border-neutral-800/60 bg-neutral-950/20 px-4 py-3 text-[12px] text-neutral-400">
                Tip: <span className="text-neutral-200">Withdraw History</span>{" "}
                is shown on the left. The table below always stays{" "}
                <span className="text-neutral-200">transfers-only</span> (Sent
                In / Sent Out), per requirements.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------- Small Components ----------------------- */
function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold tracking-[-0.02em] transition",
        active
          ? "bg-neutral-50 text-neutral-950"
          : "bg-neutral-950/35 text-neutral-300 ring-1 ring-neutral-800/70 hover:bg-neutral-900/40"
      )}
    >
      {label}
    </button>
  );
}

function MiniAreaChart() {
  // Pure SVG, no chart lib dependency.
  // Styled to match Tikd dark theme + primary/success glow.
  return (
    <div className="relative h-[220px] w-full overflow-hidden rounded-card border border-neutral-800/60 bg-neutral-950/30">
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(700px 260px at 20% 10%, rgba(154,70,255,0.20), transparent 60%), radial-gradient(600px 300px at 80% 40%, rgba(69,255,121,0.10), transparent 60%)",
        }}
      />
      <svg
        viewBox="0 0 900 260"
        className="relative h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="tikdAreaFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(154,70,255,0.35)" />
            <stop offset="70%" stopColor="rgba(154,70,255,0.08)" />
            <stop offset="100%" stopColor="rgba(154,70,255,0)" />
          </linearGradient>

          <filter id="tikdGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0.35  0 1 0 0 0.2  0 0 1 0 0.55  0 0 0 1 0"
              result="glow"
            />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Area */}
        <path
          d="M0 200
             C 90 120, 150 210, 240 160
             C 330 110, 390 210, 480 150
             C 570 90, 640 190, 720 120
             C 790 70, 850 140, 900 110
             L 900 260 L 0 260 Z"
          fill="url(#tikdAreaFill)"
        />

        {/* Line */}
        <path
          d="M0 200
             C 90 120, 150 210, 240 160
             C 330 110, 390 210, 480 150
             C 570 90, 640 190, 720 120
             C 790 70, 850 140, 900 110"
          fill="none"
          stroke="rgba(194,194,209,0.9)"
          strokeWidth="2"
          filter="url(#tikdGlow)"
        />

        {/* Dots */}
        {[
          { x: 0, y: 200 },
          { x: 240, y: 160 },
          { x: 480, y: 150 },
          { x: 720, y: 120 },
          { x: 900, y: 110 },
        ].map((p, idx) => (
          <circle
            key={idx}
            cx={p.x}
            cy={p.y}
            r="6"
            fill="rgba(154,70,255,0.95)"
            stroke="rgba(240,240,244,0.9)"
            strokeWidth="2"
          />
        ))}
      </svg>

      {/* X-axis labels */}
      <div className="absolute bottom-2 left-0 right-0 flex items-center justify-between px-4 text-[12px] text-neutral-500">
        <span>Jan</span>
        <span>Feb</span>
        <span>Mar</span>
        <span>Apr</span>
        <span>May</span>
        <span>Jun</span>
        <span>Jul</span>
        <span>Aug</span>
      </div>
    </div>
  );
}
