"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

import HeroSection from "@/components/sections/Landing/HeroSection";
import FilterBar from "@/components/ui/FilterBar";
import CategoryFilter from "@/components/ui/CategoryFilter";
import EventCarouselSection, {
  type Event,
} from "@/components/sections/Landing/EventCarouselSection";
import { EventCard } from "@/components/ui/EventCard";
import { Search, Zap } from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Demo data – plug your real API response here                              */
/* -------------------------------------------------------------------------- */
const events: Event[] = [
  {
    id: "1657675",
    title: "NYC Highschool Party",
    dateLabel: "May 23, 2025 6:00 PM",
    venue: "Brooklyn, NY",
    img: "/dummy/event-1.png",
    category: "Shows",
  },
  {
    id: "1765756",
    title: "NYC Highschool Party",
    dateLabel: "May 23, 2025 6:00 PM",
    venue: "Brooklyn, NY",
    img: "/dummy/event-2.png",
    category: "Shows",
  },
  {
    id: "1843534",
    title: "NYC Highschool Party",
    dateLabel: "May 23, 2025 6:00 PM",
    venue: "Brooklyn, NY",
    img: "/dummy/event-3.png",
    category: "Shows",
  },
  {
    id: "19867",
    title: "NYC Highschool Party",
    dateLabel: "May 23, 2025 6:00 PM",
    venue: "Brooklyn, NY",
    img: "/dummy/event-4.png",
    category: "Shows",
  },
  {
    id: "1234214",
    title: "NYC Highschool Party",
    dateLabel: "May 23, 2025 6:00 PM",
    venue: "Brooklyn, NY",
    img: "/dummy/event-5.png",
    category: "Shows",
  },

  {
    id: "24",
    title: "Senior Rave",
    dateLabel: "May 23, 2025 6:00 PM",
    venue: "Brooklyn, NY",
    img: "/dummy/event-2.png",
    category: "Party",
  },
  {
    id: "25",
    title: "Senior Rave",
    dateLabel: "May 23, 2025 6:00 PM",
    venue: "Brooklyn, NY",
    img: "/dummy/event-1.png",
    category: "Party",
  },
  {
    id: "26",
    title: "Senior Rave",
    dateLabel: "May 23, 2025 6:00 PM",
    venue: "Brooklyn, NY",
    img: "/dummy/event-4.png",
    category: "Party",
  },
  {
    id: "27",
    title: "Senior Rave",
    dateLabel: "May 23, 2025 6:00 PM",
    venue: "Brooklyn, NY",
    img: "/dummy/event-3.png",
    category: "Party",
  },
  {
    id: "28",
    title: "Senior Rave",
    dateLabel: "May 23, 2025 6:00 PM",
    venue: "Brooklyn, NY",
    img: "/dummy/event-5.png",
    category: "Party",
  },
  {
    id: "29",
    title: "Senior Rave",
    dateLabel: "May 23, 2025 6:00 PM",
    venue: "Brooklyn, NY",
    img: "/dummy/event-1.png",
    category: "Party",
  },
  {
    id: "21",
    title: "Senior Rave",
    dateLabel: "May 23, 2025 6:00 PM",
    venue: "Brooklyn, NY",
    img: "/dummy/event-2.png",
    category: "Party",
  },
  {
    id: "32",
    title: "Swim Good Open Air",
    dateLabel: "May 23, 2025 6:00 PM",
    venue: "Brooklyn, NY",
    img: "/dummy/event-3.png",
    category: "Comedy",
  },
  {
    id: "33",
    title: "Swim Good Open Air",
    dateLabel: "May 23, 2025 6:00 PM",
    venue: "Brooklyn, NY",
    img: "/dummy/event-2.png",
    category: "Comedy",
  },
  {
    id: "34",
    title: "Swim Good Open Air",
    dateLabel: "May 23, 2025 6:00 PM",
    venue: "Brooklyn, NY",
    img: "/dummy/event-5.png",
    category: "Comedy",
  },
  {
    id: "35",
    title: "Swim Good Open Air",
    dateLabel: "May 23, 2025 6:00 PM",
    venue: "Brooklyn, NY",
    img: "/dummy/event-1.png",
    category: "Comedy",
  },
  {
    id: "36",
    title: "Swim Good Open Air",
    dateLabel: "May 23, 2025 6:00 PM",
    venue: "Brooklyn, NY",
    img: "/dummy/event-4.png",
    category: "Comedy",
  },
  {
    id: "37",
    title: "Swim Good Open Air",
    dateLabel: "May 23, 2025 6:00 PM",
    venue: "Brooklyn, NY",
    img: "/dummy/event-3.png",
    category: "Comedy",
  },
  {
    id: "4",
    title: "Summer Kickoff",
    dateLabel: "May 23, 2025 6:00 PM",
    venue: "Brooklyn, NY",
    img: "/dummy/event-4.png",
    category: "Listing Party",
  },
  {
    id: "42",
    title: "Summer Kickoff",
    dateLabel: "May 23, 2025 6:00 PM",
    venue: "Brooklyn, NY",
    img: "/dummy/event-1.png",
    category: "Listing Party",
  },
  {
    id: "41",
    title: "Summer Kickoff",
    dateLabel: "May 23, 2025 6:00 PM",
    venue: "Brooklyn, NY",
    img: "/dummy/event-3.png",
    category: "Listing Party",
  },
  {
    id: "47",
    title: "Summer Kickoff",
    dateLabel: "May 23, 2025 6:00 PM",
    venue: "Brooklyn, NY",
    img: "/dummy/event-5.png",
    category: "Listing Party",
  },
  {
    id: "43",
    title: "Summer Kickoff",
    dateLabel: "May 23, 2025 6:00 PM",
    venue: "Brooklyn, NY",
    img: "/dummy/event-2.png",
    category: "Listing Party",
  },
  {
    id: "48",
    title: "Summer Kickoff",
    dateLabel: "May 23, 2025 6:00 PM",
    venue: "Brooklyn, NY",
    img: "/dummy/event-4.png",
    category: "Listing Party",
  },
  {
    id: "5",
    title: "Evol Saturdays",
    dateLabel: "May 23, 2025 6:00 PM",
    venue: "Brooklyn, NY",
    img: "/dummy/event-5.png",
    category: "Social",
  },
  {
    id: "52",
    title: "Evol Saturdays",
    dateLabel: "May 23, 2025 6:00 PM",
    venue: "Brooklyn, NY",
    img: "/dummy/event-3.png",
    category: "Social",
  },
  {
    id: "53",
    title: "Evol Saturdays",
    dateLabel: "May 23, 2025 6:00 PM",
    venue: "Brooklyn, NY",
    img: "/dummy/event-5.png",
    category: "Social",
  },
  {
    id: "54",
    title: "Evol Saturdays",
    dateLabel: "May 23, 2025 6:00 PM",
    venue: "Brooklyn, NY",
    img: "/dummy/event-1.png",
    category: "Social",
  },
  {
    id: "55",
    title: "Evol Saturdays",
    dateLabel: "May 23, 2025 6:00 PM",
    venue: "Brooklyn, NY",
    img: "/dummy/event-4.png",
    category: "Social",
  },
  {
    id: "56",
    title: "Evol Saturdays",
    dateLabel: "May 23, 2025 6:00 PM",
    venue: "Brooklyn, NY",
    img: "/dummy/event-2.png",
    category: "Social",
  },
];

