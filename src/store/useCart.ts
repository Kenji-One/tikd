"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CartItem, CartState, Coupon } from "@/types/cart";
import { findCoupon } from "@/lib/coupons";
import {
  CHECKOUT_REQUIREMENTS_DEFAULTS,
  type CheckoutRequirementsSnapshot,
} from "@/types/checkout";

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

function normalizeCheckoutRequirements(
  value: unknown,
): CheckoutRequirementsSnapshot {
  const record =
    value && typeof value === "object"
      ? (value as Partial<CheckoutRequirementsSnapshot>)
      : {};

  return {
    requireFullName:
      record.requireFullName ?? CHECKOUT_REQUIREMENTS_DEFAULTS.requireFullName,

    requireEmail:
      record.requireEmail ?? CHECKOUT_REQUIREMENTS_DEFAULTS.requireEmail,
    requirePhone:
      record.requirePhone ?? CHECKOUT_REQUIREMENTS_DEFAULTS.requirePhone,
    requireFacebook:
      record.requireFacebook ?? CHECKOUT_REQUIREMENTS_DEFAULTS.requireFacebook,
    requireInstagram:
      record.requireInstagram ??
      CHECKOUT_REQUIREMENTS_DEFAULTS.requireInstagram,
    requireGender:
      record.requireGender ?? CHECKOUT_REQUIREMENTS_DEFAULTS.requireGender,
    requireDob: record.requireDob ?? CHECKOUT_REQUIREMENTS_DEFAULTS.requireDob,
    requireAge: record.requireAge ?? CHECKOUT_REQUIREMENTS_DEFAULTS.requireAge,

    subjectToApproval:
      record.subjectToApproval ??
      CHECKOUT_REQUIREMENTS_DEFAULTS.subjectToApproval,

    addBuyerDetailsToOrder:
      record.addBuyerDetailsToOrder ??
      CHECKOUT_REQUIREMENTS_DEFAULTS.addBuyerDetailsToOrder,
    addPurchasedTicketsToAttendeesCount:
      record.addPurchasedTicketsToAttendeesCount ??
      CHECKOUT_REQUIREMENTS_DEFAULTS.addPurchasedTicketsToAttendeesCount,

    enableEmailAttachments:
      record.enableEmailAttachments ??
      CHECKOUT_REQUIREMENTS_DEFAULTS.enableEmailAttachments,
  };
}

function normalizeCartItem(input: unknown): CartItem | null {
  if (!input || typeof input !== "object") return null;

  const item = input as Partial<CartItem>;

  if (
    typeof item.eventId !== "string" ||
    typeof item.eventTitle !== "string" ||
    typeof item.ticketTypeId !== "string" ||
    typeof item.ticketLabel !== "string" ||
    typeof item.unitPrice !== "number" ||
    typeof item.currency !== "string"
  ) {
    return null;
  }

  const key =
    typeof item.key === "string" && item.key.trim()
      ? item.key
      : `${item.eventId}:${item.ticketTypeId}`;

  return {
    key,
    eventId: item.eventId,
    eventTitle: item.eventTitle,
    ticketTypeId: item.ticketTypeId,
    ticketLabel: item.ticketLabel,
    unitPrice: item.unitPrice,
    currency: item.currency,
    image: typeof item.image === "string" ? item.image : undefined,
    qty: normalizeQty(item.qty),
    checkoutRequirements: normalizeCheckoutRequirements(
      item.checkoutRequirements,
    ),
  };
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

          const normalizedPayload: Omit<CartItem, "key" | "qty"> & {
            qty: number;
          } = {
            ...payload,
            qty: nextQty,
            checkoutRequirements: normalizeCheckoutRequirements(
              payload.checkoutRequirements,
            ),
          };

          const existing = state.items.find((item) => item.key === key);
          if (existing) {
            return {
              items: state.items.map((item) =>
                item.key === key
                  ? {
                      ...item,
                      qty: item.qty + nextQty,
                      unitPrice: normalizedPayload.unitPrice,
                      currency: normalizedPayload.currency,
                      image: normalizedPayload.image,
                      ticketLabel: normalizedPayload.ticketLabel,
                      checkoutRequirements:
                        normalizedPayload.checkoutRequirements,
                    }
                  : item,
              ),
            };
          }

          const existingEventId = state.items[0]?.eventId ?? null;

          const { qty: _ignoredQty = 1, ...rest } = normalizedPayload;

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
      version: 3,
      partialize: (state) => ({
        items: state.items,
        coupon: state.coupon,
      }),
      migrate: (persistedState: unknown) => {
        const state =
          typeof persistedState === "object" && persistedState !== null
            ? (persistedState as Partial<CartState>)
            : {};

        const rawItems = Array.isArray(state.items) ? state.items : [];
        const items = rawItems
          .map((item) => normalizeCartItem(item))
          .filter((item): item is CartItem => item !== null);

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
