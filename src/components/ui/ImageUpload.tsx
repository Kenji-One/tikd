// src/components/ui/ImageUpload.tsx
"use client";

import { useRef, useState } from "react";
import Image from "next/image";

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
};

export default function ImageUpload({
  value,
  onChange,
  label,
  publicId,
}: Props) {
  const [preview, setPreview] = useState<string | undefined>(value);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSelect = () => fileInputRef.current?.click();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);

    const id = publicId ?? `uploads/${crypto.randomUUID()}`;

    const params = new URLSearchParams({
      public_id: id,
      overwrite: "1",
    }).toString();

    const { timestamp, signature } = await fetch(
      `/api/cloudinary/sign?${params}`
    ).then((r) => r.json());

    const form = new FormData();
    form.append("file", file);
    form.append("public_id", id);
    form.append("timestamp", String(timestamp));
    form.append("signature", signature);
    form.append(
      "api_key",
      process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY as string
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
    setLoading(false);
  };

  return (
    <div className="space-y-2">
      {label && <p className="text-sm text-white">{label}</p>}

      {preview ? (
        <div
          className="relative h-40 w-full cursor-pointer rounded-lg overflow-hidden"
          onClick={handleSelect}
        >
          <Image
            src={preview}
            alt="preview"
            fill
            sizes="100%"
            className="object-cover rounded-lg"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={handleSelect}
          disabled={loading}
          className="flex h-40 w-full items-center justify-center rounded-lg border border-dashed border-white/30 text-white hover:bg-white/10"
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
