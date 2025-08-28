import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({}));
  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  await connectDB();

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const hash = await bcrypt.hash(password, 10);
  user.password = hash;
  await user.save();

  return NextResponse.json({ ok: true }, { status: 200 });
}
