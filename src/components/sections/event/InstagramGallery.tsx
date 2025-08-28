// src/components/sections/InstagramGallery.tsx
"use client";

import Image from "next/image";
import React from "react";

/* -------------------------------------------------------------------------- */
/*  Assets                                                                    */
/* -------------------------------------------------------------------------- */

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

/* col, row, colSpan, rowSpan */
const POSITIONS: Readonly<[number, number, number, number][]> = [
  [1, 1, 1, 1],
  [2, 1, 2, 2], // hero
  [4, 1, 1, 1],
  [5, 1, 1, 1],
  [1, 2, 1, 1],
  [4, 2, 1, 1],
  [5, 2, 1, 1],
  [1, 3, 1, 1],
  [2, 3, 1, 1],
  [3, 3, 1, 1],
  [4, 3, 2, 2], // feature
  [1, 4, 1, 1],
  [2, 4, 1, 1],
  [3, 4, 1, 1],
];

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export default function InstagramGallery() {
  return (
    <section className="mx-auto max-w-[1440px] px-4 pb-20">
      <h2 className="mx-auto mb-8 w-full max-w-[1201px] text-2xl font-semibold text-white">
        Instagram Posts Reel
      </h2>

      <div className="grid grid-cols-2 auto-rows-[288px] md:grid-cols-5">
        {POSITIONS.map(([col, row, colSpan, rowSpan], i) => (
          <div
            key={i}
            /* Inline grid placement ─ safely typed / no Tailwind needed */
            style={{
              gridColumnStart: col,
              gridRowStart: row,
              gridColumnEnd: `span ${colSpan}`,
              gridRowEnd: `span ${rowSpan}`,
            }}
            /* `relative` ensures the fill Image knows its box,
     just in case the parent grid item ever gets `position: static` resets */
            className="relative overflow-hidden"
          >
            <Image
              src={IMAGES[i % IMAGES.length]} // make sure this 200-OKs
              alt={`Instagram post ${i + 1}`}
              fill
              sizes="(max-width: 768px) 50vw, 20vw"
              className="object-cover transition-transform duration-300 hover:scale-105"
              priority={i < 3} // optional: eager-load first few
            />
          </div>
        ))}
      </div>
    </section>
  );
}
