import { create } from "zustand";
import { format } from "date-fns";
import { ContextComposerInput, Objective, RadarSeed, StoreState } from "./types";

const initialFreshness = () => format(new Date(), "PPPp");
const SEED_STORAGE_KEY = "converge-radar-seeds";

const readSeeds = (): RadarSeed[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SEED_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RadarSeed[]) : [];
  } catch (error) {
    console.warn("Failed to read radar seeds", error);
    return [];
  }
};

const persistSeeds = (seeds: RadarSeed[]) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SEED_STORAGE_KEY, JSON.stringify(seeds));
  } catch (error) {
    console.warn("Failed to persist radar seeds", error);
  }
};

export const useStore = create<StoreState>((set, get) => ({
  locale: "en",
  setLocale: (locale) => set({ locale }),
  freshness: initialFreshness(),
  objective: undefined,
  setObjective: (objective?: Objective) => set({ objective }),
  lastContext: undefined,
  setLastContext: (ctx?: ContextComposerInput) =>
    set({ lastContext: ctx, freshness: initialFreshness() }),
  radarSeed: undefined,
  setRadarSeed: (seed?: string) => set({ radarSeed: seed }),
  selectedSegmentId: undefined,
  setSelectedSegment: (id?: string) => set({ selectedSegmentId: id }),
  selectedCampaignId: undefined,
  setSelectedCampaign: (id?: string) => set({ selectedCampaignId: id }),
  seeds: [],
  hydrateSeeds: () => {
    if (typeof window === "undefined") return;
    const existing = get().seeds;
    if (existing.length > 0) return;
    const hydrated = readSeeds();
    if (hydrated.length > 0) {
      set({ seeds: hydrated });
    }
  },
  addSeed: (seed: RadarSeed) => {
    const next = [seed, ...get().seeds.filter((existing) => existing.id !== seed.id)];
    set({ seeds: next });
    persistSeeds(next);
  },
  removeSeed: (id: string) => {
    const next = get().seeds.filter((seed) => seed.id !== id);
    set({ seeds: next });
    persistSeeds(next);
  },
}));
