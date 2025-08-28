// src/app/api/settings/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

/** ─────────────────────────── Canonical keys ─────────────────────────── */
const ROWS = ["apiLimits", "reminders", "storage", "securityAlerts"] as const;
type RowKey = (typeof ROWS)[number];

const CHANNELS = ["call", "email", "sms"] as const;
type Channel = (typeof CHANNELS)[number];

const MARKETING = ["sales", "special", "weekly", "outlet"] as const;
type MarketingKey = (typeof MARKETING)[number];

/** ─────────────────────────── Local types ───────────────────────────── */
type ChannelPrefs = Record<Channel, boolean>;
type Matrix = Record<RowKey, ChannelPrefs>;
type MarketingPrefs = Record<MarketingKey, boolean>;

/** Minimal shape of what we read/write on the User doc */
type NotificationsDoc = {
  notifications?: {
    channels?: Partial<Record<RowKey, Partial<Record<Channel, boolean>>>>;
    marketing?: Partial<Record<MarketingKey, boolean>>;
  };
};

/** ─────────────────────────── Helpers ───────────────────────────────── */
function withDefaults(
  u: NotificationsDoc | null | undefined
): { channels: Matrix; marketing: MarketingPrefs } {
  const defaults: { channels: Matrix; marketing: MarketingPrefs } = {
    channels: {
      apiLimits: { call: false, email: true, sms: false },
      reminders: { call: false, email: true, sms: false },
      storage: { call: false, email: true, sms: false },
      securityAlerts: { call: false, email: true, sms: false },
    },
    marketing: { sales: false, special: false, weekly: false, outlet: true },
  };

  const channels = ROWS.reduce((acc, row) => {
    const rowDefaults = defaults.channels[row];
    const uRow = u?.notifications?.channels?.[row] ?? {};
    const mergedRow = CHANNELS.reduce((acc2, ch) => {
      const v = (uRow as Partial<Record<Channel, boolean>>)[ch];
      acc2[ch] = typeof v === "boolean" ? v : rowDefaults[ch];
      return acc2;
    }, {} as ChannelPrefs);
    acc[row] = mergedRow;
    return acc;
  }, {} as Matrix);

  const marketing = MARKETING.reduce((acc, key) => {
    const v = u?.notifications?.marketing?.[key];
    acc[key] = typeof v === "boolean" ? v : defaults.marketing[key];
    return acc;
  }, {} as MarketingPrefs);

  return { channels, marketing };
}

/** ─────────────────────────── Routes ────────────────────────────────── */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const doc = await User.findById(session.user.id).lean<NotificationsDoc>();
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(withDefaults(doc));
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object")
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  await connectDB();

  if ((body as { type?: string }).type === "matrix") {
    const { row, channel, value } = body as {
      row: RowKey;
      channel: Channel;
      value: boolean;
    };
    if (
      !ROWS.includes(row) ||
      !CHANNELS.includes(channel) ||
      typeof value !== "boolean"
    ) {
      return NextResponse.json(
        { error: "Invalid matrix payload" },
        { status: 400 }
      );
    }

    const path = `notifications.channels.${row}.${channel}`;
    await User.findByIdAndUpdate(
      session.user.id,
      { $set: { [path]: value } },
      { new: true, runValidators: true }
    );
  } else if ((body as { type?: string }).type === "toggle") {
    const { key, value } = body as { key: MarketingKey; value: boolean };
    if (!MARKETING.includes(key) || typeof value !== "boolean") {
      return NextResponse.json(
        { error: "Invalid toggle payload" },
        { status: 400 }
      );
    }

    const path = `notifications.marketing.${key}`;
    await User.findByIdAndUpdate(
      session.user.id,
      { $set: { [path]: value } },
      { new: true, runValidators: true }
    );
  } else {
    return NextResponse.json({ error: "Unknown update type" }, { status: 400 });
  }

  const updated = await User.findById(session.user.id).lean<NotificationsDoc>();
  return NextResponse.json(withDefaults(updated));
}
