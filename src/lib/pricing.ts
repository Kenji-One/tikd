import type { CartItem, Coupon } from "@/types/cart";

export type PriceBreakdown = {
  currency: string;
  subtotal: number;
  fees: number;
  discount: number;
  total: number;
  ticketCount: number;
  lines: { label: string; amount: number }[];
};

const SERVICE_FEE_PER_TICKET = 1.99; // demo
const round2 = (n: number) => Math.round(n * 100) / 100;

export function calcPrices(items: CartItem[], coupon?: Coupon): PriceBreakdown {
  if (items.length === 0) {
    return {
      currency: "USD",
      subtotal: 0,
      fees: 0,
      discount: 0,
      total: 0,
      ticketCount: 0,
      lines: [],
    };
  }

  const currency = items[0].currency;
  const subtotal = round2(
    items.reduce((sum, it) => sum + it.unitPrice * it.qty, 0)
  );

  const ticketCount = items.reduce((n, it) => n + it.qty, 0);
  const fees = round2(ticketCount * SERVICE_FEE_PER_TICKET);

  let discount = 0;
  if (coupon) {
    if (coupon.kind === "flat") discount = coupon.value;
    else discount = (subtotal * coupon.value) / 100;
  }
  discount = Math.min(round2(discount), subtotal); // never exceed subtotal

  const total = round2(Math.max(subtotal + fees - discount, 0));

  const lines = [
    {
      label: `${ticketCount} Ticket${ticketCount === 1 ? "" : "s"}`,
      amount: subtotal,
    },
  ];

  return { currency, subtotal, fees, discount, total, ticketCount, lines };
}
