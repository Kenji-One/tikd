"use client";

import Image from "next/image";
import Link from "next/link";
import {
  FaDiscord,
  FaTwitter,
  FaRedditAlien,
  FaGithub,
  FaYoutube,
  FaTelegram,
} from "react-icons/fa";

const footerLinks = {
  Company: ["Sell on TIKD", "About", "Blog", "Discover", "Fan Support"],
  Legal: [
    "Cookie Policy",
    "Manage Cookies",
    "Privacy Policy",
    "Privacy Choices",
    "Do not sell my info",
    "Terms",
  ],
};

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
        {/* Top section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pb-14">
          {/* Logo and copyright */}
          <div>
            <Image src="/logo.svg" width={80} height={26} alt="Tikd Logo" />
            <p className="mt-4">Copyright© 2025 TIKD. All rights reserved.</p>
          </div>

          {/* Link Groups */}
          {Object.entries(footerLinks).map(([section, links]) => (
            <div key={section}>
              <h4 className="mb-2 font-semibold text-neutral-0">{section}</h4>
              <ul className="space-y-1">
                {links.map((link, index) => (
                  <li key={index}>
                    <a href="#" className="hover:underline">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <hr className="border-neutral-800 mb-8" />

        {/* Download buttons and socials */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-12">
          {/* Download buttons */}
          <div className="flex gap-4">
            <a
              href="#"
              className="px-4 py-2 border border-neutral-700 rounded-full flex items-center gap-2 hover:bg-neutral-900 transition"
            >
              <span>🪟</span> Download on Desktop
            </a>
            <a
              href="#"
              className="px-4 py-2 border border-neutral-700 rounded-full flex items-center gap-2 hover:bg-neutral-900 transition"
            >
              <span></span> Download on iOS
            </a>
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
