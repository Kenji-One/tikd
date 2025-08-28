"use client";

import Image from "next/image";
import {
  FaDiscord,
  FaTwitter,
  FaRedditAlien,
  FaGithub,
  FaYoutube,
  FaTelegram,
} from "react-icons/fa";
import { Button } from "@/components/ui/Button";
// const footerLinks = {
//   Company: ["Sell on TIKD", "About", "Blog", "Discover", "Fan Support"],
//   Legal: [
//     "Cookie Policy",
//     "Manage Cookies",
//     "Privacy Policy",
//     "Privacy Choices",
//     "Do not sell my info",
//     "Terms",
//   ],
// };

const socialIcons = [
  { href: "https://discord.com", icon: <FaDiscord />, label: "Discord" },
  { href: "https://twitter.com", icon: <FaTwitter />, label: "Twitter" },
  { href: "https://reddit.com", icon: <FaRedditAlien />, label: "Reddit" },
  { href: "https://github.com", icon: <FaGithub />, label: "GitHub" },
  { href: "https://youtube.com", icon: <FaYoutube />, label: "YouTube" },
  { href: "https://telegram.org", icon: <FaTelegram />, label: "Telegram" },
];

export default function Footer() {
  return (
    <footer className="bg-neutral-948 text-neutral-0 pt-13">
      <div className="max-w-[1232px] mx-auto px-4 md:px-6">
        {/* Top grid layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pb-14">
          {/* Left: Logo + copyright */}
          <div>
            <Image src="/Logo.svg" width={67} height={24} alt="Tikd Logo" />
            <p className="mt-6 text-neutral-0">
              Copyright© 2025 TIKD. All rights reserved.
            </p>
          </div>

          {/* Middle: Company */}
          <div>
            <h4 className="mb-3 font-bold text-[#FFFFFF99]">Company</h4>
            <ul className="grid grid-cols-2 gap-y-3">
              <li>
                <a href="#" className="hover:underline">
                  Sell on TIKD
                </a>
              </li>
              <li>
                <a href="#" className="hover:underline">
                  Discover
                </a>
              </li>
              <li>
                <a href="#" className="hover:underline">
                  About
                </a>
              </li>
              <li>
                <a href="#" className="hover:underline">
                  Fan Support
                </a>
              </li>
              <li>
                <a href="#" className="hover:underline">
                  Blog
                </a>
              </li>
            </ul>
          </div>

          {/* Right: Legal */}
          <div>
            <h4 className="mb-3 font-bold text-[#FFFFFF99]">Legal</h4>
            <ul className="grid grid-cols-2 gap-y-3">
              <li>
                <a href="#" className="hover:underline">
                  Cookie Policy
                </a>
              </li>
              <li>
                <a href="#" className="hover:underline">
                  Privacy Choices
                </a>
              </li>
              <li>
                <a href="#" className="hover:underline">
                  Manage Cookies
                </a>
              </li>
              <li>
                <a href="#" className="hover:underline">
                  Do not sell my info
                </a>
              </li>
              <li>
                <a href="#" className="hover:underline">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="hover:underline">
                  Terms
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <hr className="border-[#FFFFFF1A] mb-6" />

        {/* Download buttons and socials */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-12">
          {/* Download buttons */}
          <div className="flex gap-4">
            <Button variant="secondary" size="md" asChild>
              <a href="#" className="flex items-center gap-[10px]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                >
                  <path
                    d="M1.75089 3.19498L6.05414 2.60232V6.75973H1.75031V3.19557L1.75089 3.19498ZM1.75089 10.8028L6.05414 11.3961V7.2894H1.75031L1.75089 10.8028ZM6.52722 11.4591L12.2509 12.2489V7.2894H6.52722V11.4591ZM6.52722 2.53873V6.75973H12.2509V1.7489L6.52722 2.53873Z"
                    fill="white"
                  />
                </svg>
                Download on Desktop
              </a>
            </Button>
            <Button variant="secondary" size="md" asChild>
              <a href="#" className="flex items-center gap-[10px]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                >
                  <path
                    d="M9.94585 11.831C9.37418 12.3852 8.75001 12.2977 8.14918 12.0352C7.51335 11.7669 6.93001 11.7552 6.25918 12.0352C5.41918 12.3969 4.97585 12.2919 4.47418 11.831C1.62751 8.89687 2.04751 4.42854 5.27918 4.2652C6.06668 4.30604 6.61501 4.69687 7.07585 4.73187C7.76418 4.59187 8.42335 4.18937 9.15835 4.24187C10.0392 4.31187 10.7042 4.66187 11.1417 5.29187C9.32168 6.3827 9.75335 8.7802 11.4217 9.45104C11.0892 10.326 10.6575 11.1952 9.94001 11.8369L9.94585 11.831ZM7.01751 4.2302C6.93001 2.92937 7.98585 1.85604 9.19918 1.75104C9.36835 3.25604 7.83418 4.37604 7.01751 4.2302Z"
                    fill="white"
                  />
                </svg>
                Download on iOS
              </a>
            </Button>
          </div>

          {/* Social icons */}
          <div className="flex gap-6 text-xl">
            {socialIcons.map(({ href, icon, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="hover:text-brand-500 transition"
              >
                {icon}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
