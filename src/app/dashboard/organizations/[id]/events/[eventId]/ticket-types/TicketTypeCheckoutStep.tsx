// src/app/dashboard/organizations/[id]/events/[eventId]/ticket-types/TicketTypeCheckoutStep.tsx
"use client";

import type { TicketTypeFormValues } from "./types";
import type { UseFormSetValue } from "react-hook-form";

import clsx from "clsx";
import { X } from "lucide-react";
import Toggle from "@/components/ui/Toggle";

type Props = {
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
  setValue: UseFormSetValue<TicketTypeFormValues>;
  onPrev: () => void;
  onNext: () => void;
};

export default function TicketTypeCheckoutStep({
  requireFullName,
  requireEmail,
  requirePhone,
  requireFacebook,
  requireInstagram,
  requireGender,
  requireDob,
  requireAge,
  subjectToApproval,
  addBuyerDetailsToOrder,
  addPurchasedTicketsToAttendeesCount,
  enableEmailAttachments,
  setValue,
  onPrev,
  onNext,
}: Props) {
  return (
    <div className="space-y-6 pb-4">
      {/* Intro text (title is in modal header) */}
      <p className="text-[11px] leading-relaxed text-neutral-300">
        Customize the checkout process by collecting the client details that
        best suit your needs. The more data collected – the more diverse your
        dashboard analytics become.
      </p>

      {/* Basic attendee details */}
      <div className="space-y-0.5">
        <div className="flex items-center justify-between py-1.5">
          <span className="text-sm text-neutral-0">Name</span>
          <Toggle
            size="sm"
            checked={requireFullName}
            onCheckedChange={(val) => setValue("requireFullName", Boolean(val))}
          />
        </div>

        <div className="flex items-center justify-between py-1.5">
          <span className="text-sm text-neutral-0">Email</span>
          <Toggle
            size="sm"
            checked={requireEmail}
            onCheckedChange={(val) => setValue("requireEmail", Boolean(val))}
          />
        </div>

        <div className="flex items-center justify-between py-1.5">
          <span className="text-sm text-neutral-0">Phone number</span>
          <Toggle
            size="sm"
            checked={requirePhone}
            onCheckedChange={(val) => setValue("requirePhone", Boolean(val))}
          />
        </div>

        <div className="flex items-center justify-between py-1.5">
          <span className="text-sm text-neutral-0">Link to Facebook</span>
          <Toggle
            size="sm"
            checked={requireFacebook}
            onCheckedChange={(val) => setValue("requireFacebook", Boolean(val))}
          />
        </div>

        <div className="flex items-center justify-between py-1.5">
          <span className="text-sm text-neutral-0">Instagram Profile</span>
          <Toggle
            size="sm"
            checked={requireInstagram}
            onCheckedChange={(val) =>
              setValue("requireInstagram", Boolean(val))
            }
          />
        </div>

        <div className="flex items-center justify-between py-1.5">
          <span className="text-sm text-neutral-0">Gender</span>
          <Toggle
            size="sm"
            checked={requireGender}
            onCheckedChange={(val) => setValue("requireGender", Boolean(val))}
          />
        </div>

        <div className="flex items-center justify-between py-1.5">
          <span className="text-sm text-neutral-0">Date of birth</span>
          <Toggle
            size="sm"
            checked={requireDob}
            onCheckedChange={(val) => setValue("requireDob", Boolean(val))}
          />
        </div>

        <div className="flex items-center justify-between py-1.5">
          <span className="text-sm text-neutral-0">Age</span>
          <Toggle
            size="sm"
            checked={requireAge}
            onCheckedChange={(val) => setValue("requireAge", Boolean(val))}
          />
        </div>

        <div className="mt-3 flex items-center justify-between rounded-2xl bg-[#11111b] px-3 py-2.5">
          <span className="text-xs text-neutral-0">Add your field</span>
          <button
            type="button"
            className="rounded-full border border-white/30 px-5 py-1 text-xs font-medium text-neutral-0 hover:border-primary-500"
          >
            Setup
          </button>
        </div>
      </div>

      {/* Checkout requirements (second block) */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-neutral-0">
          Checkout Requirments
        </h3>

        <div className="space-y-0.5">
          <div className="flex items-center justify-between py-1.5">
            <span className="text-xs text-neutral-0">Merge buyer details</span>
            <Toggle
              size="sm"
              checked={addBuyerDetailsToOrder}
              onCheckedChange={(val) =>
                setValue("addBuyerDetailsToOrder", Boolean(val))
              }
            />
          </div>

          <div className="flex items-center justify-between py-1.5">
            <span className="text-xs text-neutral-0">Subject to approval</span>
            <Toggle
              size="sm"
              checked={subjectToApproval}
              onCheckedChange={(val) =>
                setValue("subjectToApproval", Boolean(val))
              }
            />
          </div>

          <div className="flex items-center justify-between py-1.5">
            <span className="text-xs text-neutral-0">
              Add purchased tickets to attendees count
            </span>
            <Toggle
              size="sm"
              checked={addPurchasedTicketsToAttendeesCount}
              onCheckedChange={(val) =>
                setValue("addPurchasedTicketsToAttendeesCount", Boolean(val))
              }
            />
          </div>
        </div>
      </div>

      {/* Additional fee */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-neutral-0">Additional fee</h3>
        <div className="mt-1 flex items-center justify-between rounded-2xl bg-[#11111b] px-3 py-2.5">
          <span className="text-xs text-neutral-0">Add additional fee</span>
          <button
            type="button"
            className="rounded-full border border-white/30 px-5 py-1 text-xs font-medium text-neutral-0 hover:border-primary-500"
          >
            Setup
          </button>
        </div>
      </div>

      {/* Custom fields */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-neutral-0">Custom Fields</h3>
        <div className="mt-1 flex items-center justify-between rounded-2xl bg-[#11111b] px-3 py-2.5">
          <span className="text-xs text-neutral-0">Add Fields</span>
          <button
            type="button"
            className="rounded-full border border-white/30 px-5 py-1 text-xs font-medium text-neutral-0 hover:border-primary-500"
          >
            Setup
          </button>
        </div>
      </div>

      {/* Email attachments */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-neutral-0">
              Email Attachments
            </h3>
            <p className="mt-1 text-[11px] leading-relaxed text-neutral-300">
              Include files in email confirmations sent with a ticket purchase
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setValue("enableEmailAttachments", !enableEmailAttachments)
            }
            className={clsx(
              "mt-1 inline-flex h-7 w-7 items-center justify-center rounded-full border text-neutral-300 transition-colors",
              enableEmailAttachments
                ? "border-white/40 hover:border-primary-500 hover:text-primary-200"
                : "border-white/10 text-neutral-600 hover:border-white/30"
            )}
            title={
              enableEmailAttachments ? "Disable attachments" : "Enable again"
            }
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div
          className={clsx(
            "flex items-center justify-between rounded-2xl px-3 py-2.5",
            enableEmailAttachments ? "bg-[#11111b]" : "bg-[#090912]"
          )}
        >
          <span
            className={clsx(
              "text-xs",
              enableEmailAttachments ? "text-neutral-0" : "text-neutral-500"
            )}
          >
            Add Files
          </span>
          <button
            type="button"
            className={clsx(
              "rounded-full border px-5 py-1 text-xs font-medium",
              enableEmailAttachments
                ? "border-white/30 text-neutral-0 hover:border-primary-500"
                : "border-white/10 text-neutral-500"
            )}
          >
            Setup
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-4 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onPrev}
          className="rounded-full bg-neutral-50 px-6 py-1.5 text-xs font-medium text-neutral-950 hover:bg-white"
        >
          Go back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="rounded-full bg-primary-600 px-7 py-1.5 text-xs font-semibold text-white hover:bg-primary-500"
        >
          Next
        </button>
      </div>
    </div>
  );
}
