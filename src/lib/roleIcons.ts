// src/lib/roleIcons.ts

export const ROLE_ICON_KEYS = [
  "user",
  "users",
  "shield",
  "badge",
  "ticket",
  "megaphone",
  "scanner",
  "crown",
  "gem",
  "wrench",
  "settings",

  "owner",

  // extra icons (role manager richer set)
  "star",
  "sparkles",
  "bolt",
  "rocket",
  "lock",
  "key",
  "wallet",
  "eye",
  "globe",
  "flag",
  "camera",
  "mic",
  "clipboard",
] as const;

export type RoleIconKey = (typeof ROLE_ICON_KEYS)[number];
