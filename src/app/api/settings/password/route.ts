// src/app/api/settings/password/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { validatePassword } from "@/lib/password";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const current = body?.current as string | undefined;
    const next = body?.next as string | undefined;

    if (!current || !next) {
      return NextResponse.json(
        { error: "Both current and new passwords are required." },
        { status: 400 }
      );
    }

    const strong = validatePassword(next);
    if (!strong.ok) {
      return NextResponse.json({ error: strong.reason }, { status: 400 });
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(current, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Current password is incorrect." },
        { status: 400 }
      );
    }

    // Prevent reusing the same password
    const isSame = await bcrypt.compare(next, user.password);
    if (isSame) {
      return NextResponse.json(
        { error: "New password must be different from the current password." },
        { status: 400 }
      );
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(next, salt);

    user.password = hash;
    user.passwordUpdatedAt = new Date(); // audit
    await user.save();

    return NextResponse.json({ ok: true, message: "Password updated." });
  } catch (err) {
    console.error("Password change error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
