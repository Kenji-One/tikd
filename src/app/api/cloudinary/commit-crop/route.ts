/* ------------------------------------------------------------------ */
/*  src/app/api/cloudinary/commit-crop/route.ts                        */
/* ------------------------------------------------------------------ */
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Body = {
  public_id?: string;
  source_url?: string;
};

function stripQueryAndHash(url: string) {
  return url.split("?")[0]?.split("#")[0] ?? url;
}

function isSafeCloudinarySource(url: string) {
  if (typeof url !== "string") return false;

  // Must be a Cloudinary delivery URL
  // Common forms:
  // - https://res.cloudinary.com/<cloud>/image/upload/...
  // - https://res.cloudinary.com/<cloud>/image/upload/<transforms>/v123/<public_id>.png
  if (!url.startsWith("https://res.cloudinary.com/")) return false;

  // Must include upload delivery segment
  return url.includes("/image/upload/");
}

function urlMatchesPublicId(cleanUrl: string, publicId: string) {
  // Cloudinary URLs typically end with:
  // .../v123/<public_id>.<ext>   OR   .../<public_id>.<ext>
  // public_id contains slashes, so we match it at the end of the path.
  const escaped = publicId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`/${escaped}(?:\\.[a-z0-9]+)?$`, "i");
  return re.test(cleanUrl);
}

function extractVersion(cleanUrl: string) {
  const m = cleanUrl.match(/\/v(\d+)\//i);
  return m ? Number(m[1]) : undefined;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Body | null;

  const public_id = body?.public_id ? String(body.public_id) : "";
  const source_url = body?.source_url ? String(body.source_url) : "";

  if (!public_id || !source_url) {
    return NextResponse.json(
      { error: "`public_id` and `source_url` are required" },
      { status: 400 },
    );
  }

  if (!isSafeCloudinarySource(source_url)) {
    return NextResponse.json(
      { error: "Invalid `source_url` (must be a Cloudinary delivery URL)" },
      { status: 400 },
    );
  }

  const clean = stripQueryAndHash(source_url);

  // Safety: ensure the URL we’re about to “commit” actually points to the same public_id
  if (!urlMatchesPublicId(clean, public_id)) {
    return NextResponse.json(
      { error: "`source_url` does not match the provided `public_id`" },
      { status: 400 },
    );
  }

  // ✅ No re-upload. We “commit” by returning the cropped Cloudinary URL.
  // You already cache-bust in the UI and strip query/hash before saving.
  return NextResponse.json({
    secure_url: clean,
    public_id,
    version: extractVersion(clean),
  });
}
