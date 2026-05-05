import { z } from "zod";

/**
 * @deprecated
 * Team/Event invites no longer use signed payload tokens.
 * The live architecture is:
 * - raw token in URL
 * - hashed token stored in DB
 * - lookup/accept through TeamMember.inviteTokenHash / EventTeam.inviteTokenHash
 *
 * This module is retained only to make any leftover usage fail loudly
 * during development instead of silently reviving the old flow.
 */

export const InviteScopeZ = z.enum(["team", "event"]);
export type InviteScope = z.infer<typeof InviteScopeZ>;

const InviteTokenPayloadZ = z.object({
  scope: InviteScopeZ,
  resourceId: z.string().min(1),
  membershipId: z.string().min(1),
  email: z.string().email(),
  iat: z.number().int().positive(),
  exp: z.number().int().positive(),
});

export type InviteTokenPayload = z.infer<typeof InviteTokenPayloadZ>;

type CreateInviteTokenInput = {
  scope: InviteScope;
  resourceId: string;
  membershipId: string;
  email: string;
  ttlHours?: number;
};

type VerifyInviteTokenResult =
  | { ok: true; payload: InviteTokenPayload }
  | { ok: false; reason: "invalid" | "expired" };

function legacyFlowError(functionName: string): never {
  throw new Error(
    [
      `Deprecated legacy invite helper used: ${functionName}.`,
      "Do not use signed memberInviteToken flow anymore.",
      "Use the DB-backed invite helpers instead:",
      '- team: "@/lib/teamInvites"',
      '- event: "@/lib/eventInvites"',
      "And use routes under /api/invites/[scope]/[token] and /accept.",
    ].join(" "),
  );
}

export function createMemberInviteToken(_input: CreateInviteTokenInput): {
  token: string;
  payload: InviteTokenPayload;
} {
  return legacyFlowError("createMemberInviteToken");
}

export function verifyMemberInviteToken(
  _token: string,
): VerifyInviteTokenResult {
  return legacyFlowError("verifyMemberInviteToken");
}

export function buildMemberInviteUrl(input: {
  baseUrl: string;
  scope: InviteScope;
  token: string;
}): string {
  const base = input.baseUrl.replace(/\/$/, "");
  return `${base}/invite/${input.scope}/${encodeURIComponent(input.token)}`;
}
