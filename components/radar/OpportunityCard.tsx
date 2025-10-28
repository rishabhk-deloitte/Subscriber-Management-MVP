"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ContextComposerInput, ContextInterpretation, Opportunity } from "@/lib/types";
import { format } from "date-fns";
import { formattedTrend, formatEligibility, snapshotBlob } from "@/lib/radar";
import { logAudit } from "@/lib/audit";

const ZoneHeatmap = dynamic(() => import("./ZoneMap").then((mod) => mod.ZoneHeatmap), { ssr: false });

interface OpportunityCardProps {
  opportunity: Opportunity;
  context?: ContextComposerInput;
  interpretation?: ContextInterpretation;
}

const channelLabels: { key: keyof Opportunity["reachability"]; label: string }[] = [
  { key: "email", label: "Email" },
  { key: "sms", label: "SMS" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "retail", label: "Retail" },
  { key: "callCenter", label: "Call Center" },
];

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

export const OpportunityCard = ({ opportunity, context, interpretation }: OpportunityCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<"overview" | "heatmap" | "benchmarks" | "lineage">("overview");

  const reachability = useMemo(
    () =>
      channelLabels.map(({ key, label }) => ({
        label,
        enabled: opportunity.reachability[key] as boolean,
      })),
    [opportunity.reachability],
  );

  const exportSnapshot = () => {
    const blob = snapshotBlob(opportunity, context, interpretation);
    download(blob, `${opportunity.id}-snapshot.html`);
    logAudit({
      type: "radar-opportunity-export",
      timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
      route: "/radar",
      payload: { opportunityId: opportunity.id },
    });
  };

  const handleOpenSegment = () => {
    logAudit({
      type: "radar-open-segment",
      timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
      route: "/radar",
      payload: { opportunityId: opportunity.id },
    });
  };

  return (
    <article className="card focus-within:ring-2 focus-within:ring-brand-500">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full flex-col gap-4 rounded-t-xl px-5 py-4 text-left focus:outline-none"
        aria-expanded={expanded}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-600">
              <span>{opportunity.objective}</span>
              <span className="chip border-brand-200 bg-brand-50 text-brand-700">
                {opportunity.product}
              </span>
            </div>
            <h3 className="mt-1 text-lg font-semibold text-slate-800">{opportunity.title}</h3>
            <p className="mt-1 text-sm text-slate-500">{opportunity.whyNow}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-700">{opportunity.subscriberCount.toLocaleString()} subs</p>
            <p className="text-sm text-slate-500">Value ${opportunity.estimatedValue.toLocaleString()}</p>
            <p className="text-sm text-slate-500">Confidence {(opportunity.confidence * 100).toFixed(0)}%</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span className="rounded-full bg-slate-100 px-2 py-1 font-medium text-slate-700">
            {formattedTrend(opportunity.trend)}
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-1 font-medium text-slate-700">
            {formatEligibility(opportunity)}
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-1 font-medium text-slate-700">
            Preview {opportunity.previewAudience.toLocaleString()} households
          </span>
          {opportunity.drivers.map((driver) => (
            <span key={driver} className="chip border-brand-200 bg-brand-50 text-brand-700">
              {driver}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {reachability.map((item) => (
            <span
              key={item.label}
              className={`rounded-full px-2 py-1 font-medium ${
                item.enabled ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-400"
              }`}
            >
              {item.label}
            </span>
          ))}
        </div>
      </button>
      {expanded && (
        <div className="border-t border-slate-200 px-5 pb-5">
          <nav className="flex gap-2 pt-4" aria-label="Opportunity detail tabs">
            <button
              type="button"
              className={`rounded-md px-3 py-1 text-sm font-medium ${
                tab === "overview" ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-600"
              }`}
              onClick={() => setTab("overview")}
            >
              Overview
            </button>
            <button
              type="button"
              className={`rounded-md px-3 py-1 text-sm font-medium ${
                tab === "heatmap" ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-600"
              }`}
              onClick={() => setTab("heatmap")}
            >
              Micro-geo heatmap
            </button>
            <button
              type="button"
              className={`rounded-md px-3 py-1 text-sm font-medium ${
                tab === "benchmarks" ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-600"
              }`}
              onClick={() => setTab("benchmarks")}
            >
              Benchmarks
            </button>
            <button
              type="button"
              className={`rounded-md px-3 py-1 text-sm font-medium ${
                tab === "lineage" ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-600"
              }`}
              onClick={() => setTab("lineage")}
            >
              Lineage
            </button>
          </nav>
          <div className="mt-4 text-sm text-slate-600">
            {tab === "overview" && (
              <div className="space-y-3">
                <p>{opportunity.summary}</p>
                <div>
                  <h4 className="text-sm font-semibold text-slate-700">Drivers</h4>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    {opportunity.drivers.map((driver) => (
                      <li key={driver}>{driver}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-700">Assumptions</h4>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    {opportunity.assumptions.map((assumption) => (
                      <li key={assumption}>{assumption}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            {tab === "heatmap" && <ZoneHeatmap values={opportunity.microGeo} />}
            {tab === "benchmarks" && (
              <ul className="space-y-2">
                {opportunity.benchmarks.map((benchmark) => (
                  <li key={`${benchmark.competitor}-${benchmark.offer}`} className="flex items-center justify-between">
                    <span className="font-medium text-slate-700">{benchmark.competitor}</span>
                    <span className="text-slate-500">{benchmark.offer}</span>
                    <span className="font-semibold text-slate-700">${benchmark.price}</span>
                  </li>
                ))}
              </ul>
            )}
            {tab === "lineage" && (
              <table className="w-full table-fixed border-collapse text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate-500">
                    <th className="border-b border-slate-200 pb-2">Source</th>
                    <th className="border-b border-slate-200 pb-2">Refreshed</th>
                  </tr>
                </thead>
                <tbody>
                  {opportunity.lineage.map((entry) => (
                    <tr key={`${entry.source}-${entry.refreshed}`}>
                      <td className="py-2 text-slate-700">{entry.source}</td>
                      <td className="py-2 text-slate-500">{format(new Date(entry.refreshed), "PPP p")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={`/segments/new?seedOpportunityId=${encodeURIComponent(opportunity.id)}`}
              className="inline-flex items-center rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-muted"
              onClick={handleOpenSegment}
            >
              Open in Segment Studio
            </Link>
            <button
              type="button"
              onClick={exportSnapshot}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-brand hover:text-brand"
            >
              Export Snapshot
            </button>
          </div>
        </div>
      )}
    </article>
  );
};
