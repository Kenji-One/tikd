"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { Upload } from "lucide-react";
import clsx from "classnames";

import { Button } from "@/components/ui/Button";

/* ---------- env (public) ---------- */
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME as string;
const API_KEY = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY as string;

type Props = {
  open: boolean;
  onClose: () => void;
};

type UploadState = "idle" | "uploading" | "saving" | "removing";

export default function AvatarDialog({ open, onClose }: Props) {
  const { data: session, update } = useSession();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string>(""); // object URL or data URL
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [dragOver, setDragOver] = useState(false);

  const userId = session?.user?.id || "guest";
  const username = session?.user?.name || "guest";
  const currentAvatar = session?.user?.image || "";

  const disabled = state !== "idle";

  const heading = useMemo(
    () =>
      state === "removing"
        ? "Removing…"
        : state === "saving"
          ? "Saving…"
          : "Update Avatar",
    [state],
  );

  useEffect(() => {
    // reset local state when modal closes
    if (!open) {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
      setError(null);
      setState("idle");
      setDragOver(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function resetLocal() {
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setError(null);
    setState("idle");
    setDragOver(false);
  }

  function closeAll() {
    resetLocal();
    onClose();
  }

  function pickFile() {
    fileInputRef.current?.click();
  }

  function handleFile(file?: File | null) {
    setError(null);
    if (!file) return;

    if (!/image\/(png|jpeg|svg\+xml)/.test(file.type)) {
      // match HTML behavior: silent reject is ok, but we keep a friendly message
      setError("Only PNG, JPG or SVG files are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Max file size is 5MB.");
      return;
    }

    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    handleFile(f);
  }

  async function generateRandom() {
    // DiceBear through your /api/avatar route (SVG)
    setError(null);
    try {
      setState("uploading");
      const seed = `${username || "guest"}-${Date.now()}`;
      const svg = await fetch(
        `/api/avatar?seed=${encodeURIComponent(seed)}`,
      ).then((r) => r.text());
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const dataUrl = await blobToDataUrl(blob);

      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(dataUrl);

      setState("idle");
    } catch {
      setState("idle");
      setError("Couldn’t generate avatar. Try again.");
    }
  }

  async function saveUpload() {
    if (!previewUrl) {
      setError("Choose a file or generate an avatar first.");
      return;
    }

    try {
      setState("saving");
      const publicId = `users/${userId}/avatar`;

      const { signature, timestamp, overwrite, invalidate } = await fetch(
        `/api/cloudinary/sign?public_id=${encodeURIComponent(publicId)}&overwrite=1`,
      ).then((r) => r.json());

      const form = new FormData();
      form.append("file", await resolveToBlobOrFile(previewUrl));
      form.append("public_id", publicId);
      form.append("timestamp", String(timestamp));
      form.append("api_key", API_KEY);
      form.append("signature", signature);
      if (overwrite) form.append("overwrite", "1");
      if (invalidate) form.append("invalidate", "1");

      const cloudinaryResp = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
        { method: "POST", body: form },
      ).then((r) => r.json());

      if (!cloudinaryResp?.secure_url) {
        throw new Error("Upload failed");
      }

      const imageUrl: string = cloudinaryResp.secure_url as string;

      // persist in DB
      await fetch("/api/user/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      }).then((r) => {
        if (!r.ok) throw new Error("Save failed");
        return r.json();
      });

      // live session update (Auth.js/NextAuth)
      await update?.({ image: imageUrl });

      closeAll();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
      setState("idle");
    }
  }

  async function removeAvatar() {
    try {
      setState("removing");
      await fetch("/api/user/avatar", {
        method: "DELETE",
      }).then((r) => {
        if (!r.ok) throw new Error("Remove failed");
        return r.json();
      });

      await update?.({ image: "" }); // triggers jwt callback "update" branch
      closeAll();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Couldn’t remove avatar.";
      setError(message);
      setState("idle");
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    handleFile(f);
  }

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-[1000]"
        onClose={() => {
          if (!disabled) closeAll();
        }}
      >
        {/* Overlay */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-150"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-120"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/80 backdrop-blur-[8px]" />
        </Transition.Child>

        {/* Panel */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-[0.96]"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-[0.98]"
            >
              <Dialog.Panel
                className={clsx(
                  "w-full max-w-[520px] overflow-hidden rounded-[24px]",
                  "border border-white/10",
                  "bg-[linear-gradient(135deg,rgba(20,20,30,0.95)_0%,rgba(15,15,25,0.95)_100%)]",
                  "shadow-[0_20px_60px_rgba(0,0,0,0.50)]",
                )}
              >
                <div className="p-8">
                  <Dialog.Title className="text-[24px] font-semibold tracking-[-0.01em] text-neutral-0">
                    {heading}
                  </Dialog.Title>
                  <p className="mt-2 text-[13px] leading-relaxed text-white/60">
                    JPG/PNG/SVG, max 5MB. You can upload your own or generate a
                    random avatar.
                  </p>

                  {/* Current + Preview */}
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <AvatarBox title="CURRENT">
                      {currentAvatar ? (
                        <Image
                          alt="Current avatar"
                          src={currentAvatar}
                          fill
                          sizes="240px"
                          className="object-cover"
                        />
                      ) : (
                        <FallbackInitial name={username} />
                      )}
                    </AvatarBox>

                    <AvatarBox title="PREVIEW" dashed={!previewUrl}>
                      {previewUrl ? (
                        // next/image can work with blob/data in many setups; keep consistent with your code
                        <Image
                          alt="Preview avatar"
                          src={previewUrl}
                          fill
                          unoptimized
                          sizes="240px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-[13px] text-white/30">
                          No file selected
                        </div>
                      )}
                    </AvatarBox>
                  </div>

                  {/* Upload area (click + drag/drop) */}
                  <div
                    className={clsx(
                      "mt-5 rounded-xl border-2 border-dashed p-8 text-center transition",
                      dragOver
                        ? "border-primary-500/60 bg-primary-500/10"
                        : "border-white/15 bg-white/[0.02] hover:bg-white/[0.04] hover:border-primary-500/40",
                      disabled
                        ? "opacity-70 pointer-events-none"
                        : "cursor-pointer",
                    )}
                    role="button"
                    tabIndex={0}
                    onClick={pickFile}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        pickFile();
                      }
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (!disabled) setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={onDrop}
                    aria-label="Upload avatar"
                  >
                    <Upload className="mx-auto mb-2 h-8 w-8 text-white/70" />
                    <div className="text-[15px] font-semibold text-white">
                      Upload
                    </div>
                    <div className="mt-1 text-[13px] text-white/50">
                      Choose file or drag &amp; drop here
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml"
                      className="hidden"
                      onChange={onFileChange}
                    />
                  </div>

                  {/* Full-width Random button */}
                  <Button
                    onClick={generateRandom}
                    disabled={disabled}
                    variant="secondary"
                    size="md"
                    className={clsx(
                      "mt-4 w-full rounded-xl px-6 py-3 text-[14px] font-semibold",
                      "bg-white/5 border border-white/10 hover:bg-white/10",
                      "transition-all hover:-translate-y-[1px]",
                    )}
                  >
                    Use Random Avatar
                  </Button>

                  {/* Error */}
                  {error ? (
                    <p className="mt-4 text-[12px] leading-snug text-error-500">
                      {error}
                    </p>
                  ) : null}

                  {/* Footer actions */}
                  <div className="mt-6 flex gap-3 border-t border-white/10 pt-6">
                    <Button
                      onClick={removeAvatar}
                      disabled={disabled}
                      variant="destructive"
                      size="md"
                      className={clsx(
                        "flex-1 rounded-xl px-6 py-3 text-[14px] font-semibold",
                        "transition-all hover:-translate-y-[1px]",
                      )}
                    >
                      Remove
                    </Button>

                    <Button
                      onClick={saveUpload}
                      disabled={disabled || !previewUrl}
                      variant="brand"
                      size="md"
                      className={clsx(
                        "flex-1 rounded-xl px-6 py-3 text-[14px] font-semibold",
                        "bg-[linear-gradient(135deg,#7c3aed,#6366f1)] hover:bg-[linear-gradient(135deg,#7c3aed,#6366f1)]",
                        "shadow-[0_4px_20px_rgba(124,58,237,0.30)]",
                        "transition-all hover:-translate-y-[1px] hover:shadow-[0_6px_30px_rgba(124,58,237,0.40)]",
                      )}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

/* ---------- tiny subcomponents + helpers ---------- */

function AvatarBox({
  title,
  dashed,
  children,
}: {
  title: string;
  dashed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="text-[11px] font-semibold tracking-[0.08em] text-white/60">
        {title}
      </div>

      <div
        className={clsx(
          "mt-3 relative aspect-square w-full overflow-hidden rounded-xl",
          dashed
            ? "border-2 border-dashed border-white/10 bg-white/[0.03]"
            : "",
        )}
      >
        {children}
      </div>
    </div>
  );
}

function FallbackInitial({ name }: { name: string }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-[linear-gradient(135deg,#22d3ee,#6366f1)]">
      <span className="text-3xl font-semibold text-white">
        {name?.[0]?.toUpperCase() || "U"}
      </span>
    </div>
  );
}

async function blobToDataUrl(blob: Blob) {
  return await new Promise<string>((res, rej) => {
    const reader = new FileReader();
    reader.onloadend = () => res(reader.result as string);
    reader.onerror = rej;
    reader.readAsDataURL(blob);
  });
}

async function resolveToBlobOrFile(src: string) {
  // If src already a data URL or object URL, fetch as blob
  if (src.startsWith("data:") || src.startsWith("blob:")) {
    return await fetch(src).then((r) => r.blob());
  }
  // remote URL -> fetch -> blob
  return await fetch(src).then((r) => r.blob());
}
