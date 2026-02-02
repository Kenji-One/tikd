/* ------------------------------------------------------------------ */
/*  src/components/dashboard/Sidebar.tsx                              */
/* ------------------------------------------------------------------ */
"use client";

import type { ReactElement, ElementType } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import {
  Landmark,
  Building2,
  ChevronDown,
  DollarSign,
  Eye,
  UserRound,
  Users,
  Users2,
  ChevronLeft,
  Sparkles,
  Type as TypeIcon,
  MessageCircleMore,
  Megaphone,
  ContactRound,
} from "lucide-react";

import FeedbackBugModal from "@/components/ui/FeedbackBugModal";

/* ------------------------------- Icons ----------------------------- */
/**
 * NOTE:
 * Per your request, ALL custom SVG icon implementations are placeholders.
 * Replace the <svg></svg> contents with your real paths later.
 */

type IconProps = { className?: string };

function DashboardIcon({ className }: IconProps): ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M10 13H3C2.73478 13 2.48043 13.1054 2.29289 13.2929C2.10536 13.4804 2 13.7348 2 14V21C2 21.2652 2.10536 21.5196 2.29289 21.7071C2.48043 21.8946 2.73478 22 3 22H10C10.2652 22 10.5196 21.8946 10.7071 21.7071C10.8946 21.5196 11 21.2652 11 21V14C11 13.7348 10.8946 13.4804 10.7071 13.2929C10.5196 13.1054 10.2652 13 10 13ZM9 20H4V15H9V20ZM21 2H14C13.7348 2 13.4804 2.10536 13.2929 2.29289C13.1054 2.48043 13 2.73478 13 3V10C13 10.2652 13.1054 10.5196 13.2929 10.7071C13.4804 10.8946 13.7348 11 14 11H21C21.2652 11 21.5196 10.8946 21.7071 10.7071C21.8946 10.5196 22 10.2652 22 10V3C22 2.73478 21.8946 2.48043 21.7071 2.29289C21.5196 2.10536 21.2652 2 21 2ZM20 9H15V4H20V9ZM21 13H14C13.7348 13 13.4804 13.1054 13.2929 13.2929C13.1054 13.4804 13 13.7348 13 14V21C13 21.2652 13.1054 21.5196 13.2929 21.7071C13.4804 21.8946 13.7348 22 14 22H21C21.2652 22 21.5196 21.8946 21.7071 21.7071C21.8946 21.5196 22 21.2652 22 21V14C22 13.7348 21.8946 13.4804 21.7071 13.2929C21.5196 13.1054 21.2652 13 21 13ZM20 20H15V15H20V20ZM10 2H3C2.73478 2 2.48043 2.10536 2.29289 2.29289C2.10536 2.48043 2 2.73478 2 3V10C2 10.2652 2.10536 10.5196 2.29289 10.7071C2.48043 10.8946 2.73478 11 3 11H10C10.2652 11 10.5196 10.8946 10.7071 10.7071C10.8946 10.5196 11 10.2652 11 10V3C11 2.73478 10.8946 2.48043 10.7071 2.29289C10.5196 2.10536 10.2652 2 10 2ZM9 9H4V4H9V9Z"
        fill="currentColor"
      />
    </svg>
  );
}
function TicketIcon({ className }: IconProps): ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M9 10C8.73478 10 8.48043 10.1054 8.29289 10.2929C8.10536 10.4804 8 10.7348 8 11V13C8 13.2652 8.10536 13.5196 8.29289 13.7071C8.48043 13.8946 8.73478 14 9 14C9.26522 14 9.51957 13.8946 9.70711 13.7071C9.89464 13.5196 10 13.2652 10 13V11C10 10.7348 9.89464 10.4804 9.70711 10.2929C9.51957 10.1054 9.26522 10 9 10ZM21 11C21.2652 11 21.5196 10.8946 21.7071 10.7071C21.8946 10.5196 22 10.2652 22 10V6C22 5.73478 21.8946 5.48043 21.7071 5.29289C21.5196 5.10536 21.2652 5 21 5H3C2.73478 5 2.48043 5.10536 2.29289 5.29289C2.10536 5.48043 2 5.73478 2 6V10C2 10.2652 2.10536 10.5196 2.29289 10.7071C2.48043 10.8946 2.73478 11 3 11C3.26522 11 3.51957 11.1054 3.70711 11.2929C3.89464 11.4804 4 11.7348 4 12C4 12.2652 3.89464 12.5196 3.70711 12.7071C3.51957 12.8946 3.26522 13 3 13C2.73478 13 2.48043 13.1054 2.29289 13.2929C2.10536 13.4804 2 13.7348 2 14V18C2 18.2652 2.10536 18.5196 2.29289 18.7071C2.48043 18.8946 2.73478 19 3 19H21C21.2652 19 21.5196 18.8946 21.7071 18.7071C21.8946 18.5196 22 18.2652 22 18V14C22 13.7348 21.8946 13.4804 21.7071 13.2929C21.5196 13.1054 21.2652 13 21 13C20.7348 13 20.4804 12.8946 20.2929 12.7071C20.1054 12.5196 20 12.2652 20 12C20 11.7348 20.1054 11.4804 20.2929 11.2929C20.4804 11.1054 20.7348 11 21 11ZM20 9.18C19.4208 9.3902 18.9205 9.77363 18.5668 10.2782C18.2132 10.7827 18.0235 11.3839 18.0235 12C18.0235 12.6161 18.2132 13.2173 18.5668 13.7218C18.9205 14.2264 19.4208 14.6098 20 14.82V17H10C10 16.7348 9.89464 16.4804 9.70711 16.2929C9.51957 16.1054 9.26522 16 9 16C8.73478 16 8.48043 16.1054 8.29289 16.2929C8.10536 16.4804 8 16.7348 8 17H4V14.82C4.57915 14.6098 5.07954 14.2264 5.43316 13.7218C5.78678 13.2173 5.97648 12.6161 5.97648 12C5.97648 11.3839 5.78678 10.7827 5.43316 10.2782C5.07954 9.77363 4.57915 9.3902 4 9.18V7H8C8 7.26522 8.10536 7.51957 8.29289 7.70711C8.48043 7.89464 8.73478 8 9 8C9.26522 8 9.51957 7.89464 9.70711 7.70711C9.89464 7.51957 10 7.26522 10 7H20V9.18Z"
        fill="currentColor"
      />
    </svg>
  );
}
function DataIcon({ className }: IconProps): ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M6 13H2C1.73478 13 1.48043 13.1054 1.29289 13.2929C1.10536 13.4804 1 13.7348 1 14V22C1 22.2652 1.10536 22.5196 1.29289 22.7071C1.48043 22.8946 1.73478 23 2 23H6C6.26522 23 6.51957 22.8946 6.70711 22.7071C6.89464 22.5196 7 22.2652 7 22V14C7 13.7348 6.89464 13.4804 6.70711 13.2929C6.51957 13.1054 6.26522 13 6 13ZM5 21H3V15H5V21ZM22 9H18C17.7348 9 17.4804 9.10536 17.2929 9.29289C17.1054 9.48043 17 9.73478 17 10V22C17 22.2652 17.1054 22.5196 17.2929 22.7071C17.4804 22.8946 17.7348 23 18 23H22C22.2652 23 22.5196 22.8946 22.7071 22.7071C22.8946 22.5196 23 22.2652 23 22V10C23 9.73478 22.8946 9.48043 22.7071 9.29289C22.5196 9.10536 22.2652 9 22 9ZM21 21H19V11H21V21ZM14 1H10C9.73478 1 9.48043 1.10536 9.29289 1.29289C9.10536 1.48043 9 1.73478 9 2V22C9 22.2652 9.10536 22.5196 9.29289 22.7071C9.48043 22.8946 9.73478 23 10 23H14C14.2652 23 14.5196 22.8946 14.7071 22.7071C14.8946 22.5196 15 22.2652 15 22V2C15 1.73478 14.8946 1.48043 14.7071 1.29289C14.5196 1.10536 14.2652 1 14 1ZM13 21H11V3H13V21Z"
        fill="currentColor"
      />
    </svg>
  );
}
function ConnectionIcon({ className }: IconProps): ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M12.3 12.22C12.8336 11.7581 13.2616 11.1869 13.5549 10.545C13.8482 9.90316 14 9.20571 14 8.5C14 7.17392 13.4732 5.90215 12.5355 4.96447C11.5979 4.02678 10.3261 3.5 9 3.5C7.67392 3.5 6.40215 4.02678 5.46447 4.96447C4.52678 5.90215 4 7.17392 4 8.5C3.99999 9.20571 4.1518 9.90316 4.44513 10.545C4.73845 11.1869 5.16642 11.7581 5.7 12.22C4.30014 12.8539 3.11247 13.8775 2.27898 15.1685C1.4455 16.4596 1.00147 17.9633 1 19.5C1 19.7652 1.10536 20.0196 1.29289 20.2071C1.48043 20.3946 1.73478 20.5 2 20.5C2.26522 20.5 2.51957 20.3946 2.70711 20.2071C2.89464 20.0196 3 19.7652 3 19.5C3 17.9087 3.63214 16.3826 4.75736 15.2574C5.88258 14.1321 7.4087 13.5 9 13.5C10.5913 13.5 12.1174 14.1321 13.2426 15.2574C14.3679 16.3826 15 17.9087 15 19.5C15 19.7652 15.1054 20.0196 15.2929 20.2071C15.4804 20.3946 15.7348 20.5 16 20.5C16.2652 20.5 16.5196 20.3946 16.7071 20.2071C16.8946 20.0196 17 19.7652 17 19.5C16.9985 17.9633 16.5545 16.4596 15.721 15.1685C14.8875 13.8775 13.6999 12.8539 12.3 12.22ZM9 11.5C8.40666 11.5 7.82664 11.3241 7.33329 10.9944C6.83994 10.6648 6.45542 10.1962 6.22836 9.64805C6.0013 9.09987 5.94189 8.49667 6.05764 7.91473C6.1734 7.33279 6.45912 6.79824 6.87868 6.37868C7.29824 5.95912 7.83279 5.6734 8.41473 5.55764C8.99667 5.44189 9.59987 5.5013 10.1481 5.72836C10.6962 5.95542 11.1648 6.33994 11.4944 6.83329C11.8241 7.32664 12 7.90666 12 8.5C12 9.29565 11.6839 10.0587 11.1213 10.6213C10.5587 11.1839 9.79565 11.5 9 11.5ZM18.74 11.82C19.38 11.0993 19.798 10.2091 19.9438 9.25634C20.0896 8.30362 19.9569 7.32907 19.5618 6.45C19.1666 5.57093 18.5258 4.8248 17.7165 4.30142C16.9071 3.77805 15.9638 3.49974 15 3.5C14.7348 3.5 14.4804 3.60536 14.2929 3.79289C14.1054 3.98043 14 4.23478 14 4.5C14 4.76522 14.1054 5.01957 14.2929 5.20711C14.4804 5.39464 14.7348 5.5 15 5.5C15.7956 5.5 16.5587 5.81607 17.1213 6.37868C17.6839 6.94129 18 7.70435 18 8.5C17.9986 9.02524 17.8593 9.5409 17.5961 9.99542C17.3328 10.4499 16.9549 10.8274 16.5 11.09C16.3517 11.1755 16.2279 11.2977 16.1404 11.4447C16.0528 11.5918 16.0045 11.7589 16 11.93C15.9958 12.0998 16.0349 12.2678 16.1137 12.4183C16.1924 12.5687 16.3081 12.6967 16.45 12.79L16.84 13.05L16.97 13.12C18.1754 13.6917 19.1923 14.596 19.901 15.7263C20.6096 16.8566 20.9805 18.1659 20.97 19.5C20.97 19.7652 21.0754 20.0196 21.2629 20.2071C21.4504 20.3946 21.7048 20.5 21.97 20.5C22.2352 20.5 22.4896 20.3946 22.6771 20.2071C22.8646 20.0196 22.97 19.7652 22.97 19.5C22.9782 17.9654 22.5938 16.4543 21.8535 15.1101C21.1131 13.7659 20.0413 12.6333 18.74 11.82Z"
        fill="currentColor"
      />
    </svg>
  );
}
function FinancesIcon({ className }: IconProps): ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M9.00001 12.0001H7.00001C6.73479 12.0001 6.48044 12.1054 6.2929 12.293C6.10537 12.4805 6.00001 12.7349 6.00001 13.0001C6.00001 13.2653 6.10537 13.5196 6.2929 13.7072C6.48044 13.8947 6.73479 14.0001 7.00001 14.0001H9.00001C9.26522 14.0001 9.51958 13.8947 9.70711 13.7072C9.89465 13.5196 10 13.2653 10 13.0001C10 12.7349 9.89465 12.4805 9.70711 12.293C9.51958 12.1054 9.26522 12.0001 9.00001 12.0001ZM8.00001 10.0001H12C12.2652 10.0001 12.5196 9.89471 12.7071 9.70717C12.8947 9.51964 13 9.26528 13 9.00007C13 8.73485 12.8947 8.4805 12.7071 8.29296C12.5196 8.10543 12.2652 8.00007 12 8.00007H8.00001C7.73479 8.00007 7.48044 8.10543 7.2929 8.29296C7.10537 8.4805 7.00001 8.73485 7.00001 9.00007C7.00001 9.26528 7.10537 9.51964 7.2929 9.70717C7.48044 9.89471 7.73479 10.0001 8.00001 10.0001ZM9.00001 16.0001H7.00001C6.73479 16.0001 6.48044 16.1054 6.2929 16.293C6.10537 16.4805 6.00001 16.7349 6.00001 17.0001C6.00001 17.2653 6.10537 17.5196 6.2929 17.7072C6.48044 17.8947 6.73479 18.0001 7.00001 18.0001H9.00001C9.26522 18.0001 9.51958 17.8947 9.70711 17.7072C9.89465 17.5196 10 17.2653 10 17.0001C10 16.7349 9.89465 16.4805 9.70711 16.293C9.51958 16.1054 9.26522 16.0001 9.00001 16.0001ZM21 12.0001H18V3.00007C18.0007 2.82386 17.9548 2.65059 17.867 2.49781C17.7792 2.34504 17.6526 2.21817 17.5 2.13007C17.348 2.0423 17.1755 1.99609 17 1.99609C16.8245 1.99609 16.652 2.0423 16.5 2.13007L13.5 3.85007L10.5 2.13007C10.348 2.0423 10.1755 1.99609 10 1.99609C9.82447 1.99609 9.65203 2.0423 9.50001 2.13007L6.50001 3.85007L3.50001 2.13007C3.34799 2.0423 3.17554 1.99609 3.00001 1.99609C2.82447 1.99609 2.65203 2.0423 2.50001 2.13007C2.3474 2.21817 2.22079 2.34504 2.13299 2.49781C2.04518 2.65059 1.99931 2.82386 2.00001 3.00007V19.0001C2.00001 19.7957 2.31608 20.5588 2.87869 21.1214C3.4413 21.684 4.20436 22.0001 5.00001 22.0001H19C19.7957 22.0001 20.5587 21.684 21.1213 21.1214C21.6839 20.5588 22 19.7957 22 19.0001V13.0001C22 12.7349 21.8947 12.4805 21.7071 12.293C21.5196 12.1054 21.2652 12.0001 21 12.0001ZM5.00001 20.0001C4.73479 20.0001 4.48044 19.8947 4.2929 19.7072C4.10536 19.5196 4.00001 19.2653 4.00001 19.0001V4.73007L6.00001 5.87007C6.15435 5.95068 6.32589 5.99278 6.50001 5.99278C6.67413 5.99278 6.84567 5.95068 7.00001 5.87007L10 4.15007L13 5.87007C13.1543 5.95068 13.3259 5.99278 13.5 5.99278C13.6741 5.99278 13.8457 5.95068 14 5.87007L16 4.73007V19.0001C16.0027 19.3412 16.0636 19.6794 16.18 20.0001H5.00001ZM20 19.0001C20 19.2653 19.8947 19.5196 19.7071 19.7072C19.5196 19.8947 19.2652 20.0001 19 20.0001C18.7348 20.0001 18.4804 19.8947 18.2929 19.7072C18.1054 19.5196 18 19.2653 18 19.0001V14.0001H20V19.0001ZM13.56 16.1701C13.5043 16.1322 13.4437 16.102 13.38 16.0801C13.3205 16.0496 13.2562 16.0293 13.19 16.0201C13.0294 15.9879 12.8633 15.9957 12.7063 16.0428C12.5494 16.0899 12.4064 16.1748 12.29 16.2901C12.1073 16.4817 12.0037 16.7353 12 17.0001C11.9984 17.1301 12.0222 17.2592 12.07 17.3801C12.1244 17.5016 12.1987 17.6131 12.29 17.7101C12.3872 17.7984 12.4988 17.8694 12.62 17.9201C12.7397 17.973 12.8691 18.0003 13 18.0003C13.1309 18.0003 13.2603 17.973 13.38 17.9201C13.5012 17.8694 13.6128 17.7984 13.71 17.7101C13.8027 17.6166 13.876 17.5058 13.9258 17.384C13.9755 17.2621 14.0008 17.1317 14 17.0001C13.9963 16.7353 13.8927 16.4817 13.71 16.2901C13.6625 16.2471 13.6124 16.207 13.56 16.1701ZM13.7 12.2901C13.5832 12.1764 13.4404 12.0929 13.2841 12.047C13.1277 12.0011 12.9624 11.9941 12.8027 12.0266C12.643 12.0591 12.4937 12.1302 12.3677 12.2337C12.2418 12.3371 12.143 12.4697 12.08 12.6201C12.0178 12.7716 11.9937 12.936 12.0099 13.099C12.0261 13.262 12.0821 13.4185 12.1729 13.5548C12.2638 13.6911 12.3867 13.8029 12.5309 13.8806C12.6751 13.9582 12.8362 13.9993 13 14.0001C13.2652 14.0001 13.5196 13.8947 13.7071 13.7072C13.8947 13.5196 14 13.2653 14 13.0001C13.9984 12.8694 13.9712 12.7403 13.92 12.6201C13.8718 12.4952 13.7967 12.3826 13.7 12.2901Z"
        fill="currentColor"
      />
    </svg>
  );
}
function FeedbackIcon({ className }: IconProps): ReactElement {
  return (
    <svg
      version="1.1"
      id="Layer_1"
      xmlns="http://www.w3.org/2000/svg"
      x="0px"
      y="0px"
      viewBox="0 0 112.77 122.88"
      className={className}
    >
      <g>
        <path
          fill="currentColor"
          d="M64.44,61.11c1.79,0,3.12-1.45,3.12-3.12c0-1.78-1.45-3.12-3.12-3.12H24.75c-1.78,0-3.12,1.45-3.12,3.12 c0,1.78,1.45,3.12,3.12,3.12H64.44L64.44,61.11L64.44,61.11L64.44,61.11z M77.45,19.73l18.1-19.14c0.69-0.58,1.39-0.81,2.2-0.35 l14.56,14.1c0.58,0.69,0.69,1.5-0.12,2.31L93.75,36.14L77.45,19.73L77.45,19.73L77.45,19.73L77.45,19.73z M87.74,42.27l-18.66,3.86 l2.36-20.28L87.74,42.27L87.74,42.27z M19.14,13.09h41.73l-3.05,6.45H19.14c-3.48,0-6.65,1.43-8.96,3.73s-3.73,5.46-3.73,8.96 v45.74c0,3.48,1.43,6.66,3.73,8.96c2.3,2.3,5.47,3.73,8.96,3.73h3.72v0.01l0.21,0.01c1.77,0.12,3.12,1.66,2.99,3.43l-1.26,18.1 L48.78,97.7c0.58-0.58,1.38-0.93,2.27-0.93h37.32c3.48,0,6.65-1.42,8.96-3.73c2.3-2.3,3.73-5.48,3.73-8.96V50.45h6.68v42.69 c0.35,9.63-3.58,15.04-19.43,15.7l-32.25-0.74l-32.73,13.87l-0.16,0.13c-1.35,1.16-3.38,1-4.54-0.36c-0.57-0.67-0.82-1.49-0.77-2.3 l1.55-22.34h-0.26c-5.26,0-10.05-2.15-13.52-5.62C2.15,88.03,0,83.24,0,77.98V32.23c0-5.26,2.15-10.05,5.62-13.52 C9.08,15.24,13.87,13.09,19.14,13.09L19.14,13.09L19.14,13.09z M79.69,78.42c1.79,0,3.12-1.45,3.12-3.12 c0-1.79-1.45-3.12-3.12-3.12H24.75c-1.78,0-3.12,1.45-3.12,3.12c0,1.78,1.45,3.12,3.12,3.12H79.69L79.69,78.42L79.69,78.42 L79.69,78.42z M50.39,43.81c1.78,0,3.12-1.45,3.12-3.12c0-1.67-1.45-3.12-3.12-3.12H24.75c-1.78,0-3.12,1.45-3.12,3.12 c0,1.78,1.45,3.12,3.12,3.12H50.39L50.39,43.81L50.39,43.81L50.39,43.81z"
        />
      </g>
    </svg>
  );
}
function ReportBugIcon({ className }: IconProps): ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 43 42"
      className={className}
    >
      <path
        strokeWidth="4"
        stroke="currentColor"
        d="M20 7H23C26.866 7 30 10.134 30 14V28.5C30 33.1944 26.1944 37 21.5 37C16.8056 37 13 33.1944 13 28.5V14C13 10.134 16.134 7 20 7Z"
      ></path>
      <path
        strokeLinecap="round"
        strokeWidth="4"
        stroke="currentColor"
        d="M18 2V7"
      ></path>
      <path
        strokeLinecap="round"
        strokeWidth="4"
        stroke="currentColor"
        d="M25 2V7"
      ></path>
      <path
        strokeLinecap="round"
        strokeWidth="4"
        stroke="currentColor"
        d="M31 22H41"
      ></path>
      <path
        strokeLinecap="round"
        strokeWidth="4"
        stroke="currentColor"
        d="M2 22H12"
      ></path>
      <path
        strokeLinecap="round"
        strokeWidth="4"
        stroke="currentColor"
        d="M12.5785 15.2681C3.5016 15.2684 4.99951 12.0004 5 4"
      ></path>
      <path
        strokeLinecap="round"
        strokeWidth="4"
        stroke="currentColor"
        d="M12.3834 29.3877C3.20782 29.3874 4.72202 32.4736 4.72252 40.0291"
      ></path>
      <path
        strokeLinecap="round"
        strokeWidth="4"
        stroke="currentColor"
        d="M30.0003 14.8974C39.0545 15.553 37.7958 12.1852 38.3718 4.20521"
      ></path>
      <path
        strokeLinecap="round"
        strokeWidth="4"
        stroke="currentColor"
        d="M29.9944 29.7379C39.147 29.1188 37.8746 32.2993 38.4568 39.8355"
      ></path>
    </svg>
  );
}

