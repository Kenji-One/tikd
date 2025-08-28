"use client";

import { useEffect, useRef, useState } from "react";

/**
 * useSessionStorage<T>
 * - Persists state in sessionStorage (per-tab) so refresh/tab-change keeps values.
 * - Returns [value, setValue, clear, meta]
 *   meta.hadCache tells if initial state came from storage.
 */
export default function useSessionStorage<T>(
  key: string,
  initial: T
): [
  T,
  React.Dispatch<React.SetStateAction<T>>,
  () => void,
  { hadCache: boolean },
] {
  const hadCacheRef = useRef(false);

  const read = () => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = sessionStorage.getItem(key);
      if (raw != null) {
        hadCacheRef.current = true;
        return JSON.parse(raw) as T;
      }
    } catch {}
    return initial;
  };

  const [value, setValue] = useState<T>(read);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);

  const clear = () => {
    if (typeof window !== "undefined") sessionStorage.removeItem(key);
  };

  return [value, setValue, clear, { hadCache: hadCacheRef.current }];
}
