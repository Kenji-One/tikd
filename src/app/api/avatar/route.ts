// src/app/api/avatar/route.ts

import { createAvatar } from "@dicebear/core";
import { rings } from "@dicebear/collection";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const seed = searchParams.get("seed") ?? "guest";

  // generate a rings avatar with black background
  const avatarResult = createAvatar(rings, {
    seed,
    backgroundColor: ["#000000"],
  });

  // convert the Result object to an SVG string
  const svg = avatarResult.toString();

  return new Response(svg, {
    status: 200,
    headers: { "Content-Type": "image/svg+xml" },
  });
}
