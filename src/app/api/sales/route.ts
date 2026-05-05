import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Types, type PipelineStage } from "mongoose";

import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import {
  listOrganizationsWithAnyEventPermission,
  requireEventGuestViewAccess,
} from "@/lib/eventAccess";
import {
  canManageOrganizationProfile,
  hasAnyOrgEventPermission,
  resolveOrgAccess,
} from "@/lib/orgAccess";

import Order from "@/models/Order";
import Event from "@/models/Event";
import EventTeam from "@/models/EventTeam";
import Team from "@/models/Team";
import TeamMember from "@/models/TeamMember";
import User from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "auto";
export const maxDuration = 15;

type SalesScope = "global" | "event" | "organization" | "team";
type SaleOrderStatus =
  | "pending"
  | "paid"
  | "refunded"
  | "cancelled"
  | "expired";
type SalesSortBy =
  | "createdAt"
  | "amount"
  | "buyerName"
  | "eventTitle"
  | "status";
type SalesSortDir = "asc" | "desc";

type TeamLean = {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId;
  name?: string;
};

type TeamMemberLean = {
  userId?: Types.ObjectId | null;
};

type EventIdLean = {
  _id: Types.ObjectId;
};

type EventTeamEventLean = {
  eventId?: Types.ObjectId | null;
};

type SalesFacetRow = {
  _id: Types.ObjectId;
  buyerUserId?: Types.ObjectId | null;
  buyerName?: string;
  buyerEmail?: string;
  buyerImageUrl?: string | null;
  eventId?: Types.ObjectId | null;
  eventTitle?: string;
  eventImage?: string | null;
  organizationId?: Types.ObjectId | null;
  total?: number;
  currency?: string;
  status?: SaleOrderStatus;
  quantity?: number;
  ticketSummary?: string;
  couponCode?: string;
  trackingCode?: string;
  trackingCreatorUserId?: Types.ObjectId | null;
  createdAt?: Date;
};

type SalesFacetResult = {
  metadata: Array<{ total: number }>;
  rows: SalesFacetRow[];
};

const ScopeSchema = z.enum(["global", "event", "organization", "team"]);
const StatusSchema = z.enum([
  "pending",
  "paid",
  "refunded",
  "cancelled",
  "expired",
  "all",
]);
const SortBySchema = z.enum([
  "createdAt",
  "amount",
  "buyerName",
  "eventTitle",
  "status",
]);
const SortDirSchema = z.enum(["asc", "desc"]);

const QuerySchema = z
  .object({
    scope: ScopeSchema.default("global"),
    eventId: z.string().trim().optional(),
    orgId: z.string().trim().optional(),
    teamId: z.string().trim().optional(),
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional(),
    search: z.string().trim().max(120).optional(),
    status: StatusSchema.default("paid"),
    sortBy: SortBySchema.default("createdAt"),
    sortDir: SortDirSchema.default("desc"),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(200).default(10),
  })
  .superRefine((data, ctx) => {
    const isObjectId = (value?: string) =>
      !!value && Types.ObjectId.isValid(value);

    if (data.scope === "event") {
      if (!isObjectId(data.eventId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid eventId.",
          path: ["eventId"],
        });
      }
    }

    if (data.scope === "organization") {
      if (!isObjectId(data.orgId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid orgId.",
          path: ["orgId"],
        });
      }
    }

    if (data.scope === "team") {
      if (!isObjectId(data.teamId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid teamId.",
          path: ["teamId"],
        });
      }
    }
  });

function normalizeEmail(email?: string | null): string {
  return String(email ?? "")
    .trim()
    .toLowerCase();
}

function buildIdentityMatch(userId: string, email?: string | null) {
  const or: Array<Record<string, unknown>> = [];

  if (Types.ObjectId.isValid(userId)) {
    or.push({ userId: new Types.ObjectId(userId) });
  }

  const emailLower = normalizeEmail(email);
  if (emailLower) {
    or.push({ email: emailLower });
  }

  return or;
}

function buildActiveMembershipTimeClause(now: Date) {
  return {
    $or: [
      { temporaryAccess: false },
      { expiresAt: { $exists: false } },
      { expiresAt: null },
      { expiresAt: { $gte: now } },
    ],
  };
}

