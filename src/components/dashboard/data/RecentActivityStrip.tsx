/* ------------------------------------------------------------------ */
/*  src/components/dashboard/data/RecentActivityStrip.tsx             */
/* ------------------------------------------------------------------ */
"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  MoreVertical,
  FileSpreadsheet,
  File,
  Image as ImageIcon,
  X,
  ExternalLink,
  Copy,
} from "lucide-react";

/* ------------------------------ Types ------------------------------ */
type FileKind = "pdf" | "doc" | "xls" | "img" | "other";

type Item = {
  id: string;
  title: string;
  kind: FileKind;
  fileUrl: string;
  thumbUrl?: string;
};

/* --------------------------- Dummy Files --------------------------- */
const ITEMS: Item[] = [
  {
    id: "1",
    title: "Article System.doc",
    kind: "doc",
    fileUrl: "/dummy/files/article-system.docx",
  },
  {
    id: "2",
    title: "Language Article.pdf",
    kind: "pdf",
    fileUrl: "/dummy/files/language-article.pdf",
  },
  {
    id: "3",
    title: "Student Name.csv",
    kind: "xls",
    fileUrl: "/dummy/files/student-name.csv",
  },
  {
    id: "4",
    title: "Language Article.pdf",
    kind: "pdf",
    fileUrl: "/dummy/files/language-article.pdf",
  },
  {
    id: "5",
    title: "Article System.pdf",
    kind: "doc",
    fileUrl: "/dummy/files/article-system-2.pdf",
  },
];

/* ------------------------------ Helpers ------------------------------ */
function lower(u?: string) {
  return (u || "").toLowerCase().trim();
}

function isPdfFile(url?: string) {
  const u = lower(url);
  return u.endsWith(".pdf") || u.includes(".pdf?");
}

function isCsvFile(url?: string) {
  const u = lower(url);
  return u.endsWith(".csv") || u.includes(".csv?");
}

function isDocxFile(url?: string) {
  const u = lower(url);
  return u.endsWith(".docx") || u.includes(".docx?");
}

function isImageFile(url?: string) {
  const u = lower(url);
  return (
    u.endsWith(".png") ||
    u.endsWith(".jpg") ||
    u.endsWith(".jpeg") ||
    u.endsWith(".webp") ||
    u.endsWith(".gif") ||
    u.includes(".png?") ||
    u.includes(".jpg?") ||
    u.includes(".jpeg?") ||
    u.includes(".webp?") ||
    u.includes(".gif?")
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function errorMessage(e: unknown, fallback: string) {
  if (e instanceof Error) return e.message || fallback;
  if (typeof e === "string") return e || fallback;
  return fallback;
}

/* ------------------------------ UI ------------------------------ */
function KindGlyph({ kind }: { kind: FileKind }) {
  const c = "h-9 w-9 text-neutral-200/85";
  if (kind === "xls") return <FileSpreadsheet className={c} />;
  if (kind === "img") return <ImageIcon className={c} />;
  if (kind === "pdf" || kind === "doc") return <FileText className={c} />;
  return <File className={c} />;
}

function KindPill({ kind }: { kind: FileKind }) {
  const label =
    kind === "pdf"
      ? "PDF"
      : kind === "doc"
        ? "DOC"
        : kind === "xls"
          ? "XLS"
          : kind === "img"
            ? "IMG"
            : "FILE";

  return (
    <div className="rounded-full border border-white/10 bg-neutral-900/40 px-3 py-1 text-[12px] font-semibold text-neutral-0">
      {label}
    </div>
  );
}

/**
 * Card preview area:
 * - PDF: embedded iframe (tiny preview)
 * - Image: next/image
 * - Others: fallback icon/pill
 */
function FilePreview({ item }: { item: Item }) {
  const pdf = item.kind === "pdf" || isPdfFile(item.fileUrl);
  const img =
    item.kind === "img" ||
    isImageFile(item.thumbUrl) ||
    isImageFile(item.fileUrl);

  const fallback = (
    <div className="absolute inset-0 grid place-items-center">
      <div className="grid place-items-center gap-3">
        <KindGlyph kind={item.kind} />
        <KindPill kind={item.kind} />
      </div>
    </div>
  );

  if (pdf) {
    return (
      <>
        {fallback}
        <iframe
          src={`${item.fileUrl}#page=1&view=FitH`}
          className="absolute inset-0 h-full w-full"
          style={{ pointerEvents: "none" }}
          loading="lazy"
          title={item.title}
        />
      </>
    );
  }

  if (img && (item.thumbUrl || item.fileUrl)) {
    const src = item.thumbUrl || item.fileUrl;

    return (
      <>
        {fallback}
        <div
          className="absolute inset-0"
          style={{ pointerEvents: "none" }}
          aria-hidden="true"
        >
          <Image
            src={src}
            alt=""
            fill
            sizes="(max-width: 640px) 82vw, 240px"
            className="object-cover"
            unoptimized
          />
        </div>
      </>
    );
  }

  return fallback;
}

/* ------------------------------ CSV Preview ------------------------------ */
function parseCsv(text: string) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const rows: string[][] = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    const out: string[] = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];

      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (ch === "," && !inQuotes) {
        out.push(cur);
        cur = "";
        continue;
      }

      cur += ch;
    }

    out.push(cur);
    rows.push(out.map((c) => c.trim()));
  }

  const maxCols = rows.reduce((m, r) => Math.max(m, r.length), 0);
  return rows.map((r) => {
    const rr = r.slice(0);
    while (rr.length < maxCols) rr.push("");
    return rr;
  });
}

