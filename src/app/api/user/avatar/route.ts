import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

/** Save/replace avatar */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { imageUrl } = await req.json().catch(() => ({}));
  if (!imageUrl || typeof imageUrl !== "string") {
    return NextResponse.json(
      { error: "imageUrl is required" },
      { status: 400 }
    );
  }

  await connectDB();
  await User.findByIdAndUpdate(session.user.id, { image: imageUrl });

  return NextResponse.json({ ok: true, image: imageUrl });
}

/** Remove avatar (set empty) */
export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  await User.findByIdAndUpdate(session.user.id, { $unset: { image: "" } });

  return NextResponse.json({ ok: true, image: "" });
}