/* ------------------------------- Data ------------------------------ */
type SidebarVariant = "dashboard" | "organization";

type OrgIconLike = (props: IconProps) => ReactElement;
type IconLike = OrgIconLike | LucideIcon;

type OrgNavItem = {
  href: string;
  label: string;
  icon: OrgIconLike;
  match?: (pathname: string) => boolean;
};

type DashNavItem = {
  href: string;
  label: string;
  icon: IconLike;
  match: (pathname: string) => boolean;
};

type DashSubItem = {
  href: string;
  label: string;
  icon: IconLike;
  match?: (pathname: string) => boolean;
};

type DashGroup = {
  key: "connections" | "finances";
  label: string;
  icon: IconLike;
  isActive: (pathname: string) => boolean;
  items: DashSubItem[];
};

function isOrgEventCreatePath(p: string) {
  return /^\/dashboard\/organizations\/[^\/]+\/events\/create(\/|$)/.test(p);
}

const DASH_ITEMS: DashNavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: DashboardIcon,
    match: (p) =>
      p === "/dashboard" ||
      p === "/dashboard/page-views" ||
      p === "/dashboard/revenue" ||
      p === "/dashboard/tickets-sold",
  },
  {
    href: "/dashboard/events",
    label: "Events",
    icon: TicketIcon,
    match: (p) => p.startsWith("/dashboard/events") || isOrgEventCreatePath(p),
  },
  {
    href: "/dashboard/organizations",
    label: "Organizations",
    icon: Building2,
    match: (p) =>
      p.startsWith("/dashboard/organizations") && !isOrgEventCreatePath(p),
  },
  {
    href: "/dashboard/teams",
    label: "Teams",
    icon: Users,
    match: (p) => p.startsWith("/dashboard/teams"),
  },
  {
    href: "/dashboard/friends",
    label: "Friends",
    icon: ContactRound,
    match: (p) => p.startsWith("/dashboard/friends"),
  },
  {
    href: "/dashboard/finances",
    label: "Finances",
    icon: FinancesIcon,
    match: (p) => p.startsWith("/dashboard/finances"),
  },
];

