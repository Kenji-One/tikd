import { NextRequest, NextResponse } from "next/server";

import { reconcileStalePendingOrders } from "@/lib/payments/reconcileStalePendingOrders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "auto";
export const maxDuration = 60;

function getCronSecret(): string {
  const value = String(process.env.CRON_SECRET ?? "").trim();
  if (!value) {
    throw new Error("Missing CRON_SECRET.");
  }
  return value;
}

function isAuthorized(req: NextRequest): boolean {
  const secret = getCronSecret();

  const authHeader = String(req.headers.get("authorization") ?? "").trim();
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim() === secret;
  }

  const altHeader = String(req.headers.get("x-cron-secret") ?? "").trim();
  return altHeader === secret;
}

function getLimit(req: NextRequest): number {
  const raw = Number(req.nextUrl.searchParams.get("limit") ?? 100);
  if (!Number.isFinite(raw)) return 100;
  return Math.max(1, Math.min(Math.floor(raw), 500));
}

async function handle(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await reconcileStalePendingOrders({
      limit: getLimit(req),
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to reconcile stale pending orders.",
      },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
