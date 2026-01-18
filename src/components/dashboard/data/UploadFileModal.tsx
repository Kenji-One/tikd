/* ------------------------------------------------------------------ */
/*  src/components/dashboard/data/UploadFileModal.tsx                  */
/* ------------------------------------------------------------------ */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { X, Plus, Upload as UploadIcon, File as FileIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import LabelledInput from "@/components/ui/LabelledInput";

export type UploadFilePayload = {
  name: string;
  file: File;
};

type Props = {
  open: boolean;
  onOpenChange: (next: boolean) => void;

  /**
   * Called when user presses Upload and the form is valid.
   * For now we keep it as a stub hook — backend can be connected later.
   */
  onUpload?: (payload: UploadFilePayload) => Promise<void> | void;

  /** Optional constraints */
  accept?: string; // e.g. "image/*,.pdf"
  maxBytes?: number; // e.g. 10 * 1024 * 1024
};

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes)) return "";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  const kb = bytes / 1024;
  return `${kb.toFixed(0)} KB`;
}

export default function UploadFileModal({
  open,
  onOpenChange,
  onUpload,
  accept = "*",
  maxBytes = 15 * 1024 * 1024, // 15MB default safety
}: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");

  const canSubmit = useMemo(() => {
    if (!name.trim()) return false;
    if (!file) return false;
    if (file.size > maxBytes) return false;
    return true;
  }, [name, file, maxBytes]);

  function resetState() {
    setName("");
    setFile(null);
    setDragOver(false);
    setSubmitting(false);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  useEffect(() => {
    if (!open) resetState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close() {
    onOpenChange(false);
  }

  function pickFile() {
    fileInputRef.current?.click();
  }

  function handleFile(next: File | null) {
    setError("");
    if (!next) {
      setFile(null);
      return;
    }

    if (next.size > maxBytes) {
      setFile(null);
      setError(
        `File is too large. Max allowed is ${formatBytes(maxBytes)}. Your file is ${formatBytes(next.size)}.`,
      );
      return;
    }

    setFile(next);

    // If name is empty, auto-suggest from filename (without extension)
    if (!name.trim()) {
      const base = next.name.replace(/\.[^/.]+$/, "");
      setName(base);
    }
  }

  async function submit() {
    setError("");

    if (!canSubmit || !file) {
      if (!name.trim()) setError("Please enter a name.");
      else if (!file) setError("Please choose a file.");
      return;
    }

    try {
      setSubmitting(true);
      await onUpload?.({ name: name.trim(), file });
      onOpenChange(false);
    } catch (e: any) {
      setError(e?.message || "Upload failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
      aria-modal="true"
      role="dialog"
    >
      {/* backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        onClick={close}
        aria-label="Close"
      />

      {/* modal */}
      <div
        className={clsx(
          "relative w-full",
          "max-w-[592px]",
          "rounded-card border border-white/10",
          "bg-neutral-950/85 backdrop-blur-2xl",
          "shadow-[0_24px_90px_rgba(0,0,0,0.70),inset_0_1px_0_rgba(255,255,255,0.06)]",
          "overflow-hidden",
        )}
      >
        {/* header */}
        <div className="flex items-start justify-between px-8 pt-8">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.48px] text-neutral-0">
              Upload File
            </h2>
          </div>

          {/* ✅ X button styling as requested */}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#181828] text-neutral-400 hover:text-neutral-50"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* content */}
        <div className="px-8 pb-8 pt-6">
          {/* ✅ Name input using LabelledInput */}
          <LabelledInput
            id="upload-file-name"
            label="Name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError("");
            }}
            placeholder="Enter text"
            size="md"
            variant="full"
            error={error && !name.trim() ? error : null}
          />

          {/* Upload area */}
          <div className="mt-6 font-medium text-neutral-0">
            Add Event Poster
          </div>

          <div className="mt-2 flex items-center gap-2">
            {/* Dropzone */}
            <div
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragOver(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragOver(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragOver(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragOver(false);
                const f = e.dataTransfer?.files?.[0] ?? null;
                handleFile(f);
              }}
              className={clsx(
                "flex-1",
                // ✅ border radius lg for upload input
                "rounded-lg",
                "border border-dashed",
                dragOver
                  ? "border-primary-500 bg-primary-950/25"
                  : "border-primary-500/90 bg-neutral-900/35",
                "px-4 py-3.5",
                "font-medium text-neutral-300",
                "grid place-items-center",
                "transition",
              )}
            >
              <div className="flex items-center gap-2 text-neutral-300">
                <span className="opacity-90">
                  Choose a file or drag & drop it here
                </span>
              </div>

              {/* hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  handleFile(f);
                }}
              />
            </div>

            {/* Browse button */}
            <Button
              type="button"
              variant="social"
              size="md"
              className={clsx("min-w-[160px]")}
              onClick={pickFile}
              icon={
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
              }
            >
              Browse File
            </Button>
          </div>

          {/* Selected file row */}
          {file ? (
            <div className="mt-6 min-h-[22px]">
              <div className="flex items-center gap-2 text-[13px] text-neutral-300">
                <FileIcon className="h-4 w-4 text-neutral-400" />
                <span className="truncate">{file.name}</span>
                <span className="text-neutral-500">•</span>
                <span className="text-neutral-400">
                  {formatBytes(file.size)}
                </span>
              </div>
            </div>
          ) : null}

          {/* Error (file / generic) */}
          {error && (name.trim() ? true : false) ? (
            <div className="mt-3 text-[13px] font-medium text-error-400">
              {error}
            </div>
          ) : null}

          {/* Footer actions */}
          <div className="mt-6 flex items-center justify-end">
            <Button
              type="button"
              variant="brand"
              size="md"
              animation
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <path
                    d="M13.6667 6.79398H11.74C10.16 6.79398 8.87335 5.50732 8.87335 3.92732V2.00065C8.87335 1.63398 8.57335 1.33398 8.20669 1.33398H5.38002C3.32669 1.33398 1.66669 2.66732 1.66669 5.04732V10.954C1.66669 13.334 3.32669 14.6673 5.38002 14.6673H10.62C12.6734 14.6673 14.3334 13.334 14.3334 10.954V7.46065C14.3334 7.09398 14.0334 6.79398 13.6667 6.79398ZM7.68669 9.02065C7.58669 9.12065 7.46002 9.16732 7.33335 9.16732C7.20669 9.16732 7.08002 9.12065 6.98002 9.02065L6.50002 8.54065V11.334C6.50002 11.6073 6.27335 11.834 6.00002 11.834C5.72669 11.834 5.50002 11.6073 5.50002 11.334V8.54065L5.02002 9.02065C4.82669 9.21398 4.50669 9.21398 4.31335 9.02065C4.12002 8.82732 4.12002 8.50732 4.31335 8.31398L5.64669 6.98065C5.69335 6.94065 5.74002 6.90732 5.79335 6.88065C5.80669 6.87398 5.82669 6.86732 5.84002 6.86065C5.88002 6.84732 5.92002 6.84065 5.96669 6.83398C5.98669 6.83398 6.00002 6.83398 6.02002 6.83398C6.07335 6.83398 6.12669 6.84732 6.18002 6.86732C6.18669 6.86732 6.18669 6.86732 6.19335 6.86732C6.24669 6.88732 6.30002 6.92732 6.34002 6.96732C6.34669 6.97398 6.35335 6.97398 6.35335 6.98065L7.68669 8.31398C7.88002 8.50732 7.88002 8.82732 7.68669 9.02065Z"
                    fill="white"
                  />
                  <path
                    d="M11.62 5.87365C12.2533 5.88032 13.1333 5.88032 13.8867 5.88032C14.2667 5.88032 14.4667 5.43365 14.2 5.16699C13.24 4.20032 11.52 2.46032 10.5333 1.47365C10.26 1.20032 9.78668 1.38699 9.78668 1.76699V4.09365C9.78668 5.06699 10.6133 5.87365 11.62 5.87365Z"
                    fill="white"
                  />
                </svg>
              }
              disabled={!canSubmit || submitting}
              onClick={submit}
              className="rounded-full"
            >
              {submitting ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