function addUniqueObjectId(
  target: Types.ObjectId[],
  seen: Set<string>,
  value?: Types.ObjectId | null,
) {
  if (!value) return;
  const key = String(value);
  if (seen.has(key)) return;
  seen.add(key);
  target.push(value);
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildOrderDisplay(orderId: string): string {
  const normalized = String(orderId || "").trim();
  const tail = normalized.slice(-6).toUpperCase();
  return `#${tail || "ORDER"}`;
}

function mapStatusLabel(status: SaleOrderStatus): string {
  switch (status) {
    case "paid":
      return "Completed";
    case "pending":
      return "Pending";
    case "refunded":
      return "Refunded";
    case "cancelled":
      return "Cancelled";
    case "expired":
      return "Expired";
    default:
      return "Pending";
  }
}

function buildSortStage(
  sortBy: SalesSortBy,
  sortDir: SalesSortDir,
): Record<string, 1 | -1> {
  const dir = sortDir === "asc" ? 1 : -1;

  switch (sortBy) {
    case "amount":
      return { total: dir, createdAt: -1 };
    case "buyerName":
      return { buyerName: dir, createdAt: -1 };
    case "eventTitle":
      return { eventTitle: dir, createdAt: -1 };
    case "status":
      return { statusSortRank: dir, createdAt: -1 };
    case "createdAt":
    default:
      return { createdAt: dir, _id: dir };
  }
}

function makeResponse(input: {
  scope: SalesScope;
  eventId?: string | null;
  orgId?: string | null;
  teamId?: string | null;
  rows: Array<{
    id: string;
    orderId: string;
    orderDisplay: string;
    buyer: {
      id: string | null;
      name: string;
      email: string;
      imageUrl: string | null;
    };
    event: {
      id: string | null;
      title: string;
      imageUrl: string | null;
    };
    organizationId: string | null;
    amount: number;
    currency: string;
    status: SaleOrderStatus;
    statusLabel: string;
    quantity: number;
    ticketSummary: string;
    couponCode: string | null;
    trackingCode: string | null;
    trackingCreatorUserId: string | null;
    createdAt: string;
  }>;
  total: number;
  page: number;
  pageSize: number;
  sortBy: SalesSortBy;
  sortDir: SalesSortDir;
  status?: SaleOrderStatus | "all";
  search?: string;
  start?: Date | null;
  end?: Date | null;
}) {
  const totalPages =
    input.total > 0 ? Math.ceil(input.total / input.pageSize) : 0;

  return {
    scope: {
      type: input.scope,
      eventId: input.eventId ?? null,
      orgId: input.orgId ?? null,
      teamId: input.teamId ?? null,
    },
    rows: input.rows,
    total: input.total,
    page: input.page,
    pageSize: input.pageSize,
    totalPages,
    hasMore: input.page * input.pageSize < input.total,
    sort: {
      by: input.sortBy,
      dir: input.sortDir,
    },
    filters: {
      search: input.search?.trim() || "",
      status: input.status && input.status !== "all" ? input.status : null,
      start: input.start ? input.start.toISOString() : null,
      end: input.end ? input.end.toISOString() : null,
    },
  };
}

async function assertCanViewOrganizationSales(input: {
  organizationId: string;
  userId: string;
  email?: string | null;
}): Promise<
  | { ok: true; organizationId: Types.ObjectId }
  | { ok: false; status: number; error: string }
> {
  const access = await resolveOrgAccess({
    organizationId: input.organizationId,
    userId: input.userId,
    email: input.email,
  });

  if (!access.org) {
    return { ok: false, status: 404, error: "Organization not found" };
  }

  if (!access.hasAccess) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  if (
    canManageOrganizationProfile(access) ||
    hasAnyOrgEventPermission(access)
  ) {
    return { ok: true, organizationId: access.org._id };
  }

  return { ok: false, status: 403, error: "Forbidden" };
}

async function assertCanViewTeamSales(input: {
  teamId: string;
  userId: string;
  email?: string | null;
}): Promise<
  { ok: true; team: TeamLean } | { ok: false; status: number; error: string }
> {
  const team = await Team.findById(input.teamId)
    .select("_id ownerId name")
    .lean<TeamLean | null>();

  if (!team) {
    return { ok: false, status: 404, error: "Team not found" };
  }

  if (String(team.ownerId) === String(input.userId)) {
    return { ok: true, team };
  }

  const identity = buildIdentityMatch(input.userId, input.email);
  if (!identity.length) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  const member = await TeamMember.findOne({
    teamId: team._id,
    status: "active",
    $and: [{ $or: identity }, buildActiveMembershipTimeClause(new Date())],
  })
    .select("_id")
    .lean();

  if (!member) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return { ok: true, team };
}

async function listTeamScopedUserIds(
  team: TeamLean,
): Promise<Types.ObjectId[]> {
  const members = await TeamMember.find({
    teamId: team._id,
    status: "active",
    userId: { $ne: null },
    $and: [buildActiveMembershipTimeClause(new Date())],
  })
    .select("userId")
    .lean<TeamMemberLean[]>();

  const out: Types.ObjectId[] = [];
  const seen = new Set<string>();

  addUniqueObjectId(out, seen, team.ownerId);

  for (const member of members) {
    addUniqueObjectId(out, seen, member.userId ?? null);
  }

  return out;
}

async function listGlobalAccessibleEventIds(input: {
  userId: string;
  email?: string | null;
}): Promise<Types.ObjectId[]> {
  const [orgIds, createdEvents, eventTeamRows] = await Promise.all([
    listOrganizationsWithAnyEventPermission({
      userId: input.userId,
      email: input.email,
    }),
    Event.find({ createdByUserId: input.userId })
      .select("_id")
      .lean<EventIdLean[]>(),
    (async () => {
      const identity = buildIdentityMatch(input.userId, input.email);
      if (!identity.length) return [] as EventTeamEventLean[];

      return EventTeam.find({
        status: "active",
        $and: [{ $or: identity }, buildActiveMembershipTimeClause(new Date())],
      })
        .select("eventId")
        .lean<EventTeamEventLean[]>();
    })(),
  ]);

  const out: Types.ObjectId[] = [];
  const seen = new Set<string>();

  for (const event of createdEvents) {
    addUniqueObjectId(out, seen, event._id);
  }

  if (orgIds.length > 0) {
    const orgEvents = await Event.find({
      organizationId: { $in: orgIds },
    })
      .select("_id")
      .lean<EventIdLean[]>();

    for (const event of orgEvents) {
      addUniqueObjectId(out, seen, event._id);
    }
  }

  for (const row of eventTeamRows) {
    addUniqueObjectId(out, seen, row.eventId ?? null);
  }

  return out;
}

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = QuerySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams.entries()),
  );

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid query parameters.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  await connectDB();

  const {
    scope,
    eventId,
    orgId,
    teamId,
    search,
    status,
    sortBy,
    sortDir,
    page,
    pageSize,
  } = parsed.data;

  const startDate = parsed.data.start ? new Date(parsed.data.start) : null;
  const endDate = parsed.data.end ? new Date(parsed.data.end) : null;

  const normalizedStart =
    startDate && endDate
      ? startDate.getTime() <= endDate.getTime()
        ? startDate
        : endDate
      : startDate;

  const normalizedEnd =
    startDate && endDate
      ? startDate.getTime() <= endDate.getTime()
        ? endDate
        : startDate
      : endDate;

  const orderMatch: Record<string, unknown> = {};

  if (status && status !== "all") {
    orderMatch.status = status;
  }

  if (normalizedStart || normalizedEnd) {
    orderMatch.createdAt = {
      ...(normalizedStart ? { $gte: normalizedStart } : {}),
      ...(normalizedEnd ? { $lte: normalizedEnd } : {}),
    };
  }

  if (scope === "event") {
    const access = await requireEventGuestViewAccess({
      eventId: eventId!,
      userId: session.user.id,
      email: session.user.email ?? undefined,
    });

    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );
    }

    orderMatch.eventId = new Types.ObjectId(eventId!);
  }

  if (scope === "organization") {
    const access = await assertCanViewOrganizationSales({
      organizationId: orgId!,
      userId: session.user.id,
      email: session.user.email ?? undefined,
    });

    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );
    }

    orderMatch.organizationId = access.organizationId;
  }

  if (scope === "team") {
    const access = await assertCanViewTeamSales({
      teamId: teamId!,
      userId: session.user.id,
      email: session.user.email ?? undefined,
    });

    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );
    }

    const teamUserIds = await listTeamScopedUserIds(access.team);

    if (teamUserIds.length === 0) {
      return NextResponse.json(
        makeResponse({
          scope,
          teamId,
          rows: [],
          total: 0,
          page,
          pageSize,
          sortBy,
          sortDir,
          status,
          search,
          start: normalizedStart,
          end: normalizedEnd,
        }),
      );
    }

    orderMatch["tracking.trackingCreatorUserId"] = { $in: teamUserIds };
  }

  if (scope === "global") {
    const accessibleEventIds = await listGlobalAccessibleEventIds({
      userId: session.user.id,
      email: session.user.email ?? undefined,
    });

    if (accessibleEventIds.length === 0) {
      return NextResponse.json(
        makeResponse({
          scope,
          rows: [],
          total: 0,
          page,
          pageSize,
          sortBy,
          sortDir,
          status,
          search,
          start: normalizedStart,
          end: normalizedEnd,
        }),
      );
    }

    orderMatch.eventId = { $in: accessibleEventIds };
  }

  const searchRegex =
    search && search.trim()
      ? new RegExp(escapeRegExp(search.trim()), "i")
      : null;

  const skip = (page - 1) * pageSize;
  const sortStage = buildSortStage(sortBy, sortDir);

  const pipeline: PipelineStage[] = [
    { $match: orderMatch },
    {
      $lookup: {
        from: User.collection.name,
        localField: "userId",
        foreignField: "_id",
        as: "buyerUser",
      },
    },
    {
      $unwind: {
        path: "$buyerUser",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: Event.collection.name,
        localField: "eventId",
        foreignField: "_id",
        as: "eventDoc",
      },
    },
    {
      $unwind: {
        path: "$eventDoc",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        buyerSnapshotFirstName: {
          $ifNull: ["$buyerSnapshot.firstName", ""],
        },
        buyerSnapshotLastName: {
          $ifNull: ["$buyerSnapshot.lastName", ""],
        },
        buyerSnapshotFullNameRaw: {
          $ifNull: ["$buyerSnapshot.fullName", ""],
        },
        buyerSnapshotEmailLower: {
          $toLower: { $ifNull: ["$buyerSnapshot.email", ""] },
        },

        fallbackBuyerFullName: {
          $trim: {
            input: {
              $concat: [
                { $ifNull: ["$buyerUser.firstName", ""] },
                " ",
                { $ifNull: ["$buyerUser.lastName", ""] },
              ],
            },
          },
        },
        fallbackBuyerEmailLower: {
          $toLower: { $ifNull: ["$buyerUser.email", ""] },
        },
        fallbackBuyerUsername: {
          $ifNull: ["$buyerUser.username", ""],
        },
        buyerImageUrl: {
          $ifNull: ["$buyerUser.image", null],
        },

        eventTitle: {
          $ifNull: ["$eventDoc.title", "Event"],
        },
        eventImage: {
          $ifNull: ["$eventDoc.image", null],
        },
        orderIdString: {
          $toString: "$_id",
        },
        itemCount: {
          $size: { $ifNull: ["$items", []] },
        },
        quantity: {
          $sum: {
            $map: {
              input: { $ifNull: ["$items", []] },
              as: "item",
              in: { $ifNull: ["$$item.qty", 0] },
            },
          },
        },
        singleTicketLabel: {
          $let: {
            vars: {
              firstItem: {
                $arrayElemAt: [{ $ifNull: ["$items", []] }, 0],
              },
            },
            in: {
              $ifNull: ["$$firstItem.ticketTypeLabel", "Ticket"],
            },
          },
        },
        statusSortRank: {
          $switch: {
            branches: [
              { case: { $eq: ["$status", "pending"] }, then: 0 },
              { case: { $eq: ["$status", "paid"] }, then: 1 },
              { case: { $eq: ["$status", "refunded"] }, then: 2 },
              { case: { $eq: ["$status", "cancelled"] }, then: 3 },
              { case: { $eq: ["$status", "expired"] }, then: 4 },
            ],
            default: 99,
          },
        },
      },
    },
    {
      $addFields: {
        buyerSnapshotCombinedFullName: {
          $trim: {
            input: {
              $concat: [
                "$buyerSnapshotFirstName",
                " ",
                "$buyerSnapshotLastName",
              ],
            },
          },
        },
      },
    },
    {
      $addFields: {
        buyerResolvedFullName: {
          $cond: [
            { $gt: [{ $strLenCP: "$buyerSnapshotFullNameRaw" }, 0] },
            "$buyerSnapshotFullNameRaw",
            "$buyerSnapshotCombinedFullName",
          ],
        },
      },
    },
    {
      $addFields: {
        buyerName: {
          $cond: [
            { $gt: [{ $strLenCP: "$buyerResolvedFullName" }, 0] },
            "$buyerResolvedFullName",
            {
              $cond: [
                { $gt: [{ $strLenCP: "$fallbackBuyerFullName" }, 0] },
                "$fallbackBuyerFullName",
                {
                  $cond: [
                    { $gt: [{ $strLenCP: "$fallbackBuyerUsername" }, 0] },
                    "$fallbackBuyerUsername",
                    {
                      $cond: [
                        {
                          $gt: [{ $strLenCP: "$fallbackBuyerEmailLower" }, 0],
                        },
                        "$fallbackBuyerEmailLower",
                        "Customer",
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        buyerEmail: {
          $cond: [
            { $gt: [{ $strLenCP: "$buyerSnapshotEmailLower" }, 0] },
            "$buyerSnapshotEmailLower",
            "$fallbackBuyerEmailLower",
          ],
        },
        buyerUserId: {
          $ifNull: ["$buyerSnapshot.userId", "$userId"],
        },
        ticketSummary: {
          $cond: [{ $gt: ["$itemCount", 1] }, "Multiple", "$singleTicketLabel"],
        },
      },
    },
  ];

  if (searchRegex) {
    pipeline.push({
      $match: {
        $or: [
          { buyerName: searchRegex },
          { buyerEmail: searchRegex },
          { eventTitle: searchRegex },
          { orderIdString: searchRegex },
          { couponCode: searchRegex },
          { "tracking.trackingCode": searchRegex },
        ],
      },
    });
  }

  pipeline.push(
    { $sort: sortStage },
    {
      $facet: {
        metadata: [{ $count: "total" }],
        rows: [
          { $skip: skip },
          { $limit: pageSize },
          {
            $project: {
              _id: 1,
              buyerUserId: 1,
              buyerName: 1,
              buyerEmail: 1,
              buyerImageUrl: 1,
              eventId: "$eventId",
              eventTitle: 1,
              eventImage: 1,
              organizationId: 1,
              total: 1,
              currency: 1,
              status: 1,
              quantity: 1,
              ticketSummary: 1,
              couponCode: 1,
              trackingCode: "$tracking.trackingCode",
              trackingCreatorUserId: "$tracking.trackingCreatorUserId",
              createdAt: 1,
            },
          },
        ],
      },
    },
  );

  const facet = (await Order.aggregate<SalesFacetResult>(pipeline))?.[0];

  const total = facet?.metadata?.[0]?.total ?? 0;
  const rows = (facet?.rows ?? []).map((row) => {
    const safeStatus: SaleOrderStatus =
      row.status === "paid" ||
      row.status === "pending" ||
      row.status === "refunded" ||
      row.status === "cancelled" ||
      row.status === "expired"
        ? row.status
        : "pending";

    const buyerName = String(row.buyerName || "").trim() || "Customer";
    const buyerEmail = String(row.buyerEmail || "")
      .trim()
      .toLowerCase();
    const ticketSummary = String(row.ticketSummary || "").trim() || "Ticket";

    return {
      id: String(row._id),
      orderId: String(row._id),
      orderDisplay: buildOrderDisplay(String(row._id)),
      buyer: {
        id: row.buyerUserId ? String(row.buyerUserId) : null,
        name: buyerName,
        email: buyerEmail,
        imageUrl:
          typeof row.buyerImageUrl === "string" && row.buyerImageUrl.trim()
            ? row.buyerImageUrl
            : null,
      },
      event: {
        id: row.eventId ? String(row.eventId) : null,
        title: String(row.eventTitle || "").trim() || "Event",
        imageUrl:
          typeof row.eventImage === "string" && row.eventImage.trim()
            ? row.eventImage
            : null,
      },
      organizationId: row.organizationId ? String(row.organizationId) : null,
      amount: Number.isFinite(row.total) ? Number(row.total) : 0,
      currency:
        String(row.currency || "")
          .trim()
          .toUpperCase() || "USD",
      status: safeStatus,
      statusLabel: mapStatusLabel(safeStatus),
      quantity: Number.isFinite(row.quantity) ? Number(row.quantity) : 0,
      ticketSummary,
      couponCode:
        typeof row.couponCode === "string" && row.couponCode.trim()
          ? row.couponCode.trim()
          : null,
      trackingCode:
        typeof row.trackingCode === "string" && row.trackingCode.trim()
          ? row.trackingCode.trim()
          : null,
      trackingCreatorUserId: row.trackingCreatorUserId
        ? String(row.trackingCreatorUserId)
        : null,
      createdAt:
        row.createdAt instanceof Date
          ? row.createdAt.toISOString()
          : new Date().toISOString(),
    };
  });

  return NextResponse.json(
    makeResponse({
      scope,
      eventId: eventId ?? null,
      orgId: orgId ?? null,
      teamId: teamId ?? null,
      rows,
      total,
      page,
      pageSize,
      sortBy,
      sortDir,
      status,
      search,
      start: normalizedStart,
      end: normalizedEnd,
    }),
  );
}
