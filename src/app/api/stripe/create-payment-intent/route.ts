import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Types } from "mongoose";

import { stripe } from "@/lib/stripe";
import { connectDB } from "@/lib/db";
import { auth } from "@/lib/auth";
import { calcPrices } from "@/lib/pricing";
import { findCoupon } from "@/lib/coupons";
import {
  getTrackingAttributionFromRequest,
  isTrackingAttributionApplicableToEvent,
} from "@/lib/trackingAttribution";

import Event from "@/models/Event";
import TicketType from "@/models/TicketType";
import Order from "@/models/Order";
import User from "@/models/User";
import {
  CHECKOUT_GENDER_VALUES,
  CHECKOUT_REQUIREMENTS_DEFAULTS,
  type CheckoutGender,
  type CheckoutRequirementsSnapshot,
} from "@/types/checkout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "auto";
export const maxDuration = 15;

const CartItemSchema = z.object({
  key: z.string().trim().min(1).max(200),
  eventId: z.string().trim().length(24),
  eventTitle: z.string().trim().min(1).max(240),
  ticketTypeId: z.string().trim().length(24),
  ticketLabel: z.string().trim().min(1).max(160),
  unitPrice: z.number().finite().nonnegative(),
  currency: z.string().trim().min(3).max(8),
  image: z.string().trim().optional(),
  qty: z.number().int().min(1).max(20),
});

const BuyerProfileSchema = z.object({
  firstName: z.string().trim().max(120).default(""),
  lastName: z.string().trim().max(120).default(""),
  fullName: z.string().trim().max(240).default(""),
  email: z.string().trim().email().default(""),
  phone: z.string().trim().max(40).default(""),
  facebookProfile: z.string().trim().max(280).default(""),
  instagramProfile: z.string().trim().max(280).default(""),
  gender: z.enum(CHECKOUT_GENDER_VALUES).nullable().optional(),
  dateOfBirth: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  declaredAge: z.number().int().min(0).max(130).nullable().optional(),
});

const BodySchema = z.object({
  items: z.array(CartItemSchema).min(1).max(20),
  couponCode: z.string().trim().max(80).nullable().optional(),
  customerEmail: z.string().email().nullable().optional(),
  buyerProfile: BuyerProfileSchema,
  persistProfileDefaults: z.boolean().optional().default(false),
});

type AuthoritativeCartLine = {
  key: string;
  eventId: string;
  eventTitle: string;
  ticketTypeId: string;
  ticketLabel: string;
  unitPrice: number;
  currency: string;
  image?: string;
  qty: number;
  checkoutRequirements: CheckoutRequirementsSnapshot;
};

type EventLean = {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  title: string;
  status: "published" | "draft";
};

type TicketTypeLean = {
  _id: Types.ObjectId;
  eventId: Types.ObjectId;
  organizationId: Types.ObjectId;
  name: string;
  price: number;
  currency: string;
  soldCount: number;
  totalQuantity: number | null;
  minPerOrder: number | null;
  maxPerOrder: number | null;
  availabilityStatus: "scheduled" | "on_sale" | "paused" | "sale_ended";
  salesStartAt?: Date | null;
  salesEndAt?: Date | null;
  accessMode: "public" | "restricted" | "password";
  checkout?: Partial<CheckoutRequirementsSnapshot> | null;
};

type NormalizedBuyerProfile = {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  facebookProfile: string;
  instagramProfile: string;
  gender: CheckoutGender | null;
  dateOfBirth: Date | null;
  dateOfBirthInput: string | null;
  declaredAge: number | null;
};

const ORDER_PENDING_TTL_MS = 15 * 60 * 1000;

function buildPendingOrderExpiresAt(now: Date = new Date()): Date {
  return new Date(now.getTime() + ORDER_PENDING_TTL_MS);
}

function normalizeCurrencyCode(input: string): string {
  const raw = String(input || "")
    .trim()
    .toUpperCase();

  const map: Record<string, string> = {
    $: "USD",
    "€": "EUR",
    "£": "GBP",
    "¥": "JPY",
    "₩": "KRW",
    "₾": "GEL",
    A$: "AUD",
    C$: "CAD",
  };

  return map[raw] ?? raw;
}

function isOnSaleNow(
  ticketType: Pick<
    TicketTypeLean,
    "availabilityStatus" | "salesStartAt" | "salesEndAt"
  >,
  now: Date,
): boolean {
  if (ticketType.availabilityStatus !== "on_sale") return false;

  if (
    ticketType.salesStartAt &&
    ticketType.salesStartAt.getTime() > now.getTime()
  ) {
    return false;
  }

  if (
    ticketType.salesEndAt &&
    ticketType.salesEndAt.getTime() < now.getTime()
  ) {
    return false;
  }

  return true;
}

