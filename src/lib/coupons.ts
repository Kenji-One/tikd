import type { Coupon } from "@/types/cart";

const coupons: Record<string, Coupon> = {
  MAX25: { code: "MAX25", label: "Demo $4.99 off", kind: "flat", value: 4.99 },
  OFF10: { code: "OFF10", label: "10% off demo", kind: "percent", value: 10 },
};

export function findCoupon(code: string): Coupon | undefined {
  return coupons[code.trim().toUpperCase()];
}
