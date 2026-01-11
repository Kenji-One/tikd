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

type WindowWithGoogle = Window & {
  google?: GoogleMapsLike;
};

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

function getGoogle(): GoogleMapsLike | undefined {
  return (window as unknown as WindowWithGoogle).google;
}

function hasMapsLoaded(): boolean {
  return Boolean(getGoogle()?.maps);
}

function hasPlacesLoaded(): boolean {
  return Boolean(getGoogle()?.maps?.places);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Load Google Maps JS (with libraries=places).
 *
 * IMPORTANT:
 * - Resolve when Maps is loaded (window.google.maps exists)
 * - Do NOT fail just because places namespace isn't immediately visible on onload.
 *   We'll verify Places separately with a short poll after load.
 */
function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  // If Maps already present, we're done.
  if (hasMapsLoaded()) return Promise.resolve();

  const existing = document.getElementById(
    SCRIPT_ID
  ) as HTMLScriptElement | null;

  // If script tag exists, either it's already loaded or we need to wait for it.
  if (existing) {
    // If for any reason it already loaded before we attached listeners
    if (hasMapsLoaded()) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const onLoad = () => {
        cleanup();
        if (hasMapsLoaded()) resolve();
        else
          reject(
            new Error("Google Maps script loaded, but maps namespace missing.")
          );
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

  // Create script tag
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    s.async = true;
    s.defer = true;

    // `loading=async` helps avoid the Chrome warning.
    // `libraries=places` is required for use-places-autocomplete.
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&v=weekly&libraries=places&loading=async`;

    s.onload = () => {
      if (hasMapsLoaded()) resolve();
      else
        reject(
          new Error("Google Maps script loaded, but maps namespace missing.")
        );
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

function buildHelpfulPlacesMissingMessage(): string {
  return [
    "Google Maps loaded, but Places library missing.",
    "Make sure these are true:",
    "• Maps JavaScript API is enabled",
    "• Places API is enabled",
    "• Billing is enabled on the Google Cloud project",
    "• If your key is restricted: add HTTP referrers for tikd.vercel.app and localhost",
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

    (async () => {
      try {
        await loadGoogleMapsScript(apiKey);

        if (!alive) return;
        setScriptReady(true);
        setScriptError(null);

        // Places namespace can appear a moment after script onload.
        // Poll briefly before declaring it "missing".
        const started = Date.now();
        const timeoutMs = 4000;

        while (alive && Date.now() - started < timeoutMs) {
          if (hasPlacesLoaded()) return;
          await sleep(150);
        }

        if (!alive) return;

        // Only show warning if it truly never appeared.
        if (!hasPlacesLoaded()) {
          setScriptError(buildHelpfulPlacesMissingMessage());
        }
      } catch (e) {
        if (!alive) return;
        const msg =
          e instanceof Error ? e.message : "Failed to load Google Maps";
        setScriptReady(false);
        setScriptError(msg);
      }
    })();

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