function normalizePhone(input: string): string {
  const raw = String(input || "").trim();
  const hasPlus = raw.startsWith("+");
  const digits = raw.replace(/[^\d]/g, "");

  if (!digits) return "";

  return hasPlus ? `+${digits}` : digits;
}

function isPhoneLike(input: string): boolean {
  const digits = normalizePhone(input).replace(/^\+/, "");
  return digits.length >= 7 && digits.length <= 15;
}

function normalizeCheckoutRequirements(
  value: Partial<CheckoutRequirementsSnapshot> | null | undefined,
): CheckoutRequirementsSnapshot {
  return {
    requireFullName:
      value?.requireFullName ?? CHECKOUT_REQUIREMENTS_DEFAULTS.requireFullName,

    requireEmail:
      value?.requireEmail ?? CHECKOUT_REQUIREMENTS_DEFAULTS.requireEmail,
    requirePhone:
      value?.requirePhone ?? CHECKOUT_REQUIREMENTS_DEFAULTS.requirePhone,
    requireFacebook:
      value?.requireFacebook ?? CHECKOUT_REQUIREMENTS_DEFAULTS.requireFacebook,
    requireInstagram:
      value?.requireInstagram ??
      CHECKOUT_REQUIREMENTS_DEFAULTS.requireInstagram,
    requireGender:
      value?.requireGender ?? CHECKOUT_REQUIREMENTS_DEFAULTS.requireGender,
    requireDob: value?.requireDob ?? CHECKOUT_REQUIREMENTS_DEFAULTS.requireDob,
    requireAge: value?.requireAge ?? CHECKOUT_REQUIREMENTS_DEFAULTS.requireAge,

    subjectToApproval:
      value?.subjectToApproval ??
      CHECKOUT_REQUIREMENTS_DEFAULTS.subjectToApproval,

    addBuyerDetailsToOrder:
      value?.addBuyerDetailsToOrder ??
      CHECKOUT_REQUIREMENTS_DEFAULTS.addBuyerDetailsToOrder,
    addPurchasedTicketsToAttendeesCount:
      value?.addPurchasedTicketsToAttendeesCount ??
      CHECKOUT_REQUIREMENTS_DEFAULTS.addPurchasedTicketsToAttendeesCount,

    enableEmailAttachments:
      value?.enableEmailAttachments ??
      CHECKOUT_REQUIREMENTS_DEFAULTS.enableEmailAttachments,
  };
}

function mergeCheckoutRequirements(
  items: CheckoutRequirementsSnapshot[],
): CheckoutRequirementsSnapshot {
  return items.reduce<CheckoutRequirementsSnapshot>(
    (acc, item) => ({
      requireFullName: acc.requireFullName || item.requireFullName,
      requireEmail: acc.requireEmail || item.requireEmail,
      requirePhone: acc.requirePhone || item.requirePhone,
      requireFacebook: acc.requireFacebook || item.requireFacebook,
      requireInstagram: acc.requireInstagram || item.requireInstagram,
      requireGender: acc.requireGender || item.requireGender,
      requireDob: acc.requireDob || item.requireDob,
      requireAge: acc.requireAge || item.requireAge,

      subjectToApproval: acc.subjectToApproval || item.subjectToApproval,

      addBuyerDetailsToOrder:
        acc.addBuyerDetailsToOrder || item.addBuyerDetailsToOrder,
      addPurchasedTicketsToAttendeesCount:
        acc.addPurchasedTicketsToAttendeesCount ||
        item.addPurchasedTicketsToAttendeesCount,

      enableEmailAttachments:
        acc.enableEmailAttachments || item.enableEmailAttachments,
    }),
    {
      requireFullName: false,
      requireEmail: false,
      requirePhone: false,
      requireFacebook: false,
      requireInstagram: false,
      requireGender: false,
      requireDob: false,
      requireAge: false,
      subjectToApproval: false,
      addBuyerDetailsToOrder:
        CHECKOUT_REQUIREMENTS_DEFAULTS.addBuyerDetailsToOrder,
      addPurchasedTicketsToAttendeesCount:
        CHECKOUT_REQUIREMENTS_DEFAULTS.addPurchasedTicketsToAttendeesCount,
      enableEmailAttachments:
        CHECKOUT_REQUIREMENTS_DEFAULTS.enableEmailAttachments,
    },
  );
}

