// src/components/features/settings/AvatarDialog.tsx
"use client";

import { Fragment, useMemo, useRef, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import Image from "next/image";
import { useSession } from "next-auth/react";
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
    [state]
  );

  function resetLocal() {
    setPreviewUrl("");
    setError(null);
    setState("idle");
  }

  function closeAll() {
    resetLocal();
    onClose();
  }

  function pickFile() {
    fileInputRef.current?.click();
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const f = e.target.files?.[0];
    if (!f) return;

    if (!/image\/(png|jpeg|svg\+xml)/.test(f.type)) {
      setError("Only PNG, JPG or SVG files are allowed.");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError("Max file size is 5MB.");
      return;
    }

    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
  }

  async function generateRandom() {
    // DiceBear through your /api/avatar route (SVG)
    setError(null);
    try {
      setState("uploading");
      const seed = `${username || "guest"}-${Date.now()}`;
      const svg = await fetch(
        `/api/avatar?seed=${encodeURIComponent(seed)}`
      ).then((r) => r.text());
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const dataUrl = await blobToDataUrl(blob);
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
        `/api/cloudinary/sign?public_id=${encodeURIComponent(publicId)}&overwrite=1`
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
        { method: "POST", body: form }
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

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={() => (disabled ? null : closeAll())}
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px]" />
        </Transition.Child>

        {/* Panel */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-y-2 scale-[0.98]"
              enterTo="opacity-100 translate-y-0 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0 scale-100"
              leaveTo="opacity-0 translate-y-2 scale-[0.98]"
            >
              <Dialog.Panel className="w-full max-w-md rounded-2xl border border-white/10 bg-surface p-5 ring-1 ring-white/10">
                <Dialog.Title className="text-lg font-semibold">
                  {" "}
                  {heading}{" "}
                </Dialog.Title>
                <p className="mt-1 text-sm text-white/70">
                  JPG/PNG/SVG, max 5MB. You can upload your own or generate a
                  random avatar.
                </p>

                {/* top row: current + preview */}
                <div className="mt-5 grid grid-cols-2 gap-4">
                  <Thumb title="Current">
                    {currentAvatar ? (
                      <Image
                        alt="Current avatar"
                        src={currentAvatar}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <FallbackInitial name={username} />
                    )}
                  </Thumb>

                  <Thumb title="Preview">
                    {previewUrl ? (
                      <Image
                        alt="Preview avatar"
                        src={previewUrl}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-xs text-white/40">
                        No file selected
                      </div>
                    )}
                  </Thumb>
                </div>

                {/* upload box */}
                <div
                  className="mt-4 cursor-pointer rounded-xl border border-dashed border-white/15 bg-white/5 p-4 text-sm text-white/80 hover:bg-white/[0.08]"
                  onClick={pickFile}
                >
                  <p className="font-medium">Upload</p>
                  <p className="text-xs text-white/60">
                    Choose file or drag & drop here
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml"
                    className="hidden"
                    onChange={onFileChange}
                  />
                </div>

                {/* actions */}
                {error && (
                  <p className="mt-3 text-xs text-error-500">{error}</p>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Button
                    onClick={saveUpload}
                    disabled={disabled || !previewUrl}
                    variant="brand"
                    size="sm"
                  >
                    Save Upload
                  </Button>
                  <Button
                    onClick={generateRandom}
                    disabled={disabled}
                    variant="secondary"
                    size="sm"
                  >
                    Use Random Avatar
                  </Button>

                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      onClick={removeAvatar}
                      disabled={disabled}
                      variant="destructive"
                      size="sm"
                    >
                      Remove
                    </Button>
                    <Button
                      onClick={closeAll}
                      disabled={disabled}
                      variant="ghost"
                      size="sm"
                    >
                      Close
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

/* ---------- helpers & tiny subcomponents ---------- */

function Thumb({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
      <p className="mb-2 text-xs font-medium text-white/70">{title}</p>
      <div className="relative w-28 h-28 mx-auto overflow-hidden rounded-full ring-1 ring-white/5">
        {children}
      </div>
    </div>
  );
}

function FallbackInitial({ name }: { name: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-xl bg-[conic-gradient(from_220deg_at_50%_50%,#6d28d9,#3b82f6,#111827)]">
      <span className="text-2xl font-semibold text-white">
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
