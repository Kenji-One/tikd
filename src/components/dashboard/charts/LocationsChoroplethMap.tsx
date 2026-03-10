"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ComponentType,
} from "react";
import { MapContainer, GeoJSON, useMap } from "react-leaflet";
import type { FeatureCollection, Feature, Geometry } from "geojson";
import * as L from "leaflet";

/* ------------------------------ Types ------------------------------ */
type MapMode = "viewers" | "revenue" | "tickets" | "views";
type Scope = "world" | "us";

export type ChoroplethDatum = {
  key: string;
  label?: string;
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

type GeoProps = Record<string, unknown>;
type GeoFeature = Feature<Geometry, GeoProps>;

/* --------------------------- Visual theme -------------------------- */
const DEFAULT_RAMP = [
  "#1C003A",
  "#2B0053",
  "#470083",
  "#6600B7",
  "#8600EE",
  "#9A46FF",
  "#C7A0FF",
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
  return ramp[idx] ?? ramp[ramp.length - 1] ?? "#9A46FF";
}

function asRecord(x: unknown): Record<string, unknown> {
  return x && typeof x === "object" ? (x as Record<string, unknown>) : {};
}

function readString(obj: Record<string, unknown>, key: string): string {
  const v = obj[key];
  const s = typeof v === "string" || typeof v === "number" ? String(v) : "";
  return s.trim();
}

function normalizeMapKey(value: unknown): string {
  const raw =
    typeof value === "string" || typeof value === "number" ? String(value) : "";

  return raw.trim().toLowerCase().replace(/[._]+/g, " ").replace(/\s+/g, " ");
}

/* ------------------------- TS compatibility ------------------------ */
const RLMapContainer = MapContainer as unknown as ComponentType<
  ComponentProps<typeof MapContainer>
>;
const RLGeoJSON = GeoJSON as unknown as ComponentType<
  ComponentProps<typeof GeoJSON>
>;

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
      const m = map as L.Map & { zoomControl?: L.Control.Zoom };
      m.zoomControl?.remove?.();
    }
  }, [map, center, zoom, showZoomControls]);

  return null;
}

function BaseTiles() {
  const map = useMap();
  const layerRef = useRef<L.TileLayer | null>(null);

  useEffect(() => {
    if (!layerRef.current) {
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

  const effectiveMode: Exclude<MapMode, "views"> | "viewers" =
    mode === "views" ? "viewers" : mode;

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
        if (!res.ok) {
          throw new Error(`Failed to load geojson: ${resolvedGeoUrl}`);
        }
        const json = (await res.json()) as FeatureCollection<Geometry>;
        if (!cancelled) setFc(json);
      } catch (e) {
        if (!cancelled) setFc(null);
        console.error(e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [resolvedGeoUrl]);

  const { byKey, maxValue } = useMemo(() => {
    const m = new Map<string, ChoroplethDatum>();

    const add = (k: unknown, datum: ChoroplethDatum) => {
      const normalized = normalizeMapKey(k);
      if (!normalized) return;
      m.set(normalized, datum);
    };

    for (const d of data) {
      add(d.key, d);
      add(d.label, d);
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

  function featureKeys(f: GeoFeature): string[] {
    const props = asRecord(f.properties);
    const out: string[] = [];

    const add = (v: unknown) => {
      const normalized = normalizeMapKey(v);
      if (normalized) out.push(normalized);
    };

    add(f.id);
    add(props["id"]);

    if (scope === "world") {
      add(props["ISO3166-1-Alpha-2"]);
      add(props["ISO3166-1-Alpha-3"]);
      add(props["name"]);
      add(props["ADMIN"]);
      add(props["NAME"]);
      add(props["ISO_A2"]);
      add(props["ISO_A3"]);
      add(props["iso_a2"]);
      add(props["iso_a3"]);
      add(props["FORMAL_EN"]);
      add(props["NAME_LONG"]);
      add(props["BRK_NAME"]);

      return Array.from(new Set(out));
    }

    add(props["name"]);
    add(props["NAME"]);
    add(props["STATE_NAME"]);
    add(props["postal"]);
    add(props["STUSPS"]);

    return Array.from(new Set(out));
  }

  function getFeatureValue(f: GeoFeature) {
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

  function featureTitle(feature: GeoFeature) {
    const props = asRecord(feature.properties);

    if (scope === "world") {
      return (
        readString(props, "name") ||
        readString(props, "ADMIN") ||
        readString(props, "NAME") ||
        readString(props, "FORMAL_EN") ||
        readString(props, "NAME_LONG") ||
        "Unknown"
      );
    }

    return (
      readString(props, "name") ||
      readString(props, "STATE_NAME") ||
      readString(props, "NAME") ||
      "Unknown"
    );
  }

  return (
    <div className="relative h-full w-full">
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
            style={(feature) => {
              const f = feature as GeoFeature;
              const { value, found } = getFeatureValue(f);

              const v01 = found
                ? Math.max(0.28, valueTo01(value))
                : 0.12 +
                  pseudo01(`missing:${featureKeys(f).join("|")}`, seed) * 0.08;

              return {
                color: found
                  ? "rgba(255,255,255,0.18)"
                  : "rgba(255,255,255,0.12)",
                weight: found ? 1.05 : 0.9,
                fillColor: found ? rampColor(v01) : "#33204F",
                fillOpacity: found ? 0.88 : 0.42,
              };
            }}
            onEachFeature={(feature, layer) => {
              const f = feature as GeoFeature;
              const regionName = featureTitle(f);
              const { value, found } = getFeatureValue(f);

              const valueLine = found
                ? `<div class="tikd-map-tooltip__value">${formatCompact(value, prefix)}</div>`
                : `<div class="tikd-map-tooltip__nodata">No data yet</div>`;

              const tooltip = `
                <div class="tikd-map-tooltip__wrap">
                  <div class="tikd-map-tooltip__title">${regionName}</div>
                  <div class="tikd-map-tooltip__meta">${label}</div>
                  ${valueLine}
                </div>
              `;

              const path = layer as L.Path;

              path.bindTooltip(tooltip, {
                sticky: true,
                direction: "top",
                opacity: 1,
                offset: [0, -10],
                className: "tikd-map-tooltip",
              });

              path.on("mouseover", () => {
                path.setStyle({
                  weight: 1.7,
                  color: "rgba(154,70,255,0.55)",
                  fillOpacity: found ? 0.96 : 0.56,
                });
              });

              path.on("mouseout", () => {
                path.setStyle({
                  weight: found ? 1.05 : 0.9,
                  color: found
                    ? "rgba(255,255,255,0.18)"
                    : "rgba(255,255,255,0.12)",
                  fillOpacity: found ? 0.88 : 0.42,
                });
              });
            }}
          />
        )}

        {!fc && (
          <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center">
            <div className="rounded-full border border-white/10 bg-neutral-900/60 px-4 py-2 text-sm text-neutral-200 backdrop-blur-xl">
              Missing GeoJSON:{" "}
              <span className="font-semibold">{resolvedGeoUrl}</span>
            </div>
          </div>
        )}
      </RLMapContainer>
    </div>
  );
}
