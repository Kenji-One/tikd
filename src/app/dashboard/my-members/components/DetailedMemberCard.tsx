// src/app/dashboard/my-members/components/DetailedMemberCard.tsx
"use client";

import clsx from "clsx";
import { Eye, Ticket, BadgeDollarSign, User } from "lucide-react";

export type DetailedMember = {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string | null;
  avatarBg?: string;
  avatarText?: string;
  revenue: number;
  pageViews: number;
  ticketsSold: number;
};

function initials(full: string) {
  return full
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function fmtUsd(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function IconOrb({
  tone,
  icon,
}: {
  tone: "primary" | "success" | "neutral";
  icon: React.ReactNode;
}) {
  const orb =
    tone === "primary"
      ? "from-primary-500/70 via-primary-300/20 to-white/10"
      : tone === "success"
        ? "from-success-500/55 via-primary-300/18 to-white/10"
        : "from-white/14 via-primary-300/12 to-white/8";

  const iconTone =
    tone === "primary"
      ? "text-primary-100"
      : tone === "success"
        ? "text-success-100"
        : "text-neutral-0";

  return (
    <div className="relative h-11 w-11 shrink-0">
      <div
        className={clsx("absolute inset-0 rounded-full bg-gradient-to-br", orb)}
      />
      <div className="absolute inset-0 rounded-full ring-1 ring-white/14 shadow-[0_18px_40px_rgba(0,0,0,0.45)]" />
      <div className="absolute inset-[2px] rounded-full bg-neutral-950/30 backdrop-blur-xl" />
      <div
        className={clsx("absolute inset-0 grid place-items-center", iconTone)}
      >
        {icon}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: "primary" | "success" | "neutral";
}) {
  const bg =
    tone === "success"
      ? [
          "radial-gradient(700px 420px at 15% 10%, rgba(69,255,121,0.16), transparent 60%)",
          "radial-gradient(650px 420px at 90% 30%, rgba(154,70,255,0.12), transparent 62%)",
          "linear-gradient(180deg, rgba(18,18,32,0.60), rgba(8,8,15,0.30))",
        ].join(",")
      : tone === "primary"
        ? [
            "radial-gradient(700px 420px at 15% 10%, rgba(154,70,255,0.20), transparent 60%)",
            "radial-gradient(650px 420px at 90% 30%, rgba(255,123,69,0.10), transparent 62%)",
            "linear-gradient(180deg, rgba(18,18,32,0.60), rgba(8,8,15,0.30))",
          ].join(",")
        : [
            "radial-gradient(700px 420px at 15% 10%, rgba(167,115,255,0.14), transparent 60%)",
            "radial-gradient(650px 420px at 90% 30%, rgba(255,123,69,0.08), transparent 62%)",
            "linear-gradient(180deg, rgba(18,18,32,0.58), rgba(8,8,15,0.30))",
          ].join(",");

  return (
    <div className="relative flex items-center overflow-hidden rounded-xl border border-white/10 p-4">
      <div
        className="pointer-events-none absolute inset-0 opacity-95"
        style={{ background: bg }}
      />

      <div className="relative w-full flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[12px] font-semibold text-neutral-300">
              {label}
            </div>
            <div className="mt-2 text-[20px] font-extrabold tracking-[-0.03em] text-neutral-50 tabular-nums">
              {value}
            </div>
          </div>

          {/* ✅ Match top summary icon orb styling */}
          <div className="mt-[2px]">
            <IconOrb tone={tone} icon={icon} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DetailedMemberCard({
  member,
}: {
  member: DetailedMember;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-neutral-800/70 bg-neutral-948/70 p-5">
      {/* Warmer, richer purple base */}
      <div
        className="pointer-events-none absolute inset-0 opacity-95"
        style={{
          background: [
            "radial-gradient(1000px 640px at 20% 0%, rgba(154,70,255,0.26), transparent 62%)",
            "radial-gradient(900px 620px at 120% 40%, rgba(255,123,69,0.12), transparent 66%)",
            "radial-gradient(900px 620px at 60% 120%, rgba(0,0,0,0.55), transparent 62%)",
            "linear-gradient(180deg, rgba(18,18,32,0.74), rgba(8,8,15,0.58))",
          ].join(","),
        }}
      />

      <div className="relative">
        <div className="flex items-start justify-between gap-3 border-b border-neutral-800/70 pb-4">
          <div className="min-w-0">
            <div className="text-[12px] font-semibold text-neutral-300">
              Detailed Member
            </div>
            <div className="mt-1 text-[15px] font-extrabold tracking-[-0.03em] text-neutral-50">
              Member stats & role
            </div>
          </div>
          <div className="pt-[1px] text-[12px] font-semibold text-neutral-400 tabular-nums">
            #{member.id}
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-white/8 ring-1 ring-white/12 shadow-[0_14px_36px_rgba(0,0,0,0.40)]">
            {member.avatarUrl ? (
              <img
                src={member.avatarUrl}
                alt={member.name}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div
                className={clsx(
                  "absolute inset-0 grid place-items-center text-[12px] font-extrabold text-neutral-100",
                  member.avatarBg ?? "",
                )}
              >
                {(member.avatarText || initials(member.name)).slice(0, 2)}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="truncate text-[16px] font-extrabold tracking-[-0.03em] text-neutral-50">
              {member.name}
            </div>
            <div className="mt-1">
              <span
                className={clsx(
                  "inline-flex items-center gap-1",
                  "text-[12px] font-semibold tracking-[-0.01em]",
                  "bg-gradient-to-r from-primary-200 via-primary-999 to-primary-400",
                  "bg-clip-text text-transparent",
                  "drop-shadow-[0_1px_10px_rgba(154,70,255,0.20)]",
                )}
              >
                <User className="h-3.5 w-3.5 text-primary-200/90 drop-shadow-[0_1px_10px_rgba(154,70,255,0.18)]" />
                {member.role}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Stat
            label="Revenue"
            value={fmtUsd(member.revenue)}
            icon={<BadgeDollarSign className="h-4 w-4" />}
            tone="success"
          />
          <Stat
            label="Page Views"
            value={member.pageViews.toLocaleString()}
            icon={<Eye className="h-4 w-4" />}
            tone="neutral"
          />
          <Stat
            label="Tickets Sold"
            value={member.ticketsSold.toLocaleString()}
            icon={<Ticket className="h-4 w-4" />}
            tone="primary"
          />
          {/*
          <div className="relative overflow-hidden rounded-xl border border-white/10 p-4">
            <div
              className="pointer-events-none absolute inset-0 opacity-95"
              style={{
                background: [
                  "radial-gradient(720px 420px at 15% 10%, rgba(255,123,69,0.10), transparent 60%)",
                  "radial-gradient(650px 420px at 90% 30%, rgba(154,70,255,0.12), transparent 62%)",
                  "linear-gradient(180deg, rgba(18,18,32,0.58), rgba(8,8,15,0.30))",
                ].join(","),
              }}
            />
            <div className="relative">
              <div className="text-[12px] font-semibold text-neutral-300">
                Notes
              </div>
              <div className="mt-2 text-[12px] leading-[1.45] text-neutral-400">
                Placeholder for future: conversion rate, top event, and payout
                status.
              </div>
            </div>
          </div> */}
        </div>
      </div>
    </div>
  );
}
