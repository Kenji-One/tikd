/* ------------------------------------------------------------------ */
/*  src/lib/makeCroppedUrl.ts                                         */
/* ------------------------------------------------------------------ */

export function isProbablyCloudinaryUrl(url: string) {
  return typeof url === "string" && url.includes("/upload/");
}

/** Remove query/hash so Cloudinary path parsing is stable. */
function stripQueryAndHash(url: string) {
  return url.split("?")[0]?.split("#")[0] ?? url;
}

export function cloudinaryPrefixToUpload(url: string) {
  const clean = stripQueryAndHash(url);
  const parts = clean.split("/upload/");
  if (parts.length < 2) return null;
  return `${parts[0]}/upload/`;
}

function isTransformSegment(seg: string) {
  if (!seg) return false;

  // Most transforms are comma-separated in a single segment
  if (seg.includes(",")) return true;

  // Allow single-key transforms (w_300, c_fill, q_auto, f_auto, g_auto, etc.)
  return /^(?:c|w|h|x|y|g|q|f|b|ar|dpr|e|l|u|a|r|t|bo|so|co|fl)_[^/]+$/i.test(
    seg,
  );
}

/**
 * Extract the "rest" (version + publicId, or just publicId) AFTER /upload/
 * while stripping any existing transformations, whether or not the URL has /v123/.
 */
export function cloudinaryRestFromUploadSegment(url: string) {
  const clean = stripQueryAndHash(url);
  const parts = clean.split("/upload/");
  if (parts.length < 2) return null;

  const rest = parts[1] || "";
  const segs = rest.split("/").filter(Boolean);
  if (!segs.length) return null;

  // Prefer version segment if present
  const vIdx = segs.findIndex((s) => /^v\d+$/i.test(s));
  if (vIdx >= 0) {
    return segs.slice(vIdx).join("/");
  }

  // Otherwise strip all leading transform segments
  let firstNonTransform = 0;
  while (
    firstNonTransform < segs.length &&
    isTransformSegment(segs[firstNonTransform])
  ) {
    firstNonTransform += 1;
  }

  // If everything looked like a transform (rare), fall back to original
  if (firstNonTransform >= segs.length) return segs.join("/");

  return segs.slice(firstNonTransform).join("/");
}

/**
 * ✅ Returns a "raw asset" Cloudinary URL (no transforms).
 * This fixes the "padded black area" issue when src already had c_pad/c_fill/etc.
 */
export function makeCloudinaryAssetUrl(url: string) {
  if (!isProbablyCloudinaryUrl(url)) return null;

  const prefix = cloudinaryPrefixToUpload(url);
  const rest = cloudinaryRestFromUploadSegment(url);
  if (!prefix || !rest) return null;

  return `${prefix}${rest}`;
}

export function makeCloudinaryCroppedUrl({
  originalUrl,
  cropX,
  cropY,
  cropW,
  cropH,
  outW,
  outH,
}: {
  originalUrl: string;
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
  outW: number;
  outH: number;
}) {
  if (!isProbablyCloudinaryUrl(originalUrl)) return originalUrl;

  const prefix = cloudinaryPrefixToUpload(originalUrl);
  const rest = cloudinaryRestFromUploadSegment(originalUrl);
  if (!prefix || !rest) return originalUrl;

  const x = Math.max(0, Math.round(cropX));
  const y = Math.max(0, Math.round(cropY));
  const w = Math.max(1, Math.round(cropW));
  const h = Math.max(1, Math.round(cropH));

  // Crop precisely, then output at desired dimensions.
  const transform = [
    `c_crop,x_${x},y_${y},w_${w},h_${h}`,
    `c_fill,w_${outW},h_${outH}`,
    "f_auto",
    "q_auto",
  ].join(",");

  return `${prefix}${transform}/${rest}`;
}
