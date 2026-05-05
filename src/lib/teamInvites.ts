import crypto from "crypto";
import { Types } from "mongoose";

import Team from "@/models/Team";
import TeamMember from "@/models/TeamMember";
import User from "@/models/User";
import { sendMail } from "@/lib/mail";

const INVITE_TTL_MS = 72 * 60 * 60 * 1000;

type TeamMemberRole =
  | "admin"
  | "promoter"
  | "scanner"
  | "collaborator"
  | "member";

type TeamInvitePreview = {
  scope: "team";
  resource: {
    id: string;
    title: string;
  };
  recipientEmail: string;
  inviterName: string;
  role: TeamMemberRole;
  roleLabel: string;
  status: "invited";
  temporaryAccess: boolean;
  expiresAt: string | null;
  redirectTo: string;
};

function normalizeEmail(email?: string | null): string {
  return String(email ?? "")
    .trim()
    .toLowerCase();
}

function normalizeToken(rawToken?: string | null): string {
  return String(rawToken ?? "").trim();
}

function appBaseUrl(): string {
  const raw = String(
    process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000",
  ).trim();

  return raw.replace(/\/$/, "");
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function roleLabel(role: TeamMemberRole): string {
  switch (role) {
    case "admin":
      return "Admin";
    case "promoter":
      return "Promoter";
    case "scanner":
      return "Scanner";
    case "collaborator":
      return "Collaborator";
    case "member":
      return "Member";
    default:
      return "Member";
  }
}

function buildTeamRedirect(teamId: string): string {
  return `/dashboard/teams/${teamId}`;
}

export function hashInviteToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export function createInviteTokenPair(): {
  rawToken: string;
  tokenHash: string;
  expiresAt: Date;
} {
  const rawToken = crypto.randomBytes(32).toString("hex");

  return {
    rawToken,
    tokenHash: hashInviteToken(rawToken),
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
  };
}

export function buildTeamInviteAcceptUrl(rawToken: string): string {
  return `${appBaseUrl()}/invite/team/${encodeURIComponent(rawToken)}`;
}

async function findInviterName(
  userId: Types.ObjectId | string,
): Promise<string> {
  const inviter = await User.findById(userId)
    .select("firstName lastName username email")
    .lean<{
      firstName?: string;
      lastName?: string;
      username?: string;
      email?: string;
    } | null>();

  if (!inviter) return "A team admin";

  const full = `${inviter.firstName ?? ""} ${inviter.lastName ?? ""}`.trim();
  return full || inviter.username || inviter.email || "A team admin";
}

async function loadInviteByRawToken(rawToken: string) {
  const normalizedToken = normalizeToken(rawToken);
  if (!normalizedToken) return null;

  const tokenHash = hashInviteToken(normalizedToken);
  const now = new Date();

  return TeamMember.findOne({
    status: "invited",
    inviteTokenHash: tokenHash,
    $and: [
      {
        $or: [
          { inviteExpiresAt: { $exists: false } },
          { inviteExpiresAt: null },
          { inviteExpiresAt: { $gt: now } },
        ],
      },
    ],
  })
    .select(
      "_id teamId email role status temporaryAccess expiresAt invitedBy inviteExpiresAt",
    )
    .lean<{
      _id: Types.ObjectId;
      teamId: Types.ObjectId;
      email: string;
      role: TeamMemberRole;
      status: "invited";
      temporaryAccess: boolean;
      expiresAt?: Date | null;
      invitedBy: Types.ObjectId;
      inviteExpiresAt?: Date | null;
    } | null>();
}

export async function getTeamInvitePreviewByToken(
  rawToken: string,
): Promise<TeamInvitePreview | null> {
  const invite = await loadInviteByRawToken(rawToken);
  if (!invite) return null;

  if (
    invite.temporaryAccess &&
    invite.expiresAt &&
    new Date(invite.expiresAt).getTime() <= Date.now()
  ) {
    return null;
  }

  const team = await Team.findById(invite.teamId)
    .select("_id name")
    .lean<{ _id: Types.ObjectId; name?: string } | null>();

  if (!team) return null;

  const inviterName = await findInviterName(invite.invitedBy);

  return {
    scope: "team",
    resource: {
      id: String(team._id),
      title: team.name || "Team",
    },
    recipientEmail: invite.email,
    inviterName,
    role: invite.role,
    roleLabel: roleLabel(invite.role),
    status: "invited",
    temporaryAccess: invite.temporaryAccess,
    expiresAt: invite.expiresAt ? invite.expiresAt.toISOString() : null,
    redirectTo: buildTeamRedirect(String(team._id)),
  };
}

export async function acceptTeamInviteByToken(input: {
  rawToken: string;
  userId: string;
  email: string;
}): Promise<
  | { ok: true; redirectTo: string }
  | { ok: false; status: number; error: string }
> {
  const normalizedToken = normalizeToken(input.rawToken);
  if (!normalizedToken) {
    return { ok: false, status: 400, error: "Invalid invite token" };
  }

  const invite = await loadInviteByRawToken(normalizedToken);

  if (!invite) {
    return { ok: false, status: 404, error: "Invite not found or expired" };
  }

  const sessionEmail = normalizeEmail(input.email);
  const inviteEmail = normalizeEmail(invite.email);

  if (!sessionEmail || sessionEmail !== inviteEmail) {
    return {
      ok: false,
      status: 403,
      error: `Sign in with ${inviteEmail} to accept this invitation`,
    };
  }

  if (
    invite.temporaryAccess &&
    invite.expiresAt &&
    new Date(invite.expiresAt).getTime() <= Date.now()
  ) {
    await TeamMember.updateOne(
      { _id: invite._id, status: "invited" },
      { $set: { status: "expired" } },
    );

    return { ok: false, status: 410, error: "Invite has expired" };
  }

  const user = await User.findById(input.userId)
    .select("_id email firstName lastName username")
    .lean<{
      _id: Types.ObjectId;
      email?: string;
      firstName?: string;
      lastName?: string;
      username?: string;
    } | null>();

  if (!user) {
    return { ok: false, status: 404, error: "User not found" };
  }

  const displayName =
    user.firstName || user.lastName
      ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
      : (user.username ?? "");

  const updated = await TeamMember.findOneAndUpdate(
    {
      _id: invite._id,
      status: "invited",
      inviteTokenHash: hashInviteToken(normalizedToken),
    },
    {
      $set: {
        userId: new Types.ObjectId(input.userId),
        email: sessionEmail,
        name: displayName,
        status: "active",
        acceptedAt: new Date(),
      },
      $unset: {
        inviteTokenHash: "",
        inviteExpiresAt: "",
      },
    },
    { new: true },
  )
    .select("_id teamId")
    .lean<{ _id: Types.ObjectId; teamId: Types.ObjectId } | null>();

  if (!updated) {
    return { ok: false, status: 409, error: "Invite could not be accepted" };
  }

  return {
    ok: true,
    redirectTo: buildTeamRedirect(String(updated.teamId)),
  };
}

export async function sendTeamInviteEmail(input: {
  to: string;
  teamName: string;
  roleName: string;
  inviterName?: string;
  rawToken: string;
  expiresAt: Date;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const acceptUrl = buildTeamInviteAcceptUrl(input.rawToken);

    const safeTeamName = escapeHtml(input.teamName);
    const safeRoleName = escapeHtml(input.roleName);
    const safeInviterName = escapeHtml(input.inviterName || "A team admin");
    const safeAcceptUrl = escapeHtml(acceptUrl);
    const safeExpiry = escapeHtml(
      input.expiresAt.toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    );

    await sendMail({
      to: input.to,
      subject: `You’ve been invited to join ${input.teamName} on Tixsy`,
      html: `
        <div style="margin:0;padding:32px 16px;background:#06070B;font-family:Inter,Arial,sans-serif;color:#F5F7FF;">
          <div style="max-width:640px;margin:0 auto;border:1px solid rgba(255,255,255,0.08);border-radius:24px;overflow:hidden;background:
            radial-gradient(900px 320px at 12% -8%, rgba(154,70,255,0.28), transparent 60%),
            radial-gradient(900px 320px at 100% 24%, rgba(66,139,255,0.16), transparent 62%),
            linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02)),
            #0B0D14;">
            <div style="padding:28px 28px 18px;">
              <div style="display:inline-block;padding:8px 12px;border-radius:999px;background:rgba(154,70,255,0.14);border:1px solid rgba(154,70,255,0.24);color:#E8D7FF;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">
                Tixsy Invitation
              </div>

              <h1 style="margin:18px 0 10px;font-size:28px;line-height:1.15;font-weight:800;color:#FFFFFF;">
                Join ${safeTeamName}
              </h1>

              <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#B8C0D9;">
                <strong style="color:#FFFFFF;">${safeInviterName}</strong> invited you to join
                <strong style="color:#FFFFFF;">${safeTeamName}</strong> on Tixsy.
              </p>

              <div style="display:flex;flex-wrap:wrap;gap:10px;margin:0 0 18px;">
                <span style="display:inline-block;padding:10px 14px;border-radius:999px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.10);font-size:13px;color:#E9EDFF;">
                  Role: <strong style="color:#FFFFFF;">${safeRoleName}</strong>
                </span>
                <span style="display:inline-block;padding:10px 14px;border-radius:999px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.10);font-size:13px;color:#E9EDFF;">
                  Expires: <strong style="color:#FFFFFF;">${safeExpiry}</strong>
                </span>
              </div>

              <div style="margin:24px 0 22px;">
                <a
                  href="${safeAcceptUrl}"
                  style="display:inline-block;padding:14px 20px;border-radius:14px;background:linear-gradient(90deg,#9A46FF,#428BFF);color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:800;"
                >
                  Accept invitation
                </a>
              </div>

              <p style="margin:0;font-size:12px;line-height:1.7;color:#8E97B3;">
                If the button does not work, copy and open this link:
              </p>
              <p style="margin:8px 0 0;font-size:12px;line-height:1.7;color:#C9D1EA;word-break:break-all;">
                ${safeAcceptUrl}
              </p>
            </div>
          </div>
        </div>
      `,
    });

    return { ok: true };
  } catch (error: unknown) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Email send failed",
    };
  }
}
