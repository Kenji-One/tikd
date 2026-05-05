import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "auto";
export const maxDuration = 10;

type CheckoutProfileResponse = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  instagramProfile: string;
  facebookProfile: string;
  gender: string | null;
  dateOfBirth: string;
};

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  await connectDB();

  const user = await User.findById(session.user.id)
    .select(
      "firstName lastName email phone instagram checkoutProfile.facebookProfile checkoutProfile.gender checkoutProfile.dateOfBirth",
    )
    .lean<{
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      instagram?: string;
      checkoutProfile?: {
        facebookProfile?: string;
        gender?: string | null;
        dateOfBirth?: Date | null;
      } | null;
    } | null>();

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const response: CheckoutProfileResponse = {
    firstName: safeString(user.firstName),
    lastName: safeString(user.lastName),
    email: safeString(user.email).toLowerCase(),
    phone: safeString(user.phone),
    instagramProfile: safeString(user.instagram),
    facebookProfile: safeString(user.checkoutProfile?.facebookProfile),
    gender:
      typeof user.checkoutProfile?.gender === "string" &&
      user.checkoutProfile.gender.trim()
        ? user.checkoutProfile.gender.trim()
        : null,
    dateOfBirth:
      user.checkoutProfile?.dateOfBirth instanceof Date
        ? user.checkoutProfile.dateOfBirth.toISOString().slice(0, 10)
        : "",
  };

  return NextResponse.json(response);
}
