/* ------------------------------------------------------------------ */
/*  Cloudinary signing endpoint                                       */
/*  GET /api/cloudinary/sign?public_id=<id>[&overwrite=1]             */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from "next/server";
import { cloudinary } from "@/lib/cloudinary";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  /* -------- required param ----------------------------------------- */
  const public_id = searchParams.get("public_id");
  if (!public_id) {
    return NextResponse.json(
      { error: "`public_id` query param is required" },
      { status: 400 }
    );
  }

  /* -------- optional flags ----------------------------------------- */
  const overwrite = searchParams.get("overwrite") === "1";
  const invalidate = overwrite; // automatically invalidate CDN

  const timestamp = Math.floor(Date.now() / 1000);

  /* -------- sign exactly the params you’ll send -------------------- */
  const signature = cloudinary.utils.api_sign_request(
    {
      public_id,
      timestamp,
      ...(overwrite ? { overwrite: "1" } : {}),
      ...(invalidate ? { invalidate: "1" } : {}),
    },
    process.env.CLOUDINARY_API_SECRET as string
  );

  return NextResponse.json({
    timestamp,
    signature,
    public_id,
    overwrite,
    invalidate,
  });
}
