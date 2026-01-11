/* ------------------------------------------------------------------ */
/*  src/components/ui/PlacesAddressInput.tsx                          */
/* ------------------------------------------------------------------ */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Combobox } from "@headlessui/react";
import clsx from "clsx";
import usePlacesAutocomplete from "use-places-autocomplete";
import { Loader2, MapPin, Search } from "lucide-react";

/** Minimal typing for what we need from google.maps */
type GoogleMapsLike = {
  maps?: {
    places?: unknown;
  };
};

declare global {
  interface Window {
    google?: GoogleMapsLike;
  }
}

type Props = {
  value: string;
  onChange: (v: string) => void;

  placeholder?: string;
  error?: boolean;
  disabled?: boolean;

  /** Optional: restrict to a country (e.g. "us", "ge") */
  country?: string;

  /** Optional: extra className on wrapper */
  className?: string;
};

const SCRIPT_ID = "google-maps-places-script";

/**
 * IMPORTANT:
 * This must match `callbackName` passed to usePlacesAutocomplete.
 * Google Maps JS will call this function when fully ready.
 */
const CALLBACK_NAME = "__tikdMapsPlacesInit";

function hasPlacesLoaded(): boolean {
  return Boolean(window.google?.maps?.places);
}

function loadGoogleMapsPlacesScript(apiKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  // If Places already available, we're done.
  if (hasPlacesLoaded()) return Promise.resolve();

  const existing = document.getElementById(
    SCRIPT_ID
  ) as HTMLScriptElement | null;

  // If a script exists but is missing required params, replace it.
  if (existing) {
    const src = existing.src || "";
    const needsReplace =
      !src.includes("libraries=places") ||
      !src.includes(`callback=${CALLBACK_NAME}`);

    if (needsReplace) {
      existing.remove();
    } else {
      // Correct script exists; wait for it.
      return new Promise((resolve, reject) => {
        const onLoad = () => {
          cleanup();
          resolve();
        };
        const onError = () => {
          cleanup();
          reject(new Error("Failed to load Google Maps script"));
        };
        const cleanup = () => {
          existing.removeEventListener("load", onLoad);
          existing.removeEventListener("error", onError);
        };

        existing.addEventListener("load", onLoad);
        existing.addEventListener("error", onError);
      });
    }
  }

  // Create script tag
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    s.async = true;
    s.defer = true;

    // `libraries=places` is required by use-places-autocomplete
    // `callback=` is required to avoid the init race condition
    // `loading=async` avoids the Chrome warning
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&v=weekly&libraries=places&callback=${CALLBACK_NAME}&loading=async`;

    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google Maps script"));

    document.head.appendChild(s);
  });
}

function LoadedPlacesCombobox({
  value,
  onChange,
  placeholder,
  error,
  disabled,
  country,
  className,
  scriptOk,
}: Props & { scriptOk: boolean }) {
  const requestOptions = useMemo(() => {
    const base: Record<string, unknown> = {
      types: ["address"],
    };

    if (country) {
      base.componentRestrictions = { country };
    }

    return base;
  }, [country]);

  const {
    ready,
    value: inputValue,
    setValue,
    suggestions: { status, data },
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: requestOptions as never,
    debounce: 250,
    cache: 24 * 60 * 60,
    callbackName: CALLBACK_NAME, // ✅ key fix
  });

  // Keep hook input in sync with parent value.
  useEffect(() => {
    setValue(value ?? "", false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const enabled = scriptOk && ready && !disabled;
  const options = enabled && status === "OK" ? data : [];
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className={clsx("relative", className)}>
      <Combobox
        value={inputValue}
        onChange={(selected: string) => {
          setValue(selected, false);
          onChange(selected);
          clearSuggestions();
        }}
        disabled={!enabled}
      >
        <div className="relative">
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
            {enabled ? (
              <Search className="h-4 w-4" />
            ) : (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
          </div>

          <Combobox.Input
            ref={inputRef}
            className={clsx(
              "w-full rounded-lg border px-10 py-3 text-sm transition",
              "bg-white/5 text-neutral-0 placeholder:text-neutral-500",
              "border-white/10 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-transparent",
              (!enabled || disabled) && "opacity-60 cursor-not-allowed",
              error && "ring-1 ring-inset ring-error-500 border-transparent"
            )}
            placeholder={placeholder}
            value={inputValue}
            onChange={(e) => {
              const v = e.target.value;
              setValue(v, true);
              onChange(v);
            }}
            onBlur={() => clearSuggestions()}
            autoComplete="off"
          />

          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500">
            <MapPin className="h-4 w-4" />
          </div>
        </div>

        {options.length > 0 && (
          <Combobox.Options
            static
            className={clsx(
              "absolute z-50 mt-2 max-h-64 w-full overflow-auto rounded-lg border p-1 shadow-xl",
              "border-white/10 bg-neutral-948/95 backdrop-blur"
            )}
          >
            {options.map((opt) => (
              <Combobox.Option
                key={opt.place_id}
                value={opt.description}
                className={({ active }) =>
                  clsx(
                    "cursor-pointer select-none rounded-md px-3 py-2 text-sm",
                    active
                      ? "bg-primary-900/40 text-neutral-0"
                      : "text-neutral-200"
                  )
                }
              >
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
                  <span className="leading-snug">{opt.description}</span>
                </div>
              </Combobox.Option>
            ))}
          </Combobox.Options>
        )}
      </Combobox>
    </div>
  );
}

export default function PlacesAddressInput({
  value,
  onChange,
  placeholder = "Type to search address",
  error,
  disabled,
  country,
  className,
}: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "";

  const [scriptOk, setScriptOk] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiKey) {
      setScriptError("Missing NEXT_PUBLIC_GOOGLE_MAPS_KEY");
      setScriptOk(false);
      return;
    }

    let alive = true;

    loadGoogleMapsPlacesScript(apiKey)
      .then(() => {
        if (!alive) return;
        setScriptOk(true);
        setScriptError(null);
      })
      .catch((e) => {
        if (!alive) return;
        setScriptOk(false);
        setScriptError(
          e instanceof Error ? e.message : "Failed to load Google Maps"
        );
      });

    return () => {
      alive = false;
    };
  }, [apiKey]);

  return (
    <div className={clsx("relative", className)}>
      <LoadedPlacesCombobox
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        error={error}
        disabled={disabled}
        country={country}
        className={className}
        scriptOk={scriptOk}
      />

      {scriptError ? (
        <p className="mt-2 text-xs text-error-300">{scriptError}</p>
      ) : null}
    </div>
  );
}
