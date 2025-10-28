"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { CampaignBrief, CampaignStatus } from "@/lib/types";
import { CampaignList } from "./CampaignList";
import { buildCampaignAssetsCsv, buildCampaignBriefHtml, formatEligibilitySummary } from "@/lib/offers";
import { loadCampaigns, saveCampaigns } from "@/lib/persistence";
import { opportunities, segmentDefinitions } from "@/lib/sample-data";
import { CopyLink } from "@/components/shared/CopyLink";
import { logAudit } from "@/lib/audit";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const findSegment = (id: string) => segmentDefinitions.find((segment) => segment.id === id);
const findOpportunity = (id?: string) => (id ? opportunities.find((opp) => opp.id === id) : undefined);

const download = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const statusOrder: CampaignStatus[] = ["Draft", "In Review", "Approved"];

export const OfferDesignerClient = () => {
  const [campaigns, setCampaigns] = useState<CampaignBrief[]>([]);
  const [selectedId, setSelectedId] = useState<string>();

  useEffect(() => {
    const seeded = loadCampaigns();
    setCampaigns(seeded);
    if (seeded.length > 0) {
      setSelectedId(seeded[0].id);
    }
  }, []);

  const selectedCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === selectedId),
    [campaigns, selectedId],
  );

  const handleSelect = (id: string) => {
    setSelectedId(id);
    const campaign = campaigns.find((item) => item.id === id);
    if (campaign) {
      logAudit({
        type: "campaign.select",
        timestamp: new Date().toISOString(),
        route: "/campaigns",
        payload: { id, name: campaign.name },
      });
    }
  };

  const persist = (next: CampaignBrief[]) => {
    setCampaigns(next);
    saveCampaigns(next);
  };

  const handleStatusChange = (id: string, status: CampaignStatus) => {
    const next = campaigns.map((campaign) =>
      campaign.id === id
        ? {
            ...campaign,
            status,
            updatedAt: new Date().toISOString(),
            changeNotes: [
              `Status changed to ${status} on ${format(new Date(), "PPP p")}`,
              ...campaign.changeNotes,
            ].slice(0, 8),
          }
        : campaign,
    );
    persist(next);
    logAudit({
      type: "campaign.status",
      timestamp: new Date().toISOString(),
      route: "/campaigns",
      payload: { id, status },
    });
  };

  const handleExportHtml = (campaign: CampaignBrief) => {
    const segment = findSegment(campaign.linkedSegmentId);
    const opportunity = findOpportunity(campaign.linkedOpportunityId);
    const html = buildCampaignBriefHtml(campaign, segment?.name ?? "Segment", opportunity?.title);
    download(new Blob([html], { type: "text/html" }), `offer-brief-${campaign.id}.html`);
    logAudit({
      type: "campaign.export.html",
      timestamp: new Date().toISOString(),
      route: "/campaigns",
      payload: { id: campaign.id },
    });
  };

  const handleExportCsv = (campaign: CampaignBrief) => {
    const csv = buildCampaignAssetsCsv(campaign);
    download(new Blob([csv], { type: "text/csv" }), `offer-assets-${campaign.id}.csv`);
    logAudit({
      type: "campaign.export.csv",
      timestamp: new Date().toISOString(),
      route: "/campaigns",
      payload: { id: campaign.id },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Offer Designer</h1>
          <p className="text-sm text-slate-600">
            Build Liberty Loop-ready briefs with deterministic channel guardrails.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/campaigns/new"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand/90"
          >
            New offer brief
          </Link>
          <CopyLink />
        </div>
      </div>
      <CampaignList campaigns={campaigns} selectedId={selectedId} onSelect={handleSelect} />
      {selectedCampaign ? (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <header className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">{selectedCampaign.offerArchetype}</p>
              <h2 className="text-xl font-semibold text-slate-900">{selectedCampaign.name}</h2>
              <p className="text-sm text-slate-500">
                Linked to: <span className="font-medium text-slate-700">{findSegment(selectedCampaign.linkedSegmentId)?.name}</span>
                {selectedCampaign.linkedOpportunityId ? (
                  <>
                    {" "}•{" "}
                    <span className="text-slate-500">
                      {findOpportunity(selectedCampaign.linkedOpportunityId)?.title}
                    </span>
                  </>
                ) : null}
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <label className="text-sm font-medium text-slate-600" htmlFor="status-select">
                Status
              </label>
              <select
                id="status-select"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                value={selectedCampaign.status}
                onChange={(event) => handleStatusChange(selectedCampaign.id, event.target.value as CampaignStatus)}
              >
                {statusOrder.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleExportHtml(selectedCampaign)}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-brand"
                >
                  Export brief (HTML)
                </button>
                <button
                  type="button"
                  onClick={() => handleExportCsv(selectedCampaign)}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-brand"
                >
                  Export assets (CSV)
                </button>
              </div>
            </div>
          </header>
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Value proposition</h3>
                <p className="mt-2 text-base text-slate-700">{selectedCampaign.valueProp}</p>
                <dl className="mt-4 grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
                  <div>
                    <dt className="font-medium text-slate-700">Timeframe</dt>
                    <dd>{selectedCampaign.timeframe}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-700">Primary KPI</dt>
                    <dd>{selectedCampaign.primaryKpi}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-700">Budget</dt>
                    <dd>{currency.format(selectedCampaign.budget)}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-700">Daily cap</dt>
                    <dd>{selectedCampaign.dailyCap.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-700">Eligibility</dt>
                    <dd>{formatEligibilitySummary(selectedCampaign)}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-700">Owner</dt>
                    <dd>{selectedCampaign.owner}</dd>
                  </div>
                </dl>
              </section>
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Channel mix</h3>
                <ul className="mt-3 space-y-3">
                  {selectedCampaign.channelMix.map((mix) => (
                    <li key={`${selectedCampaign.id}-${mix.channel}`} className="rounded-lg border border-slate-200 p-4">
                      <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                        <span>{mix.channel}</span>
                        <span className="text-slate-500">{mix.focus}</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">{mix.rationale}</p>
                    </li>
                  ))}
                </ul>
              </section>
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Assumptions</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
                  {selectedCampaign.assumptions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Compliance & guardrails</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
                  {selectedCampaign.compliance.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Change notes</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  {selectedCampaign.changeNotes.map((note) => (
                    <li key={note} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                      {note}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
            <aside className="space-y-6">
              <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Forecast</h3>
                <dl className="mt-3 space-y-2 text-sm text-slate-600">
                  <div className="flex items-center justify-between">
                    <dt className="font-medium text-slate-700">Reach</dt>
                    <dd>{selectedCampaign.forecast.reach.toLocaleString()}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="font-medium text-slate-700">Conversion rate</dt>
                    <dd>{(selectedCampaign.forecast.conversionRate * 100).toFixed(1)}%</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="font-medium text-slate-700">Conversions</dt>
                    <dd>{selectedCampaign.forecast.conversions.toLocaleString()}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="font-medium text-slate-700">CAC</dt>
                    <dd>{currency.format(selectedCampaign.forecast.cac)}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="font-medium text-slate-700">ROI</dt>
                    <dd>{selectedCampaign.forecast.roi.toFixed(1)}x</dd>
                  </div>
                </dl>
              </section>
              <section className="rounded-lg border border-slate-200 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Version history</h3>
                <ul className="mt-3 space-y-3 text-sm text-slate-600">
                  {selectedCampaign.versionHistory.map((version) => (
                    <li key={version.id} className="rounded-md border border-slate-100 bg-white p-3 shadow-sm">
                      <p className="font-medium text-slate-700">{version.summary}</p>
                      <p className="text-xs uppercase tracking-wide text-slate-400">{version.status}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {format(new Date(version.timestamp), "MMM d, HH:mm")} · {version.author}
                      </p>
                      <p className="mt-2 text-sm text-slate-600">{version.notes}</p>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="rounded-lg border border-slate-200 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Approvals</h3>
                <ul className="mt-3 space-y-3 text-sm text-slate-600">
                  {selectedCampaign.approvals.map((approval) => (
                    <li key={approval.id} className="rounded-md border border-slate-100 bg-white p-3 shadow-sm">
                      <p className="font-medium text-slate-700">{approval.approver}</p>
                      <p className="text-xs uppercase tracking-wide text-slate-400">{approval.status}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {format(new Date(approval.timestamp), "MMM d, HH:mm")}
                      </p>
                      {approval.comment && <p className="mt-2 text-sm text-slate-600">{approval.comment}</p>}
                    </li>
                  ))}
                </ul>
              </section>
            </aside>
          </div>
        </section>
      ) : (
        <p className="text-sm text-slate-500">Select a brief to review the offer details.</p>
      )}
    </div>
  );
};
