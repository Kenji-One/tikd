// src/lib/password.ts
/**
 * Basic production-ready password validation:
 * - 8–72 chars (72 = safe bcrypt limit)
 * - at least one lowercase, one uppercase, one number, one symbol
 */
const STRONG_PW_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/;

export function validatePassword(pw: string) {
  if (typeof pw !== "string") {
    return { ok: false, reason: "Invalid password type." as const };
  }
  if (pw.length < 8) {
    return { ok: false, reason: "Use at least 8 characters." as const };
  }
  if (pw.length > 72) {
    return {
      ok: false,
      reason: "Password too long (72+ chars).",
    } as const;
  }
  if (!STRONG_PW_REGEX.test(pw)) {
    return {
      ok: false,
      reason: "Use upper & lower case letters, a number, and a symbol.",
    } as const;
  }
  return { ok: true as const };
}
