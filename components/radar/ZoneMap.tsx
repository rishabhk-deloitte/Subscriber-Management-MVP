"use client";

import dynamic from "next/dynamic";
import { memo, useMemo } from "react";
import geoData from "@/lib/geo/pr-zones.json";

const ComposableMap = dynamic(() => import("react-simple-maps").then((mod) => mod.ComposableMap), { ssr: false });
const Geographies = dynamic(() => import("react-simple-maps").then((mod) => mod.Geographies), { ssr: false });
const Geography = dynamic(() => import("react-simple-maps").then((mod) => mod.Geography), { ssr: false });

export interface ZoneHeatmapProps {
  values: { zone: string; intensity: number }[];
}

const intensityToColor = (intensity: number) => {
  const clamped = Math.max(0, Math.min(intensity, 1));
  const lightness = 90 - clamped * 40;
  const saturation = 45 + clamped * 25;
  return `hsl(158 ${saturation}% ${lightness}%)`;
};

const ZoneHeatmapComponent = ({ values }: ZoneHeatmapProps) => {
  const lookup = useMemo(() => new Map(values.map((entry) => [entry.zone, entry.intensity])), [values]);

  return (
    <div className="h-64 w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <ComposableMap projectionConfig={{ scale: 7000 }} width={420} height={260}>
        <Geographies geography={geoData}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const properties = geo.properties ?? {};
              const nameValue = (properties as Record<string, unknown>)["name"];
              const zone = typeof nameValue === "string" ? nameValue : "Unknown";
              const intensity = lookup.get(zone) ?? 0.2;
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={intensityToColor(intensity)}
                  stroke="#94a3b8"
                  style={{ default: { outline: "none" }, hover: { outline: "none" }, pressed: { outline: "none" } }}
                  tabIndex={0}
                >
                  <title>
                    {zone}: {(intensity * 100).toFixed(0)}% intensity
                  </title>
                </Geography>
              );
            })
          }
        </Geographies>
      </ComposableMap>
    </div>
  );
};

export const ZoneHeatmap = memo(ZoneHeatmapComponent);
