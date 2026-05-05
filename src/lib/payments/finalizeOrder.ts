import crypto from "crypto";
import { Types } from "mongoose";

import { connectDB } from "@/lib/db";

import Order from "@/models/Order";
import Ticket from "@/models/Ticket";
import TicketType from "@/models/TicketType";
import TrackingLink from "@/models/TrackingLink";

type FinalizeOrderSuccess = {
  ok: true;
  orderId: string;
  paymentIntentId: string;
  ticketIds: string[];
  alreadyFinalized: boolean;
};

type FinalizeOrderFailure = {
  ok: false;
  status: number;
  error: string;
};

export type FinalizeOrderResult = FinalizeOrderSuccess | FinalizeOrderFailure;

function isObjectId(value?: string | null): value is string {
  return !!value && Types.ObjectId.isValid(value);
}

function makeQrCodeValue(): string {
  return `tikd_${crypto.randomUUID()}`;
}

function buildTicketHolderSnapshot(order: {
  userId: Types.ObjectId;
  buyerSnapshot?: {
    userId?: Types.ObjectId | null;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    email?: string;
    phone?: string;
    facebookProfile?: string;
    instagramProfile?: string;
    gender?: string | null;
    dateOfBirth?: Date | null;
    declaredAge?: number | null;
  } | null;
}) {
  const snapshot = order.buyerSnapshot;

  if (!snapshot) {
    return {
      userId: order.userId,
      firstName: "",
      lastName: "",
      fullName: "",
      email: "",
      phone: "",
      facebookProfile: "",
      instagramProfile: "",
      gender: null,
      dateOfBirth: null,
      declaredAge: null,
    };
  }

  return {
    userId: snapshot.userId ?? order.userId,
    firstName: snapshot.firstName ?? "",
    lastName: snapshot.lastName ?? "",
    fullName: snapshot.fullName ?? "",
    email: snapshot.email ?? "",
    phone: snapshot.phone ?? "",
    facebookProfile: snapshot.facebookProfile ?? "",
    instagramProfile: snapshot.instagramProfile ?? "",
    gender: snapshot.gender ?? null,
    dateOfBirth: snapshot.dateOfBirth ?? null,
    declaredAge:
      typeof snapshot.declaredAge === "number" ? snapshot.declaredAge : null,
  };
}

