"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";

import { OpportunityCard } from "@/components/radar/OpportunityCard";
import { Heatmap } from "@/components/radar/Heatmap";
import { BrandBadge } from "@/components/ui/Brand";
import { copyDeepLink, useQueryState } from "@/lib/urlState";
import { useStore } from "@/lib/store";
import type { RankedOpportunity } from "@/lib/sample-data";
import { opportunityRankings, radarHeatmapData } from "@/lib/sample-data";
import { PlanType, Product, RadarSeed } from "@/lib/types";

const MIN_AUDIENCE = 1800;
const stringParse = (value: string | null) => (value === null ? undefined : value);
const stringSerialize = (value: string | undefined) => value ?? "";

const DATE_PRESETS = [
  { label: "Last 7 days", from: "2024-05-05", to: "2024-05-12" },
  { label: "Last 14 days", from: "2024-04-29", to: "2024-05-12" },
  { label: "Last 30 days", from: "2024-04-13", to: "2024-05-12" },
];

const unique = <T,>(values: T[]) => Array.from(new Set(values));

const geoOptions = unique(opportunityRankings.map((opp) => opp.geography));
const productOptions = unique(opportunityRankings.map((opp) => opp.product));
const segmentOptions = unique(opportunityRankings.map((opp) => opp.segmentTag));

const seedNameFromFilters = (geo?: string, product?: string, segment?: string) => {
  const tokens = [geo, product, segment].filter(Boolean);
  return tokens.length > 0 ? tokens.join(" · ") : "Radar seed";
};

const buildFilters = (geo?: string, product?: string, segment?: string, from?: string, to?: string) => {
  const typedProduct = product as Product | undefined;
  return {
    zones: geo ? [geo] : [],
    products: typedProduct ? [typedProduct] : [],
    planTypes: [] as PlanType[],
    segments: segment ? [segment] : [],
    dateRange: { from, to },
    geography: geo,
    product: typedProduct,
    segment,
  };
};

const formatDateLabel = (value?: string) => {
  if (!value) return "—";
  try {
    return format(parseISO(value), "MMM d");
  } catch (error) {
    return value;
  }
};

