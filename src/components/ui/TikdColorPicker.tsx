/* ------------------------------------------------------------------ */
/*  src/components/ui/TikdColorPicker.tsx                             */
/* ------------------------------------------------------------------ */
"use client";

import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import clsx from "clsx";
import { Pipette } from "lucide-react";
import { createPortal } from "react-dom";

type Props = {
  /** Controlled hex value. Can be "" to mean “use default”. */
  value: string;
  /** Called with hex (e.g. "#9A46FF") or "" for default. */
  onChange: (next: string) => void;

  /** Used for rendering if value is "". */
  defaultColor?: string;

  /** Optional label/description (keeps the component reusable). */
  label?: string;
  description?: string;

  /** Show alpha slider (UI has it in the design). */
  showAlpha?: boolean;

  /** Called when user taps “Use default theme color”. If omitted, uses onChange(""). */
  onResetToDefault?: () => void;

  /** Error message shown under inputs. */
  error?: string | null;

  className?: string;
};

type RGB = { r: number; g: number; b: number };
type HSV = { h: number; s: number; v: number }; // h 0..360, s/v 0..1

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function roundInt(n: number) {
  return Math.round(n);
}

function normalizeHex(input: string) {
  const v = (input || "").trim();
  if (!v) return "";
  const up = v.toUpperCase();
  if (/^#([0-9A-F]{3})$/.test(up)) {
    const r = up[1],
      g = up[2],
      b = up[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  if (/^#([0-9A-F]{6})$/.test(up)) return up;
  if (/^([0-9A-F]{6})$/.test(up)) return `#${up}`;
  if (/^([0-9A-F]{3})$/.test(up)) {
    const r = up[0],
      g = up[1],
      b = up[2];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return up;
}

function hexToRgb(hex: string): RGB | null {
  const h = normalizeHex(hex);
  if (!/^#([0-9A-F]{6})$/.test(h)) return null;
  const r = parseInt(h.slice(1, 3), 16);
  const g = parseInt(h.slice(3, 5), 16);
  const b = parseInt(h.slice(5, 7), 16);
  return { r, g, b };
}

function rgbToHex({ r, g, b }: RGB) {
  const to2 = (n: number) =>
    clamp(roundInt(n), 0, 255).toString(16).padStart(2, "0");
  return `#${to2(r)}${to2(g)}${to2(b)}`.toUpperCase();
}

function rgbToHsv({ r, g, b }: RGB): HSV {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;

  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === rr) h = 60 * (((gg - bb) / d) % 6);
    else if (max === gg) h = 60 * ((bb - rr) / d + 2);
    else h = 60 * ((rr - gg) / d + 4);
  }
  if (h < 0) h += 360;

  const s = max === 0 ? 0 : d / max;
  const v = max;

  return { h, s, v };
}

function hsvToRgb({ h, s, v }: HSV): RGB {
  const hh = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = v - c;

  let rp = 0,
    gp = 0,
    bp = 0;

  if (hh < 60) [rp, gp, bp] = [c, x, 0];
  else if (hh < 120) [rp, gp, bp] = [x, c, 0];
  else if (hh < 180) [rp, gp, bp] = [0, c, x];
  else if (hh < 240) [rp, gp, bp] = [0, x, c];
  else if (hh < 300) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];

  return {
    r: roundInt((rp + m) * 255),
    g: roundInt((gp + m) * 255),
    b: roundInt((bp + m) * 255),
  };
}

function hueColorHex(h: number) {
  const rgb = hsvToRgb({ h, s: 1, v: 1 });
  return rgbToHex(rgb);
}

type PopPos = { top: number; left: number };

export default function TikdColorPicker({
  value,
  onChange,
  defaultColor = "#7C3AED",
  label = "Select an accent color",
  description = "Used for highlights on your organization page and event cards.",
  showAlpha = true,
  onResetToDefault,
  error,
  className,
}: Props) {
  const effectiveHex =
    value && value.trim() !== ""
      ? normalizeHex(value)
      : normalizeHex(defaultColor);

  const initialRgb = useMemo(
    () => hexToRgb(effectiveHex) ?? hexToRgb("#7C3AED")!,
    [effectiveHex],
  );

  const [hsv, setHsv] = useState<HSV>(() => rgbToHsv(initialRgb));
  const [alpha, setAlpha] = useState<number>(1);

  const rgb = useMemo(() => hsvToRgb(hsv), [hsv]);
  const hex = useMemo(() => rgbToHex(rgb), [rgb]);
  const displayHex = value && value.trim() !== "" ? normalizeHex(value) : hex;

  // inputs are controlled for nice typing behavior
  const [hexDraft, setHexDraft] = useState(displayHex);
  const [rgbDraft, setRgbDraft] = useState<{ r: string; g: string; b: string }>(
    () => ({
      r: String(rgb.r),
      g: String(rgb.g),
      b: String(rgb.b),
    }),
  );

  // popover (fixed) — does NOT push layout
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<PopPos>({ top: 0, left: 0 });

  // ✅ open at mouse click position (viewport coords)
  const [clickPt, setClickPt] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  const svRef = useRef<HTMLDivElement | null>(null);

  const hueHex = useMemo(() => hueColorHex(hsv.h), [hsv.h]);
  const alphaFill = useMemo(() => {
    const a = clamp(alpha, 0, 1);
    return `rgba(${clamp(rgb.r, 0, 255)}, ${clamp(rgb.g, 0, 255)}, ${clamp(
      rgb.b,
      0,
      255,
    )}, ${a})`;
  }, [alpha, rgb]);

  // keep internal state in sync with controlled value
  useEffect(() => {
    const nextRgb = hexToRgb(effectiveHex);
    if (!nextRgb) return;
    setHsv(rgbToHsv(nextRgb));
  }, [effectiveHex]);

  useEffect(() => {
    setHexDraft(displayHex);
    setRgbDraft({ r: String(rgb.r), g: String(rgb.g), b: String(rgb.b) });
  }, [displayHex, rgb.r, rgb.g, rgb.b]);

  function commitFromRgb(nextRgb: RGB) {
    const clamped = {
      r: clamp(roundInt(nextRgb.r), 0, 255),
      g: clamp(roundInt(nextRgb.g), 0, 255),
      b: clamp(roundInt(nextRgb.b), 0, 255),
    };
    const nextHex = rgbToHex(clamped);
    setHsv(rgbToHsv(clamped));
    onChange(nextHex);
  }

  function commitHex(nextHex: string) {
    const normalized = normalizeHex(nextHex);
    const rgb2 = hexToRgb(normalized);
    if (!rgb2) return;
    setHsv(rgbToHsv(rgb2));
    onChange(normalized);
  }

  function handleSvPointer(e: React.PointerEvent) {
    if (!svRef.current) return;
    svRef.current.setPointerCapture(e.pointerId);

    const rect = svRef.current.getBoundingClientRect();

    const setFromPoint = (clientX: number, clientY: number) => {
      const x = clamp((clientX - rect.left) / rect.width, 0, 1);
      const y = clamp((clientY - rect.top) / rect.height, 0, 1);

      const s = x;
      const v = 1 - y;

      const next: HSV = { ...hsv, s, v };
      setHsv(next);

      const rgb2 = hsvToRgb(next);
      onChange(rgbToHex(rgb2));
    };

    setFromPoint(e.clientX, e.clientY);

    const onMove = (ev: PointerEvent) => setFromPoint(ev.clientX, ev.clientY);
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function handleHueChange(nextHue: number) {
    const h = clamp(nextHue, 0, 360);
    const next = { ...hsv, h };
    setHsv(next);
    onChange(rgbToHex(hsvToRgb(next)));
  }

  function handleAlphaChange(nextA: number) {
    setAlpha(clamp(nextA, 0, 1));
  }

  const svThumbStyle: React.CSSProperties = {
    left: `${hsv.s * 100}%`,
    top: `${(1 - hsv.v) * 100}%`,
  };

  const resetToDefault = () => {
    if (onResetToDefault) onResetToDefault();
    else onChange("");

    const rgb2 = hexToRgb(normalizeHex(defaultColor));
    if (rgb2) setHsv(rgbToHsv(rgb2));
    setAlpha(1);
    setOpen(false);
  };

  // picker spec sizes
  const PICKER_W = 190;
  const PICKER_H = 258;
  const CIRCLE = 10;
  const LINE_H = 10;
  const LEFT_BLOCK = 28;
  const INPUT_H = 28;

  // ✅ position at click point (clamped) — still fixed, so no layout shift
  useLayoutEffect(() => {
    if (!open) return;
    const p = panelRef.current;
    if (!p) return;

    const gutter = 10;
    const offset = 10;

    // Because width/height are fixed, we can use constants (no “first paint jump”)
    let left = clickPt.x + offset;
    let top = clickPt.y + offset;

    // clamp horizontally
    left = Math.min(left, window.innerWidth - gutter - PICKER_W);
    left = Math.max(left, gutter);

    // if not enough space below, open above click point
    if (top + PICKER_H > window.innerHeight - gutter) {
      top = clickPt.y - offset - PICKER_H;
    }

    top = Math.max(top, gutter);
    top = Math.min(top, window.innerHeight - gutter - PICKER_H);

    setPos({ top, left });
  }, [open, clickPt.x, clickPt.y]);

  // close on outside click + Esc (and also keep it stable on scroll)
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;

      const root = rootRef.current;
      const panel = panelRef.current;

      // ✅ if click is inside preview/header OR inside the picker panel, do nothing
      if ((root && root.contains(t)) || (panel && panel.contains(t))) return;

      setOpen(false);
    };

    const onScroll = () => setOpen(false); // prevents weird “floating picker” while scrolling

    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onScroll, true);

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  function onPreviewPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    // ✅ prevent focus/scroll-jump + open exactly at pointer point
    e.preventDefault();

    const sx = window.scrollX;
    const sy = window.scrollY;

    setClickPt({ x: e.clientX, y: e.clientY });
    setOpen((v) => !v);

    // ✅ hard guarantee: no tiny scroll nudge from focus/activation
    requestAnimationFrame(() => {
      window.scrollTo(sx, sy);
      (document.activeElement as HTMLElement | null)?.blur?.();
    });
  }

  return (
    <div ref={rootRef} className={clsx("space-y-3", className)}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="grid h-6 w-6 place-items-center rounded-md bg-primary-900/50 ring-1 ring-primary-700/40">
              <Pipette className="h-3.5 w-3.5 text-primary-200" />
            </div>
            <p className="text-sm font-medium text-neutral-0">{label}</p>
          </div>
          {description ? (
            <p className="mt-1 text-xs text-neutral-300">{description}</p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={resetToDefault}
          className="mt-[2px] shrink-0 rounded-full border border-white/10 bg-neutral-900/40 px-3 py-1 text-[11px] font-semibold text-neutral-200 transition hover:border-primary-500/40 hover:bg-neutral-900/55 hover:text-neutral-0"
        >
          Use default theme color
        </button>
      </div>

      {/* Preview */}
      <button
        type="button"
        onPointerDown={onPreviewPointerDown}
        className={clsx(
          "w-full overflow-hidden rounded-xl border border-white/10 bg-neutral-900/80 text-left",
          "transition hover:border-primary-500/35 hover:bg-neutral-900/85",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <div
          className="h-14"
          style={{
            background:
              `linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0))` +
              `, ${alphaFill}`,
          }}
        />
        <div className="flex h-10 items-center justify-between px-4 text-xs text-neutral-200">
          <span className="text-neutral-300">Preview</span>
          <span className="flex items-center gap-2">
            <span
              className="h-3.5 w-3.5 rounded-full border border-white/15"
              style={{ background: alphaFill }}
              aria-hidden="true"
            />
            <span className="font-mono uppercase">{displayHex}</span>
          </span>
        </div>
      </button>

      {/* Fixed popover (190x264), opens at click point */}
      {open
        ? createPortal(
            <div
              ref={panelRef}
              role="dialog"
              aria-label="Color picker"
              className={clsx(
                "fixed z-[90] overflow-hidden",
                "rounded-lg border border-white/10 bg-neutral-950/72",
                "shadow-[0_18px_55px_rgba(0,0,0,0.62)] backdrop-blur-2xl",
                "animate-[tikdPickerIn_120ms_cubic-bezier(0.2,0.8,0.2,1)_both]",
              )}
              style={{
                top: pos.top,
                left: pos.left,
                width: PICKER_W,
                height: PICKER_H,
              }}
            >
              {/* SV area */}
              <div
                ref={svRef}
                onPointerDown={handleSvPointer}
                className={clsx(
                  "relative w-full cursor-crosshair select-none touch-none",
                  "border-b border-white/10",
                )}
                style={{
                  height: 156,
                  backgroundImage:
                    `linear-gradient(to top, rgba(0,0,0,1), rgba(0,0,0,0))` +
                    `, linear-gradient(to right, rgba(255,255,255,1), ${hueHex})`,
                }}
              >
                <div
                  className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
                  style={svThumbStyle}
                >
                  <div
                    style={{ width: CIRCLE, height: CIRCLE }}
                    className="rounded-full border-[1.5px] border-white shadow-[0_6px_14px_rgba(0,0,0,0.55)]"
                  />
                </div>
              </div>

              {/* Bottom controls */}
              <div className="h-[108px] w-full bg-neutral-900/55 p-2 pt-2.5">
                {/* Sliders row */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className={clsx(
                      "grid shrink-0 place-items-center rounded-md",
                      "border border-white/10 shadow-[0_10px_25px_rgba(0,0,0,0.25)]",
                    )}
                    style={{
                      width: LEFT_BLOCK,
                      height: LEFT_BLOCK,
                      background: "var(--color-primary-500)",
                    }}
                    aria-label="Pick color"
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    <Pipette className="h-3 w-3 text-white" />
                  </button>

                  <div className="min-w-0 flex-1 space-y-2">
                    {/* Hue */}
                    <div className="relative" style={{ height: LINE_H }}>
                      <div
                        className="absolute inset-0 rounded-full"
                        style={{
                          background:
                            "linear-gradient(90deg, #FF0000 0%, #FFFF00 17%, #00FF00 33%, #00FFFF 50%, #0000FF 67%, #FF00FF 83%, #FF0000 100%)",
                        }}
                      />
                      <input
                        type="range"
                        min={0}
                        max={360}
                        step={1}
                        value={hsv.h}
                        onChange={(e) =>
                          handleHueChange(Number(e.target.value))
                        }
                        className="tikd-range absolute inset-0 w-full"
                        aria-label="Hue"
                      />
                    </div>

                    {/* Alpha */}
                    {showAlpha ? (
                      <div className="relative" style={{ height: LINE_H }}>
                        <div className="tikd-checker absolute inset-0 rounded-full opacity-85" />
                        <div
                          className="absolute inset-0 rounded-full"
                          style={{
                            background: `linear-gradient(90deg, rgba(0,0,0,0), ${rgbToHex(
                              rgb,
                            )})`,
                            opacity: 0.95,
                          }}
                        />
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={Math.round(alpha * 100)}
                          onChange={(e) =>
                            handleAlphaChange(Number(e.target.value) / 100)
                          }
                          className="tikd-range absolute inset-0 w-full"
                          aria-label="Opacity"
                        />
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Labels + Inputs */}
                <div className="mt-2">
                  <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-1 px-[2px] text-[9px] font-semibold tracking-wide text-neutral-200/90">
                    <span>HEX</span>
                    <span className="text-start pl-0.5">R</span>
                    <span className="text-start pl-0.5">G</span>
                    <span className="text-start pl-0.5">B</span>
                  </div>

                  <div className="mt-1 flex items-center gap-1.5">
                    {/* HEX */}
                    <input
                      value={hexDraft}
                      onChange={(e) => {
                        const next = e.target.value.toUpperCase();
                        setHexDraft(next);

                        if (next.trim() === "") {
                          onChange("");
                          return;
                        }

                        const normalized = normalizeHex(next);
                        const rgb2 = hexToRgb(normalized);
                        if (rgb2) commitHex(normalized);
                        else onChange(next);
                      }}
                      onBlur={() => {
                        const normalized = normalizeHex(hexDraft);
                        const rgb2 = hexToRgb(normalized);
                        if (rgb2) {
                          setHexDraft(normalized);
                          commitHex(normalized);
                        }
                      }}
                      className={clsx(
                        "w-full max-w-[59px] rounded-md border border-white/10 bg-neutral-950/55 px-2",
                        "font-mono text-[11px] uppercase text-neutral-0 placeholder:text-neutral-500",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
                      )}
                      style={{ height: INPUT_H }}
                      placeholder="#9A46FF"
                      aria-label="Hex color"
                    />
                    <div className="flex-1 flex items-center gap-0.5">
                      {/* R */}
                      <input
                        value={rgbDraft.r}
                        inputMode="numeric"
                        onChange={(e) => {
                          const next = e.target.value.replace(/[^\d]/g, "");
                          setRgbDraft((s) => ({ ...s, r: next }));
                          const n = Number(next);
                          if (Number.isFinite(n))
                            commitFromRgb({ r: n, g: rgb.g, b: rgb.b });
                        }}
                        onBlur={() => {
                          const n = clamp(Number(rgbDraft.r || 0), 0, 255);
                          setRgbDraft((s) => ({ ...s, r: String(n) }));
                          commitFromRgb({ r: n, g: rgb.g, b: rgb.b });
                        }}
                        className={clsx(
                          "w-full rounded-l-md border border-white/10 bg-neutral-950/55 px-1 text-center",
                          "font-mono text-[11px] text-neutral-0",
                          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
                        )}
                        style={{ height: INPUT_H }}
                        aria-label="Red"
                      />

                      {/* G */}
                      <input
                        value={rgbDraft.g}
                        inputMode="numeric"
                        onChange={(e) => {
                          const next = e.target.value.replace(/[^\d]/g, "");
                          setRgbDraft((s) => ({ ...s, g: next }));
                          const n = Number(next);
                          if (Number.isFinite(n))
                            commitFromRgb({ r: rgb.r, g: n, b: rgb.b });
                        }}
                        onBlur={() => {
                          const n = clamp(Number(rgbDraft.g || 0), 0, 255);
                          setRgbDraft((s) => ({ ...s, g: String(n) }));
                          commitFromRgb({ r: rgb.r, g: n, b: rgb.b });
                        }}
                        className={clsx(
                          "w-full border border-white/10 bg-neutral-950/55 px-1 text-center",
                          "font-mono text-[11px] text-neutral-0",
                          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
                        )}
                        style={{ height: INPUT_H }}
                        aria-label="Green"
                      />

                      {/* B */}
                      <input
                        value={rgbDraft.b}
                        inputMode="numeric"
                        onChange={(e) => {
                          const next = e.target.value.replace(/[^\d]/g, "");
                          setRgbDraft((s) => ({ ...s, b: next }));
                          const n = Number(next);
                          if (Number.isFinite(n))
                            commitFromRgb({ r: rgb.r, g: rgb.g, b: n });
                        }}
                        onBlur={() => {
                          const n = clamp(Number(rgbDraft.b || 0), 0, 255);
                          setRgbDraft((s) => ({ ...s, b: String(n) }));
                          commitFromRgb({ r: rgb.r, g: rgb.g, b: n });
                        }}
                        className={clsx(
                          "w-full rounded-r-md border border-white/10 bg-neutral-950/55 px-1 text-center",
                          "font-mono text-[11px] text-neutral-0",
                          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
                        )}
                        style={{ height: INPUT_H }}
                        aria-label="Blue"
                      />
                    </div>
                  </div>

                  {error ? (
                    <p className="mt-1.5 text-[11px] leading-snug text-error-500">
                      {error}
                    </p>
                  ) : null}
                </div>
              </div>

              <style jsx>{`
                @keyframes tikdPickerIn {
                  from {
                    opacity: 0;
                    transform: translateY(-6px) scale(0.98);
                  }
                  to {
                    opacity: 1;
                    transform: translateY(0px) scale(1);
                  }
                }

                .tikd-checker {
                  background-image:
                    linear-gradient(
                      45deg,
                      rgba(255, 255, 255, 0.14) 25%,
                      transparent 25%
                    ),
                    linear-gradient(
                      -45deg,
                      rgba(255, 255, 255, 0.14) 25%,
                      transparent 25%
                    ),
                    linear-gradient(
                      45deg,
                      transparent 75%,
                      rgba(255, 255, 255, 0.14) 75%
                    ),
                    linear-gradient(
                      -45deg,
                      transparent 75%,
                      rgba(255, 255, 255, 0.14) 75%
                    );
                  background-size: 10px 10px;
                  background-position:
                    0 0,
                    0 5px,
                    5px -5px,
                    -5px 0px;
                }

                .tikd-range {
                  -webkit-appearance: none;
                  appearance: none;
                  background: transparent;
                  height: ${LINE_H}px;
                  margin: 0;
                  outline: none;
                  cursor: pointer;
                }

                .tikd-range::-webkit-slider-runnable-track {
                  height: ${LINE_H}px;
                  background: transparent;
                  border-radius: 999px;
                }

                .tikd-range::-webkit-slider-thumb {
                  -webkit-appearance: none;
                  appearance: none;
                  width: ${CIRCLE}px;
                  height: ${CIRCLE}px;
                  border-radius: 999px;
                  background: rgba(0, 0, 0, 0);
                  border: 1.5px solid rgba(255, 255, 255, 0.95);
                  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.45);
                  margin-top: calc((${LINE_H}px - ${CIRCLE}px) / 2);
                }

                .tikd-range::-moz-range-track {
                  height: ${LINE_H}px;
                  background: transparent;
                  border-radius: 999px;
                }

                .tikd-range::-moz-range-thumb {
                  width: ${CIRCLE}px;
                  height: ${CIRCLE}px;
                  border-radius: 999px;
                  background: rgba(0, 0, 0, 0);
                  border: 2px solid rgba(255, 255, 255, 0.95);
                  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.45);
                }
              `}</style>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