/* optional: map a bespoke icon per category */ const categoryIcon: Record<
  string,
  ReactNode
> = {
  Shows: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.46356 2.74893C6.58129 2.74883 5.71669 2.9963 4.96809 3.4632C4.21948 3.9301 3.61691 4.59769 3.22889 5.39006C2.84088 6.18243 2.68298 7.06778 2.77317 7.94544C2.86336 8.82309 3.198 9.65782 3.73906 10.3547L10.3548 3.73899C9.52843 3.09574 8.51074 2.74725 7.46356 2.74893ZM11.6265 3.29228C10.8912 2.55882 9.97515 2.0327 8.97109 1.76721C7.96703 1.50172 6.91064 1.50629 5.90891 1.78046C4.90718 2.05462 3.9957 2.58865 3.26677 3.32844C2.53785 4.06824 2.01737 4.98753 1.75806 5.99321C1.49875 6.99888 1.50981 8.05523 1.79013 9.05526C2.07045 10.0553 2.61006 10.9635 3.35432 11.6878C4.09858 12.4122 5.02105 12.927 6.0283 13.1801C7.03555 13.4333 8.0918 13.4157 9.09008 13.1293L17.0895 20.2789C17.2019 20.3792 17.3485 20.4327 17.4991 20.4283C17.6497 20.4239 17.7929 20.362 17.8992 20.2553L20.2565 17.8981C20.3627 17.7916 20.4242 17.6485 20.4283 17.4982C20.4325 17.3479 20.379 17.2017 20.2789 17.0895L13.1293 9.09004C13.2778 8.57379 13.3568 8.02808 13.3568 7.46351C13.3579 6.68939 13.2061 5.92268 12.91 5.20744C12.6138 4.4922 12.1793 3.84255 11.6312 3.29582C11.6289 3.29582 11.6277 3.29346 11.6265 3.29228ZM11.1881 4.57229L4.57235 11.188C5.47942 11.8932 6.61275 12.2428 7.75943 12.1713C8.90611 12.0998 9.9872 11.612 10.7996 10.7996C11.612 9.98716 12.0998 8.90606 12.1713 7.75938C12.2428 6.6127 11.8932 5.47936 11.1881 4.57229ZM12.6307 10.3005C12.0901 11.2821 11.2821 12.0901 10.3005 12.6307L17.4596 19.0284L19.0284 17.4596L12.6307 10.3005Z"
        fill="white"
      />
    </svg>
  ),
  Party: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="23"
      viewBox="0 0 22 23"
      fill="none"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11 2.12537C11.1488 2.12537 11.2916 2.18745 11.3968 2.29796C11.5021 2.40847 11.5612 2.55836 11.5612 2.71465V4.50371C13.5912 4.65635 15.4856 5.63012 16.8456 7.22C18.2055 8.80987 18.9248 10.8918 18.8521 13.0274C18.7794 15.163 17.9202 17.1857 16.4556 18.6695C14.991 20.1533 13.0352 20.9825 11 20.9825C8.96474 20.9825 7.00892 20.1533 5.54431 18.6695C4.0797 17.1857 3.22058 15.163 3.14785 13.0274C3.07511 10.8918 3.79444 8.80987 5.15437 7.22C6.5143 5.63012 8.40871 4.65635 10.4387 4.50371V2.71465C10.4387 2.55836 10.4979 2.40847 10.6031 2.29796C10.7084 2.18745 10.8511 2.12537 11 2.12537ZM4.3865 11.3877C4.22347 12.276 4.22347 13.1888 4.3865 14.0772C5.48201 14.419 6.59436 14.6759 7.71568 14.8432C7.60456 13.4384 7.60456 12.0265 7.71568 10.6204C6.59436 10.789 5.48201 11.0447 4.3865 11.3865V11.3877ZM4.76589 10.0512C5.77946 9.76835 6.8065 9.5562 7.83915 9.4136C7.97384 8.32932 8.17701 7.25094 8.44527 6.18669C7.61914 6.5435 6.86859 7.06876 6.23704 7.7321C5.60548 8.39543 5.10546 9.18366 4.76589 10.0512ZM9.71925 5.78834C9.39374 6.93862 9.14905 8.10657 8.98966 9.28396C10.3276 9.16728 11.6723 9.16728 13.0114 9.28396C12.8509 8.10657 12.6073 6.93862 12.2818 5.78834C11.4354 5.61703 10.5656 5.61703 9.71925 5.78834ZM13.5535 6.18669C13.8229 7.25094 14.025 8.32932 14.1608 9.4136C15.1934 9.55503 16.2205 9.76834 17.234 10.05C16.8942 9.18259 16.394 8.39452 15.7622 7.73139C15.1305 7.06826 14.3798 6.54324 13.5535 6.18669ZM17.6134 11.3877C16.5231 11.0468 15.4104 10.7908 14.2842 10.6216C14.3954 12.0265 14.3954 13.4384 14.2842 14.8444C15.4067 14.6759 16.5179 14.4201 17.6134 14.0783C17.7765 13.1896 17.7765 12.2764 17.6134 11.3877ZM17.234 15.4137C16.2205 15.6965 15.1934 15.9087 14.1608 16.0513C14.0261 17.1355 13.8229 18.2139 13.5547 19.2782C14.3808 18.9213 15.1313 18.396 15.7628 17.7327C16.3944 17.0694 16.8944 16.2812 17.234 15.4137ZM12.2807 19.6765C12.6062 18.5262 12.8509 17.3583 13.0103 16.1809C11.6723 16.2976 10.3276 16.2976 8.98854 16.1809C9.14905 17.3583 9.39262 18.5262 9.71813 19.6765C10.5645 19.8477 11.4343 19.8477 12.2807 19.6765ZM8.4464 19.2782C8.17701 18.2139 7.97497 17.1355 7.83915 16.0513C6.8065 15.9098 5.77946 15.6965 4.76589 15.4148C5.10571 16.2823 5.60596 17.0703 6.23771 17.7335C6.86946 18.3966 7.62016 18.9216 8.4464 19.2782ZM8.85497 14.9847C10.2816 15.1249 11.7172 15.1249 13.145 14.9847C13.2776 13.4864 13.2776 11.9785 13.145 10.4802C11.718 10.3408 10.2819 10.3408 8.85497 10.4802C8.72227 11.9785 8.72227 13.4864 8.85497 14.9847Z"
        fill="white"
      />
    </svg>
  ),
  Comedy: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="23"
      viewBox="0 0 22 23"
      fill="none"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11 2.85801C9.91658 2.85801 8.84378 3.07141 7.84284 3.48601C6.84191 3.90061 5.93244 4.5083 5.16635 5.27438C4.40027 6.04047 3.79258 6.94994 3.37798 7.95088C2.96337 8.95181 2.74998 10.0246 2.74998 11.108C2.74998 12.1914 2.96337 13.2642 3.37798 14.2652C3.79258 15.2661 4.40027 16.1756 5.16635 16.9416C5.93244 17.7077 6.84191 18.3154 7.84284 18.73C8.84378 19.1446 9.91658 19.358 11 19.358C13.188 19.358 15.2864 18.4888 16.8336 16.9416C18.3808 15.3945 19.25 13.2961 19.25 11.108C19.25 8.91998 18.3808 6.82156 16.8336 5.27438C15.2864 3.72721 13.188 2.85801 11 2.85801ZM1.57141 11.108C1.57141 8.6074 2.56478 6.20921 4.33298 4.44101C6.10118 2.67281 8.49937 1.67944 11 1.67944C13.5006 1.67944 15.8988 2.67281 17.667 4.44101C19.4352 6.20921 20.4286 8.6074 20.4286 11.108C20.4286 13.6086 19.4352 16.0068 17.667 17.775C15.8988 19.5432 13.5006 20.5366 11 20.5366C8.49937 20.5366 6.10118 19.5432 4.33298 17.775C2.56478 16.0068 1.57141 13.6086 1.57141 11.108ZM7.04705 5.97651C7.10179 5.92164 7.16682 5.8781 7.23841 5.84839C7.31001 5.81868 7.38676 5.80339 7.46427 5.80339C7.54178 5.80339 7.61853 5.81868 7.69012 5.84839C7.76171 5.8781 7.82674 5.92164 7.88148 5.97651L9.06005 7.15509C9.11493 7.20983 9.15847 7.27485 9.18818 7.34645C9.21789 7.41804 9.23318 7.49479 9.23318 7.5723C9.23318 7.64981 9.21789 7.72656 9.18818 7.79815C9.15847 7.86975 9.11493 7.93478 9.06005 7.98952L7.88148 9.16809C7.77083 9.27874 7.62075 9.3409 7.46427 9.3409C7.30778 9.3409 7.15771 9.27874 7.04705 9.16809C6.9364 9.05743 6.87424 8.90736 6.87424 8.75087C6.87424 8.59439 6.9364 8.44431 7.04705 8.33366L7.80959 7.5723L7.04705 6.81094C6.99218 6.7562 6.94864 6.69117 6.91893 6.61958C6.88922 6.54799 6.87393 6.47124 6.87393 6.39373C6.87393 6.31622 6.88922 6.23947 6.91893 6.16788C6.94864 6.09628 6.99218 6.03125 7.04705 5.97651ZM14.9529 5.97651C15.0078 6.03125 15.0513 6.09628 15.081 6.16788C15.1107 6.23947 15.126 6.31622 15.126 6.39373C15.126 6.47124 15.1107 6.54799 15.081 6.61958C15.0513 6.69117 15.0078 6.7562 14.9529 6.81094L14.1904 7.5723L14.9529 8.33366C15.0636 8.44431 15.1257 8.59439 15.1257 8.75087C15.1257 8.90736 15.0636 9.05743 14.9529 9.16809C14.8423 9.27874 14.6922 9.3409 14.5357 9.3409C14.3792 9.3409 14.2291 9.27874 14.1185 9.16809L12.9399 7.98952C12.885 7.93478 12.8415 7.86975 12.8118 7.79815C12.7821 7.72656 12.7668 7.64981 12.7668 7.5723C12.7668 7.49479 12.7821 7.41804 12.8118 7.34645C12.8415 7.27485 12.885 7.20983 12.9399 7.15509L14.1185 5.97651C14.1732 5.92164 14.2383 5.8781 14.3098 5.84839C14.3814 5.81868 14.4582 5.80339 14.5357 5.80339C14.6132 5.80339 14.69 5.81868 14.7616 5.84839C14.8331 5.8781 14.8982 5.92164 14.9529 5.97651ZM5.25563 11.306C5.31093 11.2437 5.37881 11.1939 5.45479 11.1598C5.53077 11.1256 5.61312 11.108 5.69641 11.108H16.3036C16.3869 11.1079 16.4692 11.1255 16.5452 11.1596C16.6213 11.1937 16.6892 11.2435 16.7445 11.3058C16.7999 11.368 16.8414 11.4413 16.8664 11.5208C16.8913 11.6002 16.8991 11.6841 16.8893 11.7668C16.7184 13.2087 16.0244 14.5378 14.9389 15.5021C13.8535 16.4665 12.452 16.9991 11 16.9991C9.54801 16.9991 8.14649 16.4665 7.06104 15.5021C5.97558 14.5378 5.28162 13.2087 5.11066 11.7668C5.10089 11.6841 5.10876 11.6003 5.13375 11.5209C5.15874 11.4415 5.20028 11.3682 5.25563 11.306ZM6.40709 12.2866C6.67599 13.2994 7.27216 14.195 8.10282 14.8339C8.93348 15.4728 9.95204 15.8192 11 15.8192C12.0479 15.8192 13.0665 15.4728 13.8971 14.8339C14.7278 14.195 15.324 13.2994 15.5929 12.2866H6.40709Z"
        fill="white"
      />
    </svg>
  ),
  Social: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M1 1.87931C1 1.77871 1.03951 1.68223 1.10984 1.6111C1.18016 1.53996 1.27554 1.5 1.375 1.5H8.875C8.97446 1.5 9.06984 1.53996 9.14017 1.6111C9.21049 1.68223 9.25 1.77871 9.25 1.87931V7.94828C9.25 8.04887 9.21049 8.14535 9.14017 8.21649C9.06984 8.28762 8.97446 8.32759 8.875 8.32759H5.98225L3.07375 10.1665C3.01699 10.2024 2.95176 10.2222 2.88484 10.224C2.81793 10.2258 2.75176 10.2094 2.69321 10.1766C2.63466 10.1438 2.58587 10.0957 2.55189 10.0373C2.51792 9.97901 2.5 9.91254 2.5 9.84483V8.32759H1.375C1.27554 8.32759 1.18016 8.28762 1.10984 8.21649C1.03951 8.14535 1 8.04887 1 7.94828V1.87931ZM1.75 2.25862V7.56896H2.875C2.97446 7.56896 3.06984 7.60893 3.14016 7.68006C3.21049 7.7512 3.25 7.84768 3.25 7.94828V9.16055L5.67625 7.62662C5.73585 7.58894 5.80472 7.56896 5.875 7.56896H8.5V2.25862H1.75ZM10 4.15517C10 4.05457 10.0395 3.95809 10.1098 3.88696C10.1802 3.81582 10.2755 3.77586 10.375 3.77586H12.625C12.7245 3.77586 12.8198 3.81582 12.8902 3.88696C12.9605 3.95809 13 4.05457 13 4.15517V10.2241C13 10.3247 12.9605 10.4212 12.8902 10.4924C12.8198 10.5635 12.7245 10.6034 12.625 10.6034H11.5V12.1207C11.5 12.1884 11.4821 12.2549 11.4481 12.3132C11.4141 12.3716 11.3653 12.4196 11.3068 12.4525C11.2482 12.4853 11.1821 12.5016 11.1152 12.4999C11.0482 12.4981 10.983 12.4782 10.9263 12.4423L8.01775 10.6034H5.875C5.77554 10.6034 5.68016 10.5635 5.60983 10.4924C5.53951 10.4212 5.5 10.3247 5.5 10.2241C5.5 10.1235 5.53951 10.0271 5.60983 9.95592C5.68016 9.88479 5.77554 9.84483 5.875 9.84483H8.125C8.19528 9.84483 8.26415 9.8648 8.32375 9.90248L10.75 11.4364V10.2241C10.75 10.1235 10.7895 10.0271 10.8598 9.95592C10.9302 9.88479 11.0255 9.84483 11.125 9.84483H12.25V4.53448H10.375C10.2755 4.53448 10.1802 4.49452 10.1098 4.42339C10.0395 4.35225 10 4.25577 10 4.15517Z"
        fill="white"
      />
    </svg>
  ),
  "Listing Party": (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
    >
      <path
        d="M8.07728 12.7916L1.79156 6.50591V1.79163H6.50585L12.7916 8.07734L8.07728 12.7916Z"
        stroke="white"
        strokeWidth="0.8"
        strokeLinecap="square"
      />
      <path
        d="M4.79156 3.79163C5.05678 3.79163 5.31114 3.89698 5.49867 4.08452C5.68621 4.27206 5.79157 4.52641 5.79157 4.79163C5.79157 5.05684 5.68621 5.3112 5.49867 5.49873C5.31114 5.68627 5.05678 5.79163 4.79156 5.79163C4.52635 5.79163 4.27199 5.68627 4.08446 5.49873C3.89692 5.3112 3.79156 5.05684 3.79156 4.79163C3.79156 4.52641 3.89692 4.27206 4.08446 4.08452C4.27199 3.89698 4.52635 3.79163 4.79156 3.79163Z"
        stroke="white"
        strokeWidth="0.8"
        strokeLinecap="square"
      />
    </svg>
  ),
};

