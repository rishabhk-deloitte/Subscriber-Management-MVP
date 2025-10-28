import { campaignBriefs as seedCampaigns, defaultMonitoringViews } from "./sample-data";
import { CampaignBrief, MonitoringSavedView } from "./types";
import { safeStorage } from "./safe-storage";

const CAMPAIGNS_KEY = "converge-campaigns";
const MONITORING_VIEWS_KEY = "converge-monitoring-views";

export const loadCampaigns = (): CampaignBrief[] =>
  safeStorage.get<CampaignBrief[]>(CAMPAIGNS_KEY, seedCampaigns);

export const saveCampaigns = (campaigns: CampaignBrief[]) => {
  safeStorage.set(CAMPAIGNS_KEY, campaigns);
};

export const loadMonitoringViews = (): MonitoringSavedView[] =>
  safeStorage.get<MonitoringSavedView[]>(MONITORING_VIEWS_KEY, defaultMonitoringViews);

export const saveMonitoringViews = (views: MonitoringSavedView[]) => {
  safeStorage.set(MONITORING_VIEWS_KEY, views);
};
