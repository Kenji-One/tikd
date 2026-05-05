import type { CheckoutRequirementsSnapshot } from "@/types/checkout";

export type Currency = "USD" | "EUR" | "GBP" | "GEL" | string;

export interface CartItem {
  /**
   * Stable key: eventId + ticketTypeId
   */
  key: string;

  /**
   * IMPORTANT:
   * Cart is event-scoped.
   * All items in a single checkout must belong to the same event.
   */
  eventId: string;
  eventTitle: string;

  ticketTypeId: string;
  ticketLabel: string;

  unitPrice: number;
  currency: Currency;

  image?: string;
  qty: number;

  /**
   * Lightweight client-side checkout requirement snapshot used to render the
   * checkout form immediately from cart state.
   *
   * IMPORTANT:
   * This is never authoritative for purchase validation.
   * The server must always re-read ticket types and re-resolve requirements.
   */
  checkoutRequirements: CheckoutRequirementsSnapshot;
}

export interface Coupon {
  code: string;
  label: string;

  /**
   * "flat" is in the currency of the cart.
   * "percent" is a percent off subtotal.
   */
  kind: "flat" | "percent";
  value: number;
}

export interface CartState {
  items: CartItem[];
  coupon?: Coupon;
}
