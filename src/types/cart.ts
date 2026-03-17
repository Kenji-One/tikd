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
