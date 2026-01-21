/* ------------------------------------------------------------------ */
/*  src/components/dashboard/charts/LocationsChoroplethMap.tsx        */
/* ------------------------------------------------------------------ */
"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { MapContainer, GeoJSON, useMap } from "react-leaflet";
import type { FeatureCollection, Feature, Geometry } from "geojson";
import * as L from "leaflet";

/* ------------------------------ Types ------------------------------ */
/**
 * NOTE:
 * - "views" is accepted as an alias because other parts of the app use it.
 * - Internally we normalize "views" -> "viewers".
 */
type MapMode = "viewers" | "revenue" | "tickets" | "views";
type Scope = "world" | "us";

export type ChoroplethDatum = {
  key: string;
  viewers?: number;
  revenue?: number;
  tickets?: number;
};

type Props = {
  mode?: MapMode;
  scope?: Scope;
  data?: ChoroplethDatum[];
  geoUrl?: string;
  center?: [number, number];
  zoom?: number;
  showZoomControls?: boolean;
  seed?: number;
};

/* --------------------------- Visual theme -------------------------- */
/**
 * Tikd purple ramp (low -> high)
 * Designed for dark tiles: stays readable and "Tikd" branded.
 */
const DEFAULT_RAMP = [
  "#1C003A", // primary-950 (deep)
  "#2B0053", // primary-900
  "#470083", // primary-800
  "#6600B7", // primary-700
  "#8600EE", // primary-600
  "#9A46FF", // primary-500
  "#C7A0FF", // primary-999 (bright)
];

/* --------------------------- Helpers -------------------------- */
function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function pseudo01(input: string, seed = 1) {
  let h = 2166136261 ^ seed;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10_000) / 10_000;
}

