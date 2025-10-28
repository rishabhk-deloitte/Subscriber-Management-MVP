"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { OpportunityCard } from "./OpportunityCard";
import { ClarifyModal } from "./ClarifyModal";
import { FiltersPanel } from "./FiltersPanel";
import { CopyLink } from "@/components/shared/CopyLink";
import { useStore } from "@/lib/store";
import {
  ClarifyingPrompt,
  ContextComposerInput,
  ContextInterpretation,
  RadarFilters,
  RadarSeed,
} from "@/lib/types";
import { decodeContextFromSearch, decodeObjectiveFromSearch, decodeRadarFilters } from "@/lib/urlState";
import { adjustContext, defaultFiltersFromContext, deriveFilterSeedName, runContextStub } from "@/lib/llm-stub";
import { defaultFilters, filterOpportunities, findOpportunity, buildOpportunitySnapshot } from "@/lib/radar";
import { opportunities } from "@/lib/sample-data";
import { logAudit } from "@/lib/audit";
import { Opportunity } from "@/lib/types";

const download = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export const RadarClient = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const locale = useStore((state) => state.locale);
  const freshness = useStore((state) => state.freshness);
  const lastContext = useStore((state) => state.lastContext);
  const setLastContext = useStore((state) => state.setLastContext);
  const hydrateSeeds = useStore((state) => state.hydrateSeeds);
  const addSeed = useStore((state) => state.addSeed);
  const seeds = useStore((state) => state.seeds);

  const [mode, setMode] = useState<"context" | "filters">("context");
  const [context, setContext] = useState<ContextComposerInput | undefined>(undefined);
  const [interpretation, setInterpretation] = useState<ContextInterpretation | undefined>(undefined);
  const [selectedPrompt, setSelectedPrompt] = useState<ClarifyingPrompt | undefined>(undefined);
  const [filters, setFilters] = useState<RadarFilters>(defaultFilters);

  const contextFromUrl = useMemo(() => decodeContextFromSearch(searchParams), [searchParams]);
  const filtersFromUrl = useMemo(() => decodeRadarFilters(searchParams), [searchParams]);
  const objectiveFromUrl = useMemo(() => decodeObjectiveFromSearch(searchParams), [searchParams]);

  useEffect(() => {
    hydrateSeeds();
  }, [hydrateSeeds]);

  useEffect(() => {
    if (contextFromUrl) {
      setContext(contextFromUrl);
      setInterpretation(runContextStub(contextFromUrl));
      setLastContext(contextFromUrl);
      setMode("context");
      return;
    }
    if (lastContext) {
      setContext(lastContext);
      setInterpretation(runContextStub(lastContext));
      setMode("context");
    } else if (objectiveFromUrl) {
      const fallback: ContextComposerInput = {
        objective: objectiveFromUrl,
        market: "Liberty Puerto Rico",
        geography: ["San Juan Metro"],
        product: "Fiber",
        planType: "postpaid",
        language: locale,
        signals: [],
        bundleEligible: false,
      };
      setContext(fallback);
      setInterpretation(runContextStub(fallback));
      setMode("context");
    }
  }, [contextFromUrl, lastContext, objectiveFromUrl, locale, setLastContext]);

  useEffect(() => {
    if (filtersFromUrl) {
      setFilters(filtersFromUrl);
      setMode("filters");
    } else if (context) {
      setFilters(defaultFiltersFromContext(context));
    }
  }, [filtersFromUrl, context]);

  const contextOpportunities: Opportunity[] = useMemo(() => {
    if (!interpretation) return opportunities.slice(0, 5);
    return interpretation.rankedOpportunityIds
      .map((id) => findOpportunity(id))
      .filter(Boolean)
      .slice(0, 6) as Opportunity[];
  }, [interpretation]);

  const filteredOpportunities = useMemo(() => filterOpportunities(filters), [filters]);

  const visibleOpportunities = mode === "context" ? contextOpportunities : filteredOpportunities;

  const updateSearch = useCallback(
    (next: URLSearchParams) => {
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [pathname, router],
  );

  const handlePrompt = (prompt: ClarifyingPrompt) => {
    setSelectedPrompt(prompt);
  };

  const handleClarify = (updates: Partial<Pick<ContextComposerInput, "planType" | "language" | "bundleEligible">>) => {
    if (!context) return;
    const next = adjustContext(context, updates);
    setContext(next);
    setInterpretation(runContextStub(next));
    setLastContext(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set("context", encodeURIComponent(JSON.stringify(next)));
    updateSearch(params);
    logAudit({
      type: "radar-clarified",
      timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
      route: "/radar",
      payload: { updates },
    });
  };

  const handleModeChange = (nextMode: "context" | "filters") => {
    setMode(nextMode);
    const params = new URLSearchParams(searchParams.toString());
    if (nextMode === "filters") {
      params.delete("context");
      params.set("filters", encodeURIComponent(JSON.stringify(filters)));
    } else if (context) {
      params.delete("filters");
      params.set("context", encodeURIComponent(JSON.stringify(context)));
    }
    updateSearch(params);
    logAudit({
      type: "radar-mode", 
      timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
      route: "/radar",
      payload: { mode: nextMode },
    });
  };

  const handleFilterChange = (next: RadarFilters) => {
    setFilters(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set("filters", encodeURIComponent(JSON.stringify(next)));
    updateSearch(params);
  };

  const handleResetFilters = () => {
    const base = context ? defaultFiltersFromContext(context) : defaultFilters;
    handleFilterChange(base);
    logAudit({
      type: "radar-filters-reset",
      timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
      route: "/radar",
      payload: base,
    });
  };

  const handleSaveSeed = () => {
    const id = `seed-${Date.now()}`;
    const name = context ? deriveFilterSeedName(context) : `Radar seed ${seeds.length + 1}`;
    const seed: RadarSeed = {
      id,
      name,
      createdAt: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
      filters,
    };
    addSeed(seed);
    logAudit({
      type: "radar-seed",
      timestamp: seed.createdAt,
      route: "/radar",
      payload: seed,
    });
  };

  const exportSnapshot = () => {
    if (visibleOpportunities.length === 0) return;
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"/><title>Opportunity Radar Snapshot</title></head><body style="font-family:Inter,system-ui,sans-serif;background:#f8fafc;padding:32px;">${visibleOpportunities
      .slice(0, 6)
      .map((opp) => buildOpportunitySnapshot(opp, context, interpretation))
      .join("<hr style='margin:32px 0;border:none;border-top:1px solid #cbd5f5' />")}</body></html>`;
    download(new Blob([html], { type: "text/html" }), `radar-${Date.now()}.html`);
    logAudit({
      type: "radar-export",
      timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
      route: "/radar",
      payload: { mode, count: visibleOpportunities.length },
    });
  };

  const contextMissing = mode === "context" && !context;

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Opportunity Radar</h1>
          <p className="text-sm text-slate-500">Deterministic ranking of Liberty Puerto Rico opportunities.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs uppercase tracking-wide text-slate-500">Freshness {freshness}</span>
          <button
            type="button"
            onClick={() => handleModeChange(mode === "context" ? "filters" : "context")}
            className="rounded-md border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700 hover:border-brand hover:text-brand"
          >
            Mode: {mode === "context" ? "Context" : "Filter"}
          </button>
          <button
            type="button"
            onClick={exportSnapshot}
            className="rounded-md border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700 hover:border-brand hover:text-brand"
          >
            Export snapshot
          </button>
          <CopyLink />
        </div>
      </div>

      {mode === "context" && context && interpretation && (
        <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="space-y-4">
            <article className="card p-5">
              <h2 className="text-sm font-semibold text-slate-700">Structured signals</h2>
              <ul className="mt-3 space-y-1 text-sm text-slate-600">
                {interpretation.structuredSignals.map((signal) => (
                  <li key={signal} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-brand-500" />
                    <span className="capitalize">{signal}</span>
                  </li>
                ))}
              </ul>
            </article>
            <article className="card p-5">
              <h2 className="text-sm font-semibold text-slate-700">Inferred CSP drivers</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {interpretation.inferredDrivers.map((driver) => (
                  <span key={driver} className="chip border-brand-200 bg-brand-50 text-brand-700">
                    {driver}
                  </span>
                ))}
              </div>
              <div className="mt-4 space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assumptions</h3>
                <ul className="space-y-1 text-sm text-slate-600">
                  {interpretation.assumptions.map((assumption) => (
                    <li key={assumption}>{assumption}</li>
                  ))}
                </ul>
              </div>
              <div className="mt-4 space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Clarifying questions</h3>
                <div className="flex flex-wrap gap-2">
                  {interpretation.clarifyingPrompts.map((prompt) => (
                    <button
                      key={prompt.id}
                      type="button"
                      onClick={() => handlePrompt(prompt)}
                      className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-700"
                    >
                      {prompt.label}
                    </button>
                  ))}
                </div>
              </div>
            </article>
          </div>
          <div className="space-y-4">
            {contextOpportunities.map((opp) => (
              <OpportunityCard key={opp.id} opportunity={opp} context={context} interpretation={interpretation} />
            ))}
          </div>
        </section>
      )}

      {contextMissing && (
        <div className="card border-dashed border-slate-300 bg-white p-6 text-center">
          <p className="text-sm text-slate-600">Compose a context on the Start screen to activate the radar.</p>
          <a
            href="/start"
            className="mt-3 inline-flex items-center rounded-md bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            Go to Start
          </a>
        </div>
      )}

      {mode === "filters" && (
        <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <FiltersPanel filters={filters} onChange={handleFilterChange} onReset={handleResetFilters} onSaveSeed={handleSaveSeed} />
          <div className="space-y-4">
            {filteredOpportunities.length === 0 && (
              <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
                No opportunities match the current filters.
              </p>
            )}
            {filteredOpportunities.map((opp) => (
              <OpportunityCard key={opp.id} opportunity={opp} context={context} interpretation={interpretation} />
            ))}
          </div>
        </section>
      )}

      {selectedPrompt && context && (
        <ClarifyModal
          prompt={selectedPrompt}
          open={Boolean(selectedPrompt)}
          context={context}
          onClose={() => setSelectedPrompt(undefined)}
          onConfirm={handleClarify}
        />
      )}
    </div>
  );
};