/* ------------------------------ Modal Preview ------------------------------ */
type DocxPreviewModule = {
  renderAsync: (
    data: ArrayBuffer,
    container: HTMLElement,
    styleContainer?: HTMLElement,
    options?: Record<string, unknown>,
  ) => Promise<unknown>;
};

function PreviewModal({
  open,
  item,
  onClose,
}: {
  open: boolean;
  item: Item | null;
  onClose: () => void;
}) {
  const [csvRows, setCsvRows] = useState<string[][] | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);

  const docxHostRef = useRef<HTMLDivElement | null>(null);
  const [docxError, setDocxError] = useState<string | null>(null);
  const [docxLoading, setDocxLoading] = useState(false);

  const isPdf = item ? item.kind === "pdf" || isPdfFile(item.fileUrl) : false;
  const isCsv = item ? isCsvFile(item.fileUrl) : false;
  const isDocx = item ? isDocxFile(item.fileUrl) : false;
  const isImg = item
    ? item.kind === "img" ||
      isImageFile(item.thumbUrl) ||
      isImageFile(item.fileUrl)
    : false;

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !item) return;

    setCsvRows(null);
    setCsvError(null);
    setDocxError(null);
    setDocxLoading(false);

    if (isCsv) {
      (async () => {
        try {
          const res = await fetch(item.fileUrl, { cache: "no-store" });
          if (!res.ok) throw new Error(`Failed to load CSV (${res.status})`);
          const text = await res.text();
          const parsed = parseCsv(text);

          const maxRows = 50;
          const maxCols = 12;

          const trimmed = parsed
            .slice(0, maxRows)
            .map((r) => r.slice(0, maxCols));

          setCsvRows(trimmed);
        } catch (e: unknown) {
          setCsvError(errorMessage(e, "Failed to load CSV"));
        }
      })();
      return;
    }

    if (isDocx) {
      (async () => {
        try {
          setDocxLoading(true);

          const host = docxHostRef.current;
          if (!host) return;

          host.innerHTML = "";

          const res = await fetch(item.fileUrl, { cache: "no-store" });
          if (!res.ok) throw new Error(`Failed to load DOCX (${res.status})`);

          const buf = await res.arrayBuffer();

          const mod = (await import(
            "docx-preview"
          )) as unknown as DocxPreviewModule;

          await mod.renderAsync(buf, host, undefined, {
            inWrapper: false,
            ignoreWidth: false,
            ignoreHeight: false,
            className: "docx",
          });

          setDocxLoading(false);
        } catch (e: unknown) {
          setDocxLoading(false);
          setDocxError(
            errorMessage(
              e,
              "DOCX preview failed. Make sure `docx-preview` is installed.",
            ),
          );
        }
      })();
    }
  }, [open, item, isCsv, isDocx]);

  if (!open || !item) return null;

  const openInNewTab = () => {
    window.open(item.fileUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className="fixed inset-0 z-[90]"
      role="dialog"
      aria-modal="true"
      aria-label="File preview"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative mx-auto mt-2 flex max-h-[calc(100dvh-16px)] w-[calc(100%-16px)] flex-col overflow-hidden rounded-xl border border-neutral-700 bg-neutral-900 shadow-[0_30px_90px_rgba(0,0,0,0.75)] sm:mt-10 sm:w-[min(980px,calc(100%-32px))] sm:max-h-[90vh]">
        <div className="relative border-b border-neutral-700 px-3 py-3 sm:px-4">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center text-neutral-200 hover:text-neutral-0"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="min-w-0 pr-10">
            <div className="truncate text-sm font-semibold text-neutral-0">
              {item.title}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-300">
              <span className="rounded-full border border-white/10 bg-neutral-900/40 px-2 py-0.5">
                {isPdf
                  ? "PDF"
                  : isCsv
                    ? "CSV"
                    : isDocx
                      ? "DOCX"
                      : isImg
                        ? "IMAGE"
                        : item.kind.toUpperCase()}
              </span>

              <button
                type="button"
                onClick={openInNewTab}
                className="inline-flex items-center gap-1.5 text-neutral-200 hover:text-neutral-0"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open
              </button>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(item.fileUrl).catch(() => {});
                }}
                className="inline-flex items-center gap-1.5 text-neutral-200 hover:text-neutral-0"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy link
              </button>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-neutral-950/30 p-3 sm:p-4">
          {isPdf && (
            <div className="overflow-hidden rounded-lg border border-neutral-700 bg-neutral-0">
              <iframe
                src={`${item.fileUrl}#page=1&view=FitH`}
                className="h-[58dvh] w-full sm:h-[68vh]"
                title={item.title}
              />
            </div>
          )}

          {isImg && (
            <div className="overflow-hidden rounded-lg border border-neutral-700 bg-neutral-950/30">
              <div className="relative h-[58dvh] w-full sm:h-[68vh]">
                <Image
                  src={item.thumbUrl || item.fileUrl}
                  alt={item.title}
                  fill
                  sizes="(max-width: 980px) 100vw, 980px"
                  className="object-contain"
                  unoptimized
                />
              </div>
            </div>
          )}

          {isCsv && (
            <div className="overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900">
              {csvError ? (
                <div className="p-4 text-sm text-neutral-100">{csvError}</div>
              ) : !csvRows ? (
                <div className="p-4 text-sm text-neutral-100">Loading…</div>
              ) : (
                <div className="overflow-auto">
                  <table className="w-full border-collapse text-xs sm:text-sm">
                    <tbody>
                      {csvRows.map((r, ri) => (
                        <tr key={ri} className="border-b border-white/10">
                          {r.map((c, ci) => (
                            <td
                              key={ci}
                              className={clsx(
                                "whitespace-nowrap px-2 py-2 sm:px-3",
                                ri === 0
                                  ? "font-semibold text-neutral-0"
                                  : "text-neutral-100",
                              )}
                            >
                              {c || "\u00A0"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {isDocx && (
            <div className="overflow-hidden rounded-lg border border-neutral-700 bg-neutral-0">
              <div className="p-3 text-xs text-neutral-700">
                {docxLoading ? "Rendering DOCX…" : docxError ? docxError : " "}
              </div>
              <div ref={docxHostRef} className="p-4" />
            </div>
          )}

          {!isPdf && !isImg && !isCsv && !isDocx && (
            <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-4 text-sm text-neutral-100">
              Preview isn’t available for this file type yet. Use “Open” to
              download/view it.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Thumb Card ------------------------------ */
function ThumbCard({
  item,
  onOpenPreview,
}: {
  item: Item;
  onOpenPreview: (item: Item) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const dotsRef = useRef<HTMLButtonElement | null>(null);

  const openPreview = useCallback(() => {
    onOpenPreview(item);
  }, [item, onOpenPreview]);

  const openFile = useCallback(() => {
    window.open(item.fileUrl, "_blank", "noopener,noreferrer");
  }, [item.fileUrl]);

  const syncMenuPos = useCallback(() => {
    const btn = dotsRef.current;
    if (!btn) return;

    const r = btn.getBoundingClientRect();
    const width = Math.min(220, window.innerWidth - 24);
    const left = clamp(r.right - width, 12, window.innerWidth - width - 12);
    const top = clamp(r.bottom + 8, 12, window.innerHeight - 12);

    setMenuPos({ top, left, width });
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    syncMenuPos();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };

    const onDown = (e: MouseEvent) => {
      const root = rootRef.current;
      if (!root) return;
      if (!root.contains(e.target as Node)) setMenuOpen(false);
    };

    const onResize = () => syncMenuPos();
    const onScroll = () => syncMenuPos();

    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
    };
  }, [menuOpen, syncMenuPos]);

  return (
    <div
      ref={rootRef}
      className={clsx(
        "relative w-full rounded-lg border border-neutral-700 bg-neutral-900",
        "shadow-[0_18px_56px_rgba(0,0,0,0.48),inset_0_1px_0_rgba(255,255,255,0.05)]",
      )}
    >
      <div className="p-2.5 sm:p-3">
        <div
          role="button"
          tabIndex={0}
          onClick={openPreview}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openPreview();
            }
          }}
          className={clsx(
            "group relative block w-full overflow-hidden rounded-lg border border-neutral-700 text-left",
          )}
          aria-label={`Preview ${item.title}`}
        >
          <div className="relative h-[112px] bg-neutral-950/35 sm:h-[121px]">
            <FilePreview item={item} />

            <div className="absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
            </div>
          </div>

          <div className="relative flex items-center justify-between rounded-b-lg border border-neutral-700 border-t-0 bg-[#ececec] p-2 pt-3">
            <div className="flex min-w-0 items-center gap-2">
              <FileText className="h-4 w-4 shrink-0 text-[#595959]" />
              <span className="truncate text-xs text-[#5d5d5d]">
                {item.title}
              </span>
            </div>

            <button
              ref={dotsRef}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMenuOpen((v) => !v);
              }}
              className={clsx(
                "relative grid h-4 w-4 shrink-0 place-items-center text-[#595959] transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-951/35",
              )}
              aria-label="Options"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
        </div>

        {menuOpen && menuPos && (
          <div
            className={clsx(
              "fixed z-[95] overflow-hidden rounded-lg border border-neutral-700 bg-black",
              "shadow-[0_22px_70px_rgba(0,0,0,0.6)]",
            )}
            style={{
              top: menuPos.top,
              left: menuPos.left,
              width: menuPos.width,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                openPreview();
              }}
              className="block w-full px-3 py-2 text-left text-sm text-neutral-100 hover:bg-neutral-800/60"
            >
              Preview
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                openFile();
              }}
              className="block w-full px-3 py-2 text-left text-sm text-neutral-100 hover:bg-neutral-800/60"
            >
              Open
            </button>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(item.fileUrl).catch(() => {});
                setMenuOpen(false);
              }}
              className="block w-full px-3 py-2 text-left text-sm text-neutral-100 hover:bg-neutral-800/60"
            >
              Copy link
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="block w-full px-3 py-2 text-left text-sm text-neutral-100 hover:bg-neutral-800/60"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------ Strip ------------------------------ */
export default function RecentActivityStrip() {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const firstSlideRef = useRef<HTMLDivElement | null>(null);

  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<Item | null>(null);

  const [step, setStep] = useState(216 + 16);

  const openPreview = useCallback((item: Item) => {
    setActiveItem(item);
    setPreviewOpen(true);
  }, []);

  const closePreview = useCallback(() => {
    setPreviewOpen(false);
    setActiveItem(null);
  }, []);

  const syncButtons = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;

    const eps = 2;
    const maxLeft = el.scrollWidth - el.clientWidth;

    setCanLeft(el.scrollLeft > eps);
    setCanRight(el.scrollLeft < maxLeft - eps);
  }, []);

  const recomputeStep = useCallback(() => {
    const slide = firstSlideRef.current;
    if (!slide) return;
    const w = slide.getBoundingClientRect().width;
    if (!Number.isFinite(w) || w <= 0) return;
    setStep(Math.round(w + 16));
  }, []);

  const scrollByDir = useCallback(
    (dir: "left" | "right") => {
      const el = viewportRef.current;
      if (!el) return;

      const delta = dir === "left" ? -step : step;
      el.scrollBy({ left: delta, behavior: "smooth" });
    },
    [step],
  );

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    syncButtons();
    recomputeStep();

    const onScroll = () => syncButtons();
    const onResize = () => {
      syncButtons();
      recomputeStep();
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [syncButtons, recomputeStep]);

  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-[20px] font-semibold tracking-[-0.55px] text-neutral-0 sm:text-[22px]">
          Recent Activity
        </h2>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => scrollByDir("left")}
            disabled={!canLeft}
            className={clsx(
              "grid h-6 w-6 place-items-center text-neutral-200 transition",
              "hover:text-neutral-0 disabled:opacity-30 cursor-pointer",
            )}
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>

          <button
            type="button"
            onClick={() => scrollByDir("right")}
            disabled={!canRight}
            className={clsx(
              "grid h-6 w-6 place-items-center text-neutral-200 transition",
              "hover:text-neutral-0 disabled:opacity-30 cursor-pointer",
            )}
            aria-label="Scroll right"
          >
            <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>
      </div>

      <div
        ref={viewportRef}
        className={clsx(
          "mt-4 flex flex-nowrap gap-4 overflow-x-auto pb-2 no-scrollbar",
          "scroll-smooth snap-x snap-mandatory",
        )}
      >
        {ITEMS.map((it, idx) => (
          <div
            key={it.id}
            ref={idx === 0 ? firstSlideRef : undefined}
            className={clsx(
              "snap-start shrink-0",
              "w-[82vw] max-w-[280px]",
              "sm:w-[calc((100%-16px)/2)] sm:max-w-none",
              "lg:w-[calc((100%-32px)/3)]",
              "2xl:w-[calc((100%-64px)/5)]",
            )}
          >
            <ThumbCard item={it} onOpenPreview={openPreview} />
          </div>
        ))}
      </div>

      <PreviewModal
        open={previewOpen}
        item={activeItem}
        onClose={closePreview}
      />
    </section>
  );
}