function formatCompact(n: number, prefix = "") {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${prefix}${(n / 1_000).toFixed(1)}K`;
  return `${prefix}${Math.round(n)}`;
}

function rampColor(value01: number, ramp = DEFAULT_RAMP) {
  const idx = Math.floor(clamp(value01, 0, 0.9999) * ramp.length);
  return ramp[idx];
}

/* ------------------------- TS compatibility ------------------------ */
const RLMapContainer = MapContainer as unknown as ComponentType<any>;
const RLGeoJSON = GeoJSON as unknown as ComponentType<any>;

function ConfigureMap({
  center,
  zoom,
  showZoomControls,
}: {
  center: [number, number];
  zoom: number;
  showZoomControls: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom, { animate: false });
    if (!showZoomControls) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (map as any).zoomControl?.remove?.();
    }
  }, [map, center, zoom, showZoomControls]);

  return null;
}

function BaseTiles() {
  const map = useMap();
  const layerRef = useRef<L.TileLayer | null>(null);

  useEffect(() => {
    if (!layerRef.current) {
      /**
       * ✅ IMPORTANT
       * Use the "rastertiles" endpoint (not the legacy /dark_nolabels path).
       * The rastertiles variant avoids the two big horizontal graticule/tropic lines
       * that can appear on some CARTO dark styles at low zoom.
       */
      layerRef.current = L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/dark_nolabels/{z}/{x}/{y}{r}.png",
        {
          attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
          subdomains: "abcd",
          detectRetina: true,
          updateWhenIdle: true,
          keepBuffer: 4,
        },
      );

      layerRef.current.addTo(map);
    }

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map]);

  return null;
}

/* ------------------------------ Component ------------------------------ */
export default function LocationsChoroplethMap({
  mode = "revenue",
  scope = "world",
  data = [],
  geoUrl,
  center,
  zoom,
  showZoomControls = false,
  seed = 7,
}: Props) {
  const [fc, setFc] = useState<FeatureCollection<Geometry> | null>(null);

  // Normalize app-wide alias
  const effectiveMode: Exclude<MapMode, "views"> | "viewers" =
    mode === "views" ? "viewers" : mode;

  // Default views
  const mapCenter: [number, number] =
    center ??
    (scope === "us"
      ? ([39.5, -98.35] as [number, number])
      : ([20, 0] as [number, number]));
  const mapZoom = zoom ?? (scope === "us" ? 4 : 2);

  const resolvedGeoUrl =
    geoUrl ??
    (scope === "us"
      ? "/geo/us-states.geojson"
      : "/geo/world-countries.geojson");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(resolvedGeoUrl, { cache: "force-cache" });
        if (!res.ok)
          throw new Error(`Failed to load geojson: ${resolvedGeoUrl}`);
        const json = (await res.json()) as FeatureCollection<Geometry>;
        if (!cancelled) setFc(json);
      } catch (e) {
        if (!cancelled) setFc(null);
        // eslint-disable-next-line no-console
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resolvedGeoUrl]);

  const { byKey, maxValue } = useMemo(() => {
    const m = new Map<string, ChoroplethDatum>();

    for (const d of data) {
      const k = (d.key ?? "").trim().toLowerCase();
      if (!k) continue;
      m.set(k, d);
    }

    let max = 0;
    for (const d of data) {
      const v =
        effectiveMode === "revenue"
          ? Number(d.revenue ?? 0)
          : effectiveMode === "viewers"
            ? Number(d.viewers ?? 0)
            : Number(d.tickets ?? 0);

      if (!Number.isFinite(v)) continue;
      max = Math.max(max, v);
    }

    return { byKey: m, maxValue: max };
  }, [data, effectiveMode]);

  const label =
    effectiveMode === "revenue"
      ? "Revenue"
      : effectiveMode === "viewers"
        ? "Views"
        : "Tickets";

  const prefix = effectiveMode === "revenue" ? "$" : "";

  function featureKeys(f: Feature<Geometry>): string[] {
    const p: any = f.properties ?? {};

    const add = (arr: string[], v: unknown) => {
      const s = String(v ?? "").trim();
      if (s) arr.push(s.toLowerCase());
    };

    const out: string[] = [];

    add(out, (f as any).id);
    add(out, p.id);

    if (scope === "world") {
      add(out, p["ISO3166-1-Alpha-2"]);
      add(out, p["ISO3166-1-Alpha-3"]);
      add(out, p.name);

      add(out, p.ADMIN);
      add(out, p.NAME);
      add(out, p.ISO_A2);
      add(out, p.ISO_A3);
      add(out, p.iso_a2);
      add(out, p.iso_a3);

      return out.filter(Boolean);
    }

    add(out, p.name);
    add(out, p.NAME);
    add(out, p.STATE_NAME);
    add(out, p.postal);
    add(out, p.STUSPS);

    return out.filter(Boolean);
  }

  function getFeatureValue(f: Feature<Geometry>) {
    const keys = featureKeys(f);
    let datum: ChoroplethDatum | undefined;

    for (const k of keys) {
      const hit = byKey.get(k);
      if (hit) {
        datum = hit;
        break;
      }
    }

    if (!datum) return { value: 0, found: false };

    const value =
      effectiveMode === "revenue"
        ? Number(datum.revenue ?? 0)
        : effectiveMode === "viewers"
          ? Number(datum.viewers ?? 0)
          : Number(datum.tickets ?? 0);

    return { value: Number.isFinite(value) ? value : 0, found: true };
  }

  function valueTo01(v: number) {
    const max = Math.max(1, maxValue);
    const vv = Math.max(0, v);
    const t = Math.log1p(vv) / Math.log1p(max);
    return clamp(t, 0, 1);
  }

  function featureTitle(feature: any) {
    const p: any = feature?.properties ?? {};
    if (scope === "world")
      return String(p.name ?? p.ADMIN ?? p.NAME ?? "Unknown");
    return String(p.name ?? p.STATE_NAME ?? p.NAME ?? "Unknown");
  }

  return (
    <div className="relative h-full w-full">
      {/* subtle vignette + purple tint (Tikd branded, very light) */}
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            "radial-gradient(1100px 650px at 50% 35%, rgba(255,255,255,0.05), transparent 60%), radial-gradient(900px 520px at 50% 15%, rgba(154,70,255,0.07), transparent 55%)",
        }}
      />

      <RLMapContainer
        scrollWheelZoom={false}
        zoomControl={false}
        className="tikd-leaflet-map h-full w-full"
      >
        <ConfigureMap
          center={mapCenter}
          zoom={mapZoom}
          showZoomControls={showZoomControls}
        />
        <BaseTiles />

        {fc && (
          <RLGeoJSON
            data={fc}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            style={(feature: any) => {
              const { value, found } = getFeatureValue(feature);

              const v01 = found
                ? valueTo01(value)
                : pseudo01(`missing:${featureKeys(feature).join("|")}`, seed) *
                  0.06;

              return {
                // borders: softer, not harsh black
                color: "rgba(255,255,255,0.10)",
                weight: 0.85,
                // fill: Tikd ramp
                fillColor: found ? rampColor(v01) : "rgba(18,18,32,0.35)",
                fillOpacity: found ? 0.82 : 0.16,
              };
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onEachFeature={(feature: any, layer: any) => {
              const regionName = featureTitle(feature);
              const { value, found } = getFeatureValue(feature);

              const valueLine = found
                ? `<div class="tikd-map-tooltip__value">${formatCompact(value, prefix)}</div>`
                : `<div class="tikd-map-tooltip__nodata">No data</div>`;

              const tooltip = `
                <div class="tikd-map-tooltip__wrap">
                  <div class="tikd-map-tooltip__title">${regionName}</div>
                  <div class="tikd-map-tooltip__meta">${label}</div>
                  ${valueLine}
                </div>
              `;

              layer.bindTooltip(tooltip, {
                sticky: true,
                direction: "top",
                opacity: 1,
                offset: [0, -10],
                className: "tikd-map-tooltip",
              });

              layer.on("mouseover", () => {
                layer.setStyle?.({
                  weight: 1.5,
                  color: "rgba(154,70,255,0.42)",
                  fillOpacity: found ? 0.92 : 0.24,
                });
              });

              layer.on("mouseout", () => {
                layer.setStyle?.({
                  weight: 0.85,
                  color: "rgba(255,255,255,0.10)",
                  fillOpacity: found ? 0.82 : 0.16,
                });
              });
            }}
          />
        )}
      </RLMapContainer>

      {!fc && (
        <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center">
          <div className="rounded-full border border-white/10 bg-neutral-900/60 px-4 py-2 text-sm text-neutral-200 backdrop-blur-xl">
            Missing GeoJSON:{" "}
            <span className="font-semibold">{resolvedGeoUrl}</span>
          </div>
        </div>
      )}
    </div>
  );
}