function buildNormalizedBuyerProfile(input: {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  facebookProfile: string;
  instagramProfile: string;
  gender?: CheckoutGender | null;
  dateOfBirth?: string | null;
  declaredAge?: number | null;
  fallbackEmail?: string | null;
}): NormalizedBuyerProfile {
  const firstName = String(input.firstName || "").trim();
  const lastName = String(input.lastName || "").trim();

  const explicitFullName = String(input.fullName || "").trim();
  const fullName = explicitFullName || `${firstName} ${lastName}`.trim();

  const email = String(input.email || input.fallbackEmail || "")
    .trim()
    .toLowerCase();

  const phone = normalizePhone(input.phone);
  const facebookProfile = String(input.facebookProfile || "").trim();
  const instagramProfile = String(input.instagramProfile || "").trim();

  const dateOfBirthInput = String(input.dateOfBirth || "").trim() || null;
  const dateOfBirth =
    dateOfBirthInput !== null
      ? new Date(`${dateOfBirthInput}T00:00:00.000Z`)
      : null;

  return {
    firstName,
    lastName,
    fullName,
    email,
    phone,
    facebookProfile,
    instagramProfile,
    gender: input.gender ?? null,
    dateOfBirth:
      dateOfBirth instanceof Date && !Number.isNaN(dateOfBirth.getTime())
        ? dateOfBirth
        : null,
    dateOfBirthInput,
    declaredAge:
      typeof input.declaredAge === "number" &&
      Number.isInteger(input.declaredAge)
        ? input.declaredAge
        : null,
  };
}

