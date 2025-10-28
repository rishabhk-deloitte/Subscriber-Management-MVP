import geoJson from "./geo/pr-zones.json";

type Geometry = {
  type: string;
  coordinates?: unknown;
  [key: string]: unknown;
};

export type RadarFeature = {
  type: "Feature";
  properties: {
    name: string;
    GEOID: string;
  };
  geometry: Geometry;
};

const toGeoId = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const features = (geoJson as {
  features: Array<{
    type: string;
    properties: { name: string; GEOID?: string };
    geometry: Geometry;
  }>;
}).features.map((feature) => ({
  ...feature,
  properties: {
    ...feature.properties,
    GEOID: feature.properties.GEOID ?? toGeoId(feature.properties.name),
  },
}));

export const getRadarGeographies = () => features;
