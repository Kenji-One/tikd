// src/app/dashboard/events/[eventId]/ticket-types/TicketTypeDesignStep.tsx
"use client";

import { useRef, useState } from "react";
import type { TicketTypeFormValues } from "./types";
import type { UseFormRegister, UseFormSetValue } from "react-hook-form";

import clsx from "clsx";
import Toggle from "@/components/ui/Toggle";
import TicketPassCard, {
  type TicketPassDesign,
} from "@/components/ui/TicketPassCard";

type Props = {
  register: UseFormRegister<TicketTypeFormValues>;
  setValue: UseFormSetValue<TicketTypeFormValues>;
  eventId: string;
  ticketTypeId?: string;
  layout: TicketTypeFormValues["layout"];
  watermarkEnabled: boolean;
  eventInfoEnabled: boolean;
  logoEnabled: boolean;
  brandColor: string;
  qrSize: number;
  qrBorderRadius: number;
  footerText: string;
  name: string;
  logoUrl: string;
  backgroundUrl: string;
  /** Real event data coming from the opened event */
  eventTitle?: string;
  eventDate?: string; // ISO string from API
  eventLocation?: string;
  eventImageUrl?: string;
  serverError: string | null;
  onPrev: () => void;
  isSubmitting: boolean;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function isValidHexColor(value: string) {
  return /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(value);
}

export default function TicketTypeDesignStep({
  register,
  setValue,
  eventId,
  ticketTypeId,
  layout,
  watermarkEnabled,
  eventInfoEnabled,
  logoEnabled,
  brandColor,
  qrSize,
  qrBorderRadius,
  footerText,
  name,
  logoUrl,
  backgroundUrl,
  eventTitle,
  eventDate,
  eventLocation,
  eventImageUrl,
  serverError,
  onPrev,
  isSubmitting,
}: Props) {
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const backgroundInputRef = useRef<HTMLInputElement | null>(null);

  const [logoFileName, setLogoFileName] = useState<string>("");
  const [backgroundFileName, setBackgroundFileName] = useState<string>("");

  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBackground, setIsUploadingBackground] = useState(false);
  const [assetError, setAssetError] = useState<string | null>(null);

  const previewDesign: Partial<TicketPassDesign> = {
    layout,
    brandColor,
    logoUrl,
    backgroundUrl,
    footerText,
    watermarkEnabled,
    eventInfoEnabled,
    logoEnabled,
    qrSize,
    qrBorderRadius,
  };

  const commonInputClasses =
    "w-full rounded-lg border-none bg-neutral-900 px-3 py-2.5 text-sm text-neutral-0 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-primary-500";
  const commonButtonClasses =
    "inline-flex items-center justify-center gap-1.5 rounded-full border border-white/10 bg-neutral-800 px-6 py-3 text-sm font-medium text-neutral-0 hover:bg-neutral-700 transition-colors cursor-pointer";

  const draftKey =
    slugify(name || "untitled-ticket-type") || "untitled-ticket-type";
  const uploadScope = ticketTypeId ? ticketTypeId : `draft-${draftKey}`;
  const designUploadBase = `ticket-types/${eventId}/${uploadScope}`;

  async function uploadImage(params: {
    file: File;
    publicId: string;
    type: "logo" | "background";
  }) {
    const { file, publicId, type } = params;

    const setLoading =
      type === "logo" ? setIsUploadingLogo : setIsUploadingBackground;
    const setFileName =
      type === "logo" ? setLogoFileName : setBackgroundFileName;
    const fieldName = type === "logo" ? "logoUrl" : "backgroundUrl";

    setAssetError(null);
    setLoading(true);

    try {
      const qs = new URLSearchParams({
        public_id: publicId,
        overwrite: "1",
      }).toString();

      const signRes = await fetch(`/api/cloudinary/sign?${qs}`, {
        method: "GET",
      });

      if (!signRes.ok) {
        throw new Error("Failed to sign upload.");
      }

      const signJson = (await signRes.json()) as {
        timestamp: number;
        signature: string;
      };

      const form = new FormData();
      form.append("file", file);
      form.append("public_id", publicId);
      form.append("timestamp", String(signJson.timestamp));
      form.append("signature", signJson.signature);
      form.append(
        "api_key",
        process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY as string,
      );
      form.append("overwrite", "1");
      form.append("invalidate", "1");

      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

      const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        body: form,
      });

      if (!uploadRes.ok) {
        const text = await uploadRes.text().catch(() => "");
        throw new Error(text || "Cloudinary upload failed.");
      }

      const uploadJson = (await uploadRes.json()) as {
        secure_url?: string;
      };

      const uploadedUrl = String(uploadJson.secure_url || "").trim();

      if (!uploadedUrl) {
        throw new Error("Upload finished but no URL was returned.");
      }

      setValue(fieldName, uploadedUrl, { shouldDirty: true });
      setFileName(file.name);
    } catch (error: unknown) {
      setAssetError(
        error instanceof Error ? error.message : "Failed to upload image.",
      );
    } finally {
      setLoading(false);
    }
  }

  const renderPreviewInner = () => {
    return (
      <>
        <h3 className="text-2xl font-semibold text-neutral-0">
          Ticket Preview
        </h3>

        <div className="mt-3 rounded-xl bg-neutral-950 p-4 text-[13px] text-neutral-50">
          <TicketPassCard
            chrome="plain"
            className="mx-auto"
            design={previewDesign}
            eventTitle={eventTitle || "Event"}
            eventDateISO={eventDate}
            eventLocation={eventLocation || "Location TBA"}
            eventImageUrl={eventImageUrl}
            ticketTypeLabel={name || "Untitled ticket"}
          />
        </div>
      </>
    );
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-neutral-300">
        Customize the visual appearance of your ticket. Focus controls how the
        content sits inside the ticket, not the outer ticket size.
      </p>

      {/* Layout options - restored compact old design */}
      <div className="grid gap-2 sm:grid-cols-4">
        {(["horizontal", "vertical", "down", "up"] as const).map((value) => {
          const isActive = layout === value;

          return (
            <button
              key={value}
              type="button"
              onClick={() => setValue("layout", value, { shouldDirty: true })}
              className={clsx(
                "flex flex-col items-center justify-between gap-3 rounded-lg border px-2.5 py-3 text-xs capitalize transition-colors",
                "bg-neutral-900 text-neutral-0 cursor-pointer",
                isActive
                  ? "border-primary-500"
                  : "border-neutral-950 hover:border-primary-500",
              )}
            >
              <span
                className={clsx(
                  "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold",
                  isActive
                    ? "bg-primary-500 text-white"
                    : "bg-neutral-0 text-neutral-400",
                )}
              >
                {value === "horizontal"
                  ? "↔"
                  : value === "vertical"
                    ? "↕"
                    : value === "down"
                      ? "↓"
                      : "↑"}
              </span>

              <span>{`${value[0].toUpperCase()}${value.slice(1)} Focus`}</span>
            </button>
          );
        })}
      </div>

      {/* Watermark / event info / logo toggles */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between py-1">
          <span className="text-lg text-neutral-0">Watermark</span>
          <Toggle
            size="sm"
            checked={watermarkEnabled}
            onCheckedChange={(val) =>
              setValue("watermarkEnabled", Boolean(val), { shouldDirty: true })
            }
          />
        </div>

        <div className="flex items-center justify-between py-1">
          <span className="text-lg text-neutral-0">Event Info</span>
          <Toggle
            size="sm"
            checked={eventInfoEnabled}
            onCheckedChange={(val) =>
              setValue("eventInfoEnabled", Boolean(val), {
                shouldDirty: true,
              })
            }
          />
        </div>

        <div className="flex items-center justify-between py-1">
          <span className="text-lg text-neutral-0">Logo</span>
          <Toggle
            size="sm"
            checked={logoEnabled}
            onCheckedChange={(val) =>
              setValue("logoEnabled", Boolean(val), { shouldDirty: true })
            }
          />
        </div>
      </div>

      {/* LOGO upload - restored compact old design */}
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <input
          type="file"
          accept="image/*"
          ref={logoInputRef}
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0] ?? null;
            if (!file) return;

            await uploadImage({
              file,
              publicId: `${designUploadBase}/logo`,
              type: "logo",
            });

            e.currentTarget.value = "";
          }}
        />

        <button
          type="button"
          className="flex-1 rounded-lg border border-dashed border-primary-500 bg-neutral-900 px-4 py-3 text-left text-xs text-neutral-400"
          onClick={() => logoInputRef.current?.click()}
        >
          {isUploadingLogo
            ? "Uploading logo..."
            : logoFileName
              ? logoFileName
              : logoUrl
                ? "Logo uploaded"
                : "Choose a logo file or drag & drop it here"}
        </button>

        <button
          type="button"
          className={commonButtonClasses}
          onClick={() => logoInputRef.current?.click()}
          disabled={isUploadingLogo}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
          >
            <path
              d="M8 4C8.13261 4 8.25979 4.05268 8.35355 4.14645C8.44732 4.24021 8.5 4.36739 8.5 4.5V7.5H11.5C11.6326 7.5 11.7598 7.55268 11.8536 7.64645C11.9473 7.74021 12 7.86739 12 8C12 8.13261 11.9473 8.25979 11.8536 8.35355C11.7598 8.44732 11.6326 8.5 11.5 8.5H8.5V11.5C8.5 11.6326 8.44732 11.7598 8.35355 11.8536C8.25979 11.9473 8.13261 12 8 12C7.86739 12 7.74021 11.9473 7.64645 11.8536C7.55268 11.7598 7.5 11.6326 7.5 11.5V8.5H4.5C4.36739 8.5 4.24021 8.44732 4.14645 8.35355C4.05268 8.25979 4 8.13261 4 8C4 7.86739 4.05268 7.74021 4.14645 7.64645C4.24021 7.55268 4.36739 7.5 4.5 7.5H7.5V4.5C7.5 4.36739 7.55268 4.24021 7.64645 4.14645C7.74021 4.05268 7.86739 4 8 4Z"
              fill="white"
            />
          </svg>
          Browse File
        </button>
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-white/10" />

      {/* QR code section */}
      <div className="space-y-4">
        <h3 className="text-2xl font-semibold text-neutral-0">QR Code</h3>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="block text-sm text-neutral-200">Size</label>
            <input
              {...register("qrSize", { valueAsNumber: true })}
              type="number"
              inputMode="numeric"
              className={commonInputClasses}
              placeholder="0"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm text-neutral-200">
              Border Radius
            </label>
            <input
              {...register("qrBorderRadius", { valueAsNumber: true })}
              type="number"
              inputMode="numeric"
              className={commonInputClasses}
              placeholder="0"
            />
          </div>
        </div>

        <div className="my-6 h-px w-full bg-white/10" />

        {/* Color */}
        <div className="space-y-1.5">
          <label className="block text-sm text-neutral-200">Color</label>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <input
              {...register("brandColor")}
              type="text"
              placeholder="Enter Hex Color Code"
              className={clsx(commonInputClasses, "flex-1")}
            />

            <button
              type="button"
              className={clsx(commonButtonClasses, "relative")}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
              >
                <path
                  d="M12.74 4.98015L10.3934 2.63349C8.2867 0.533487 7.18003 1.30682 5.8467 2.63349L2.07337 6.40682C1.3067 7.17349 0.886699 7.66682 0.733365 8.21349C0.733365 8.22015 0.726699 8.22015 0.726699 8.22015C0.726699 8.22682 0.726699 8.22682 0.726699 8.22682C0.726699 8.23349 0.726699 8.23349 0.726699 8.23349V8.25349C0.453365 9.22682 1.17337 10.0535 2.07337 10.9535L4.4267 13.2935C5.2667 14.1402 5.9467 14.6668 6.70003 14.6668C7.45336 14.6668 8.10003 14.1602 8.9667 13.2935L12.74 9.52682C13.0667 9.19349 13.3067 8.92015 13.4934 8.66015C13.4934 8.65349 13.4934 8.65349 13.4934 8.65349C13.4934 8.65349 13.4934 8.65349 13.5 8.65349C14.3534 7.46015 14.1267 6.36015 12.74 4.98015ZM12.0534 7.58015H12.0467C11.8467 7.53349 11.64 7.49349 11.4334 7.45349C11.42 7.45349 11.4067 7.44682 11.3867 7.44682C10.92 7.36015 10.4467 7.28682 9.9667 7.22682H9.94003C9.46003 7.16682 8.97336 7.12015 8.4867 7.09349H8.43336C8.0067 7.06682 7.57336 7.05349 7.1467 7.05349C6.6267 7.05349 6.1067 7.08015 5.59337 7.11349C5.5067 7.12015 5.4267 7.12682 5.3467 7.13349C4.96003 7.16015 4.57336 7.20015 4.19336 7.24682C4.0867 7.26015 3.9867 7.27349 3.8867 7.28682C3.50003 7.34682 3.12003 7.40682 2.74003 7.48015C2.65337 7.50015 2.57337 7.51349 2.4867 7.52682C2.45337 7.53349 2.41337 7.54015 2.38003 7.54682C2.50003 7.41349 2.64003 7.27349 2.79337 7.12015L6.56003 3.35349C7.77337 2.15349 8.1867 1.86682 9.68003 3.35349L12.02 5.70015C12.38 6.05349 12.62 6.35349 12.7667 6.61349C12.7667 6.61349 12.7667 6.62015 12.7734 6.62015C13.0534 7.10682 12.6 7.68682 12.0534 7.58015Z"
                  fill="#727293"
                />
                <path
                  d="M13.9667 11.2465C13.7134 10.9332 13.4934 10.6665 13 10.6665C12.5067 10.6665 12.2867 10.9332 12.04 11.2465C11.5067 11.9065 11.2667 12.6265 11.3534 13.3198C11.4534 14.1132 12.1334 14.6665 13 14.6665C13.8667 14.6665 14.5467 14.1132 14.6467 13.3132C14.7334 12.6198 14.5 11.9065 13.9667 11.2465Z"
                  fill="#727293"
                />
              </svg>
              Color Picker
              <input
                type="color"
                value={isValidHexColor(brandColor) ? brandColor : "#9a46ff"}
                onChange={(e) =>
                  setValue("brandColor", e.target.value, { shouldDirty: true })
                }
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                aria-label="Pick brand color"
              />
            </button>
          </div>
        </div>

        <p className="text-sm text-neutral-500">or</p>

        {/* BACKGROUND upload - restored compact old design */}
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <input
            type="file"
            accept="image/*"
            ref={backgroundInputRef}
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0] ?? null;
              if (!file) return;

              await uploadImage({
                file,
                publicId: `${designUploadBase}/background`,
                type: "background",
              });

              e.currentTarget.value = "";
            }}
          />

          <button
            type="button"
            className="flex-1 rounded-lg border border-dashed border-primary-500 bg-neutral-900 px-4 py-3 text-left text-xs text-neutral-400"
            onClick={() => backgroundInputRef.current?.click()}
          >
            {isUploadingBackground
              ? "Uploading background..."
              : backgroundFileName
                ? backgroundFileName
                : backgroundUrl
                  ? "Background uploaded"
                  : "Choose a background image file or drag & drop it here"}
          </button>

          <button
            type="button"
            className={commonButtonClasses}
            onClick={() => backgroundInputRef.current?.click()}
            disabled={isUploadingBackground}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
            >
              <path
                d="M8 4C8.13261 4 8.25979 4.05268 8.35355 4.14645C8.44732 4.24021 8.5 4.36739 8.5 4.5V7.5H11.5C11.6326 7.5 11.7598 7.55268 11.8536 7.64645C11.9473 7.74021 12 7.86739 12 8C12 8.13261 11.9473 8.25979 11.8536 8.35355C11.7598 8.44732 11.6326 8.5 11.5 8.5H8.5V11.5C8.5 11.6326 8.44732 11.7598 8.35355 11.8536C8.25979 11.9473 8.13261 12 8 12C7.86739 12 7.74021 11.9473 7.64645 11.8536C7.55268 11.7598 7.5 11.6326 7.5 11.5V8.5H4.5C4.36739 8.5 4.24021 8.44732 4.14645 8.35355C4.05268 8.25979 4 8.13261 4 8C4 7.86739 4.05268 7.74021 4.14645 7.64645C4.24021 7.55268 4.36739 7.5 4.5 7.5H7.5V4.5C7.5 4.36739 7.55268 4.24021 7.64645 4.14645C7.74021 4.05268 7.86739 4 8 4Z"
                fill="white"
              />
            </svg>
            Browse File
          </button>
        </div>
      </div>

      <div className="h-px w-full bg-white/10" />

      {/* Bottom line */}
      <div className="space-y-1.5">
        <label className="block text-xs text-neutral-100">Bottom Line</label>
        <input
          {...register("footerText")}
          type="text"
          placeholder="Enter text"
          className={commonInputClasses}
        />
      </div>

      {assetError ? (
        <p className="text-center text-sm text-error-400">{assetError}</p>
      ) : null}

      {/* Ticket Preview - inline for smaller screens */}
      <div className="space-y-2.5 2xl:hidden">{renderPreviewInner()}</div>

      {/* Navigation + errors */}
      <div className="mt-6 flex items-center justify-end gap-4">
        <button
          type="button"
          onClick={onPrev}
          className="rounded-full bg-white px-6 py-3 font-medium text-neutral-950 hover:bg-neutral-100 cursor-pointer"
        >
          Go back
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-full bg-primary-500 border border-[#FFFFFF1A] px-6 py-3 text-white font-medium hover:bg-primary-400 disabled:opacity-60 cursor-pointer transition-colors"
        >
          {isSubmitting ? "Saving…" : "Complete"}
        </button>
      </div>

      {serverError && (
        <p className="text-center text-sm text-error-400">{serverError}</p>
      )}

      {/* Ticket Preview - fixed for big screens */}
      <div className="pointer-events-none fixed right-6 top-6 z-[60] hidden 2xl:block">
        <div className="pointer-events-auto w-[360px] space-y-2.5">
          {renderPreviewInner()}
        </div>
      </div>
    </div>
  );
}
