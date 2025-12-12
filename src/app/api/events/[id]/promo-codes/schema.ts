import { z } from "zod";

export const promoBodySchema = z
  .object({
    name: z.string().min(1),
    description: z.string().optional().default(""),
    code: z.string().min(2).max(64),

    kind: z.enum(["discount", "special_access"]),

    discountMode: z.enum(["percentage", "amount"]).nullable().optional(),
    discountValue: z.number().min(0).nullable().optional(),

    overallItems: z.number().int().min(1).nullable().optional(),

    maxUses: z.number().int().min(1).nullable().optional(),
    isActive: z.boolean().default(true),

    validFrom: z.string().nullable().optional(),
    validUntil: z.string().nullable().optional(),

    applicableTicketTypeIds: z.array(z.string()).default([]),
  })
  .superRefine((data, ctx) => {
    if (data.kind === "discount") {
      if (data.discountValue == null || data.discountMode == null) {
        ctx.addIssue({
          path: ["discountValue"],
          code: z.ZodIssueCode.custom,
          message: "Discount value & mode are required for discounts.",
        });
      }

      if (
        data.discountMode === "percentage" &&
        data.discountValue != null &&
        (data.discountValue <= 0 || data.discountValue > 100)
      ) {
        ctx.addIssue({
          path: ["discountValue"],
          code: z.ZodIssueCode.custom,
          message: "Percentage discount must be between 0–100.",
        });
      }
    }
  });
