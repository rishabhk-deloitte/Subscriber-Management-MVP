import { campaignBriefs as seedCampaigns, defaultMonitoringViews } from "./sample-data";
import { CampaignBrief, MonitoringSavedView } from "./types";

const CAMPAIGNS_KEY = "converge-campaigns";
const MONITORING_VIEWS_KEY = "converge-monitoring-views";

const isBrowser = () => typeof window !== "undefined";

const safeParse = <T,>(raw: string | null): T | undefined => {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn("Failed to parse persisted payload", error);
    return undefined;
  }
};

export const loadCampaigns = (): CampaignBrief[] => {
  if (!isBrowser()) return seedCampaigns;
  const parsed = safeParse<CampaignBrief[]>(window.localStorage.getItem(CAMPAIGNS_KEY));
  if (!parsed || parsed.length === 0) {
    return seedCampaigns;
  }
  return parsed;
};

export const saveCampaigns = (campaigns: CampaignBrief[]) => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(campaigns));
  } catch (error) {
    console.warn("Failed to persist campaigns", error);
  }
};

export const loadMonitoringViews = (): MonitoringSavedView[] => {
  if (!isBrowser()) return defaultMonitoringViews;
  const parsed = safeParse<MonitoringSavedView[]>(window.localStorage.getItem(MONITORING_VIEWS_KEY));
  if (!parsed || parsed.length === 0) {
    return defaultMonitoringViews;
  }
  return parsed;
};

export const saveMonitoringViews = (views: MonitoringSavedView[]) => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(MONITORING_VIEWS_KEY, JSON.stringify(views));
  } catch (error) {
    console.warn("Failed to persist monitoring views", error);
  }
};
