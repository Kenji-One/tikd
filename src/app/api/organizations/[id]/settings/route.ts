// src/app/api/organizations/[id]/settings/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

type SettingsResponse = {
  organizationId: string;
  stripe: {
    accountId: string | null;
    paymentsEnabled: boolean;
    payoutsEnabled: boolean;
    onboardingStatus: "not_configured" | "pending" | "active";
  };
  serviceFees: {
    name: string;
    items: {
      label: string;
      percent: number;
      fixed: number;
      currency: string;
    }[];
  };
  terms: {
    general: string;
    refundPolicy: string;
    ageRestriction: string;
    updatedAt: string | null;
  };
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const organizationId = id;

  const payload: SettingsResponse = {
    organizationId,
    stripe: {
      accountId: null,
      paymentsEnabled: false,
      payoutsEnabled: false,
      onboardingStatus: "not_configured",
    },
    serviceFees: {
      name: "Service Fee (non-refundable)",
      items: [
        {
          label: "Standard tickets",
          percent: 7,
          fixed: 1.99,
          currency: "USD",
        },
      ],
    },
    terms: {
      general: "All items are non-refundable. All sales are final.",
      refundPolicy:
        "All sales are final. There are no refunds, exchanges or cancellations under any circumstance.",
      ageRestriction: "",
      updatedAt: null,
    },
  };

  return NextResponse.json(payload);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const organizationId = id;
  const body = await req.json();

  // TODO: validate + persist settings in MongoDB.

  return NextResponse.json(
    {
      ok: true,
      organizationId,
      received: body,
      message:
        "Settings endpoint is a stub. Implement persistence when the data model is ready.",
    },
    { status: 200 }
  );
}
