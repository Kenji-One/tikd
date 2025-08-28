import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import ResetToken from "@/models/ResetToken";

export async function POST(req: Request) {
  const { email, code } = await req.json().catch(() => ({}));
  if (typeof email !== "string" || typeof code !== "string") {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  await connectDB();

  // Find a non-expired, unused token
  const doc = await ResetToken.findOneAndUpdate(
    { token: code, used: false },
    { used: true }
  ).populate("userId");

  if (!doc) {
    return NextResponse.json(
      { error: "Invalid or expired code." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
