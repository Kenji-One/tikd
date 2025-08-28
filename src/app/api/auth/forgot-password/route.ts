import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import ResetToken from "@/models/ResetToken";
import { sendMail } from "@/lib/mail"; // your mailer util

export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({}));
  if (typeof email !== "string") {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  }

  await connectDB();
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    // Do not reveal that the email is unknown
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  // Invalidate any existing tokens
  await ResetToken.updateMany(
    { userId: user._id, used: false },
    { used: true }
  );

  // Generate 6-digit code
  const token = ("" + Math.floor(100000 + Math.random() * 900000)).slice(0, 6);
  const expiresAt = new Date(Date.now() + 15 * 60e3); // +15 min

  await ResetToken.create({ userId: user._id, token, expiresAt });

  // Send email (implement sendMail yourself)
  await sendMail({
    to: user.email,
    subject: "Your Tikd password reset code",
    html: `<p>Your code is <strong>${token}</strong>. It expires in 15 minutes.</p>`,
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
