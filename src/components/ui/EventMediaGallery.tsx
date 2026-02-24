// src/components/ui/EventMediaGallery.tsx
"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type EventMediaType = "image" | "video";

export type EventMediaItem = {
  url: string;
  type: EventMediaType;
  caption?: string;
  sortOrder?: number;
};

function safeTrim(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function sortByOrder(a: EventMediaItem, b: EventMediaItem): number {
  const ao = typeof a.sortOrder === "number" ? a.sortOrder : 0;
  const bo = typeof b.sortOrder === "number" ? b.sortOrder : 0;
  if (ao !== bo) return ao - bo;
  return safeTrim(a.url).localeCompare(safeTrim(b.url));
}

function isDirectVideoUrl(url: string): boolean {
  const u = url.toLowerCase();
  return (
    u.endsWith(".mp4") ||
    u.endsWith(".webm") ||
    u.endsWith(".ogg") ||
    u.includes(".mp4?") ||
    u.includes(".webm?") ||
    u.includes(".ogg?")
  );
}

function getYouTubeId(url: string): string | null {
  const raw = safeTrim(url);
  if (!raw) return null;

  try {
    const u = new URL(raw);

    // youtu.be/<id>
    if (u.hostname === "youtu.be") {
      const id = u.pathname.replace("/", "").trim();
      return id ? id : null;
    }

    // youtube.com/watch?v=<id>
    if (
      u.hostname.endsWith("youtube.com") ||
      u.hostname.endsWith("youtube-nocookie.com")
    ) {
      const path = u.pathname;

      if (path === "/watch") {
        const id = u.searchParams.get("v")?.trim() ?? "";
        return id || null;
      }

      // /embed/<id>
      if (path.startsWith("/embed/")) {
        const id = path.replace("/embed/", "").split("/")[0]?.trim() ?? "";
        return id || null;
      }

      // /shorts/<id>
      if (path.startsWith("/shorts/")) {
        const id = path.replace("/shorts/", "").split("/")[0]?.trim() ?? "";
        return id || null;
      }
    }

    return null;
  } catch {
    // Non-URL strings: try basic patterns
    const m1 = raw.match(/v=([a-zA-Z0-9_-]{6,})/);
    if (m1?.[1]) return m1[1];

    const m2 = raw.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/);
    if (m2?.[1]) return m2[1];

    const m3 = raw.match(/\/embed\/([a-zA-Z0-9_-]{6,})/);
    if (m3?.[1]) return m3[1];

    return null;
  }
}

function ChevronLeftIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M15 18l-6-6 6-6"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Dot({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={[
        "h-2.5 w-2.5 rounded-full transition cursor-pointer",
        active
          ? "bg-white/80"
          : "bg-white/20 hover:bg-white/35 active:bg-white/30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25",
      ].join(" ")}
    />
  );
}

