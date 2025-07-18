// src/components/sections/InstagramGallery.tsx
import React from "react";

/**
 * List every image you want to show (14 cells in the grid).
 * – Path is relative to NEXT_PUBLIC_URL, so `/dummy/foo.png` maps to /public/dummy/foo.png
 * – If you have fewer than 14 unique PNGs, just repeat some of them.
 */
const IMAGES = [
  "/dummy/event-1.png",
  "/dummy/event-2.png",
  "/dummy/event-3.png",
  "/dummy/event-4.png",
  "/dummy/event-5.png",
  "/dummy/event-6.png",
  "/dummy/event-avalon.png",
  "/dummy/event-card-2.png",
  "/dummy/event-card-3.png",
  "/dummy/map.png",
  "/dummy/event-1.png",
  "/dummy/event-2.png",
  "/dummy/event-3.png",
  "/dummy/event-4.png",
];

/* -------------------------------------------------------------------------- */
/*  Grid slot definitions (col, row, colSpan, rowSpan)                        */
/* -------------------------------------------------------------------------- */
const POSITIONS = [
  [1, 1, 1, 1], //  0 – small
  [2, 1, 2, 2], //  1 – HERO (The Motet-like poster)
  [4, 1, 1, 1], //  2 – small
  [5, 1, 1, 1], //  3 – small
  [1, 2, 1, 1], //  4 – small
  [4, 2, 1, 1], //  5 – small
  [5, 2, 1, 1], //  6 – small
  [1, 3, 1, 1], //  7 – small
  [2, 3, 1, 1], //  8 – small
  [3, 3, 1, 1], //  9 – small
  [4, 3, 2, 2], // 10 – FEATURE (World-Pride-like poster)
  [1, 4, 1, 1], // 11 – small
  [2, 4, 1, 1], // 12 – small
  [3, 4, 1, 1], // 13 – small
] as const;

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */
export default function InstagramGallery() {
  return (
    <section className="py-20 max-w-[1440px] mx-auto px-4">
      <h2 className="mx-auto mb-8 w-full max-w-[1201px] text-2xl font-semibold text-white">
        Instagram Posts Reel
      </h2>

      <div className="grid grid-cols-2 auto-rows-[288px] md:grid-cols-5">
        {POSITIONS.map(([c, r, cs, rs], i) => (
          <div
            key={i}
            className={`
              overflow-hidden 
              md:col-start-${c} md:row-start-${r}
              md:col-span-${cs} md:row-span-${rs}
            `}
          >
            <img
              src={IMAGES[i % IMAGES.length]} // cycle if positions > images
              alt={`Gallery item ${i + 1}`}
              className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
