/* ------------------------------------------------------------------ */
/*  src/components/ui/PlacesAddressInput.tsx                          */
/* ------------------------------------------------------------------ */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Combobox } from "@headlessui/react";
import clsx from "clsx";
import usePlacesAutocomplete from "use-places-autocomplete";
import { Loader2, MapPin, Search } from "lucide-react";

/** Minimal typing for the only thing we need: google.maps.places existing */
type GoogleMapsNamespace = {
  maps?: {
    places?: unknown;
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

function loadGooglePlacesScript(apiKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  // If already loaded with Places library, done.
  if (hasPlacesLib()) return Promise.resolve();

  const existing = document.getElementById(
    SCRIPT_ID
  ) as HTMLScriptElement | null;

  // If script tag exists, wait for it.
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => {
        if (hasPlacesLib()) resolve();
        else
          reject(new Error("Google Maps loaded, but Places library missing."));
      });
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load Google Maps script"))
      );
    });
  }

  // Create script tag
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    s.async = true;
    s.defer = true;

    // `loading=async` removes the yellow warning in Chrome devtools
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&libraries=places&v=weekly&loading=async`;

    s.onload = () => {
      if (hasPlacesLib()) resolve();
      else reject(new Error("Google Maps loaded, but Places library missing."));
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
      // Good default: address suggestions (street addresses)
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

  // Keep hook input in sync with parent value.
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
        setScriptError(
          e instanceof Error ? e.message : "Failed to load Places"
        );
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
        <p className="mt-2 text-xs text-error-300">
          {scriptError}. Add <code>NEXT_PUBLIC_GOOGLE_MAPS_KEY</code> to{" "}
          <code>.env.local</code> and restart the dev server.
        </p>
      ) : null}
    </div>
  );
}
