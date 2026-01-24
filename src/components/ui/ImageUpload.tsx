// src/components/ui/ImageUpload.tsx
"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import clsx from "clsx";

type Sizing = "small" | "avatar" | "normal" | "big" | "full" | "square";

type Props = {
  /** Current image URL coming from the form */
  value?: string;
  /** Called with the new URL after successful upload */
  onChange: (url: string) => void;
  /** Optional label shown above the uploader */
  label?: string;
  /** Deterministic Cloudinary public_id, e.g. "events/123/poster"
   *  • Pass the same id again when user edits to overwrite the file.
   *  • If omitted, a random id will be generated.
   */
  publicId?: string;
  /** Size preset for the uploader */
  sizing?: Sizing; // "avatar" | "normal" | "big"
  /** Optional extra className on the outer wrapper */
  className?: string;
};

export default function ImageUpload({
  value,
  onChange,
  label,
  publicId,
  sizing = "normal",
  className,
}: Props) {
  const [preview, setPreview] = useState<string | undefined>(value);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSelect = () => fileInputRef.current?.click();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);

    try {
      const id = publicId ?? `uploads/${crypto.randomUUID()}`;

      const params = new URLSearchParams({
        public_id: id,
        overwrite: "1",
      }).toString();

      const { timestamp, signature } = await fetch(
        `/api/cloudinary/sign?${params}`,
      ).then((r) => r.json());

      const form = new FormData();
      form.append("file", file);
      form.append("public_id", id);
      form.append("timestamp", String(timestamp));
      form.append("signature", signature);
      form.append(
        "api_key",
        process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY as string,
      );
      form.append("overwrite", "1");
      form.append("invalidate", "1");

      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

      const res = await fetch(uploadUrl, { method: "POST", body: form });
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Cloudinary upload failed:", errorText);
        setLoading(false);
        return;
      }

      const json = await res.json();
      setPreview(json.secure_url);
      onChange(json.secure_url);
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setLoading(false);
    }
  };

  /* -------------------------------- Variants -------------------------------- */
  const variant = (() => {
    switch (sizing) {
      case "small":
        return {
          label: "text-[10px] text-white/80",
          box: "relative h-10 w-10 rounded-full overflow-hidden border border-white/10 ",
          img: "object-cover rounded-full",
          button:
            "h-14 w-14 rounded-full border border-dashed border-white/30 hover:border-primary-500 text-white/80 hover:bg-white/10",
          wrapper: "inline-flex flex-col gap-2",
        };
      case "avatar":
        return {
          label: "text-xs text-white/80",
          box: "relative h-20 w-20 rounded-full overflow-hidden border border-white/10",
          img: "object-cover rounded-full",
          button:
            "h-20 w-20 rounded-full border border-dashed border-white/30 text-white/80 hover:bg-white/10",
          wrapper: "inline-flex flex-col gap-2",
        };
      case "square":
        return {
          label: "text-xs text-white/80",
          box: "relative h-20 w-20 rounded-full overflow-hidden border border-white/10",
          img: "object-cover rounded-full",
          button:
            "h-20 w-20 rounded-xl border border-dashed border-white/30 text-white/80 hover:bg-white/10",
          wrapper: "inline-flex flex-col gap-2",
        };
      case "big":
        return {
          label: "text-sm text-white",
          box: "relative h-64 w-full rounded-xl overflow-hidden",
          img: "object-cover rounded-xl",
          button:
            "flex h-64 w-full items-center justify-center rounded-xl border border-dashed border-white/30 text-white/80 hover:bg-white/10",
          wrapper: "space-y-2",
        };
      case "full":
        return {
          label: "text-sm text-white",
          box: "relative h-full w-full rounded-xl overflow-hidden",
          img: "object-cover rounded-xl",
          button:
            "flex h-full w-full items-center justify-center rounded-xl border border-dashed border-white/30 text-white/80 hover:bg-white/10",
          wrapper: "space-y-2",
        };
      case "normal":
      default:
        return {
          label: "text-sm text-white",
          box: "relative h-40 w-full rounded-lg overflow-hidden",
          img: "object-cover rounded-lg",
          button:
            "flex h-40 w-full items-center justify-center rounded-lg border border-dashed border-white/30 text-white/80 hover:bg-white/10",
          wrapper: "space-y-2",
        };
    }
  })();

  return (
    <div className={clsx(variant.wrapper, className)}>
      {label && <p className={variant.label}>{label}</p>}

      {preview ? (
        <div
          className={clsx(variant.box, "cursor-pointer")}
          onClick={handleSelect}
        >
          <Image
            src={preview}
            alt="preview"
            fill
            sizes="100%"
            className={variant.img}
          />
          {loading && (
            <div className="absolute inset-0 grid place-items-center bg-black/40">
              <svg
                className="h-5 w-5 animate-spin text-white"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4A4 4 0 008 12H4z"
                />
              </svg>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={handleSelect}
          disabled={loading}
          className={clsx(variant.button, loading && "opacity-60")}
          aria-label="Upload image"
        >
          {loading ? "Uploading…" : "Click to upload"}
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
