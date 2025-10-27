"use client";

import { opportunities } from "@/lib/sample-data";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { decodeContextFromSearch, decodeObjectiveFromSearch } from "@/lib/urlState";
import { useStore } from "@/lib/store";
import { runContextStub } from "@/lib/llm-stub";

export const OpportunitiesTable = () => {
  const searchParams = useSearchParams();
  const locale = useStore((state) => state.locale);
  const lastContext = useStore((state) => state.lastContext);

  const contextFromUrl = useMemo(() => decodeContextFromSearch(searchParams), [searchParams]);
  const objectiveFromUrl = useMemo(() => decodeObjectiveFromSearch(searchParams), [searchParams]);

  const stub = useMemo(() => {
    if (contextFromUrl) return runContextStub(contextFromUrl);
    if (objectiveFromUrl && lastContext) {
      return runContextStub({ ...lastContext, objective: objectiveFromUrl });
    }
    if (objectiveFromUrl) {
      return runContextStub({
        objective: objectiveFromUrl,
        market: "Liberty Puerto Rico",
        geography: ["San Juan Metro"],
        product: "Fiber",
        planType: "postpaid",
        language: locale,
        signals: []
      });
    }
    return undefined;
  }, [contextFromUrl, objectiveFromUrl, lastContext, locale]);

  const rankedIds = stub?.rankedOpportunityIds ?? [];
  const filtered = useMemo(() => {
    if (!stub) return opportunities.slice(0, 6);
    return rankedIds.map((id) => opportunities.find((opp) => opp.id === id)).filter(Boolean);
  }, [stub, rankedIds]);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              Opportunity
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              Zone
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              Product
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              Value
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              Probability
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {filtered.map((opp) => (
            <tr key={opp!.id} className="hover:bg-brand/5">
              <td className="px-4 py-3 text-sm font-medium text-slate-800">{opp!.title}</td>
              <td className="px-4 py-3 text-sm text-slate-600">{opp!.zone}</td>
              <td className="px-4 py-3 text-sm text-slate-600">{opp!.product}</td>
              <td className="px-4 py-3 text-sm text-slate-600">${opp!.value.toLocaleString()}</td>
              <td className="px-4 py-3 text-sm text-slate-600">{Math.round(opp!.probability * 100)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
