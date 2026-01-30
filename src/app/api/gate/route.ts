// src/app/api/gate/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const COOKIE_NAME = "tikd_preview_gate";
const COOKIE_VALUE = "1";

// default: 12 hours
const DEFAULT_TTL_SECONDS = 60 * 60 * 12;

function timingSafeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    password?: string;
    next?: string;
  };

  const supplied = (body.password ?? "").toString();
  const expected = (process.env.TIKD_PREVIEW_PASSWORD ?? "").toString();

  if (!expected) {
    return NextResponse.json(
      { error: "Preview password is not configured on the server." },
      { status: 500 },
    );
  }

  const ok = timingSafeEqual(supplied, expected);

  if (!ok) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const ttl = Number(
    process.env.TIKD_PREVIEW_TTL_SECONDS || DEFAULT_TTL_SECONDS,
  );

  const res = NextResponse.json({ ok: true });

  res.cookies.set({
    name: COOKIE_NAME,
    value: COOKIE_VALUE,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Number.isFinite(ttl) && ttl > 0 ? ttl : DEFAULT_TTL_SECONDS,
  });

  return res;
}