const DASH_COMING_SOON: Array<{ label: string; icon: IconLike }> = [
  { label: "Tixsy AI (Coming Soon)", icon: Sparkles },
  { label: "Text Blaster (Coming Soon)", icon: TypeIcon },
];

const DASH_GROUPS: DashGroup[] = [
  {
    key: "connections",
    label: "Connections",
    icon: ConnectionIcon,
    isActive: (p) => p.startsWith("/dashboard/connections"),
    items: [
      {
        href: "/dashboard/connections/organizations",
        label: "Organizations",
        icon: Building2,
        match: (p) => p.startsWith("/dashboard/connections/organizations"),
      },
      {
        href: "/dashboard/connections/establishments",
        label: "Establishments",
        icon: Landmark,
        match: (p) => p.startsWith("/dashboard/connections/establishments"),
      },
      {
        href: "/dashboard/connections/teams",
        label: "Teams",
        icon: Users2,
        match: (p) => p.startsWith("/dashboard/connections/teams"),
      },
    ],
  },
  {
    key: "finances",
    label: "Finances",
    icon: FinancesIcon,
    isActive: (p) => p.startsWith("/dashboard/finances"),
    items: [
      {
        href: "/dashboard/finances/revenue",
        label: "Revenue",
        icon: DollarSign,
        match: (p) => p.startsWith("/dashboard/finances/revenue"),
      },
      {
        href: "/dashboard/finances/page-views",
        label: "Page Views",
        icon: Eye,
        match: (p) => p.startsWith("/dashboard/finances/page-views"),
      },
      {
        href: "/dashboard/finances/gender-breakdown",
        label: "Gender breakdown",
        icon: Users,
        match: (p) => p.startsWith("/dashboard/finances/gender-breakdown"),
      },
      {
        href: "/dashboard/finances/age-breakdown",
        label: "Age Breakdown",
        icon: UserRound,
        match: (p) => p.startsWith("/dashboard/finances/age-breakdown"),
      },
    ],
  },
];

