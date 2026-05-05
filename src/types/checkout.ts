export const CHECKOUT_GENDER_VALUES = [
  "male",
  "female",
  "non_binary",
  "other",
  "prefer_not_to_say",
] as const;

export type CheckoutGender = (typeof CHECKOUT_GENDER_VALUES)[number];

export const CHECKOUT_REQUIREMENTS_DEFAULTS = {
  requireFullName: true,

  requireEmail: true,
  requirePhone: false,
  requireFacebook: false,
  requireInstagram: false,
  requireGender: false,
  requireDob: false,
  requireAge: false,

  subjectToApproval: false,

  addBuyerDetailsToOrder: true,
  addPurchasedTicketsToAttendeesCount: true,

  enableEmailAttachments: true,
} as const;

export interface CheckoutRequirementsSnapshot {
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
}

export interface CheckoutPartyDetails {
  firstName?: string;
  lastName?: string;
  fullName?: string;

  email?: string;
  phone?: string;

  facebookProfile?: string;
  instagramProfile?: string;

  gender?: CheckoutGender | null;
  dateOfBirth?: Date | null;

  /**
   * Keep this only for immutable purchase snapshots.
   * User profile autofill should prefer dateOfBirth over age.
   */
  declaredAge?: number | null;
}

export interface UserCheckoutProfile {
  facebookProfile?: string;
  gender?: CheckoutGender | null;
  dateOfBirth?: Date | null;
  updatedAt?: Date | null;
}
