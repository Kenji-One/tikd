export type Currency = "USD" | "EUR" | "GBP" | string;

export interface CartItem {
  /** Stable key: eventId + ticketTypeId */
  key: string;
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
  /** "flat" in the currency of the cart or "percent" off subtotal */
  kind: "flat" | "percent";
  value: number; // flat amount or percent (0..100)
}

export interface CartState {
  items: CartItem[];
  coupon?: Coupon;
}
