// src/app/api/events/[id]/ticket-types/schema.ts
import { z } from "zod";

const checkoutSchema = z.object({
  requireFullName: z.boolean(),

  requireEmail: z.boolean(),
  requirePhone: z.boolean(),
  requireFacebook: z.boolean(),
  requireInstagram: z.boolean(),
  requireGender: z.boolean(),
  requireDob: z.boolean(),
  requireAge: z.boolean(),

  subjectToApproval: z.boolean(),

  addBuyerDetailsToOrder: z.boolean(),
  addPurchasedTicketsToAttendeesCount: z.boolean(),

  enableEmailAttachments: z.boolean(),
});

const designSchema = z.object({
  layout: z.enum(["horizontal", "vertical", "down", "up"]),
  brandColor: z.string(),
  logoUrl: z.string().optional(),
  backgroundUrl: z.string().optional(),
  footerText: z.string().optional(),

  watermarkEnabled: z.boolean(),
  eventInfoEnabled: z.boolean(),
  logoEnabled: z.boolean(),
  qrSize: z.number(),
  qrBorderRadius: z.number(),
});

export const ticketTypeBodySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(""),

  price: z.number().min(0),
  currency: z.string().min(3).max(3).default("USD"),
  feeMode: z.enum(["pass_on", "absorb"]).default("pass_on"),
  isFree: z.boolean().default(false),

  totalQuantity: z.number().int().min(0).nullable().optional(),
  minPerOrder: z.number().int().min(0).nullable().optional(),
  maxPerOrder: z.number().int().min(0).nullable().optional(),

  availabilityStatus: z
    .enum(["scheduled", "on_sale", "paused", "sale_ended"])
    .default("on_sale"),
  salesStartAt: z.string().nullable().optional(),
  salesEndAt: z.string().nullable().optional(),

  /**
   * UI uses:
   * - public
   * - restricted (link-only)
   * - password
   */
  accessMode: z.enum(["public", "restricted", "password"]).default("public"),
  password: z.string().optional().or(z.literal("")),

  checkout: checkoutSchema.default({
    requireFullName: true,

    requireEmail: true,
    requirePhone: false,
    requireFacebook: false,
    requireInstagram: false,
    requireGender: false,
    requireDob: false,
    requireAge: false,

    subjectToApproval: false,

    addBuyerDetailsToOrder: true,
    addPurchasedTicketsToAttendeesCount: true,

    enableEmailAttachments: true,
  }),

  design: designSchema.default({
    layout: "horizontal",
    brandColor: "#9a46ff",
    logoUrl: "",
    backgroundUrl: "",
    footerText: "",

    watermarkEnabled: true,
    eventInfoEnabled: true,
    logoEnabled: false,
    qrSize: 0,
    qrBorderRadius: 0,
  }),
});
