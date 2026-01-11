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
type GoogleMapsNamespace = {
  maps?: {
    places?: unknown;
    importLibrary?: (name: string) => Promise<unknown>;
  };
};

declare global {
  interface Window {
    google?: GoogleMapsNamespace;
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

function hasPlacesLib(): boolean {
  return Boolean(window.google?.maps?.places);
}

/**
 * Ensures Places library exists.
 * - If script was loaded without libraries=places, this still works (importLibrary loads it).
 * - If the key is restricted / billing missing / API disabled, this will throw (good: actionable error).
 */
async function ensurePlacesLibrary(): Promise<void> {
  const importer = window.google?.maps?.importLibrary;
  if (typeof importer === "function") {
    await importer("places");
  }
  if (!hasPlacesLib()) {
    throw new Error("Google Maps loaded, but Places library missing.");
  }
}

function loadGooglePlacesScript(apiKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  // If already available, done.
  if (hasPlacesLib()) return Promise.resolve();

  const existing = document.getElementById(
    SCRIPT_ID
  ) as HTMLScriptElement | null;

  // If script exists, wait for it then ensure Places.
  if (existing) {
    return new Promise((resolve, reject) => {
      const onLoad = async () => {
        try {
          await ensurePlacesLibrary();
          resolve();
        } catch (e) {
          reject(e);
        } finally {
          existing.removeEventListener("load", onLoad);
          existing.removeEventListener("error", onError);
        }
      };

      const onError = () => {
        reject(new Error("Failed to load Google Maps script"));
        existing.removeEventListener("load", onLoad);
        existing.removeEventListener("error", onError);
      };

      existing.addEventListener("load", onLoad);
      existing.addEventListener("error", onError);
    });
  }

  // Create script tag
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    s.async = true;
    s.defer = true;

    // Keep libraries=places AND also importLibrary("places") after load.
    // This combo is the most robust across environments.
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&v=weekly&libraries=places&loading=async`;

    s.onload = async () => {
      try {
        await ensurePlacesLibrary();
        resolve();
      } catch (e) {
        reject(e);
      }
    };

    s.onerror = () => reject(new Error("Failed to load Google Maps script"));

    document.head.appendChild(s);
  });
}

function LoadingInput({
  placeholder,
  error,
  disabled,
}: {
  placeholder: string;
  error?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>

      <input
        disabled
        className={clsx(
          "w-full rounded-lg border px-10 py-3 text-sm transition",
          "bg-white/5 text-neutral-0 placeholder:text-neutral-500",
          "border-white/10 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-transparent",
          "opacity-60 cursor-not-allowed",
          error && "ring-1 ring-inset ring-error-500 border-transparent",
          disabled && "opacity-60 cursor-not-allowed"
        )}
        placeholder={placeholder}
        value=""
        readOnly
      />

      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500">
        <MapPin className="h-4 w-4" />
      </div>
    </div>
  );
}

function LoadedPlacesCombobox({
  value,
  onChange,
  placeholder,
  error,
  disabled,
  country,
  className,
}: Props) {
  const requestOptions = useMemo(() => {
    const base: Record<string, unknown> = {
      // addresses only
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
  });

  useEffect(() => {
    setValue(value ?? "", false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const enabled = ready && !disabled;
  const options = status === "OK" ? data : [];
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

        {enabled && options.length > 0 && (
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

function buildHelpfulMapsErrorMessage(raw: string): string {
  // Keep it short but actually useful.
  return [
    raw,
    "Make sure these are true:",
    "• Maps JavaScript API is enabled",
    "• Places API is enabled",
    "• Billing is enabled on the Google Cloud project",
    "• Your API key’s HTTP referrer restrictions include this domain (tikd.vercel.app) and localhost (for dev)",
  ].join(" ");
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

  const [scriptReady, setScriptReady] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiKey) {
      setScriptError("Missing NEXT_PUBLIC_GOOGLE_MAPS_KEY");
      setScriptReady(false);
      return;
    }

    let alive = true;

    loadGooglePlacesScript(apiKey)
      .then(() => {
        if (!alive) return;
        setScriptReady(true);
        setScriptError(null);
      })
      .catch((e) => {
        if (!alive) return;
        setScriptReady(false);

        const msg =
          e instanceof Error ? e.message : "Failed to load Google Places";
        setScriptError(buildHelpfulMapsErrorMessage(msg));
      });

    return () => {
      alive = false;
    };
  }, [apiKey]);

  return (
    <div className={clsx("relative", className)}>
      {!scriptReady ? (
        <LoadingInput
          placeholder={placeholder}
          error={error}
          disabled={disabled}
        />
      ) : (
        <LoadedPlacesCombobox
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          error={error}
          disabled={disabled}
          country={country}
          className={className}
        />
      )}

      {scriptError ? (
        <p className="mt-2 text-xs text-error-300">{scriptError}</p>
      ) : null}
    </div>
  );
}