const DASH_FOOTER: DashNavItem = {
  href: "/dashboard/data",
  label: "Data",
  icon: DataIcon,
  match: (p) => p.startsWith("/dashboard/data"),
};

const orgItems: OrgNavItem[] = [
  {
    href: ".", // /dashboard/organizations/:id
    label: "Home",
    icon: DashboardIcon,
    match: (pathname) => {
      const sections = ["/events", "/edit", "/team", "/finance", "/settings"];
      return !sections.some(
        (seg) => pathname.endsWith(seg) || pathname.includes(`${seg}/`),
      );
    },
  },
];

/* ----------------------------- Helpers ---------------------------- */

const COLLAPSE_KEY = "ui:sidebar-collapsed";

// Nice easing for width / layout transitions
const EASE_OUT = "ease-[cubic-bezier(0.22,1,0.36,1)]";

type MotionPhase = "opening" | "closing" | null;

type MotionClasses = {
  shellWidth: string;
  label: string;
  logo: string;
  chevron: string;
};

function Divider({ collapsed }: { collapsed: boolean }) {
  return (
    <div
      className={clsx(
        "my-3 h-px w-full bg-neutral-800/60",
        collapsed && "mx-auto w-10",
      )}
    />
  );
}

/**
 * Tooltip:
 * - only visible on hover
 * - only rendered for collapsed mode
 */
