"use client";

import Link from "next/link";
import { format } from "date-fns";
import { CampaignBrief } from "@/lib/types";
import { formatEligibilitySummary } from "@/lib/offers";
import { opportunities, segmentDefinitions } from "@/lib/sample-data";

type Props = {
  campaigns: CampaignBrief[];
  selectedId?: string;
  onSelect: (id: string) => void;
};

const statusStyles: Record<CampaignBrief["status"], string> = {
  Draft: "bg-slate-100 text-slate-600",
  "In Review": "bg-amber-100 text-amber-700",
  Approved: "bg-emerald-100 text-emerald-700",
};

const objectiveColors: Record<CampaignBrief["objective"], string> = {
  acquire: "bg-sky-100 text-sky-700",
  grow: "bg-emerald-100 text-emerald-700",
  retain: "bg-rose-100 text-rose-700",
};

const resolveSegmentName = (segmentId: string) =>
  segmentDefinitions.find((segment) => segment.id === segmentId)?.name ?? "Unknown segment";

const resolveOpportunityTitle = (opportunityId?: string) =>
  opportunityId
    ? opportunities.find((opp) => opp.id === opportunityId)?.title ?? ""
    : "";

export const CampaignList = ({ campaigns, selectedId, onSelect }: Props) => {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {campaigns.map((campaign) => {
        const active = campaign.id === selectedId;
        const segmentName = resolveSegmentName(campaign.linkedSegmentId);
        const opportunityTitle = resolveOpportunityTitle(campaign.linkedOpportunityId);
        return (
          <button
            key={campaign.id}
            type="button"
            onClick={() => onSelect(campaign.id)}
            className={`text-left rounded-xl border p-4 transition focus:outline-none focus:ring-2 focus:ring-brand/60 focus:ring-offset-2 ${
              active ? "border-brand bg-brand/10" : "border-slate-200 bg-white hover:border-brand/60"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide">
              <span className={`rounded-full px-2 py-1 ${statusStyles[campaign.status]}`}>{campaign.status}</span>
              <span className={`rounded-full px-2 py-1 ${objectiveColors[campaign.objective]}`}>
                {campaign.objective}
              </span>
            </div>
            <h3 className="mt-3 text-lg font-semibold text-slate-900">{campaign.name}</h3>
            <p className="mt-2 text-sm text-slate-600">{campaign.valueProp}</p>
            <dl className="mt-4 space-y-2 text-xs text-slate-500">
              <div className="flex items-center justify-between gap-2">
                <dt className="font-medium text-slate-600">Timeframe</dt>
                <dd>{campaign.timeframe}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="font-medium text-slate-600">ROI</dt>
                <dd>{campaign.roiEstimate.toFixed(1)}x</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="font-medium text-slate-600">Primary KPI</dt>
                <dd>{campaign.primaryKpi}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-600">Linked to</dt>
                <dd className="mt-1">
                  <p className="font-medium text-slate-700">{segmentName}</p>
                  {opportunityTitle && <p className="text-slate-500">{opportunityTitle}</p>}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-slate-600">Eligibility</dt>
                <dd>{formatEligibilitySummary(campaign)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="font-medium text-slate-600">Updated</dt>
                <dd>{format(new Date(campaign.updatedAt), "MMM d, HH:mm")}</dd>
              </div>
            </dl>
            <div className="mt-4 text-sm font-medium text-brand hover:underline">
              <Link href={`/campaigns/${campaign.id}`}>Edit brief</Link>
            </div>
          </button>
        );
      })}
    </div>
  );
};
