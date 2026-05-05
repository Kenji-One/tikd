/* -------------------------------------------------------------------------- */
/*  src/components/sections/Landing/HeroSection.tsx                           */
/* -------------------------------------------------------------------------- */
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Image from "next/image";
import clsx from "classnames";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";

/* -------------------------------------------------------------------------- */
/*  Types & fallback data                                                     */
/* -------------------------------------------------------------------------- */

interface Slide {
  id: string;
  title: string;
  venue: string;
  dateLabel: string;
  img: string;
  category?: string;
}

type HeroApiEvent = {
  _id: string;
  title: string;
  location: string;
  date: string;
  image?: string;
  categories?: string[];
};

const fallbackSlides: Slide[] = [
  {
    id: "1",
    title: "Avalon NYC: Yacht Party",
    venue: "Skyport Marina – AVALON YACHT",
    dateLabel: "May 23, 2025 6:00 PM",
    img: "/dummy/event-avalon.png",
    category: "Social",
  },
  {
    id: "2",
    title: "SOL At 1 Hotel: May 25 2025",
    venue: "Brooklyn, NY",
    dateLabel: "May 25, 2025 7:00 PM",
    img: "/dummy/event-card-2.png",
    category: "Comedy",
  },
  {
    id: "3",
    title: "1 Hotel Rooftop: Aug 8 2025",
    venue: "Downtown Manhattan",
    dateLabel: "May 30, 2025 9:00 PM",
    img: "/dummy/event-card-3.png",
    category: "Party",
  },
];

const HERO_CENTER_W = 1074;
const HERO_CENTER_HALF = HERO_CENTER_W / 2;
const HERO_ARROW_GAP = 58;
const HERO_ARROW_EDGE_PAD = 22;
const SLIDE_DURATION_MS = 7000;

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function formatDateLabel(dateValue: string) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function toSlide(event: HeroApiEvent): Slide {
  return {
    id: event._id,
    title: event.title,
    venue: event.location,
    dateLabel: formatDateLabel(event.date),
    img: event.image?.trim() || "/dummy/event-avalon.png",
    category: Array.isArray(event.categories)
      ? event.categories.find(
          (value) => typeof value === "string" && value.trim(),
        )
      : undefined,
  };
}

/* -------------------------------------------------------------------------- */
/*  Main component                                                            */
/* -------------------------------------------------------------------------- */

