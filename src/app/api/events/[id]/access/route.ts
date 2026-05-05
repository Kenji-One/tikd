import { NextResponse } from "next/server";
import "@/lib/mongoose";

import { auth } from "@/lib/auth";
import { resolveEventActor } from "@/lib/eventAccess";
import { hasOrgPermission } from "@/lib/orgAccess";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const isObjectId = (val: string) => /^[a-f\d]{24}$/i.test(val);

function canViewMembers(
  actor: NonNullable<Awaited<ReturnType<typeof resolveEventActor>>>,
): boolean {
  if (actor.isCreator) return true;
  if (actor.orgAccess.isOwner) return true;
  if (hasOrgPermission(actor.orgAccess, "members.view")) return true;
  if (actor.eventTeam) return true;
  return false;
}

function canInviteMembers(
  actor: NonNullable<Awaited<ReturnType<typeof resolveEventActor>>>,
): boolean {
  if (actor.isCreator) return true;
  if (actor.orgAccess.isOwner) return true;
  if (hasOrgPermission(actor.orgAccess, "members.invite")) return true;
  if (actor.eventTeam?.role === "admin") return true;
  return false;
}

function canAssignRoles(
  actor: NonNullable<Awaited<ReturnType<typeof resolveEventActor>>>,
): boolean {
  if (actor.isCreator) return true;
  if (actor.orgAccess.isOwner) return true;
  if (hasOrgPermission(actor.orgAccess, "members.assignRoles")) return true;
  if (actor.eventTeam?.role === "admin") return true;
  return false;
}

function canRemoveMembers(
  actor: NonNullable<Awaited<ReturnType<typeof resolveEventActor>>>,
): boolean {
  if (actor.isCreator) return true;
  if (actor.orgAccess.isOwner) return true;
  if (hasOrgPermission(actor.orgAccess, "members.remove")) return true;
  if (actor.eventTeam?.role === "admin") return true;
  return false;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!isObjectId(id)) {
    return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
  }

  const actor = await resolveEventActor({
    eventId: id,
    userId: session.user.id,
    email: session.user.email ?? undefined,
  });

  if (!actor) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const viewMembers = canViewMembers(actor);
  if (!viewMembers) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    event: {
      id: String(actor.event._id),
      title: actor.event.title ?? "",
      organizationId: String(actor.event.organizationId),
      createdByUserId: String(actor.event.createdByUserId),
      status: actor.event.status,
    },
    access: {
      hasAccess: true,
      isCreator: actor.isCreator,
      isOrgOwner: actor.orgAccess.isOwner,
      orgRole: actor.orgAccess.effectiveRole,
      orgPermissions: actor.orgAccess.permissions,
      eventTeam:
        actor.eventTeam != null
          ? {
              role: actor.eventTeam.role,
              status: actor.eventTeam.status,
              temporaryAccess: actor.eventTeam.temporaryAccess,
              expiresAt: actor.eventTeam.expiresAt
                ? actor.eventTeam.expiresAt.toISOString()
                : null,
            }
          : null,
      canViewMembers: viewMembers,
      canInviteMembers: canInviteMembers(actor),
      canAssignRoles: canAssignRoles(actor),
      canRemoveMembers: canRemoveMembers(actor),
    },
  });
}