function VideoCard({ item, index }: { item: EventMediaItem; index: number }) {
  const url = safeTrim(item.url);
  if (!url) return null;

  const ytId = getYouTubeId(url);

  const title = item.caption?.trim()
    ? item.caption.trim()
    : `Event video ${index + 1}`;

  return (
    <figure className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/25">
      <div className="relative aspect-video">
        {ytId ? (
          <iframe
            src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`}
            title={title}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : isDirectVideoUrl(url) ? (
          // uploaded/hosted video file (Cloudinary, S3, etc.)
          <video
            className="absolute inset-0 h-full w-full object-cover"
            controls
            playsInline
            preload="metadata"
          >
            <source src={url} />
            Your browser does not support the video tag.
          </video>
        ) : (
          // fallback: treat as embeddable iframe link (e.g. already an embed URL)
          <iframe
            src={url}
            title={title}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        )}

        <div className="pointer-events-none absolute inset-0 ring-1 ring-white/10" />
      </div>

      {item.caption?.trim() ? (
        <figcaption className="px-4 py-3 text-sm text-white/75">
          {item.caption.trim()}
        </figcaption>
      ) : null}
    </figure>
  );
}

function ImageCarousel({ items }: { items: EventMediaItem[] }) {
  const images = items.filter((x) => safeTrim(x.url)).sort(sortByOrder);
  const count = images.length;

  const [idx, setIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIdx(0);
  }, [count]);

  const goPrev = useCallback(() => {
    setIdx((i) => (count <= 1 ? 0 : (i - 1 + count) % count));
  }, [count]);

  const goNext = useCallback(() => {
    setIdx((i) => (count <= 1 ? 0 : (i + 1) % count));
  }, [count]);

  const current = useMemo(() => images[idx], [images, idx]);

  if (count === 0 || !current) return null;

  return (
    <div
      ref={wrapRef}
      tabIndex={0}
      onKeyDown={(e) => {
        if (count <= 1) return;
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          goPrev();
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          goNext();
        }
      }}
      className={[
        "overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/25",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
      ].join(" ")}
      aria-label="Event photo gallery"
    >
      <div className="relative aspect-[16/9]">
        <Image
          fill
          src={current.url}
          alt={current.caption?.trim() || `Event photo ${idx + 1}`}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 720px, 760px"
          className="object-cover"
        />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
        <div className="pointer-events-none absolute inset-0 ring-1 ring-white/10" />

        {count > 1 ? (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous photo"
              className={[
                "absolute left-3 top-1/2 -translate-y-1/2",
                "grid size-10 place-items-center rounded-full",
                "border border-white/12 bg-black/30 backdrop-blur-md cursor-pointer",
                "text-white/90 hover:bg-black/40 hover:text-white",
                "shadow-[0_18px_50px_rgba(0,0,0,0.55)]",
                "transition",
                "active:scale-[0.98]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25",
              ].join(" ")}
            >
              <ChevronLeftIcon />
            </button>

            <button
              type="button"
              onClick={goNext}
              aria-label="Next photo"
              className={[
                "absolute right-3 top-1/2 -translate-y-1/2",
                "grid size-10 place-items-center rounded-full",
                "border border-white/12 bg-black/30 backdrop-blur-md cursor-pointer",
                "text-white/90 hover:bg-black/40 hover:text-white",
                "shadow-[0_18px_50px_rgba(0,0,0,0.55)]",
                "transition",
                "active:scale-[0.98]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25",
              ].join(" ")}
            >
              <ChevronRightIcon />
            </button>
          </>
        ) : null}
      </div>

      {/* Caption + dots */}
      <div className="px-4 py-3">
        {current.caption?.trim() ? (
          <div className="text-sm text-white/75">{current.caption.trim()}</div>
        ) : null}

        {count > 1 ? (
          <div className="flex items-center justify-center gap-2">
            {images.map((_, i) => (
              <Dot
                key={i}
                active={i === idx}
                onClick={() => setIdx(i)}
                label={`Go to photo ${i + 1}`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function EventMediaGallery({
  items,
}: {
  items: EventMediaItem[];
}) {
  const cleaned = useMemo(() => {
    return (Array.isArray(items) ? items : [])
      .map((x) => ({
        url: safeTrim(x?.url),
        type: x?.type === "video" ? ("video" as const) : ("image" as const),
        caption: safeTrim(x?.caption) || undefined,
        sortOrder: typeof x?.sortOrder === "number" ? x.sortOrder : undefined,
      }))
      .filter((x) => x.url);
  }, [items]);

  const videos = useMemo(
    () => cleaned.filter((x) => x.type === "video").sort(sortByOrder),
    [cleaned],
  );
  const images = useMemo(
    () => cleaned.filter((x) => x.type === "image").sort(sortByOrder),
    [cleaned],
  );

  if (videos.length === 0 && images.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Videos / YouTube embeds (one-by-one) */}
      {videos.length > 0 ? (
        <div className="space-y-4">
          {videos.map((v, i) => (
            <VideoCard key={`${v.url}-${i}`} item={v} index={i} />
          ))}
        </div>
      ) : null}

      {/* Images as carousel */}
      {images.length > 0 ? <ImageCarousel items={images} /> : null}
    </div>
  );
}
