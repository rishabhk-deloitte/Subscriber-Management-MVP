import { create } from "zustand";
import { format } from "date-fns";

import { BookmarkEntry, ContextComposerInput, Objective, RadarSeed, StoreState } from "./types";
import { safeStorage } from "./safe-storage";

const initialFreshness = () => format(new Date(), "PPPp");
const SEED_STORAGE_KEY = "converge-radar-seeds";
const BOOKMARKS_STORAGE_KEY = "converge-radar-bookmarks";

const loadSeeds = () => safeStorage.get<RadarSeed[]>(SEED_STORAGE_KEY, []);
const persistSeeds = (seeds: RadarSeed[]) => safeStorage.set(SEED_STORAGE_KEY, seeds);

const loadBookmarks = () => safeStorage.get<BookmarkEntry[]>(BOOKMARKS_STORAGE_KEY, []);
const persistBookmarks = (bookmarks: BookmarkEntry[]) => safeStorage.set(BOOKMARKS_STORAGE_KEY, bookmarks);

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
  seeds: loadSeeds(),
  hydrateSeeds: () => {
    const existing = get().seeds;
    if (existing.length > 0) return;
    const hydrated = loadSeeds();
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
  bookmarks: loadBookmarks(),
  hydrateBookmarks: () => {
    const existing = get().bookmarks;
    if (existing.length > 0) return;
    const hydrated = loadBookmarks();
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
