"use client";

import { useMemo, useState } from "react";
import { differenceInHours, format } from "date-fns";

import { MetricLineage } from "@/lib/types";

export type FreshnessProps = {
  updatedAt: string;
  slaHours: number;
  lineage: MetricLineage[];
};

export function Freshness({ updatedAt, slaHours, lineage }: FreshnessProps) {
  const [open, setOpen] = useState(false);

  const freshness = useMemo(() => {
    const updatedDate = new Date(updatedAt);
    const hoursAgo = differenceInHours(new Date(), updatedDate);
    const formatted = format(updatedDate, "MMM d, p");
    const breached = hoursAgo > slaHours;
    return { hoursAgo, formatted, breached };
  }, [updatedAt, slaHours]);

  return (
    <div className="relative">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span>
          Last refreshed {freshness.formatted}
          <span className="ml-1 text-slate-400">({freshness.hoursAgo}h ago)</span>
        </span>
        {freshness.breached ? (
          <span className="badge border-amber-300 bg-amber-50 text-amber-700" title="SLA breach">
            SLA breach
          </span>
        ) : (
          <span className="badge border-slate-200 bg-slate-100 text-slate-600">SLA {slaHours}h</span>
        )}
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="h-6 w-6 rounded-full border border-slate-300 text-slate-500 transition hover:border-brand-300 hover:text-brand-600"
          aria-label="Metric lineage"
        >
          i
        </button>
      </div>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">Metric lineage</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
              aria-label="Close lineage details"
            >
              Close
            </button>
          </div>
          <ul className="mt-2 space-y-2">
            {lineage.map((item) => (
              <li key={`${item.kpi}-${item.source}`} className="rounded-lg border border-slate-100 bg-slate-50 p-2">
                <p className="font-semibold text-slate-700">{item.kpi}</p>
                <p>{item.source}</p>
                <p>Schedule: {item.schedule}</p>
                <p>Owner: {item.owner}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
