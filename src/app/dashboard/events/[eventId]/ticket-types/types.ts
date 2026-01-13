// src/app/dashboard/organizations/[id]/events/[eventId]/ticket-types/types.ts

export type TicketAvailabilityStatus =
  | "scheduled"
  | "on_sale"
  | "paused"
  | "sale_ended";

export type TicketTypeApi = {
  _id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  isFree: boolean;
  totalQuantity: number | null;
  soldCount?: number;
  availabilityStatus: TicketAvailabilityStatus;
};

export type TicketTypeRow = {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  sold: number;
  capacity: number | null;
  status: TicketAvailabilityStatus;
};

export type TicketTypeFormValues = {
  // General
  name: string;
  description: string;
  isFree: boolean;
  price: number;
  currency: string;
  feeMode: "pass_on" | "absorb";

  // Availability
  totalQuantity: number | null;
  unlimitedQuantity: boolean;
  minPerOrder: number | null;
  maxPerOrder: number | null;
  availabilityStatus: TicketAvailabilityStatus;
  salesStartAt: string | null;
  salesEndAt: string | null;
  accessMode: "public" | "password";
  password: string;

  // Checkout (mirrors design)
  requireFullName: boolean;
  requireEmail: boolean;
  requirePhone: boolean;
  requireFacebook: boolean;
  requireInstagram: boolean;
  requireGender: boolean;
  requireDob: boolean;
  requireAge: boolean;
  subjectToApproval: boolean;
  addBuyerDetailsToOrder: boolean;
  addPurchasedTicketsToAttendeesCount: boolean;
  enableEmailAttachments: boolean;

  // Design
  layout: "horizontal" | "vertical" | "down" | "up";
  brandColor: string;
  logoUrl: string;
  backgroundUrl: string;
  footerText: string;

  watermarkEnabled: boolean;
  eventInfoEnabled: boolean;
  logoEnabled: boolean;
  qrSize: number;
  qrBorderRadius: number;
};
