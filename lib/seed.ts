import { campaignBriefs, defaultMonitoringViews, opportunityRankings } from "./sample-data";
import { RadarSeed } from "./types";
import { safeStorage } from "./safe-storage";

const CAMPAIGNS_KEY = "converge-campaigns";
const MONITORING_VIEWS_KEY = "converge-monitoring-views";
const RADAR_SEEDS_KEY = "converge-radar-seeds";
const AUDIT_KEY = "converge-subscriber-audit";

export const applySeed = () => {
  safeStorage.set(CAMPAIGNS_KEY, campaignBriefs);
  safeStorage.set(MONITORING_VIEWS_KEY, defaultMonitoringViews);
  const seeds: RadarSeed[] = opportunityRankings.slice(0, 3).map((opportunity) => ({
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
  safeStorage.set<RadarSeed[]>(RADAR_SEEDS_KEY, seeds);
  safeStorage.remove(AUDIT_KEY);
};

export const resetSeed = () => {
  safeStorage.remove(CAMPAIGNS_KEY);
  safeStorage.remove(MONITORING_VIEWS_KEY);
  safeStorage.remove(RADAR_SEEDS_KEY);
  safeStorage.remove(AUDIT_KEY);
};

export const ensureSeed = () => {
  const campaigns = safeStorage.get<unknown | null>(CAMPAIGNS_KEY, null);
  if (!campaigns) {
    applySeed();
  }
};