function validateBuyerProfileAgainstRequirements(input: {
  buyerProfile: NormalizedBuyerProfile;
  requirements: CheckoutRequirementsSnapshot;
}): string | null {
  const { buyerProfile, requirements } = input;

  if (requirements.requireFullName) {
    if (
      !buyerProfile.firstName ||
      !buyerProfile.lastName ||
      !buyerProfile.fullName
    ) {
      return "Full name is required for the selected ticket type.";
    }
  }

  if (requirements.requireEmail && !buyerProfile.email) {
    return "Email is required for the selected ticket type.";
  }

  if (requirements.requirePhone) {
    if (!buyerProfile.phone || !isPhoneLike(buyerProfile.phone)) {
      return "A valid phone number is required for the selected ticket type.";
    }
  }

  if (requirements.requireFacebook && !buyerProfile.facebookProfile) {
    return "Facebook profile is required for the selected ticket type.";
  }

  if (requirements.requireInstagram && !buyerProfile.instagramProfile) {
    return "Instagram profile is required for the selected ticket type.";
  }

  if (requirements.requireGender && !buyerProfile.gender) {
    return "Gender is required for the selected ticket type.";
  }

  if (requirements.requireDob) {
    if (!buyerProfile.dateOfBirthInput || !buyerProfile.dateOfBirth) {
      return "Date of birth is required for the selected ticket type.";
    }

    if (buyerProfile.dateOfBirth.getTime() > Date.now()) {
      return "Date of birth cannot be in the future.";
    }
  }

  if (requirements.requireAge) {
    if (
      buyerProfile.declaredAge === null ||
      !Number.isInteger(buyerProfile.declaredAge) ||
      buyerProfile.declaredAge < 0 ||
      buyerProfile.declaredAge > 130
    ) {
      return "A valid age is required for the selected ticket type.";
    }
  }

  if (!buyerProfile.email) {
    return "Buyer email is required to continue checkout.";
  }

  return null;
}

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let bodyJson: unknown;
  try {
    bodyJson = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(bodyJson);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid checkout payload.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const {
    items,
    couponCode,
    customerEmail,
    buyerProfile: rawBuyerProfile,
    persistProfileDefaults,
  } = parsed.data;

  const distinctEventIds = Array.from(
    new Set(items.map((item) => item.eventId)),
  );

  if (distinctEventIds.length !== 1) {
    return NextResponse.json(
      { error: "Checkout must contain ticket types from a single event." },
      { status: 400 },
    );
  }

  const distinctTicketTypeIds = items.map((item) => item.ticketTypeId);
  const distinctTicketTypeIdSet = new Set(distinctTicketTypeIds);

  if (distinctTicketTypeIdSet.size !== distinctTicketTypeIds.length) {
    return NextResponse.json(
      { error: "Duplicate ticket types are not allowed in checkout." },
      { status: 400 },
    );
  }

  const distinctCurrencies = Array.from(
    new Set(items.map((item) => normalizeCurrencyCode(item.currency))),
  );

  if (distinctCurrencies.length !== 1) {
    return NextResponse.json(
      { error: "Mixed currencies are not supported." },
      { status: 400 },
    );
  }

  await connectDB();

  const eventId = distinctEventIds[0]!;
  const event = await Event.findById(eventId)
    .select("_id organizationId title status")
    .lean<EventLean | null>();

  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  if (event.status !== "published") {
    return NextResponse.json(
      { error: "This event is not available for checkout." },
      { status: 400 },
    );
  }

  const ticketTypes = await TicketType.find({
    _id: {
      $in: Array.from(distinctTicketTypeIdSet).map(
        (id) => new Types.ObjectId(id),
      ),
    },
    eventId: event._id,
  })
    .select(
      "_id eventId organizationId name price currency soldCount totalQuantity minPerOrder maxPerOrder availabilityStatus salesStartAt salesEndAt accessMode checkout",
    )
    .lean<TicketTypeLean[]>();

  if (ticketTypes.length !== distinctTicketTypeIdSet.size) {
    return NextResponse.json(
      { error: "One or more ticket types no longer exist." },
      { status: 404 },
    );
  }

  const ticketTypeById = new Map(
    ticketTypes.map((ticketType) => [String(ticketType._id), ticketType]),
  );

  const now = new Date();
  const authoritativeItems: AuthoritativeCartLine[] = [];
  const perTicketRequirements: CheckoutRequirementsSnapshot[] = [];

  for (const item of items) {
    const ticketType = ticketTypeById.get(item.ticketTypeId);

    if (!ticketType) {
      return NextResponse.json(
        { error: "Ticket type not found." },
        { status: 404 },
      );
    }

    if (ticketType.accessMode !== "public") {
      return NextResponse.json(
        {
          error: `Ticket type "${ticketType.name}" is not publicly purchasable.`,
        },
        { status: 403 },
      );
    }

    if (!isOnSaleNow(ticketType, now)) {
      return NextResponse.json(
        { error: `Ticket type "${ticketType.name}" is not currently on sale.` },
        { status: 409 },
      );
    }

    if (ticketType.minPerOrder !== null && item.qty < ticketType.minPerOrder) {
      return NextResponse.json(
        {
          error: `Minimum quantity for "${ticketType.name}" is ${ticketType.minPerOrder}.`,
        },
        { status: 400 },
      );
    }

    if (ticketType.maxPerOrder !== null && item.qty > ticketType.maxPerOrder) {
      return NextResponse.json(
        {
          error: `Maximum quantity for "${ticketType.name}" is ${ticketType.maxPerOrder}.`,
        },
        { status: 400 },
      );
    }

    if (ticketType.totalQuantity !== null) {
      const remaining = Math.max(
        ticketType.totalQuantity - ticketType.soldCount,
        0,
      );

      if (item.qty > remaining) {
        return NextResponse.json(
          {
            error: `Only ${remaining} ticket(s) remaining for "${ticketType.name}".`,
          },
          { status: 409 },
        );
      }
    }

    const authoritativePrice = Number(ticketType.price);
    const authoritativeCurrency = normalizeCurrencyCode(ticketType.currency);

    const clientPrice = Number(item.unitPrice);
    const clientCurrency = normalizeCurrencyCode(item.currency);

    if (
      authoritativePrice !== clientPrice ||
      authoritativeCurrency !== clientCurrency
    ) {
      return NextResponse.json(
        {
          error: `Ticket pricing changed for "${ticketType.name}". Please refresh and try again.`,
        },
        { status: 409 },
      );
    }

    const normalizedRequirements = normalizeCheckoutRequirements(
      ticketType.checkout,
    );

    authoritativeItems.push({
      key: item.key,
      eventId,
      eventTitle: event.title,
      ticketTypeId: String(ticketType._id),
      ticketLabel: ticketType.name,
      unitPrice: authoritativePrice,
      currency: authoritativeCurrency,
      image: item.image,
      qty: item.qty,
      checkoutRequirements: normalizedRequirements,
    });

    perTicketRequirements.push(normalizedRequirements);
  }

  const checkoutRequirementsSnapshot = mergeCheckoutRequirements(
    perTicketRequirements,
  );

  const normalizedBuyerProfile = buildNormalizedBuyerProfile({
    ...rawBuyerProfile,
    fallbackEmail: customerEmail || session.user.email || null,
  });

  const buyerProfileError = validateBuyerProfileAgainstRequirements({
    buyerProfile: normalizedBuyerProfile,
    requirements: checkoutRequirementsSnapshot,
  });

  if (buyerProfileError) {
    return NextResponse.json({ error: buyerProfileError }, { status: 400 });
  }

  const normalizedCouponCode = String(couponCode ?? "").trim();
  const coupon = normalizedCouponCode
    ? findCoupon(normalizedCouponCode)
    : undefined;

  if (normalizedCouponCode && !coupon) {
    return NextResponse.json(
      { error: "Invalid coupon code." },
      { status: 400 },
    );
  }

  const pricing = calcPrices(authoritativeItems, coupon);
  const amountInCents = Math.round(pricing.total * 100);

  if (!Number.isFinite(amountInCents) || amountInCents <= 0) {
    return NextResponse.json(
      { error: "Invalid checkout total." },
      { status: 400 },
    );
  }

  const attribution = await getTrackingAttributionFromRequest(req);
  const applicableAttribution = isTrackingAttributionApplicableToEvent({
    attribution,
    eventId: String(event._id),
    organizationId: String(event.organizationId),
  })
    ? attribution
    : null;

  const order = await Order.create({
    userId: new Types.ObjectId(session.user.id),
    organizationId: event.organizationId,
    eventId: event._id,
    ticketIds: [],
    items: authoritativeItems.map((item) => ({
      ticketTypeId: new Types.ObjectId(item.ticketTypeId),
      ticketTypeLabel: item.ticketLabel,
      unitPrice: item.unitPrice,
      qty: item.qty,
      currency: item.currency,
    })),
    buyerSnapshot: {
      userId: new Types.ObjectId(session.user.id),
      firstName: normalizedBuyerProfile.firstName,
      lastName: normalizedBuyerProfile.lastName,
      fullName: normalizedBuyerProfile.fullName,
      email: normalizedBuyerProfile.email,
      phone: normalizedBuyerProfile.phone,
      facebookProfile: normalizedBuyerProfile.facebookProfile,
      instagramProfile: normalizedBuyerProfile.instagramProfile,
      gender: normalizedBuyerProfile.gender,
      dateOfBirth: normalizedBuyerProfile.dateOfBirth,
      declaredAge: normalizedBuyerProfile.declaredAge,
    },
    checkoutRequirementsSnapshot,
    status: "pending",
    expiresAt: buildPendingOrderExpiresAt(),
    subtotal: pricing.subtotal,
    fees: pricing.fees,
    discount: pricing.discount,
    currency: pricing.currency,
    total: pricing.total,
    couponCode: coupon?.code ?? "",
    tracking: applicableAttribution
      ? {
          trackingLinkId: new Types.ObjectId(
            applicableAttribution.trackingLinkId,
          ),
          trackingCode: applicableAttribution.trackingCode,
          trackingCreatorUserId: new Types.ObjectId(
            applicableAttribution.trackingCreatorUserId,
          ),
          trackingOrganizationId: new Types.ObjectId(
            applicableAttribution.organizationId,
          ),
          trackingDestinationKind: applicableAttribution.destinationKind,
          trackingDestinationId: new Types.ObjectId(
            applicableAttribution.destinationId,
          ),
        }
      : null,
  });

  if (persistProfileDefaults) {
    await User.updateOne(
      { _id: new Types.ObjectId(session.user.id) },
      {
        $set: {
          firstName: normalizedBuyerProfile.firstName,
          lastName: normalizedBuyerProfile.lastName,
          phone: normalizedBuyerProfile.phone,
          instagram: normalizedBuyerProfile.instagramProfile,
          "checkoutProfile.facebookProfile":
            normalizedBuyerProfile.facebookProfile,
          "checkoutProfile.gender": normalizedBuyerProfile.gender,
          "checkoutProfile.dateOfBirth": normalizedBuyerProfile.dateOfBirth,
          "checkoutProfile.updatedAt": new Date(),
        },
      },
    );
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: pricing.currency.toLowerCase(),
      description: `Tixsy order for ${event.title}`,
      automatic_payment_methods: { enabled: true },
      receipt_email:
        normalizedBuyerProfile.email ||
        customerEmail ||
        session.user.email ||
        undefined,
      metadata: {
        orderId: String(order._id),
        eventId: String(event._id),
        organizationId: String(event.organizationId),
        userId: String(session.user.id),
      },
    });

    await Order.updateOne(
      { _id: order._id },
      { $set: { paymentIntentId: paymentIntent.id } },
    );

    return NextResponse.json(
      {
        clientSecret: paymentIntent.client_secret,
        orderId: String(order._id),
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    await Order.updateOne(
      { _id: order._id },
      {
        $set: {
          status: "cancelled",
          expiresAt: null,
        },
      },
    ).catch(() => {
      // best-effort cleanup only
    });
    const message =
      error instanceof Error
        ? error.message
        : "Unable to create payment intent.";

    return NextResponse.json(
      { error: message || "Unable to create payment intent." },
      { status: 500 },
    );
  }
}
