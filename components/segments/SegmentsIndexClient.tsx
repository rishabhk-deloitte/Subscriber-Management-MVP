"use client";

import Link from "next/link";
import { useState } from "react";
import { format } from "date-fns";
import { segmentDefinitions } from "@/lib/sample-data";
import { SegmentDefinition, SegmentRuleGroup } from "@/lib/types";
import { encodeRulesParam } from "@/lib/url-state";
import { logAudit } from "@/lib/audit";

const cloneSegment = (segment: SegmentDefinition): SegmentDefinition => {
  const clonedMetrics = {
    ...segment.metrics,
    reach: { ...segment.metrics.reach },
    warnings: segment.metrics.warnings.slice(),
    impact: { ...segment.metrics.impact },
  };
  return {
    ...segment,
    id: `${segment.id}-copy-${Date.now()}`,
    name: `${segment.name} copy`,
    lastEdited: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
    archived: false,
    rules: JSON.parse(JSON.stringify(segment.rules)) as SegmentRuleGroup,
    metrics: clonedMetrics,
    versions: JSON.parse(JSON.stringify(segment.versions)) as SegmentDefinition["versions"],
  };
};

export const SegmentsIndexClient = () => {
  const [segments, setSegments] = useState<SegmentDefinition[]>(segmentDefinitions);

  const handleDuplicate = (segment: SegmentDefinition) => {
    const duplicate = cloneSegment(segment);
    setSegments((prev) => [duplicate, ...prev]);
    logAudit({
      type: "segment-duplicate",
      timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
      route: "/segments",
      payload: { sourceId: segment.id, duplicateId: duplicate.id },
    });
  };

  const handleRename = (segment: SegmentDefinition) => {
    const nextName = window.prompt("Rename segment", segment.name);
    if (!nextName) return;
    setSegments((prev) =>
      prev.map((item) => (item.id === segment.id ? { ...item, name: nextName, lastEdited: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx") } : item)),
    );
    logAudit({
      type: "segment-rename",
      timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
      route: "/segments",
      payload: { segmentId: segment.id, name: nextName },
    });
  };

  const toggleArchive = (segment: SegmentDefinition) => {
    setSegments((prev) =>
      prev.map((item) =>
        item.id === segment.id
          ? { ...item, archived: !item.archived, lastEdited: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx") }
          : item,
      ),
    );
    logAudit({
      type: "segment-archive",
      timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
      route: "/segments",
      payload: { segmentId: segment.id, archived: !segment.archived },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Segment Studio</h1>
          <p className="text-sm text-slate-500">Saved segments with size, trend, and freshness summaries.</p>
        </div>
        <Link
          href="/segments/new"
          className="inline-flex items-center rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-muted"
        >
          New segment
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {segments.map((segment) => (
          <article
            key={segment.id}
            className={`rounded-xl border px-4 py-4 shadow-sm transition ${segment.archived ? "border-slate-200 bg-slate-100" : "border-slate-200 bg-white hover:border-brand"}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">{segment.language.toUpperCase()} · {segment.lastEdited}</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-800">{segment.name}</h2>
                <p className="mt-1 text-sm text-slate-500">{segment.description}</p>
              </div>
              <div className="text-right text-sm text-slate-600">
                <p>{segment.size.toLocaleString()} people</p>
                <p>{segment.trend >= 0 ? "+" : ""}{segment.trend.toFixed(1)} trend</p>
                <p className="text-xs text-slate-400">Fresh {segment.freshness}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="rounded-full bg-slate-100 px-2 py-1">{(segment.metrics.impact.propensity * 100).toFixed(1)}% propensity</span>
              <span className="rounded-full bg-slate-100 px-2 py-1">Reach email {segment.metrics.reach.email.toLocaleString()}</span>
              <span className="rounded-full bg-slate-100 px-2 py-1">WhatsApp {segment.metrics.reach.whatsapp.toLocaleString()}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={`/segments/new?${encodeRulesParam(segment.rules)}`}
                className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-brand hover:text-brand"
              >
                Open
              </Link>
              <button
                type="button"
                onClick={() => handleDuplicate(segment)}
                className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-brand hover:text-brand"
              >
                Duplicate
              </button>
              <button
                type="button"
                onClick={() => handleRename(segment)}
                className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-brand hover:text-brand"
              >
                Rename
              </button>
              <button
                type="button"
                onClick={() => toggleArchive(segment)}
                className={`rounded-md border px-3 py-1 text-xs font-semibold ${
                  segment.archived
                    ? "border-slate-400 text-slate-500 hover:border-brand hover:text-brand"
                    : "border-slate-300 text-slate-600 hover:border-red-400 hover:text-red-600"
                }`}
              >
                {segment.archived ? "Restore" : "Archive"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};