function TooltipBubble({ label }: { label: string }) {
  return (
    <div
      className={clsx(
        "pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap",
        "rounded-md border border-neutral-800/70 bg-neutral-948 px-3 py-2 text-[13px] font-semibold text-neutral-100",
        "shadow-[0_18px_60px_rgba(0,0,0,0.55)]",
        "opacity-0 -translate-x-1 transition-all duration-150",
        "group-hover:opacity-100 group-hover:translate-x-0",
      )}
    >
      {label}
    </div>
  );
}

function NavRow({
  href,
  label,
  Icon,
  active,
  collapsed,
  disabled,
  motion,
  onClick,
}: {
  href?: string;
  label: string;
  Icon: IconLike;
  active?: boolean;
  collapsed: boolean;
  disabled?: boolean;
  motion: MotionClasses;
  onClick?: () => void;
}) {
  const IconComp = Icon as ElementType<{ className?: string }>;

  const base = clsx(
    "group relative flex items-center",
    "transition-colors duration-200",
    collapsed
      ? clsx(
          "mx-auto h-11 w-11 justify-center rounded-lg",
          active
            ? "bg-neutral-800/60"
            : "bg-transparent hover:bg-neutral-800/35",
        )
      : clsx(
          "h-11 justify-start rounded-lg px-3",
          active ? "bg-neutral-800/60" : "hover:bg-neutral-800/35",
        ),
    disabled
      ? "cursor-not-allowed text-neutral-600"
      : active
        ? "text-primary-300"
        : "text-neutral-200",
  );

  const iconCls = clsx(
    "shrink-0",
    label === "Text Blaster (Coming Soon)" ? "h-5.5 w-5.5" : "h-5 w-5",
    "text-[20px] leading-none",
    disabled
      ? "text-neutral-600"
      : active
        ? "text-primary-300"
        : "text-neutral-500 group-hover:text-neutral-200",
  );

  const labelCls = clsx(
    "min-w-0 truncate font-semibold",
    "overflow-hidden whitespace-nowrap",
    "transition-[max-width,opacity,transform]",
    motion.label,
    EASE_OUT,
    collapsed
      ? "max-w-0 opacity-0 translate-x-1"
      : "ml-3 max-w-[220px] opacity-100 translate-x-0",
  );

  const content = (
    <>
      <IconComp className={iconCls} />
      <span className={labelCls}>{label}</span>

      {collapsed && <TooltipBubble label={label} />}

      {/* Active indicator rail */}
      {collapsed && active && (
        <span className="absolute -left-[10px] top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-primary-500" />
      )}
    </>
  );

  // Clickable button-row (for modals)
  if (onClick && !disabled) {
    return (
      <button type="button" onClick={onClick} className={base}>
        {content}
      </button>
    );
  }

  if (disabled || !href) return <div className={base}>{content}</div>;

  return (
    <Link href={href} className={base}>
      {content}
    </Link>
  );
}

