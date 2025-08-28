"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CartItem, CartState, Coupon } from "@/types/cart";
import { findCoupon } from "@/lib/coupons";

type Actions = {
  addItem: (payload: Omit<CartItem, "key">) => void;
  removeItem: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
  applyCoupon: (code: string) => { ok: boolean; coupon?: Coupon };
  clearCoupon: () => void;
};

export type CartStore = CartState & Actions;

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      coupon: undefined,

      addItem: (p) =>
        set((s) => {
          const key = `${p.eventId}:${p.ticketTypeId}`;
          const existing = s.items.find((i) => i.key === key);

          if (existing) {
            const increment = Math.max(1, Math.floor(p.qty ?? 1));
            return {
              items: s.items.map((i) =>
                i.key === key ? { ...i, qty: i.qty + increment } : i
              ),
            };
          }

          // Avoid duplicate "qty" property warnings by stripping it from the spread
          const { qty: rawQty = 1, ...rest } = p;
          const item: CartItem = {
            key,
            ...rest,
            qty: Math.max(1, Math.floor(rawQty)),
          };
          return { items: [...s.items, item] };
        }),

      removeItem: (key) =>
        set((s) => ({ items: s.items.filter((i) => i.key !== key) })),

      setQty: (key, qty) =>
        set((s) => ({
          items: s.items
            .map((i) =>
              i.key === key ? { ...i, qty: Math.max(0, Math.floor(qty)) } : i
            )
            .filter((i) => i.qty > 0),
        })),

      clear: () => set({ items: [], coupon: undefined }),

      applyCoupon: (code) => {
        const coupon = findCoupon(code);
        if (!coupon) return { ok: false as const };
        set({ coupon });
        return { ok: true as const, coupon };
      },

      clearCoupon: () => set({ coupon: undefined }),
    }),
    {
      name: "tikd-cart",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (s) => ({ items: s.items, coupon: s.coupon }),
    }
  )
);
