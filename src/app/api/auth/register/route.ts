import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

/* ------------------- server-side validation helpers ------------------- */
function validateUsername(username: unknown): string | null {
  const u = String(username ?? "")
    .trim()
    .toLowerCase();
  if (!u) return "Username is required.";
  if (u.length < 3 || u.length > 24) return "Username must be 3–24 characters.";
  if (!/^[a-z0-9_]+$/.test(u))
    return "Only lowercase letters, numbers and underscores.";
  return null;
}

function validateEmail(email: unknown): string | null {
  const e = String(email ?? "")
    .trim()
    .toLowerCase();
  if (!e) return "Email is required.";
  if (!/^\S+@\S+\.\S+$/.test(e)) return "Enter a valid email.";
  return null;
}

function passwordPolicy(
  password: unknown,
  username: string,
  email: string
): string | null {
  const pw = String(password ?? "");
  if (!pw) return "Password is required.";
  if (pw.length < 8) return "At least 8 characters.";

  const hasLower = /[a-z]/.test(pw);
  const hasUpper = /[A-Z]/.test(pw);
  const hasDigit = /\d/.test(pw);
  // const hasSymbol = /[^A-Za-z0-9]/.test(pw);
  // if (!(hasLower && hasUpper && hasDigit && hasSymbol)) {
  //   return "Use upper & lower case, a number, and a symbol.";
  // }
  if (!(hasLower && hasUpper && hasDigit)) {
    return "Use upper & lower case, and a number.";
  }

  const lowered = pw.toLowerCase();
  const local = (email.split("@")[0] ?? "").toLowerCase();

  if (username && lowered.includes(username.toLowerCase())) {
    return "Password must not contain your username.";
  }
  if (local && lowered.includes(local)) {
    return "Password must not contain your email name.";
  }
  return null;
}

/**
 * POST /api/auth/register
 * Body: { username, email, password, agreeTerms, referralCode? }
 * Returns:
 *  - 201 { ok: true }
 *  - 400 { errors: { field: message } } (validation)
 *  - 409 { errors: { username?: string, email?: string } } (duplicates)
 */
export async function POST(req: Request) {
  try {
    const { username, email, password, agreeTerms } = (await req.json()) as {
      username: string;
      email: string;
      password: string;
      agreeTerms: boolean;
      referralCode?: string;
    };

    // Field-level validation
    const fieldErrors: Record<string, string> = {};
    const uErr = validateUsername(username);
    const eErr = validateEmail(email);
    const pErr = passwordPolicy(password, username, email);

    if (uErr) fieldErrors.username = uErr;
    if (eErr) fieldErrors.email = eErr;
    if (pErr) fieldErrors.password = pErr;
    if (!agreeTerms)
      fieldErrors.agreeTerms = "You must agree to the Terms & Conditions.";

    if (Object.keys(fieldErrors).length) {
      return NextResponse.json({ errors: fieldErrors }, { status: 400 });
    }

    await connectDB();

    const uname = username.trim().toLowerCase();
    const mail = email.trim().toLowerCase();

    // Uniqueness checks
    const [uDup, eDup] = await Promise.all([
      User.findOne({ username: uname }).lean(),
      User.findOne({ email: mail }).lean(),
    ]);

    if (uDup || eDup) {
      const dupErrors: Record<string, string> = {};
      if (uDup) dupErrors.username = "This username is already taken.";
      if (eDup) dupErrors.email = "This email is already registered.";
      return NextResponse.json({ errors: dupErrors }, { status: 409 });
    }

    // Create user
    const hashed = await bcrypt.hash(password, 10);
    const avatarUrl = `/api/avatar?seed=${encodeURIComponent(uname)}`;

    await User.create({
      username: uname,
      email: mail,
      password: hashed,
      image: avatarUrl,
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("Register route error:", err);
    return NextResponse.json(
      { error: "Server error. Please try again later." },
      { status: 500 }
    );
  }
}
