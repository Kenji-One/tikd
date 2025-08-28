import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

/**
 * GET /api/auth/check-availability?username=foo  OR  ?email=foo@bar.com
 * Returns: { available: boolean }
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username");
  const email = searchParams.get("email");

  if (!username && !email) {
    return NextResponse.json(
      { error: "Provide username or email." },
      { status: 400 }
    );
  }

  await connectDB();

  if (username) {
    const u = await User.findOne({
      username: username.trim().toLowerCase(),
    }).lean();
    return NextResponse.json({ available: !u });
  }

  if (email) {
    const e = await User.findOne({ email: email.trim().toLowerCase() }).lean();
    return NextResponse.json({ available: !e });
  }

  return NextResponse.json({ available: false });
}