/* -------------------------------------------------------------------------- */
/*  Helpers for Live Events (API → Carousel adapter)                          */
/* -------------------------------------------------------------------------- */
type BackendEvent = {
  _id: string;
  title: string;
  date: string; // ISO from Mongo
  location: string;
  image?: string;
};

const fmtDateLabel = (iso: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));

const toCarouselEvent = (e: BackendEvent): Event => ({
  id: e._id,
  title: e.title,
  dateLabel: fmtDateLabel(e.date),
  venue: e.location,
  img: e.image || "/dummy/event-1.png",
  category: "Live",
});

const GRID_MIN_CARD_W = 220;
const GRID_GAP_PX = 16; // gap-4
const GRID_MAX_COLS = 6;

const getSidePadding = (winW: number) => {
  // Must match your page paddings: px-4 | sm:px-6 | lg:px-[120px]
  if (winW >= 1024) return 120;
  if (winW >= 640) return 24;
  return 16;
};

const calcGridCols = (winW: number) => {
  const side = getSidePadding(winW);
  const safe = Math.max(0, winW - side * 2);

  // how many columns can fit at the MIN card width (including gaps)
  const colsAtMin = Math.floor(
    (safe + GRID_GAP_PX) / (GRID_MIN_CARD_W + GRID_GAP_PX)
  );

  // clamp: 1..6
  return Math.min(GRID_MAX_COLS, Math.max(1, colsAtMin));
};

