import crypto from "crypto";
import { Types } from "mongoose";

import OrgTeam from "@/models/OrgTeam";
import Organization from "@/models/Organization";
import OrgRole from "@/models/OrgRole";
import User from "@/models/User";
import { sendMail } from "@/lib/mail";
import { getSystemRoleFallback } from "@/lib/orgRoles";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type InvitePreview = {
  organizationId: string;
  organizationName: string;
  email: string;
  role: {
    key: string;
    name: string;
    color?: string;
    iconKey?: string | null;
    iconUrl?: string | null;
  };
  expiresAt: string | null;
};

function appBaseUrl(): string {
  return String(process.env.APP_URL || process.env.NEXTAUTH_URL || "").replace(
    /\/$/,
    "",
  );
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

export function buildOrgInviteAcceptUrl(rawToken: string): string {
  const path = `/accept-invite?type=organization&token=${encodeURIComponent(rawToken)}`;
  const base = appBaseUrl();
  return base ? `${base}${path}` : path;
}

async function loadInviteByRawToken(rawToken: string) {
  const now = new Date();
  const tokenHash = hashInviteToken(rawToken);

  const invite = await OrgTeam.findOne({
    status: "invited",
    $or: [{ inviteTokenHash: tokenHash }, { inviteToken: rawToken }],
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
      "_id organizationId email role roleId status inviteExpiresAt inviteTokenHash inviteToken",
    )
    .lean<{
      _id: Types.ObjectId;
      organizationId: Types.ObjectId;
      email: string;
      role: string;
      roleId?: Types.ObjectId | null;
      status: string;
      inviteExpiresAt?: Date | null;
      inviteTokenHash?: string;
      inviteToken?: string;
    } | null>();

  return invite;
}

async function resolveRoleMeta(input: {
  organizationId: Types.ObjectId;
  role: string;
  roleId?: Types.ObjectId | null;
}) {
  if (input.roleId && Types.ObjectId.isValid(input.roleId)) {
    const roleDoc = await OrgRole.findOne({
      _id: input.roleId,
      organizationId: input.organizationId,
    })
      .select("_id key name color iconKey iconUrl")
      .lean<{
        _id: Types.ObjectId;
        key: string;
        name: string;
        color?: string;
        iconKey?: string | null;
        iconUrl?: string | null;
      } | null>();

    if (roleDoc) {
      return {
        key: roleDoc.key,
        name: roleDoc.name,
        color: roleDoc.color || "",
        iconKey: roleDoc.iconKey ?? null,
        iconUrl: roleDoc.iconUrl ?? null,
      };
    }
  }

  const fallback = getSystemRoleFallback(input.role);
  if (fallback) {
    return {
      key: fallback.key,
      name: fallback.name,
      color: fallback.color,
      iconKey: fallback.iconKey,
      iconUrl: null,
    };
  }

  return {
    key: input.role,
    name: input.role.charAt(0).toUpperCase() + input.role.slice(1),
    color: "",
    iconKey: null,
    iconUrl: null,
  };
}

export async function getOrganizationInvitePreviewByToken(
  rawToken: string,
): Promise<InvitePreview | null> {
  const invite = await loadInviteByRawToken(rawToken);
  if (!invite) return null;

  const org = await Organization.findById(invite.organizationId)
    .select("_id name")
    .lean<{ _id: Types.ObjectId; name?: string } | null>();

  if (!org) return null;

  const role = await resolveRoleMeta({
    organizationId: invite.organizationId,
    role: invite.role,
    roleId: invite.roleId ?? null,
  });

  return {
    organizationId: String(org._id),
    organizationName: org.name || "Organization",
    email: invite.email,
    role,
    expiresAt: invite.inviteExpiresAt
      ? invite.inviteExpiresAt.toISOString()
      : null,
  };
}

export async function acceptOrganizationInviteByToken(input: {
  rawToken: string;
  userId: string;
  email: string;
}): Promise<
  | { ok: true; organizationId: string }
  | { ok: false; status: number; error: string }
> {
  const invite = await loadInviteByRawToken(input.rawToken);
  if (!invite) {
    return { ok: false, status: 404, error: "Invite not found or expired" };
  }

  const sessionEmail = String(input.email).trim().toLowerCase();
  const inviteEmail = String(invite.email).trim().toLowerCase();

  if (!sessionEmail || sessionEmail !== inviteEmail) {
    return {
      ok: false,
      status: 403,
      error: "This invite belongs to a different email address",
    };
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

  const updated = await OrgTeam.findOneAndUpdate(
    { _id: invite._id, status: "invited" },
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
        inviteToken: "",
        inviteExpiresAt: "",
      },
    },
    { new: true },
  )
    .select("_id organizationId")
    .lean<{ _id: Types.ObjectId; organizationId: Types.ObjectId } | null>();

  if (!updated) {
    return { ok: false, status: 409, error: "Invite could not be accepted" };
  }

  return { ok: true, organizationId: String(updated.organizationId) };
}

export async function sendOrganizationInviteEmail(input: {
  to: string;
  organizationName: string;
  roleName: string;
  inviterName?: string;
  rawToken: string;
  expiresAt: Date;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const acceptUrl = buildOrgInviteAcceptUrl(input.rawToken);

    const safeOrganizationName = escapeHtml(input.organizationName);
    const safeRoleName = escapeHtml(input.roleName);
    const safeInviterName = input.inviterName
      ? escapeHtml(input.inviterName)
      : "";
    const safeAcceptUrl = escapeHtml(acceptUrl);
    const safeExpiry = escapeHtml(input.expiresAt.toUTCString());

    await sendMail({
      to: input.to,
      subject: `You’ve been invited to join ${input.organizationName} on Tikd`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
          <h2 style="margin:0 0 12px">Organization invitation</h2>
          <p style="margin:0 0 12px">
            ${
              safeInviterName
                ? `<strong>${safeInviterName}</strong> has`
                : "You’ve"
            } invited you to join
            <strong>${safeOrganizationName}</strong> on Tikd.
          </p>
          <p style="margin:0 0 12px">
            Assigned role: <strong>${safeRoleName}</strong>
          </p>
          <p style="margin:0 0 16px">
            This invite expires on <strong>${safeExpiry}</strong>.
          </p>
          <p style="margin:0 0 16px">
            <a
              href="${safeAcceptUrl}"
              style="display:inline-block;padding:10px 16px;background:#6100EA;color:#ffffff;text-decoration:none;border-radius:10px"
            >
              Accept invitation
            </a>
          </p>
          <p style="margin:0;color:#6B7280;font-size:12px">
            If the button does not work, open this URL in your browser:<br />
            ${safeAcceptUrl}
          </p>
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
