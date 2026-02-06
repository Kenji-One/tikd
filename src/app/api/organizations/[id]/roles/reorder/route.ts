import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";
import { z } from "zod";
import { Types } from "mongoose";

import { auth } from "@/lib/auth";
import Organization from "@/models/Organization";
import OrgTeam from "@/models/OrgTeam";
import OrgRole from "@/models/OrgRole";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Ctx = { params: Promise<{ id: string }> };
const isObjectId = (val: string) => /^[a-f\d]{24}$/i.test(val);

const reorderSchema = z
  .object({
    roleIds: z.array(z.string().regex(/^[a-f\d]{24}$/i)).min(1),
  })
  .strict();

async function assertCanManageRoles(orgId: string, userId: string) {
  const org = await Organization.findById(orgId).select("_id ownerId").lean<{
    _id: Types.ObjectId;
    ownerId: Types.ObjectId;
  } | null>();

  if (!org) return { ok: false as const, status: 404 };

  if (String(org.ownerId) === String(userId)) return { ok: true as const };

  const admin = await OrgTeam.findOne({
    organizationId: orgId,
    userId,
    role: "admin",
    status: "active",
  })
    .select("_id")
    .lean();

  if (admin) return { ok: true as const };

  return { ok: false as const, status: 403 };
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  if (!isObjectId(id))
    return NextResponse.json(
      { error: "Invalid organization id" },
      { status: 400 },
    );

  const can = await assertCanManageRoles(id, session.user.id);
  if (!can.ok) {
    return NextResponse.json(
      { error: can.status === 404 ? "Organization not found" : "Forbidden" },
      { status: can.status },
    );
  }

  const body = await req.json();
  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(parsed.error.flatten(), { status: 400 });

  const ids = parsed.data.roleIds.map((x) => new Types.ObjectId(x));

  // Verify all belong to org
  const found = await OrgRole.find({
    _id: { $in: ids },
    organizationId: new Types.ObjectId(id),
  })
    .select("_id")
    .lean<Array<{ _id: Types.ObjectId }>>();

  if (found.length !== ids.length) {
    return NextResponse.json(
      { error: "One or more roles not found" },
      { status: 404 },
    );
  }

  const ops = ids.map((roleId, idx) => ({
    updateOne: {
      filter: { _id: roleId, organizationId: new Types.ObjectId(id) },
      update: { $set: { order: idx + 1 } },
    },
  }));

  await OrgRole.bulkWrite(ops, { ordered: true });
  return NextResponse.json({ ok: true });
}
