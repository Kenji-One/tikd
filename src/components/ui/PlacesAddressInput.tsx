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
    __tikdPlacesReady?: boolean;
  }
}

type Props = {
  /** Can be null/undefined from RHF defaultValues/reset/db — we normalize internally */
  value: string | null | undefined;
  onChange: (v: string) => void;

  placeholder?: string;
  error?: boolean;
  disabled?: boolean;

  /** Optional: restrict to a country (e.g. "us", "ge") */
  country?: string;

  /** Force Google Places language (default: "en") */
  language?: string;
  /** Optional region bias for results (default: "US") */
  region?: string;

  /** Optional: extra className on wrapper */
  className?: string;
};

const SCRIPT_ID = "google-maps-places-script";
const CALLBACK_NAME = "__tikdMapsPlacesInit";
const INIT_TIMEOUT_MS = 12000;

let initListeners: Array<() => void> = [];
let loadPromise: Promise<void> | null = null;
let loadedSignature: string | null = null;

function hasPlacesLoaded(): boolean {
  return Boolean(window.google?.maps?.places);
}

function ensureGlobalCallback(): void {
  if (typeof window === "undefined") return;

  const w = window as unknown as Record<string, unknown>;
  if (typeof w[CALLBACK_NAME] !== "function") {
    w[CALLBACK_NAME] = () => {
      window.__tikdPlacesReady = true;

      const listeners = initListeners;
      initListeners = [];
      listeners.forEach((fn) => fn());
    };
  }
}

function waitForInit(timeoutMs: number): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (hasPlacesLoaded() || window.__tikdPlacesReady) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const t = window.setTimeout(() => {
      if (hasPlacesLoaded()) resolve();
      else
        reject(
          new Error(
            "Google Maps initialized, but Places library is still missing.",
          ),
        );
    }, timeoutMs);

    initListeners.push(() => {
      window.clearTimeout(t);
      resolve();
    });
  });
}

function scriptSrcMatches(src: string, language: string, region: string) {
  const langOk = src.includes(`language=${encodeURIComponent(language)}`);
  const regionOk = src.includes(`region=${encodeURIComponent(region)}`);
  const placesOk = src.includes("libraries=places");
  const cbOk = src.includes(`callback=${CALLBACK_NAME}`);
  return placesOk && cbOk && langOk && regionOk;
}

async function loadGoogleMapsPlacesScript(
  apiKey: string,
  language: string,
  region: string,
): Promise<void> {
  if (typeof window === "undefined") return;

  const signature = `${apiKey}::${language}::${region}`;

  // If already loaded with same signature, we're done.
  if (hasPlacesLoaded() && loadedSignature === signature) return;

  // If there's an inflight load with same signature, await it.
  if (loadPromise && loadedSignature === signature) {
    await loadPromise;
    return;
  }

  ensureGlobalCallback();

  const existing = document.getElementById(
    SCRIPT_ID,
  ) as HTMLScriptElement | null;

  // If a script exists but doesn't match required params, replace it.
  if (existing) {
    const src = existing.src || "";
    if (!scriptSrcMatches(src, language, region)) {
      existing.remove();
      // best-effort reset (helps during dev/hot reload)
      try {
        delete (window as any).google;
      } catch {
        /* noop */
      }
      window.__tikdPlacesReady = false;
    } else {
      // Script matches — just wait until places is actually ready.
      loadedSignature = signature;
      try {
        await waitForInit(2000);
      } catch {
        // fall through: script may be "stuck", we will reload below
        existing.remove();
        window.__tikdPlacesReady = false;
        try {
          delete (window as any).google;
        } catch {
          /* noop */
        }
      }
      if (hasPlacesLoaded()) return;
    }
  }

  loadedSignature = signature;

  loadPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    s.async = true;
    s.defer = true;

    s.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}` +
      `&v=weekly&libraries=places&callback=${CALLBACK_NAME}&loading=async` +
      `&language=${encodeURIComponent(language)}` +
      `&region=${encodeURIComponent(region)}`;

    const onError = () => {
      cleanup();
      loadPromise = null;
      reject(new Error("Failed to load Google Maps script"));
    };

    const cleanup = () => {
      s.removeEventListener("error", onError);
    };

    s.addEventListener("error", onError);
    document.head.appendChild(s);

    // Resolve when callback fires OR places becomes available.
    waitForInit(INIT_TIMEOUT_MS)
      .then(() => {
        cleanup();
        resolve();
      })
      .catch((e) => {
        cleanup();
        loadPromise = null;
        reject(
          e instanceof Error
            ? e
            : new Error("Failed to initialize Google Maps"),
        );
      });
  });

  await loadPromise;
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
          disabled && "opacity-60 cursor-not-allowed",
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
  scriptOk,
}: Props & { scriptOk: boolean }) {
  const requestOptions = useMemo(() => {
    // "address" is fine, but some accounts return better with "geocode".
    // We'll keep address (your original intent), but allow full results.
    const base: Record<string, unknown> = { types: ["address"] };
    if (country) base.componentRestrictions = { country };
    return base;
  }, [country]);

  const {
    ready,
    value: inputValueRaw,
    setValue,
    suggestions: { status, data },
    clearSuggestions,
    init,
  } = usePlacesAutocomplete({
    requestOptions: requestOptions as never,
    debounce: 250,
    cache: 24 * 60 * 60,
    callbackName: CALLBACK_NAME,
    initOnMount: false, // ✅ critical: we will init manually when script is ready
  });

  const safePropValue = typeof value === "string" ? value : "";
  const inputValue = typeof inputValueRaw === "string" ? inputValueRaw : "";

  // When parent value changes (reset/edit), update the input without triggering new fetch.
  useEffect(() => {
    setValue(safePropValue, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safePropValue]);

  // ✅ Initialize the hook AFTER the script is confirmed ready.
  useEffect(() => {
    if (!scriptOk) return;
    if (!hasPlacesLoaded()) return;
    if (disabled) return;

    // init() is idempotent; safe to call.
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptOk, disabled, country]);

  const enabled = scriptOk && hasPlacesLoaded() && ready && !disabled;
  const options = enabled && status === "OK" ? data : [];
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className={clsx("relative", className)}>
      <Combobox
        value={inputValue}
        onChange={(selected: string | null) => {
          const next = selected ?? "";
          setValue(next, false);
          onChange(next);
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
              error && "ring-1 ring-inset ring-error-500 border-transparent",
            )}
            placeholder={placeholder}
            value={inputValue}
            onChange={(e) => {
              const v = e.target.value ?? "";
              setValue(v, true);
              onChange(v);
            }}
            // Don’t instantly wipe suggestions: it can cancel option clicks
            onBlur={() => {
              window.setTimeout(() => clearSuggestions(), 120);
            }}
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
              "border-white/10 bg-neutral-948/95 backdrop-blur",
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
                      : "text-neutral-200",
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
  language = "en",
  region = "US",
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

    loadGoogleMapsPlacesScript(apiKey, language, region)
      .then(() => {
        if (!alive) return;
        setScriptOk(true);
        setScriptError(null);
      })
      .catch((e) => {
        if (!alive) return;
        setScriptOk(false);
        setScriptError(
          e instanceof Error ? e.message : "Failed to load Google Maps",
        );
      });

    return () => {
      alive = false;
    };
  }, [apiKey, language, region]);

  return (
    <div className={clsx("relative", className)}>
      {!scriptOk ? (
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
          scriptOk={scriptOk}
          language={language}
          region={region}
        />
      )}

      {scriptError ? (
        <p className="mt-2 text-xs text-error-300">{scriptError}</p>
      ) : null}
    </div>
  );
}
