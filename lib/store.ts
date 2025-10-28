import { create } from "zustand";
import { format } from "date-fns";
import { BookmarkEntry, ContextComposerInput, Objective, RadarSeed, StoreState } from "./types";

const initialFreshness = () => format(new Date(), "PPPp");
const SEED_STORAGE_KEY = "converge-radar-seeds";
const BOOKMARKS_STORAGE_KEY = "converge-radar-bookmarks";

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

const readBookmarks = (): BookmarkEntry[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(BOOKMARKS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BookmarkEntry[]) : [];
  } catch (error) {
    console.warn("Failed to read bookmarks", error);
    return [];
  }
};

const persistBookmarks = (bookmarks: BookmarkEntry[]) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(bookmarks));
  } catch (error) {
    console.warn("Failed to persist bookmarks", error);
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
  bookmarks: [],
  hydrateBookmarks: () => {
    if (typeof window === "undefined") return;
    const existing = get().bookmarks;
    if (existing.length > 0) return;
    const hydrated = readBookmarks();
    if (hydrated.length > 0) {
      set({ bookmarks: hydrated });
    }
  },
  addBookmark: (bookmark: BookmarkEntry) => {
    const next = [bookmark, ...get().bookmarks.filter((entry) => entry.id !== bookmark.id)];
    set({ bookmarks: next });
    persistBookmarks(next);
  },
  removeBookmark: (id: string) => {
    const next = get().bookmarks.filter((bookmark) => bookmark.id !== id);
    set({ bookmarks: next });
    persistBookmarks(next);
  },
}));