export default function EventsPage() {
  const [winW, setWinW] = useState(() =>
    typeof window === "undefined" ? 1200 : window.innerWidth
  );

  useEffect(() => {
    const onResize = () => setWinW(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const gridTemplateColumns = useMemo(() => {
    const cols = calcGridCols(winW);

    // ✅ Fixed column count (<=6), so cards never stretch when there are fewer items.
    // ✅ Uses minmax(220px, 1fr), so when cols drops (5/4/3...), it wraps naturally.
    return `repeat(${cols}, minmax(${GRID_MIN_CARD_W}px, 1fr))`;
  }, [winW]);

  // 1️⃣ live events from API (auth required; hide if 401/no data)
  const { data: liveEvents = [] } = useQuery({
    queryKey: ["live-events"],
    queryFn: async (): Promise<Event[]> => {
      const res = await fetch("/api/events", { method: "GET" });
      if (!res.ok) {
        if (res.status === 401) return [];
        throw new Error(await res.text());
      }
      const json = (await res.json()) as BackendEvent[];
      return json
        .slice()
        .sort((a, b) => +new Date(a.date) - +new Date(b.date))
        .map(toCarouselEvent);
    },
    staleTime: 60_000,
  });

  // 2️⃣ track which category is active
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const setCategoryAndScrollTop = useCallback((cat: string) => {
    setSelectedCategory(cat);

    const behavior: ScrollBehavior = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
      ? "auto"
      : "smooth";

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior });
      });
    });
  }, []);

  // 3️⃣ memoize grouping for the “All” case (dummy dataset)
  const eventsByCategory = useMemo(() => {
    return events.reduce<Record<string, Event[]>>((acc, ev) => {
      (acc[ev.category] ??= []).push(ev);
      return acc;
    }, {});
  }, []);

  // 4️⃣ grab all items when a single category is picked (dummy dataset)
  const filteredEvents =
    selectedCategory === "All"
      ? []
      : events.filter((ev) => ev.category === selectedCategory);

  return (
    <>
      <HeroSection />
      <FilterBar />

      {/* category filter */}
      <div className="w-full px-4 sm:px-6 lg:px-[120px] flex justify-center">
        <CategoryFilter
          selected={selectedCategory}
          onSelect={setCategoryAndScrollTop}
        />
      </div>

      {/* carousels */}
      <main className="w-full py-12">
        {/* ─── Live Events (real data) – shown when available ───────── */}
        {liveEvents.length > 0 && (
          <EventCarouselSection
            title="Live Events"
            icon={<Zap className="text-white" size={22} />}
            events={liveEvents}
            onViewAll={() => setCategoryAndScrollTop("All")}
            isCarousel={false}
          />
        )}

        {selectedCategory === "All" ? (
          Object.entries(eventsByCategory).map(([cat, list]) => (
            <EventCarouselSection
              key={cat}
              title={cat}
              icon={categoryIcon[cat] ?? <Search size={22} />}
              events={list}
              onViewAll={() => setCategoryAndScrollTop(cat)}
              isCarousel={false}
            />
          ))
        ) : (
          <section className="mb-16 px-4 sm:px-6 lg:px-[120px]">
            <div className="mb-6 flex items-center gap-3">
              <span className="inline-flex items-center justify-center text-white [&_svg]:h-7 [&_svg]:w-7">
                {categoryIcon[selectedCategory] ?? (
                  <Search className="h-7 w-7" />
                )}
              </span>
              <h2 className="text-2xl font-semibold text-neutral-0">
                {selectedCategory}
              </h2>
            </div>

            <div
              className="grid w-full gap-4 group/row transition-all duration-300"
              style={{ gridTemplateColumns }}
            >
              {filteredEvents.map((ev) => (
                <div key={ev.id} className="cursor-pointer">
                  <EventCard {...ev} className="h-full w-full" />
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