export default function HeroSection() {
  const [idx, setIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [liveSlides, setLiveSlides] = useState<Slide[]>([]);

  const slides = useMemo(
    () => (liveSlides.length > 0 ? liveSlides : fallbackSlides),
    [liveSlides],
  );

  const total = slides.length;

  const jumpTo = useCallback(
    (i: number) => {
      if (total === 0) return;
      setIdx(((i % total) + total) % total);
      setProgress(0);
    },
    [total],
  );

  const goPrev = useCallback(() => {
    if (total <= 1) return;
    jumpTo(idx - 1);
  }, [idx, jumpTo, total]);

  const goNext = useCallback(() => {
    if (total <= 1) return;
    jumpTo(idx + 1);
  }, [idx, jumpTo, total]);

  useEffect(() => {
    const controller = new AbortController();

    const loadSlides = async () => {
      try {
        const res = await fetch("/api/events?featured=topViewed&limit=3", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        if (!res.ok) return;

        const json = (await res.json()) as HeroApiEvent[];

        if (!Array.isArray(json) || json.length === 0) return;

        const mapped = json
          .slice(0, 3)
          .map(toSlide)
          .filter((slide) => slide.title);

        if (mapped.length > 0) {
          setLiveSlides(mapped);
        }
      } catch {
        // keep fallback slides silently
      }
    };

    loadSlides();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (idx >= total) {
      setIdx(0);
      setProgress(0);
    }
  }, [idx, total]);

  useEffect(() => {
    if (total <= 1) {
      setProgress(0);
      return;
    }

    setProgress(0);

    let rafId = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const pct = Math.min(1, (now - start) / SLIDE_DURATION_MS);
      setProgress(pct * 100);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    const timeoutId = window.setTimeout(() => {
      setIdx((i) => (i + 1) % total);
    }, SLIDE_DURATION_MS);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
    };
  }, [idx, total]);

  const prev = total > 0 ? (idx - 1 + total) % total : 0;
  const next = total > 0 ? (idx + 1) % total : 0;

  return (
    <section className="relative mt-10 w-full overflow-hidden pb-2 lg:mt-16">
      {/* Mobile / Tablet */}
      <div className="px-4 sm:px-6 lg:hidden">
        <div className="relative mx-auto w-full max-w-[560px]">
          <div className="relative min-h-[520px] overflow-hidden rounded-2xl bg-[#D9D9D9]">
            <div
              className="absolute inset-0 z-0 rounded-2xl blur-[24px]"
              style={{
                backgroundImage: `url(${slides[idx]?.img})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
            <div className="absolute inset-0 z-0 rounded-2xl bg-[#08080F]/60" />

            {total > 1 && (
              <>
                <div className="pointer-events-none absolute inset-0 z-30">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-auto">
                    <ArrowButton direction="left" onClick={goPrev} />
                  </div>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-auto">
                    <ArrowButton direction="right" onClick={goNext} />
                  </div>
                </div>
              </>
            )}

            <div className="relative z-10 flex min-h-[520px] flex-col items-center px-5 pb-14 pt-6 sm:px-6">
              {slides[idx]?.category ? (
                <span className="mb-4 rounded-full border border-white/15 bg-white/8 px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-white/85">
                  {slides[idx].category}
                </span>
              ) : null}

              <div
                className={clsx(
                  "relative shrink-0 overflow-hidden rounded-xl",
                  "w-[200px] h-[250px]",
                  "sm:w-[230px] sm:h-[288px]",
                )}
              >
                <Image
                  fill
                  src={slides[idx]?.img || fallbackSlides[0].img}
                  alt={slides[idx]?.title || "Featured event"}
                  sizes="(max-width: 640px) 200px, 230px"
                  className="object-cover"
                />
              </div>

              <div className="mt-5 flex w-full flex-1 flex-col items-center justify-center text-center">
                <h1 className="max-w-[300px] text-[30px] font-black uppercase italic leading-[90%] tracking-[-1.04px] text-white sm:max-w-[380px] sm:text-[38px]">
                  {slides[idx]?.title}
                </h1>

                <div className="my-4 flex flex-wrap justify-center gap-2">
                  <Pill
                    icon={
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <path
                          d="M7.99967 7.66658C7.55765 7.66658 7.13372 7.49099 6.82116 7.17843C6.5086 6.86587 6.33301 6.44195 6.33301 5.99992C6.33301 5.55789 6.5086 5.13397 6.82116 4.82141C7.13372 4.50885 7.55765 4.33325 7.99967 4.33325C8.4417 4.33325 8.86562 4.50885 9.17819 4.82141C9.49075 5.13397 9.66634 5.55789 9.66634 5.99992C9.66634 6.21879 9.62323 6.43551 9.53947 6.63772C9.45572 6.83993 9.33295 7.02367 9.17819 7.17843C9.02342 7.33319 8.83969 7.45596 8.63748 7.53972C8.43527 7.62348 8.21854 7.66658 7.99967 7.66658ZM7.99967 1.33325C6.762 1.33325 5.57501 1.82492 4.69984 2.70009C3.82467 3.57526 3.33301 4.76224 3.33301 5.99992C3.33301 9.49992 7.99967 14.6666 7.99967 14.6666C7.99967 14.6666 12.6663 9.49992 12.6663 5.99992C12.6663 4.76224 12.1747 3.57526 11.2995 2.70009C10.4243 1.82492 9.23735 1.33325 7.99967 1.33325Z"
                          fill="white"
                        />
                      </svg>
                    }
                    text={slides[idx]?.venue || ""}
                  />
                  <Pill
                    icon={
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <path
                          stroke="currentColor"
                          d="M12.6667 4H3.33333C2.59695 4 2 4.59695 2 5.33333V12.6667C2 13.403 2.59695 14 3.33333 14H12.6667C13.403 14 14 13.403 14 12.6667V5.33333C14 4.59695 13.403 4 12.6667 4Z"
                          strokeWidth="2"
                        />
                        <path
                          stroke="currentColor"
                          d="M2 6.66667C2 5.40933 2 4.78133 2.39067 4.39067C2.78133 4 3.40933 4 4.66667 4H11.3333C12.5907 4 13.2187 4 13.6093 4.39067C14 4.78133 14 5.40933 14 6.66667H2Z"
                        />
                        <path
                          stroke="currentColor"
                          d="M4.667 2V4M11.333 2V4"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    }
                    text={slides[idx]?.dateLabel || ""}
                    color={"#9A51FF"}
                    textColor="#C7A0FF"
                  />
                </div>

                <Button>Get Tickets</Button>
              </div>
            </div>

            <div
              className="absolute bottom-0 left-0 right-0 h-[4px] overflow-hidden"
              aria-hidden
            >
              <div
                className="absolute bottom-0 left-0 top-0 bg-primary-400"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-[6px]">
              {slides.map((_, i) => {
                const isActive = i === idx;
                return (
                  <button
                    key={slides[i].id}
                    onClick={() => jumpTo(i)}
                    aria-label={`Go to slide ${i + 1}`}
                    className="h-[12px] w-[12px] p-0 focus:outline-none"
                  >
                    {isActive ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                      >
                        <circle
                          cx="6"
                          cy="6"
                          r="4"
                          stroke="white"
                          strokeWidth="4"
                        />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                      >
                        <circle
                          cx="6"
                          cy="6"
                          r="5.5"
                          stroke="white"
                          strokeOpacity="0.6"
                        />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop - original design preserved */}
      <div className="relative hidden h-[432px] w-full items-center justify-center lg:flex">
        {total > 1 && (
          <div className="pointer-events-none absolute inset-0 z-30">
            <div
              className="absolute top-1/2 -translate-y-1/2 pointer-events-auto"
              style={{
                left: `max(${HERO_ARROW_EDGE_PAD}px, calc(50% - ${HERO_CENTER_HALF}px - ${HERO_ARROW_GAP}px))`,
              }}
            >
              <ArrowButton direction="left" onClick={goPrev} />
            </div>

            <div
              className="absolute top-1/2 -translate-y-1/2 pointer-events-auto"
              style={{
                right: `max(${HERO_ARROW_EDGE_PAD}px, calc(50% - ${HERO_CENTER_HALF}px - ${HERO_ARROW_GAP}px))`,
              }}
            >
              <ArrowButton direction="right" onClick={goNext} />
            </div>
          </div>
        )}

        {total > 1 && (
          <>
            <Card
              slide={slides[prev]}
              slides={slides}
              position="left"
              className="blur-[5px] opacity-60 z-10"
              idx={idx}
              setIdx={jumpTo}
              progress={0}
            />
            <Card
              slide={slides[next]}
              slides={slides}
              position="right"
              className="blur-[5px] opacity-60 z-10"
              idx={idx}
              setIdx={jumpTo}
              progress={0}
            />
          </>
        )}

        <Card
          slide={slides[idx]}
          slides={slides}
          position="center"
          className="z-20"
          idx={idx}
          setIdx={jumpTo}
          progress={progress}
        />
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Arrow button                                                              */
/* -------------------------------------------------------------------------- */

function ArrowButton({
  direction,
  onClick,
}: {
  direction: "left" | "right";
  onClick: () => void;
}) {
  const Icon = direction === "left" ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "left" ? "Previous slide" : "Next slide"}
      className={clsx(
        "group inline-flex items-center justify-center rounded-full",
        "h-9 w-9 sm:h-10 sm:w-10",
        "border border-white/15 bg-neutral-950/55 backdrop-blur-md",
        "shadow-[0_12px_34px_rgba(0,0,0,0.40)]",
        "transform-gpu will-change-transform origin-center scale-100",
        "transition-[transform,background-color,border-color,box-shadow] duration-200 ease-out",
        "hover:bg-neutral-950/70 hover:border-white/25",
        "active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/70 cursor-pointer",
      )}
    >
      <Icon className="h-5 w-5 text-white/90 transition-transform duration-200 group-hover:scale-110 sm:h-5.5 sm:w-5.5" />
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Card component                                                            */
/* -------------------------------------------------------------------------- */

function Card({
  slide,
  slides,
  position,
  idx,
  setIdx,
  progress = 0,
  className = "",
}: {
  slide: Slide;
  slides: Slide[];
  position: "left" | "right" | "center";
  idx: number;
  setIdx: (n: number) => void;
  progress?: number;
  className?: string;
}) {
  const wrapperSize =
    position === "center" ? "w-[1074px] h-[400px]" : "w-[945.12px] h-[352px]";

  const placement =
    position === "center"
      ? "left-1/2 -translate-x-1/2"
      : position === "left"
        ? "left-0"
        : "right-0";

  const isCenter = position === "center";

  return (
    <div
      className={clsx("absolute -translate-y-1/2", placement, className)}
      style={{ top: "50%" }}
    >
      <div
        className={clsx(
          "relative max-w-full overflow-hidden rounded-2xl bg-[#D9D9D9] transition-all duration-500",
          wrapperSize,
        )}
      >
        <div
          className="absolute inset-0 z-0 rounded-2xl blur-[24px]"
          style={{
            backgroundImage: `url(${slide.img})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 z-0 rounded-2xl bg-[#08080F]/60" />

        <div className="relative z-10 flex flex-col gap-10 p-6 md:flex-row md:px-[104px] md:py-[38px]">
          <div
            className="relative shrink-0 overflow-hidden rounded-xl
                        w-[152px] h-[191px]
                        sm:w-[180px] sm:h-[225px]
                        md:w-[220px] md:h-[275px]
                        lg:w-[259px] lg:h-[324px]"
          >
            <Image
              fill
              src={slide.img}
              alt={slide.title}
              sizes="(max-width: 640px) 152px,
                     (max-width: 768px) 180px,
                     (max-width: 1024px) 220px,
                     259px"
              className="object-cover"
            />
          </div>

          <div className="mt-3 flex flex-1 flex-col items-center justify-center text-center md:mt-6 md:items-start md:justify-normal md:text-left lg:mt-8">
            <h1 className="max-w-[436px] text-3xl font-black uppercase italic leading-[90%] tracking-[-1.04px] text-white sm:text-4xl lg:text-[52px]">
              {slide.title}
            </h1>

            <div className="my-4 flex flex-wrap justify-center gap-2 md:justify-start lg:mb-6 lg:mt-[18px]">
              <Pill
                icon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <path
                      d="M7.99967 7.66658C7.55765 7.66658 7.13372 7.49099 6.82116 7.17843C6.5086 6.86587 6.33301 6.44195 6.33301 5.99992C6.33301 5.55789 6.5086 5.13397 6.82116 4.82141C7.13372 4.50885 7.55765 4.33325 7.99967 4.33325C8.4417 4.33325 8.86562 4.50885 9.17819 4.82141C9.49075 5.13397 9.66634 5.55789 9.66634 5.99992C9.66634 6.21879 9.62323 6.43551 9.53947 6.63772C9.45572 6.83993 9.33295 7.02367 9.17819 7.17843C9.02342 7.33319 8.83969 7.45596 8.63748 7.53972C8.43527 7.62348 8.21854 7.66658 7.99967 7.66658ZM7.99967 1.33325C6.762 1.33325 5.57501 1.82492 4.69984 2.70009C3.82467 3.57526 3.33301 4.76224 3.33301 5.99992C3.33301 9.49992 7.99967 14.6666 7.99967 14.6666C7.99967 14.6666 12.6663 9.49992 12.6663 5.99992C12.6663 4.76224 12.1747 3.57526 11.2995 2.70009C10.4243 1.82492 9.23735 1.33325 7.99967 1.33325Z"
                      fill="white"
                    />
                  </svg>
                }
                text={slide.venue}
              />
              <Pill
                icon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <path
                      stroke="currentColor"
                      d="M12.6667 4H3.33333C2.59695 4 2 4.59695 2 5.33333V12.6667C2 13.403 2.59695 14 3.33333 14H12.6667C13.403 14 14 13.403 14 12.6667V5.33333C14 4.59695 13.403 4 12.6667 4Z"
                      strokeWidth="2"
                    />
                    <path
                      stroke="currentColor"
                      d="M2 6.66667C2 5.40933 2 4.78133 2.39067 4.39067C2.78133 4 3.40933 4 4.66667 4H11.3333C12.5907 4 13.2187 4 13.6093 4.39067C14 4.78133 14 5.40933 14 6.66667H2Z"
                    />
                    <path
                      stroke="currentColor"
                      d="M4.667 2V4M11.333 2V4"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                }
                text={slide.dateLabel}
                color={"#9A51FF"}
                textColor="#C7A0FF"
              />
            </div>

            <Button>Get Tickets</Button>
          </div>
        </div>

        {isCenter && (
          <div
            className="absolute bottom-0 left-0 right-0 h-[4px] overflow-hidden"
            aria-hidden
          >
            <div
              className="absolute bottom-0 left-0 top-0 bg-primary-400"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {isCenter && (
          <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-[6px]">
            {slides.map((_, i) => {
              const isActive = i === idx;
              return (
                <button
                  key={slides[i].id}
                  onClick={() => setIdx(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className="h-[12px] w-[12px] p-0 focus:outline-none"
                >
                  {isActive ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                    >
                      <circle
                        cx="6"
                        cy="6"
                        r="4"
                        stroke="white"
                        strokeWidth="4"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                    >
                      <circle
                        cx="6"
                        cy="6"
                        r="5.5"
                        stroke="white"
                        strokeOpacity="0.6"
                      />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
