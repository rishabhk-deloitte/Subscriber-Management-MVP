"use client";

import { useMemo, useState } from "react";
import { scaleLinear } from "d3-scale";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";

import { getRadarGeographies } from "@/lib/geo";
import type { RadarFeature } from "@/lib/geo";

type HeatmapDatum = {
  name: string;
  audience: number;
  value: number;
  confidence: number;
};

type HeatmapProps = {
  data: Record<string, HeatmapDatum>;
};

const geographies = getRadarGeographies();

export function Heatmap({ data }: HeatmapProps) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);

  const { scale, buckets } = useMemo(() => {
    const entries = Object.entries(data);
    const max = entries.reduce((acc, [, value]) => Math.max(acc, value.value * value.confidence), 1);
    const scaleFn = scaleLinear<string>()
      .domain([0, max * 0.5, max])
      .range(["#F5FAEB", "#A6CF5B", "#86BC25"]);
    const bucketValues = Array.from({ length: 5 }, (_, idx) => (max / 4) * idx);
    return {
      scale: scaleFn,
      buckets: bucketValues.map((score) => ({
        score,
        color: scaleFn(score),
      })),
    };
  }, [data]);

  const hoverDatum = hoverId ? data[hoverId] : undefined;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 shadow-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 accent-brand-500"
            checked={showOverlay}
            onChange={(event) => setShowOverlay(event.target.checked)}
          />
          Show competitor overlay
        </label>
      </div>
      <ComposableMap projection="geoMercator" projectionConfig={{ scale: 5500, center: [-66.2, 18.2] }} width={800} height={420}>
        <Geographies geography={{ type: "FeatureCollection", features: geographies as any }}>
          {({ geographies: geoFeatures }) =>
            geoFeatures.map((geo) => {
              const feature = geo as unknown as RadarFeature;
              const id = feature.properties.GEOID;
              const datum = data[id];
              const fill = datum ? scale(datum.value * datum.confidence) : "#F8FAFC";
              return (
                <Geography
                  key={id}
                  geography={feature as any}
                  onMouseEnter={() => setHoverId(id)}
                  onMouseLeave={() => setHoverId(null)}
                  style={{
                    default: {
                      fill: showOverlay ? "transparent" : fill,
                      stroke: showOverlay ? "#94a3b8" : "#cbd5f5",
                      strokeWidth: showOverlay ? 2 : 1,
                      strokeDasharray: showOverlay ? "4 4" : undefined,
                    },
                    hover: {
                      fill: showOverlay ? "transparent" : fill,
                      stroke: "#334155",
                      strokeWidth: 2,
                      strokeDasharray: showOverlay ? "4 4" : undefined,
                    },
                    pressed: {
                      fill: showOverlay ? "transparent" : fill,
                      stroke: "#1e293b",
                      strokeWidth: 2,
                      strokeDasharray: showOverlay ? "4 4" : undefined,
                    },
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>
      <div className="pointer-events-none absolute bottom-4 right-4 space-y-2 rounded-2xl border border-slate-200 bg-white/90 p-3 text-xs text-slate-600 shadow-sm">
        <p className="font-semibold text-slate-700">Legend</p>
        <ul className="space-y-1">
          {buckets.map((bucket, index) => (
            <li key={bucket.score} className="flex items-center gap-2">
              <span className="inline-flex h-3 w-3 rounded-sm" style={{ backgroundColor: bucket.color }} />
              <span>
                ≥ {Math.round(bucket.score).toLocaleString()} score
                {index === buckets.length - 1 ? "" : ""}
              </span>
            </li>
          ))}
        </ul>
      </div>
      {hoverDatum && (
        <div className="pointer-events-none absolute right-4 bottom-4 max-w-xs rounded-2xl border border-slate-200 bg-white/95 p-4 text-sm shadow-lg">
          <p className="text-sm font-semibold text-slate-900">{hoverDatum.name}</p>
          <p className="mt-1 text-xs text-slate-500">Audience {hoverDatum.audience.toLocaleString()}</p>
          <p className="text-xs text-slate-500">
            Value ${Math.round(hoverDatum.value).toLocaleString()} · Confidence {(hoverDatum.confidence * 100).toFixed(0)}%
          </p>
        </div>
      )}
    </div>
  );
}