export default function RadarPage() {
  const router = useRouter();
  const addSeed = useStore((state) => state.addSeed);
  const hydrateSeeds = useStore((state) => state.hydrateSeeds);
  const seeds = useStore((state) => state.seeds);

  const [geo, setGeo] = useQueryState<string | undefined>("geo", {
    parse: stringParse,
    serialize: stringSerialize,
  });
  const [product, setProduct] = useQueryState<string | undefined>("product", {
    parse: stringParse,
    serialize: stringSerialize,
  });
  const [segment, setSegment] = useQueryState<string | undefined>("segment", {
    parse: stringParse,
    serialize: stringSerialize,
  });
  const [dateFrom, setDateFrom] = useQueryState<string | undefined>("from", {
    parse: stringParse,
    serialize: stringSerialize,
  });
  const [dateTo, setDateTo] = useQueryState<string | undefined>("to", {
    parse: stringParse,
    serialize: stringSerialize,
  });

  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  useEffect(() => {
    hydrateSeeds();
  }, [hydrateSeeds]);

  useEffect(() => {
    if (copyState === "copied") {
      const timeout = window.setTimeout(() => setCopyState("idle"), 2200);
      return () => window.clearTimeout(timeout);
    }
    return undefined;
  }, [copyState]);

  const filters = useMemo(
    () => buildFilters(geo, product, segment, dateFrom, dateTo),
    [geo, product, segment, dateFrom, dateTo],
  );

  const filteredOpportunities = useMemo(() => {
    return [...opportunityRankings]
      .filter((opp) => {
        if (filters.geography && opp.geography !== filters.geography) return false;
        if (filters.product && opp.product !== filters.product) return false;
        if (filters.segment && opp.segmentTag !== filters.segment) return false;
        if (filters.dateRange.from && new Date(opp.updatedAt) < new Date(filters.dateRange.from)) return false;
        if (filters.dateRange.to && new Date(opp.updatedAt) > new Date(filters.dateRange.to)) return false;
        return true;
      })
      .sort((a, b) => b.value * b.confidence - a.value * a.confidence);
  }, [filters]);

  const heatmapData = useMemo(() => {
    const buckets = new Map<string, { audience: number; value: number; confidence: number; count: number; name: string }>();
    const source = filteredOpportunities.length > 0 ? filteredOpportunities : opportunityRankings;
    source.forEach((opp) => {
      const key = opp.geography.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const existing = buckets.get(key) ?? { audience: 0, value: 0, confidence: 0, count: 0, name: opp.geography };
      existing.audience += opp.audience;
      existing.value += opp.value;
      existing.confidence += opp.confidence;
      existing.count += 1;
      buckets.set(key, existing);
    });
    return Object.fromEntries(
      Array.from(buckets.entries()).map(([key, bucket]) => [
        key,
        {
          name: bucket.name,
          audience: bucket.audience,
          value: bucket.value,
          confidence: bucket.confidence / bucket.count,
        },
      ]),
    );
  }, [filteredOpportunities]);

  const handleCopyLink = async () => {
    const url = await copyDeepLink();
    if (!url) {
      setCopyState("error");
      return;
    }
    setCopyState("copied");
    window.open(url, "_blank");
  };

  const handleSaveSeed = () => {
    const defaultName = seedNameFromFilters(geo, product, segment);
    const name = window.prompt("Name this radar seed", defaultName) ?? defaultName;
    const seed: RadarSeed = {
      id: `seed-${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
      filters,
    };
    addSeed(seed);
  };

  const handleOpenStudio = (opportunity: RankedOpportunity) => {
    const derivedFilters = buildFilters(
      opportunity.geography,
      opportunity.product,
      opportunity.segmentTag,
      dateFrom,
      dateTo,
    );
    const seedId = `opportunity-${opportunity.id}-${Date.now()}`;
    const seed: RadarSeed = {
      id: seedId,
      name: `${opportunity.name} seed`,
      createdAt: new Date().toISOString(),
      filters: {
        ...derivedFilters,
        segments: [opportunity.segmentTag],
      },
      opportunityId: opportunity.id,
    };
    addSeed(seed);
    router.push(`/segments?seedId=${encodeURIComponent(seedId)}`);
  };

  const activeSeedCount = seeds.length;

  const preset = DATE_PRESETS.find((item) => item.from === dateFrom && item.to === dateTo);

  return (
    <main className="space-y-8 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">Opportunity Radar</h1>
        <p className="text-sm text-slate-600">
          Ranked opportunities blending audience size, modeled value, and confidence. Filters persist for sharing and Segment Studio seeding.
        </p>
      </header>

      <section className="sticky top-16 z-10 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Geography</p>
            <select
              value={geo ?? ""}
              onChange={(event) => setGeo(event.target.value || undefined)}
              className="mt-1 w-48 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            >
              <option value="">All geographies</option>
              {geoOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Product</p>
            <select
              value={product ?? ""}
              onChange={(event) => setProduct(event.target.value || undefined)}
              className="mt-1 w-44 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            >
              <option value="">All products</option>
              {productOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Segment</p>
            <select
              value={segment ?? ""}
              onChange={(event) => setSegment(event.target.value || undefined)}
              className="mt-1 w-52 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            >
              <option value="">All segments</option>
              {segmentOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date range</p>
            <div className="mt-1 flex items-center gap-2">
              <select
                value={dateFrom ?? ""}
                onChange={(event) => setDateFrom(event.target.value || undefined)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              >
                <option value="">Start</option>
                {DATE_PRESETS.map((presetOption) => (
                  <option key={presetOption.label} value={presetOption.from}>
                    {presetOption.label.split(" ")[1]} start
                  </option>
                ))}
              </select>
              <select
                value={dateTo ?? ""}
                onChange={(event) => setDateTo(event.target.value || undefined)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              >
                <option value="">End</option>
                {DATE_PRESETS.map((presetOption) => (
                  <option key={presetOption.label} value={presetOption.to}>
                    {presetOption.label.split(" ")[1]} end
                  </option>
                ))}
              </select>
              {preset && (
                <span className="text-xs text-slate-500">Preset: {preset.label}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Active filters:</span>
            <span className="font-medium text-slate-700">{geo ?? "All PR"}</span>
            <span>·</span>
            <span className="font-medium text-slate-700">{product ?? "Any product"}</span>
            <span>·</span>
            <span className="font-medium text-slate-700">{segment ?? "Any segment"}</span>
            <span>·</span>
            <span className="font-medium text-slate-700">
              {formatDateLabel(dateFrom)} → {formatDateLabel(dateTo)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-brand-400 hover:text-brand-600"
            >
              {copyState === "copied" ? "Copied!" : "Copy link"}
            </button>
            <button
              type="button"
              onClick={handleSaveSeed}
              className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
            >
              Save as seed
            </button>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Opportunity pockets heatmap</h2>
            <p className="text-sm text-slate-500">
              Aggregated audience size, modeled value, and confidence across geographies. Hover to inspect.
            </p>
          </div>
          <BrandBadge status="on-track" />
        </div>
        <div className="mt-4 h-72">
          <Heatmap data={Object.keys(heatmapData).length > 0 ? heatmapData : radarHeatmapData} />
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filteredOpportunities.map((opportunity, index) => (
          <OpportunityCard
            key={opportunity.id}
            variant="ranked"
            rank={index + 1}
            minAudience={MIN_AUDIENCE}
            opportunity={opportunity}
            onOpenStudio={() => handleOpenStudio(opportunity)}
          />
        ))}
      </section>

      <footer className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            Saved seeds ready in Segment Studio: <span className="font-medium text-slate-700">{activeSeedCount}</span>
          </div>
          <button
            type="button"
            onClick={() => router.push("/segments")}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-brand-400 hover:text-brand-600"
          >
            View in Segment Studio
          </button>
        </div>
      </footer>
    </main>
  );
}
