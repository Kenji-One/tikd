import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const u = await User.findById(session.user.id).lean();
  if (!u) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    firstName: u.firstName ?? "",
    lastName: u.lastName ?? "",
    email: u.email ?? "",
    phone: u.phone ?? "",
    address: u.address ?? "",
    city: u.city ?? "",
    country: u.country ?? "",
    zip: u.zip ?? "",
    defaultAddress: !!u.defaultAddress,
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const {
    firstName = "",
    lastName = "",
    email = "",
    phone = "",
    address = "",
    city = "",
    country = "",
    zip = "",
    defaultAddress = false,
  } = body || {};

  // minimal validation (expand later if needed)
  if (typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  }

  await connectDB();
  await User.findByIdAndUpdate(
    session.user.id,
    {
      $set: {
        firstName,
        lastName,
        email: email.toLowerCase(),
        phone,
        address,
        city,
        country,
        zip,
        defaultAddress: !!defaultAddress,
      },
    },
    { new: true }
  );

  return NextResponse.json({ ok: true });
}
