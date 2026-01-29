/* ------------------------------------------------------------------ */
/*  src/components/ui/ImagePositionEditorModal.tsx                     */
/* ------------------------------------------------------------------ */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import {
  isProbablyCloudinaryUrl,
  makeCloudinaryAssetUrl,
  makeCloudinaryCroppedUrl,
} from "@/lib/makeCroppedUrl";

export type ImageEditorMode = "banner" | "logo";

type OutSpec = { w: number; h: number; ratio: number };
type Size = { w: number; h: number };
type Box = { x: number; y: number; w: number; h: number };

type Props = {
  open: boolean;
  mode: ImageEditorMode;
  src: string;
  title: string;
  onClose: () => void;

  // ✅ allow async apply (we commit crop on server)
  onApply: (result: { cropUrl: string }) => void | Promise<void>;

  /** Optional override */
  out?: Partial<OutSpec>;
  /** Optional override */
  maxZoom?: number;
};

export default function ImagePositionEditorModal({
  open,
  mode,
  src,
  title,
  onClose,
  onApply,
  out: outOverride,
  maxZoom = 2.8,
}: Props) {
  const viewportRef = useRef<HTMLDivElement | null>(null);

  // preview element is different for banner vs logo, so use a callback ref
  const [previewEl, setPreviewEl] = useState<HTMLDivElement | null>(null);

  const out = useMemo<OutSpec>(() => {
    const base =
      mode === "banner"
        ? ({ w: 1600, h: 400, ratio: 4 / 1 } as OutSpec)
        : ({ w: 512, h: 512, ratio: 1 } as OutSpec);

    return {
      w: outOverride?.w ?? base.w,
      h: outOverride?.h ?? base.h,
      ratio: outOverride?.ratio ?? base.ratio,
    };
  }, [mode, outOverride?.w, outOverride?.h, outOverride?.ratio]);

  /**
   * 🔥 Critical: always edit the RAW asset (no existing transforms).
   */
  const assetSrc = useMemo(() => {
    const raw = makeCloudinaryAssetUrl(src);
    return raw ?? src;
  }, [src]);

  const [imgSize, setImgSize] = useState<Size | null>(null);
  const [vpSize, setVpSize] = useState<Size>({ w: 0, h: 0 });
  const [pvSize, setPvSize] = useState<Size>({ w: 0, h: 0 });

  const [zoom, setZoom] = useState(1.0);
  const [offset, setOffset] = useState({ x: 0, y: 0 }); // viewport px
  const [dragging, setDragging] = useState(false);

  const [applying, setApplying] = useState(false);

  const dragStart = useRef<{
    x: number;
    y: number;
    ox: number;
    oy: number;
  } | null>(null);

  const didInit = useRef(false);
  const prevVp = useRef<Size>({ w: 0, h: 0 });

  // Track viewport size (left editor)
  useEffect(() => {
    if (!open) return;

    const el = viewportRef.current;
    if (!el) return;

    const update = () => {
      setVpSize({ w: el.clientWidth || 0, h: el.clientHeight || 0 });
    };

    update();

    const ro = new ResizeObserver(() => update());
    ro.observe(el);

    return () => ro.disconnect();
  }, [open]);

  // Track preview box size (right preview)
  useEffect(() => {
    if (!open) return;
    if (!previewEl) return;

    const update = () => {
      setPvSize({
        w: previewEl.clientWidth || 0,
        h: previewEl.clientHeight || 0,
      });
    };

    update();

    const ro = new ResizeObserver(() => update());
    ro.observe(previewEl);

    return () => ro.disconnect();
  }, [open, previewEl]);

  // Load image natural dimensions + reset each open/src/mode
  useEffect(() => {
    if (!open) return;

    didInit.current = false;
    prevVp.current = { w: 0, h: 0 };

    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;

      setImgSize({ w: img.naturalWidth, h: img.naturalHeight });

      setZoom(1.0);
      setOffset({ x: 0, y: 0 });
      setDragging(false);
      dragStart.current = null;
    };
    img.src = assetSrc;

    return () => {
      cancelled = true;
    };
  }, [open, assetSrc, mode]);

  function getScale(forZoom = zoom) {
    if (!imgSize) return null;
    if (vpSize.w <= 0 || vpSize.h <= 0) return null;

    // cover
    const baseScale = Math.max(vpSize.w / imgSize.w, vpSize.h / imgSize.h);
    return baseScale * forZoom;
  }

  function clampOffset(next: { x: number; y: number }, forZoom = zoom) {
    if (!imgSize) return next;
    if (vpSize.w <= 0 || vpSize.h <= 0) return next;

    const s = getScale(forZoom);
    if (!s || s <= 0) return next;

    const renderedW = imgSize.w * s;
    const renderedH = imgSize.h * s;

    // If rendered smaller than viewport (rare), center it.
    const cx = (vpSize.w - renderedW) / 2;
    const cy = (vpSize.h - renderedH) / 2;

    const x =
      renderedW <= vpSize.w
        ? cx
        : Math.min(0, Math.max(vpSize.w - renderedW, next.x));

    const y =
      renderedH <= vpSize.h
        ? cy
        : Math.min(0, Math.max(vpSize.h - renderedH, next.y));

    return { x, y };
  }

  function centerImage(forZoom = zoom) {
    if (!imgSize) return;
    if (vpSize.w <= 0 || vpSize.h <= 0) return;

    const s = getScale(forZoom);
    if (!s || s <= 0) return;

    const renderedW = imgSize.w * s;
    const renderedH = imgSize.h * s;

    const next = {
      x: (vpSize.w - renderedW) / 2,
      y: (vpSize.h - renderedH) / 2,
    };

    setOffset(clampOffset(next, forZoom));
  }

  // Initialize centering ONCE when we have real sizes
  useEffect(() => {
    if (!open) return;
    if (!imgSize) return;
    if (vpSize.w <= 0 || vpSize.h <= 0) return;

    if (!didInit.current) {
      didInit.current = true;
      const raf = window.requestAnimationFrame(() => {
        centerImage(zoom);
        prevVp.current = { ...vpSize };
      });
      return () => window.cancelAnimationFrame(raf);
    }

    // Handle viewport resize (keep same image point under center)
    const prev = prevVp.current;
    if (
      prev.w > 0 &&
      prev.h > 0 &&
      (prev.w !== vpSize.w || prev.h !== vpSize.h)
    ) {
      const s = getScale(zoom);
      if (!s || s <= 0) {
        prevVp.current = { ...vpSize };
        return;
      }

      const prevCenter = { x: prev.w / 2, y: prev.h / 2 };
      const nextCenter = { x: vpSize.w / 2, y: vpSize.h / 2 };

      const ix = (prevCenter.x - offset.x) / s;
      const iy = (prevCenter.y - offset.y) / s;

      const nextOffset = {
        x: nextCenter.x - ix * s,
        y: nextCenter.y - iy * s,
      };

      setOffset(clampOffset(nextOffset, zoom));
      prevVp.current = { ...vpSize };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, imgSize?.w, imgSize?.h, vpSize.w, vpSize.h]);

  function onPointerDown(e: React.PointerEvent) {
    if (!imgSize) return;
    if (vpSize.w <= 0 || vpSize.h <= 0) return;

    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (e.isPrimary === false) return;

    e.preventDefault();
    e.stopPropagation();

    setDragging(true);

    try {
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      ox: offset.x,
      oy: offset.y,
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    const start = dragStart.current;
    if (!start) return;

    e.preventDefault();

    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;

    setOffset(() => clampOffset({ x: start.ox + dx, y: start.oy + dy }));
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!dragging) return;

    e.preventDefault();

    setDragging(false);
    dragStart.current = null;

    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }

  function handleZoom(nextZoom: number) {
    if (!imgSize || vpSize.w <= 0 || vpSize.h <= 0) {
      setZoom(nextZoom);
      return;
    }

    const s1 = getScale(zoom);
    const s2 = getScale(nextZoom);

    if (!s1 || !s2 || s1 <= 0 || s2 <= 0) {
      setZoom(nextZoom);
      return;
    }

    // Keep viewport center stable while zooming
    const center = { x: vpSize.w / 2, y: vpSize.h / 2 };

    const ix = (center.x - offset.x) / s1;
    const iy = (center.y - offset.y) / s1;

    const nextOffset = {
      x: center.x - ix * s2,
      y: center.y - iy * s2,
    };

    setZoom(nextZoom);
    setOffset(clampOffset(nextOffset, nextZoom));
  }

  function getCropBoxPx(): Box | null {
    if (vpSize.w <= 0 || vpSize.h <= 0) return null;

    // Banner uses full viewport.
    if (mode === "banner") {
      return { x: 0, y: 0, w: vpSize.w, h: vpSize.h };
    }

    // Logo: match the visual mask (72% of the viewport), centered.
    const MASK = 0.72;
    const size = Math.min(vpSize.w, vpSize.h) * MASK;

    return {
      x: (vpSize.w - size) / 2,
      y: (vpSize.h - size) / 2,
      w: size,
      h: size,
    };
  }

  function computeCrop(): {
    x: number;
    y: number;
    w: number;
    h: number;
  } | null {
    if (!imgSize) return null;
    if (vpSize.w <= 0 || vpSize.h <= 0) return null;

    const s = getScale(zoom);
    if (!s || s <= 0) return null;

    const box = getCropBoxPx();
    if (!box) return null;

    // imageCoord = (viewportCoord - offset) / scale
    const cropX = (box.x - offset.x) / s;
    const cropY = (box.y - offset.y) / s;
    const cropW = box.w / s;
    const cropH = box.h / s;

    const x = Math.max(0, Math.min(imgSize.w - cropW, cropX));
    const y = Math.max(0, Math.min(imgSize.h - cropH, cropY));

    return { x, y, w: cropW, h: cropH };
  }

  const crop = useMemo(
    () => computeCrop(),
    [
      mode,
      zoom,
      offset.x,
      offset.y,
      imgSize?.w,
      imgSize?.h,
      vpSize.w,
      vpSize.h,
    ],
  );

  const cropUrl = useMemo(() => {
    if (!crop) return assetSrc;
    if (!isProbablyCloudinaryUrl(assetSrc)) return assetSrc;

    return makeCloudinaryCroppedUrl({
      originalUrl: assetSrc,
      cropX: crop.x,
      cropY: crop.y,
      cropW: crop.w,
      cropH: crop.h,
      outW: out.w,
      outH: out.h,
    });
  }, [assetSrc, crop, out.w, out.h]);

  // Local preview transform (always accurate, no caching issues)
  const previewTransform = useMemo(() => {
    if (!crop) return null;
    if (!imgSize) return null;
    if (pvSize.w <= 0 || pvSize.h <= 0) return null;

    const scale = Math.max(pvSize.w / crop.w, pvSize.h / crop.h);
    const tx = -crop.x * scale;
    const ty = -crop.y * scale;

    return {
      transform: `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`,
      transformOrigin: "top left" as const,
    };
  }, [crop, imgSize, pvSize.w, pvSize.h]);

  async function apply() {
    setApplying(true);
    try {
      await onApply({ cropUrl });
    } finally {
      setApplying(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-2xl"
        onClick={applying ? undefined : onClose}
      />

      <div
        className={clsx(
          "relative w-full overflow-hidden rounded-2xl",
          "max-w-[860px]",
          "border border-white/10",
          "bg-neutral-950/55 backdrop-blur-2xl",
          "bg-[radial-gradient(1100px_520px_at_12%_-10%,rgba(154,70,255,0.22),transparent_55%),radial-gradient(900px_520px_at_110%_-15%,rgba(154,70,255,0.14),transparent_55%)]",
          "shadow-[0_28px_110px_rgba(0,0,0,0.72)]",
          "ring-1 ring-white/[0.06]",
          "max-h-[82vh]",
        )}
      >
        {/* Header */}
        <div
          className={clsx(
            "flex items-center justify-between px-5 py-4",
            "border-b border-white/10",
            "bg-white/[0.03] backdrop-blur-xl",
          )}
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-neutral-0">{title}</p>
            <p className="mt-1 text-xs text-neutral-400">
              Drag to reposition. Use the slider to zoom. Then apply.
            </p>
          </div>

          <button
            type="button"
            onClick={applying ? undefined : onClose}
            disabled={applying}
            className={clsx(
              "grid h-9 w-9 place-items-center rounded-full",
              "border border-white/10 bg-white/[0.06] text-neutral-200",
              "transition hover:bg-white/[0.10] hover:text-neutral-0",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
              applying && "opacity-60 cursor-not-allowed",
            )}
            aria-label="Close editor"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Body */}
        <div className="grid grid-cols-1 gap-0 lg:grid-cols-12">
          {/* Left */}
          <div className="p-4 lg:col-span-8">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl">
              <div
                ref={viewportRef}
                className={clsx(
                  "relative mx-auto overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/30",
                  "touch-none select-none",
                  dragging ? "cursor-grabbing" : "cursor-grab",
                  mode === "banner" ? "w-full" : "w-[340px] max-w-full",
                  mode === "banner" ? "min-h-[180px]" : "min-h-[340px]",
                )}
                style={{ aspectRatio: `${out.ratio}`, touchAction: "none" }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onDragStart={(e) => e.preventDefault()}
              >
                {/* Image */}
                <div
                  className="absolute left-0 top-0"
                  style={{
                    transform: (() => {
                      const s = getScale(zoom);
                      if (!imgSize || !s || s <= 0)
                        return "translate3d(0px,0px,0) scale(1)";
                      return `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${s})`;
                    })(),
                    transformOrigin: "top left",
                    willChange: "transform",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={assetSrc}
                    alt=""
                    draggable={false}
                    className="block select-none max-w-none max-h-none"
                    style={{
                      width: imgSize?.w ? `${imgSize.w}px` : "auto",
                      height: imgSize?.h ? `${imgSize.h}px` : "auto",
                      maxWidth: "none",
                      maxHeight: "none",
                      userSelect: "none",
                      pointerEvents: "none",
                    }}
                  />
                </div>

                {/* Overlay */}
                <div className="pointer-events-none absolute inset-0">
                  {mode === "logo" ? (
                    <div className="absolute inset-0">
                      <div className="absolute inset-0 bg-black/35" />
                      <div className="absolute left-1/2 top-1/2 h-[72%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
                    </div>
                  ) : (
                    <div className="absolute inset-0">
                      <div className="absolute inset-0 bg-black/28" />
                      <div className="absolute inset-0 ring-2 ring-white/75 shadow-[0_0_0_9999px_rgba(0,0,0,0.28)]" />
                    </div>
                  )}
                </div>
              </div>

              {/* Controls */}
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-xs text-neutral-300">
                  <SlidersHorizontal className="h-4 w-4 text-neutral-300" />
                  Zoom
                </div>

                <div className="flex w-full items-center gap-3 sm:max-w-[420px]">
                  <input
                    type="range"
                    min={1}
                    max={maxZoom}
                    step={0.01}
                    value={zoom}
                    onChange={(e) => handleZoom(Number(e.target.value))}
                    className="tikd-range w-full"
                    aria-label="Zoom"
                  />
                  <span className="w-12 text-right text-xs font-semibold text-neutral-0">
                    {zoom.toFixed(2)}×
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right rail */}
          <div className="border-t border-white/10 p-4 lg:col-span-4 lg:border-l lg:border-t-0">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl">
              <p className="text-sm font-semibold text-neutral-0">Preview</p>
              <p className="mt-1 text-xs text-neutral-400">
                This is what will be saved (Cloudinary crop).
              </p>

              <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-black/30">
                {mode === "banner" ? (
                  <div
                    ref={setPreviewEl}
                    className="relative aspect-[4/1] w-full overflow-hidden"
                  >
                    {previewTransform && imgSize ? (
                      <div
                        className="absolute left-0 top-0"
                        style={{ ...previewTransform, willChange: "transform" }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={assetSrc}
                          alt=""
                          draggable={false}
                          className="block select-none max-w-none max-h-none"
                          style={{
                            width: `${imgSize.w}px`,
                            height: `${imgSize.h}px`,
                            maxWidth: "none",
                            maxHeight: "none",
                            pointerEvents: "none",
                            userSelect: "none",
                          }}
                        />
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={assetSrc}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                        draggable={false}
                      />
                    )}
                  </div>
                ) : (
                  <div
                    ref={setPreviewEl}
                    className="relative mx-auto my-5 h-40 w-40 overflow-hidden rounded-full bg-black/25 ring-1 ring-white/10"
                  >
                    {previewTransform && imgSize ? (
                      <div
                        className="absolute left-0 top-0"
                        style={{ ...previewTransform, willChange: "transform" }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={assetSrc}
                          alt=""
                          draggable={false}
                          className="block select-none max-w-none max-h-none"
                          style={{
                            width: `${imgSize.w}px`,
                            height: `${imgSize.h}px`,
                            maxWidth: "none",
                            maxHeight: "none",
                            pointerEvents: "none",
                            userSelect: "none",
                          }}
                        />
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={assetSrc}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                        draggable={false}
                      />
                    )}
                  </div>
                )}
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onClose}
                  disabled={applying}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={apply}
                  loading={applying}
                  animation
                >
                  Apply
                </Button>
              </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-neutral-400">
              Tip: upload a larger image than the target ratio so you have room
              to zoom/crop without losing quality.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
