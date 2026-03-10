import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Types } from "mongoose";
import "@/lib/mongoose";

import Event from "@/models/Event";
import EventPageView from "@/models/EventPageView";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "auto";
export const maxDuration = 10;

const ParamsSchema = z.object({
  id: z.string().length(24),
});

const BodySchema = z.object({
  visitorId: z.string().trim().min(8).max(128),
  url: z.string().trim().url().optional(),
  path: z.string().trim().min(1).max(512).optional(),
  referrer: z.string().trim().url().optional().or(z.literal("")),
  utmSource: z.string().trim().max(120).optional(),
  utmMedium: z.string().trim().max(120).optional(),
  utmCampaign: z.string().trim().max(160).optional(),
});

const BOT_UA_RE =
  /bot|crawler|spider|crawling|facebookexternalhit|slackbot|discordbot|whatsapp|telegrambot|preview|headless|lighthouse|googleweblight/i;

function isObjectId(value: string): boolean {
  return Types.ObjectId.isValid(value);
}

function safeHeader(request: NextRequest, key: string): string {
  return request.headers.get(key)?.trim() ?? "";
}

function safeHost(input: string): string {
  if (!input) return "";
  try {
    return new URL(input).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function normalizeCountryCode(code: string): string {
  return code.trim().toUpperCase().slice(0, 2);
}

function parseNumber(value: string): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function countryCodeFromAcceptLanguage(headerValue: string): string {
  if (!headerValue) return "";

  const candidates = headerValue
    .split(",")
    .map((part) => part.split(";")[0]?.trim() ?? "")
    .filter(Boolean);

  for (const candidate of candidates) {
    const pieces = candidate.split("-");
    const region = pieces[1] ?? "";
    const normalized = normalizeCountryCode(region);
    if (normalized.length === 2) return normalized;
  }

  return "";
}

function resolveCountryCode(request: NextRequest): string {
  const explicitHeaders = [
    "x-vercel-ip-country",
    "cf-ipcountry",
    "x-country-code",
    "x-appengine-country",
  ];

  for (const header of explicitHeaders) {
    const normalized = normalizeCountryCode(safeHeader(request, header));
    if (normalized.length === 2 && normalized !== "XX") {
      return normalized;
    }
  }

  const fromLanguage = countryCodeFromAcceptLanguage(
    safeHeader(request, "accept-language"),
  );
  if (fromLanguage.length === 2 && fromLanguage !== "XX") {
    return fromLanguage;
  }

  return "";
}

function classifyTrafficSource(input: {
  referrer: string;
  currentUrl: string;
  utmSource?: string;
}): {
  sourceType: "direct" | "search" | "social" | "internal" | "referral";
  sourceLabel: string;
} {
  const utm = (input.utmSource ?? "").trim().toLowerCase();
  const referrer = input.referrer.trim();
  const refHost = safeHost(referrer);
  const currentHost = safeHost(input.currentUrl);

  if (!referrer) {
    if (utm) {
      return { sourceType: "referral", sourceLabel: utm };
    }
    return { sourceType: "direct", sourceLabel: "Direct" };
  }

  if (refHost && currentHost && refHost === currentHost) {
    return { sourceType: "internal", sourceLabel: "Internal" };
  }

  const searchHosts = [
    "google.",
    "bing.",
    "search.yahoo.",
    "duckduckgo.",
    "yandex.",
    "baidu.",
  ];

  if (searchHosts.some((part) => refHost.includes(part))) {
    return {
      sourceType: "search",
      sourceLabel: utm || refHost || "Search",
    };
  }

  const socialHosts = [
    "facebook.com",
    "m.facebook.com",
    "instagram.com",
    "l.instagram.com",
    "tiktok.com",
    "reddit.com",
    "linkedin.com",
    "x.com",
    "twitter.com",
    "t.co",
    "youtube.com",
    "youtu.be",
  ];

  if (socialHosts.some((host) => refHost.includes(host))) {
    return {
      sourceType: "social",
      sourceLabel: utm || refHost || "Social",
    };
  }

  return {
    sourceType: "referral",
    sourceLabel: utm || refHost || "Referral",
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rawParams = await params;
  const parsedParams = ParamsSchema.safeParse(rawParams);

  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid event id." }, { status: 400 });
  }

  const eventId = parsedParams.data.id;

  if (!isObjectId(eventId)) {
    return NextResponse.json({ error: "Invalid event id." }, { status: 400 });
  }

  let bodyJson: unknown;
  try {
    bodyJson = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsedBody = BodySchema.safeParse(bodyJson);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Invalid page view payload." },
      { status: 400 },
    );
  }

  const event = await Event.findById(eventId)
    .select("_id status")
    .lean<{ _id: Types.ObjectId; status: "published" | "draft" } | null>();

  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  if (event.status !== "published") {
    return NextResponse.json({ ok: true, tracked: false }, { status: 200 });
  }

  const userAgent = safeHeader(request, "user-agent");
  if (BOT_UA_RE.test(userAgent)) {
    return NextResponse.json(
      { ok: true, tracked: false, ignored: "bot" },
      { status: 200 },
    );
  }

  const now = new Date();
  const dedupeCutoff = new Date(now.getTime() - 15_000);

  const recentDuplicate = await EventPageView.findOne({
    eventId: new Types.ObjectId(eventId),
    visitorId: parsedBody.data.visitorId,
    viewedAt: { $gte: dedupeCutoff },
  })
    .select("_id viewedAt")
    .sort({ viewedAt: -1 })
    .lean<{ _id: Types.ObjectId; viewedAt: Date } | null>();

  if (recentDuplicate) {
    return NextResponse.json(
      { ok: true, tracked: false, deduped: true },
      { status: 200 },
    );
  }

  const url = parsedBody.data.url ?? "";
  const referrer = parsedBody.data.referrer ?? "";
  const { sourceType, sourceLabel } = classifyTrafficSource({
    referrer,
    currentUrl: url,
    utmSource: parsedBody.data.utmSource,
  });

  const countryCode = resolveCountryCode(request);

  await EventPageView.create({
    eventId: new Types.ObjectId(eventId),
    visitorId: parsedBody.data.visitorId,

    path: parsedBody.data.path ?? "",
    url,
    referrer,
    referrerHost: safeHost(referrer),

    sourceType,
    sourceLabel,

    utmSource: parsedBody.data.utmSource ?? "",
    utmMedium: parsedBody.data.utmMedium ?? "",
    utmCampaign: parsedBody.data.utmCampaign ?? "",

    countryCode,
    countryRegion: safeHeader(request, "x-vercel-ip-country-region"),
    city: safeHeader(request, "x-vercel-ip-city"),
    latitude: parseNumber(safeHeader(request, "x-vercel-ip-latitude")),
    longitude: parseNumber(safeHeader(request, "x-vercel-ip-longitude")),
    timezone: safeHeader(request, "x-vercel-ip-timezone"),

    userAgent,
    viewedAt: now,
  });

  return NextResponse.json({ ok: true, tracked: true }, { status: 201 });
}
