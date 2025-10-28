import { campaignBriefs, defaultMonitoringViews, opportunityRankings } from "./sample-data";
import { RadarSeed } from "./types";

const CAMPAIGNS_KEY = "converge-campaigns";
const MONITORING_VIEWS_KEY = "converge-monitoring-views";
const RADAR_SEEDS_KEY = "converge-radar-seeds";
const AUDIT_KEY = "converge-subscriber-audit";

const isBrowser = () => typeof window !== "undefined";

export const applySeed = () => {
  if (!isBrowser()) return;
  window.localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(campaignBriefs));
  window.localStorage.setItem(MONITORING_VIEWS_KEY, JSON.stringify(defaultMonitoringViews));
  const seeds: RadarSeed[] = opportunityRankings.slice(0, 3).map((opportunity, index) => ({
    id: `seed-${opportunity.id}`,
    name: opportunity.name,
    createdAt: new Date().toISOString(),
    filters: {
      zones: [opportunity.geography],
      products: [opportunity.product],
      planTypes: [],
      segments: [opportunity.segmentTag],
      dateRange: {},
      geography: opportunity.geography,
      product: opportunity.product,
      segment: opportunity.segmentTag,
    },
    opportunityId: opportunity.id,
  }));
  window.localStorage.setItem(RADAR_SEEDS_KEY, JSON.stringify(seeds));
  window.localStorage.removeItem(AUDIT_KEY);
};

export const resetSeed = () => {
  if (!isBrowser()) return;
  window.localStorage.removeItem(CAMPAIGNS_KEY);
  window.localStorage.removeItem(MONITORING_VIEWS_KEY);
  window.localStorage.removeItem(RADAR_SEEDS_KEY);
  window.localStorage.removeItem(AUDIT_KEY);
};

export const ensureSeed = () => {
  if (!isBrowser()) return;
  if (!window.localStorage.getItem(CAMPAIGNS_KEY)) {
    applySeed();
  }
};
