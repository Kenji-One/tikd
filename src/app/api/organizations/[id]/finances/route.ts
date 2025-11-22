// src/app/api/organizations/[id]/finances/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

type BalanceSummary = {
  available: number;
  pending: number;
  currency: string;
};

type PayoutItem = {
  id: string;
  amount: number;
  currency: string;
  status: "paid" | "in_transit" | "failed";
  arrivalDate: string;
};

type DisputeItem = {
  id: string;
  amount: number;
  currency: string;
  status: "warning" | "won" | "lost";
  reason: string;
  createdAt: string;
};

type FinancesResponse = {
  organizationId: string;
  summary: BalanceSummary;
  payouts: PayoutItem[];
  disputes: DisputeItem[];
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organizationId = params.id;

  // TODO: pull real data from your own ledger / Stripe later.
  const payload: FinancesResponse = {
    organizationId,
    summary: {
      available: 0,
      pending: 0,
      currency: "USD",
    },
    payouts: [],
    disputes: [],
  };

  return NextResponse.json(payload);
}