function CollapsedGroupPopover({
  title,
  items,
  pathname,
  onEnter,
  onLeave,
}: {
  title: string;
  items: DashSubItem[];
  pathname: string;
  onEnter: () => void;
  onLeave: () => void;
}) {
  return (
    <div
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className={clsx(
        "absolute left-full top-1/2 z-[10] ml-2 -translate-y-1/2",
        "w-[198px] overflow-hidden rounded-xl",
        "border border-neutral-800/70 bg-neutral-948/95 backdrop-blur-xl",
        "shadow-[0_22px_70px_rgba(0,0,0,0.65)]",
      )}
    >
      {/* wider hover-bridge so you can move into the popover without it collapsing */}
      <div className="absolute -left-10 top-0 h-full w-10" />

      {/* subtle inner glow */}
      <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-neutral-800/30" />

      <div className="px-3 pb-2 pt-2.5">
        <div className="text-xs font-semibold tracking-wide text-neutral-400">
          {title}
        </div>
      </div>

      <div className="px-2 pb-2">
        <div className="space-y-1">
          {items.map((sub) => {
            const IconComp = sub.icon as ElementType<{ className?: string }>;
            const isActive = sub.match
              ? sub.match(pathname)
              : pathname === sub.href;

            return (
              <Link
                key={sub.href}
                href={sub.href}
                className={clsx(
                  "group relative flex items-center gap-2 rounded-lg px-2 py-2.5",
                  "transition-[background-color] duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50",
                  isActive
                    ? "bg-neutral-800/70 text-primary-300"
                    : "text-neutral-200 hover:bg-neutral-800/40",
                )}
              >
                <span
                  className={clsx(
                    "pointer-events-none absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full",
                    isActive ? "bg-primary-500" : "bg-transparent",
                  )}
                />

                <IconComp
                  className={clsx(
                    "h-4 w-4 shrink-0 transition-colors",
                    isActive
                      ? "text-primary-300"
                      : "text-neutral-500 group-hover:text-neutral-200",
                  )}
                />

                <span className="truncate text-[13px] font-semibold">
                  {sub.label}
                </span>

                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary-500/90" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function GroupRow({
  group,
  pathname,
  open,
  setOpen,
  collapsed,
  isPopoverOpen,
  openPopover,
  scheduleClosePopover,
  motion,
}: {
  group: DashGroup;
  pathname: string;
  open: boolean;
  setOpen: (v: boolean) => void;
  collapsed: boolean;

  isPopoverOpen: boolean;
  openPopover: () => void;
  scheduleClosePopover: () => void;

  motion: MotionClasses;
}) {
  const active = group.isActive(pathname);
  const IconComp = group.icon as ElementType<{ className?: string }>;

  return (
    <div
      className="relative"
      onMouseEnter={() => collapsed && openPopover()}
      onMouseLeave={() => collapsed && scheduleClosePopover()}
    >
      <button
        type="button"
        onClick={() => {
          if (collapsed) return;
          setOpen(!open);
        }}
        aria-expanded={collapsed ? isPopoverOpen : open}
        className={clsx(
          "group relative flex items-center transition-colors duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40",
          collapsed
            ? clsx(
                "mx-auto h-11 w-11 justify-center rounded-lg",
                active
                  ? "bg-neutral-800/60"
                  : "bg-transparent hover:bg-neutral-800/35",
              )
            : clsx(
                "h-11 w-full justify-start rounded-lg px-3",
                active ? "bg-neutral-800/60" : "hover:bg-neutral-800/35",
              ),
          active ? "text-primary-300" : "text-neutral-200",
        )}
      >
        <IconComp
          className={clsx(
            "h-5 w-5 shrink-0 transition-colors",
            active
              ? "text-primary-300"
              : "text-neutral-500 group-hover:text-neutral-200",
          )}
        />

        <span
          className={clsx(
            "min-w-0 truncate font-semibold",
            "overflow-hidden whitespace-nowrap",
            "transition-[max-width,opacity,transform]",
            motion.label,
            EASE_OUT,
            collapsed
              ? "max-w-0 opacity-0 translate-x-1"
              : "ml-3 max-w-[220px] opacity-100 translate-x-0",
          )}
        >
          {group.label}
        </span>

        {!collapsed && (
          <ChevronDown
            className={clsx(
              "ml-auto h-5 w-5 shrink-0",
              "text-neutral-500 group-hover:text-neutral-200",
              "transition-transform",
              motion.chevron,
              EASE_OUT,
              open && "rotate-180",
            )}
          />
        )}

        {collapsed && active && (
          <span className="absolute -left-[10px] top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-primary-500" />
        )}
      </button>

      {/* Collapsed popover */}
      {collapsed && isPopoverOpen && (
        <CollapsedGroupPopover
          title={group.label}
          items={group.items}
          pathname={pathname}
          onEnter={openPopover}
          onLeave={scheduleClosePopover}
        />
      )}
    </div>
  );
}

/* ----------------------------- Component --------------------------- */

type SidebarProps = {
  variant?: SidebarVariant;
};

export default function Sidebar({ variant = "dashboard" }: SidebarProps) {
  const pathnameRaw = usePathname();
  const pathname = pathnameRaw || "";

  // Modal state for the 2 tasks
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [bugOpen, setBugOpen] = useState(false);

  const isOrg = variant === "organization";

  // Figure out /dashboard/organizations/:id base from the current URL
  let orgBase: string | null = null;
  if (isOrg && pathname) {
    const match = pathname.match(/^\/dashboard\/organizations\/([^\/]+)/);
    if (match) orgBase = `/dashboard/organizations/${match[1]}`;
  }

  const groupsActive = useMemo(
    () => ({
      connections: DASH_GROUPS[0].isActive(pathname),
      finances: DASH_GROUPS[1].isActive(pathname),
    }),
    [pathname],
  );

  const [collapsed, setCollapsed] = useState(false);

  const [connectionsOpen, setConnectionsOpen] = useState<boolean>(
    groupsActive.connections,
  );
  const [financesOpen, setFinancesOpen] = useState<boolean>(
    groupsActive.finances,
  );

  // hover popover state (collapsed)
  const [hoveredGroup, setHoveredGroup] = useState<DashGroup["key"] | null>(
    null,
  );
  const hoverCloseTimer = useRef<number | null>(null);

  // responsive mode flags
  const [isUnder1400, setIsUnder1400] = useState(false);
  const [isMdUp, setIsMdUp] = useState(false);

  // animation phase
  const [motionPhase, setMotionPhase] = useState<MotionPhase>(null);
  const motionTimer = useRef<number | null>(null);

  const motion: MotionClasses = useMemo(() => {
    if (motionPhase === "opening") {
      return {
        shellWidth: "duration-700",
        label: "duration-450 delay-150",
        logo: "duration-450 delay-120",
        chevron: "duration-450",
      };
    }
    if (motionPhase === "closing") {
      return {
        shellWidth: "duration-420",
        label: "duration-100",
        logo: "duration-120",
        chevron: "duration-150",
      };
    }
    return {
      shellWidth: "duration-500",
      label: "duration-300",
      logo: "duration-300",
      chevron: "duration-300",
    };
  }, [motionPhase]);

  useEffect(() => {
    try {
      const v = localStorage.getItem(COLLAPSE_KEY);
      if (v === "1") setCollapsed(true);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
    } catch {
      // ignore
    }
  }, [collapsed]);

  useEffect(() => {
    if (groupsActive.connections) setConnectionsOpen(true);
    if (groupsActive.finances) setFinancesOpen(true);
  }, [groupsActive.connections, groupsActive.finances]);

  // media queries
  useEffect(() => {
    const mq1400 = window.matchMedia("(max-width: 1400px)");
    const mqMd = window.matchMedia("(min-width: 768px)");

    const apply = () => {
      setIsUnder1400(mq1400.matches);
      setIsMdUp(mqMd.matches);
    };

    apply();

    mq1400.addEventListener?.("change", apply);
    mqMd.addEventListener?.("change", apply);

    return () => {
      mq1400.removeEventListener?.("change", apply);
      mqMd.removeEventListener?.("change", apply);
    };
  }, []);

  const isExpandedOverlay = !collapsed && isMdUp && isUnder1400;
  const pinOverlayDuringClose =
    isMdUp && isUnder1400 && motionPhase === "closing";

  const isOverlayPinned = isExpandedOverlay || pinOverlayDuringClose;

  function cancelHoverClose() {
    if (hoverCloseTimer.current) {
      window.clearTimeout(hoverCloseTimer.current);
      hoverCloseTimer.current = null;
    }
  }

  function openHover(key: DashGroup["key"]) {
    cancelHoverClose();
    setHoveredGroup(key);
  }

  function scheduleCloseHover() {
    cancelHoverClose();
    hoverCloseTimer.current = window.setTimeout(() => {
      setHoveredGroup(null);
      hoverCloseTimer.current = null;
    }, 180);
  }

  function toggleCollapsed() {
    const next = !collapsed;

    if (motionTimer.current) {
      window.clearTimeout(motionTimer.current);
      motionTimer.current = null;
    }
    setMotionPhase(next ? "closing" : "opening");

    motionTimer.current = window.setTimeout(
      () => {
        setMotionPhase(null);
        motionTimer.current = null;
      },
      next ? 520 : 860,
    );

    setHoveredGroup(null);
    cancelHoverClose();

    setCollapsed(next);
  }

  useEffect(() => {
    if (!isOverlayPinned) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") toggleCollapsed();
    };

    window.addEventListener("keydown", onKeyDown);

    const body = document.body;
    const prevOverflow = body.style.overflow;
    const prevPaddingRight = body.style.paddingRight;

    const sbw = window.innerWidth - document.documentElement.clientWidth;

    body.style.overflow = "hidden";
    if (sbw > 0) body.style.paddingRight = `${sbw}px`;

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPaddingRight;
    };
  }, [isOverlayPinned]);

  return (
    <>
      {/* Modals for the two tasks */}
      <FeedbackBugModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        variant="feedback"
      />
      <FeedbackBugModal
        open={bugOpen}
        onClose={() => setBugOpen(false)}
        variant="bug"
      />

      {isOverlayPinned && (
        <div aria-hidden="true" className="relative h-full w-[84px] shrink-0" />
      )}

      {isExpandedOverlay && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={toggleCollapsed}
          className={clsx(
            "fixed inset-0 z-40",
            "bg-black/40 backdrop-blur-[1px]",
          )}
        />
      )}

      <div
        className={clsx(
          isOverlayPinned ? "fixed left-0 top-0 z-50 h-dvh" : "relative h-full",
          "shrink-0",
          "will-change-[width]",
          "transition-[width]",
          motion.shellWidth,
          EASE_OUT,
          "motion-reduce:transition-none",
          collapsed ? "w-[84px]" : "w-[256px]",
        )}
      >
        <nav
          className={clsx(
            "flex h-full flex-col rounded-none border border-neutral-800/70 bg-neutral-948",
            "shadow-[0_22px_70px_rgba(0,0,0,0.55)]",
            collapsed ? "px-2 py-4" : "px-3 py-4",
          )}
        >
          {/* Top / Logo */}
          <div className={clsx("relative flex items-center px-2")}>
            <Link
              href="/dashboard"
              className={clsx("flex items-center h-10", collapsed && "mx-auto")}
            >
              <div
                className={clsx(
                  "origin-left transition",
                  motion.logo,
                  EASE_OUT,
                )}
              >
                <Image
                  src="/Logo.svg"
                  alt="Tixsy"
                  width={92}
                  height={28}
                  priority
                />
              </div>
            </Link>

            {/* Collapse / Expand toggle */}
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className={clsx(
                "absolute -right-4 top-1/2 z-20 -translate-y-1/2 translate-x-1/2",
                "grid h-7 w-7 place-items-center rounded-lg",
                "border border-neutral-800/80 bg-neutral-948",
                "text-neutral-200 shadow-[0_18px_60px_rgba(0,0,0,0.6)]",
                "transition-[transform,background-color,color] duration-300",
                EASE_OUT,
                "hover:bg-neutral-800/35 hover:text-neutral-0",
                "active:scale-[0.98]",
              )}
            >
              <ChevronLeft
                className={clsx(
                  "h-4 w-4 transition-transform",
                  motion.chevron,
                  EASE_OUT,
                  collapsed && "rotate-180",
                )}
              />
            </button>
          </div>

          <Divider collapsed={collapsed} />

          {/* Dashboard sidebar */}
          <div className={clsx("space-y-2")}>
            {DASH_ITEMS.map((item) => (
              <NavRow
                key={item.href}
                href={item.href}
                label={item.label}
                Icon={item.icon}
                active={item.match(pathname)}
                collapsed={collapsed}
                motion={motion}
              />
            ))}
            <NavRow
              href={DASH_FOOTER.href}
              label={DASH_FOOTER.label}
              Icon={DASH_FOOTER.icon}
              active={DASH_FOOTER.match(pathname)}
              collapsed={collapsed}
              motion={motion}
            />
          </div>

          <Divider collapsed={collapsed} />

          <div className={clsx("space-y-2")}>
            {DASH_COMING_SOON.map((x) => (
              <NavRow
                key={x.label}
                label={x.label}
                Icon={x.icon}
                collapsed={collapsed}
                disabled
                motion={motion}
              />
            ))}
          </div>

          <Divider collapsed={collapsed} />

          {/* Bottom actions */}
          <div
            className={clsx(
              "mt-auto pb-1 space-y-2",
              collapsed ? "px-0" : "px-2",
            )}
          >
            <NavRow
              label="Give Feedback"
              Icon={FeedbackIcon}
              collapsed={collapsed}
              motion={motion}
              onClick={() => setFeedbackOpen(true)}
            />
            <NavRow
              label="Report Bug"
              Icon={ReportBugIcon}
              collapsed={collapsed}
              motion={motion}
              onClick={() => setBugOpen(true)}
            />
          </div>
        </nav>
      </div>
    </>
  );
}