export async function finalizeOrderFromPayment(input: {
  orderId?: string | null;
  paymentIntentId: string;
  checkoutSessionId?: string | null;
}): Promise<FinalizeOrderResult> {
  if (!input.paymentIntentId || !input.paymentIntentId.trim()) {
    return {
      ok: false,
      status: 400,
      error: "Missing paymentIntentId.",
    };
  }

  const mongooseConn = await connectDB();
  const dbSession = await mongooseConn.startSession();

  let result: FinalizeOrderResult = {
    ok: false,
    status: 500,
    error: "Unknown finalization error.",
  };

  try {
    await dbSession.withTransaction(async () => {
      const order = isObjectId(input.orderId ?? null)
        ? await Order.findById(input.orderId).session(dbSession)
        : await Order.findOne({
            paymentIntentId: input.paymentIntentId,
          }).session(dbSession);

      if (!order) {
        result = {
          ok: false,
          status: 404,
          error: "Order not found.",
        };
        return;
      }

      if (
        order.status === "paid" &&
        Array.isArray(order.ticketIds) &&
        order.ticketIds.length > 0
      ) {
        result = {
          ok: true,
          orderId: String(order._id),
          paymentIntentId: input.paymentIntentId,
          ticketIds: order.ticketIds.map((id) => String(id)),
          alreadyFinalized: true,
        };
        return;
      }

      if (
        order.status === "cancelled" ||
        order.status === "refunded" ||
        order.status === "expired"
      ) {
        result = {
          ok: false,
          status: 409,
          error: `Order cannot be finalized from status "${order.status}".`,
        };
        return;
      }

      if (!Array.isArray(order.items) || order.items.length === 0) {
        result = {
          ok: false,
          status: 409,
          error: "Order has no line items.",
        };
        return;
      }

      const expectedTicketTypeIds = order.items.map(
        (item) => item.ticketTypeId,
      );

      const existingTicketTypes = await TicketType.find({
        _id: { $in: expectedTicketTypeIds },
        eventId: order.eventId,
      })
        .select("_id")
        .session(dbSession)
        .lean<Array<{ _id: Types.ObjectId }>>();

      if (existingTicketTypes.length !== expectedTicketTypeIds.length) {
        result = {
          ok: false,
          status: 409,
          error: "One or more order ticket types no longer exist.",
        };
        return;
      }

      const holderSnapshot = buildTicketHolderSnapshot({
        userId: order.userId,
        buyerSnapshot: order.buyerSnapshot ?? null,
      });

      const ticketsToInsert: Array<Record<string, unknown>> = [];

      for (const item of order.items) {
        for (let i = 0; i < item.qty; i += 1) {
          ticketsToInsert.push({
            organizationId: order.organizationId,
            eventId: order.eventId,
            ownerId: order.userId,
            orderId: order._id,
            orderNumber: null,
            ticketType: item.ticketTypeLabel || "general",
            ticketTypeId: item.ticketTypeId,
            ticketTypeLabel: item.ticketTypeLabel || "",
            price: item.unitPrice,
            currency: item.currency,
            status: "paid",
            qrCode: makeQrCodeValue(),
            tracking: order.tracking?.trackingLinkId
              ? {
                  trackingLinkId: order.tracking.trackingLinkId,
                  trackingCode: order.tracking.trackingCode || "",
                  trackingCreatorUserId:
                    order.tracking.trackingCreatorUserId ?? null,
                }
              : null,
            holderSnapshot,
          });
        }
      }

      const createdTickets = await Ticket.insertMany(ticketsToInsert, {
        session: dbSession,
        ordered: true,
      });

      if (!createdTickets.length) {
        result = {
          ok: false,
          status: 500,
          error: "Failed to create tickets.",
        };
        return;
      }

      const ticketTypeUpdates = order.items.map((item) => ({
        updateOne: {
          filter: { _id: item.ticketTypeId, eventId: order.eventId },
          update: { $inc: { soldCount: item.qty } },
        },
      }));

      if (ticketTypeUpdates.length > 0) {
        await TicketType.bulkWrite(ticketTypeUpdates, {
          session: dbSession,
          ordered: true,
        });
      }

      const totalTicketsSold = order.items.reduce(
        (sum, item) => sum + item.qty,
        0,
      );

      if (order.tracking?.trackingLinkId) {
        await TrackingLink.updateOne(
          { _id: order.tracking.trackingLinkId },
          {
            $inc: {
              ticketsSold: totalTicketsSold,
              /**
               * Business rule:
               * attribute ticket revenue (subtotal), not platform fees.
               */
              revenue: order.subtotal,
            },
          },
          { session: dbSession },
        );
      }

      order.ticketIds = createdTickets.map((ticket) => ticket._id);
      order.status = "paid";
      order.paymentIntentId = input.paymentIntentId;
      order.expiresAt = null;

      if (input.checkoutSessionId) {
        order.checkoutSessionId = input.checkoutSessionId;
      }

      await order.save({ session: dbSession });

      result = {
        ok: true,
        orderId: String(order._id),
        paymentIntentId: input.paymentIntentId,
        ticketIds: createdTickets.map((ticket) => String(ticket._id)),
        alreadyFinalized: false,
      };
    });
  } catch (error: unknown) {
    result = {
      ok: false,
      status: 500,
      error:
        error instanceof Error ? error.message : "Failed to finalize order.",
    };
  } finally {
    await dbSession.endSession();
  }

  return result;
}
