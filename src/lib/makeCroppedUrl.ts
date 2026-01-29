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

  if (seg.includes(",")) return true;

  return /^(?:c|w|h|x|y|g|q|f|b|ar|dpr|e|l|u|a|r|t|bo|so|co|fl)_[^/]+$/i.test(
    seg,
  );
}

/**
 * Extract the "rest" (version + publicId, or just publicId) AFTER /upload/
 * while stripping any existing transformations.
 */
export function cloudinaryRestFromUploadSegment(url: string) {
  const clean = stripQueryAndHash(url);
  const parts = clean.split("/upload/");
  if (parts.length < 2) return null;

  const rest = parts[1] || "";
  const segs = rest.split("/").filter(Boolean);
  if (!segs.length) return null;

  const vIdx = segs.findIndex((s) => /^v\d+$/i.test(s));
  if (vIdx >= 0) {
    return segs.slice(vIdx).join("/");
  }

  let firstNonTransform = 0;
  while (
    firstNonTransform < segs.length &&
    isTransformSegment(segs[firstNonTransform])
  ) {
    firstNonTransform += 1;
  }

  if (firstNonTransform >= segs.length) return segs.join("/");

  return segs.slice(firstNonTransform).join("/");
}

/**
 * ✅ Returns a "raw asset" Cloudinary URL (no transforms).
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

  // ✅ IMPORTANT:
  // Cloudinary applies transformations in "blocks" separated by "/".
  // If you do "c_crop,...,c_fill,..." in ONE block, c_fill overrides c_crop.
  const t1 = `c_crop,x_${x},y_${y},w_${w},h_${h}`;
  const t2 = `c_fill,w_${outW},h_${outH}`;
  const t3 = `f_auto,q_auto`;

  return `${prefix}${t1}/${t2}/${t3}/${rest}`;
}
