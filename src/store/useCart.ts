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

function normalizeQty(value: number | undefined): number {
  return Math.max(1, Math.floor(value ?? 1));
}

export const useCart = create<CartStore>()(
  persist(
    (set) => ({
      items: [],
      coupon: undefined,

      addItem: (payload) =>
        set((state) => {
          const key = `${payload.eventId}:${payload.ticketTypeId}`;
          const nextQty = normalizeQty(payload.qty);

          const existing = state.items.find((item) => item.key === key);
          if (existing) {
            return {
              items: state.items.map((item) =>
                item.key === key ? { ...item, qty: item.qty + nextQty } : item,
              ),
            };
          }

          const existingEventId = state.items[0]?.eventId ?? null;

          const { qty: _ignoredQty = 1, ...rest } = payload;

          const nextItem: CartItem = {
            key,
            ...rest,
            qty: nextQty,
          };

          /**
           * IMPORTANT:
           * One checkout = one event.
           * If the user adds a ticket from a different event,
           * replace the previous cart contents.
           */
          if (existingEventId && existingEventId !== payload.eventId) {
            return {
              items: [nextItem],
              coupon: undefined,
            };
          }

          return {
            items: [...state.items, nextItem],
          };
        }),

      removeItem: (key) =>
        set((state) => {
          const nextItems = state.items.filter((item) => item.key !== key);

          return {
            items: nextItems,
            coupon: nextItems.length > 0 ? state.coupon : undefined,
          };
        }),

      setQty: (key, qty) =>
        set((state) => {
          const nextItems = state.items
            .map((item) =>
              item.key === key
                ? { ...item, qty: Math.max(0, Math.floor(qty)) }
                : item,
            )
            .filter((item) => item.qty > 0);

          return {
            items: nextItems,
            coupon: nextItems.length > 0 ? state.coupon : undefined,
          };
        }),

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
      version: 2,
      partialize: (state) => ({
        items: state.items,
        coupon: state.coupon,
      }),
      migrate: (persistedState: unknown) => {
        const state =
          typeof persistedState === "object" && persistedState !== null
            ? (persistedState as Partial<CartState>)
            : {};

        const items = Array.isArray(state.items) ? state.items : [];
        const coupon = state.coupon;

        if (items.length <= 1) {
          return {
            items,
            coupon,
          };
        }

        const firstEventId =
          typeof items[0]?.eventId === "string" ? items[0].eventId : null;

        if (!firstEventId) {
          return {
            items: [],
            coupon: undefined,
          };
        }

        const filtered = items.filter((item) => item.eventId === firstEventId);

        return {
          items: filtered,
          coupon,
        };
      },
    },
  ),
);
