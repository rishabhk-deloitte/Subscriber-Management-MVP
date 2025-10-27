import { format } from "date-fns";
import { CampaignBrief } from "./types";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const pct = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
});

export const formatEligibilitySummary = (campaign: CampaignBrief) => {
  const items: string[] = [];
  if (campaign.eligibility.prepaid !== undefined) {
    items.push(`Prepaid ${campaign.eligibility.prepaid ? "only" : "excluded"}`);
  }
  if (campaign.eligibility.bundleEligible !== undefined) {
    items.push(`Bundle eligible ${campaign.eligibility.bundleEligible ? "required" : "not required"}`);
  }
  if (campaign.eligibility.consentSMS) {
    items.push("SMS opt-in required");
  }
  if (campaign.eligibility.consentWhatsApp) {
    items.push("WhatsApp opt-in required");
  }
  if (campaign.eligibility.language) {
    items.push(`${campaign.eligibility.language.toUpperCase()} copy`);
  }
  return items.join(" • ");
};

export const buildCampaignBriefHtml = (
  campaign: CampaignBrief,
  segmentName: string,
  opportunityTitle?: string,
) => {
  const eligibility = formatEligibilitySummary(campaign);
  const channelRows = campaign.channelMix
    .map(
      (mix) =>
        `<tr><td style="padding:8px;border:1px solid #e2e8f0;">${mix.channel}</td><td style="padding:8px;border:1px solid #e2e8f0;">${mix.focus}</td><td style="padding:8px;border:1px solid #e2e8f0;">${mix.rationale}</td></tr>`,
    )
    .join("");
  const assumptionItems = campaign.assumptions.map((item) => `<li>${item}</li>`).join("");
  const complianceItems = campaign.compliance.map((item) => `<li>${item}</li>`).join("");
  const versions = campaign.versionHistory
    .map(
      (version) =>
        `<tr><td style="padding:6px;border:1px solid #e2e8f0;">${format(new Date(version.timestamp), "PPP p")}</td><td style="padding:6px;border:1px solid #e2e8f0;">${version.summary}</td><td style="padding:6px;border:1px solid #e2e8f0;">${version.status}</td><td style="padding:6px;border:1px solid #e2e8f0;">${version.notes}</td></tr>`,
    )
    .join("");
  const approvals = campaign.approvals
    .map(
      (approval) =>
        `<tr><td style="padding:6px;border:1px solid #e2e8f0;">${approval.approver}</td><td style="padding:6px;border:1px solid #e2e8f0;">${approval.status}</td><td style="padding:6px;border:1px solid #e2e8f0;">${format(new Date(approval.timestamp), "PPP p")}</td><td style="padding:6px;border:1px solid #e2e8f0;">${approval.comment ?? ""}</td></tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${campaign.name} · Offer Brief</title>
  </head>
  <body style="font-family:Inter,system-ui,-apple-system,sans-serif;background:#f8fafc;padding:24px;color:#0f172a;">
    <article style="background:white;border-radius:16px;padding:24px;border:1px solid #e2e8f0;max-width:840px;margin:0 auto;">
      <header style="margin-bottom:24px;">
        <p style="margin:0;color:#0f172a;font-weight:600;">${campaign.offerArchetype} · ${campaign.objective.toUpperCase()}</p>
        <h1 style="margin:4px 0 0;font-size:28px;">${campaign.name}</h1>
        <p style="margin:12px 0 0;color:#475569;">Linked to ${segmentName}${
          opportunityTitle ? ` · ${opportunityTitle}` : ""
        }</p>
      </header>
      <section style="margin-bottom:24px;">
        <p style="margin:0 0 12px;color:#1f2937;">${campaign.valueProp}</p>
        <p style="margin:0;color:#1f2937;font-weight:600;">Timeframe ${campaign.timeframe} · Primary KPI ${campaign.primaryKpi}</p>
        <p style="margin:4px 0 0;color:#1f2937;">Budget ${currency.format(
          campaign.budget,
        )} · Daily cap ${campaign.dailyCap.toLocaleString()} · ROI estimate ${campaign.roiEstimate.toFixed(1)}x</p>
        <p style="margin:4px 0 0;color:#1f2937;">Forecast reach ${campaign.forecast.reach.toLocaleString()} · Conversions ${campaign.forecast.conversions.toLocaleString()} at ${pct.format(
          campaign.forecast.conversionRate,
        )}</p>
      </section>
      <section style="margin-bottom:24px;">
        <h2 style="margin:0 0 12px;font-size:18px;color:#0f172a;">Eligibility</h2>
        <p style="margin:0;color:#475569;">${eligibility}</p>
      </section>
      <section style="margin-bottom:24px;">
        <h2 style="margin:0 0 12px;font-size:18px;color:#0f172a;">Channel mix</h2>
        <table style="border-collapse:collapse;width:100%;">
          <thead>
            <tr style="background:#f1f5f9;">
              <th style="text-align:left;padding:8px;border:1px solid #e2e8f0;">Channel</th>
              <th style="text-align:left;padding:8px;border:1px solid #e2e8f0;">Focus</th>
              <th style="text-align:left;padding:8px;border:1px solid #e2e8f0;">Rationale</th>
            </tr>
          </thead>
          <tbody>${channelRows}</tbody>
        </table>
      </section>
      <section style="margin-bottom:24px;">
        <h2 style="margin:0 0 12px;font-size:18px;color:#0f172a;">Assumptions</h2>
        <ul style="margin:0;color:#475569;line-height:1.6;">${assumptionItems}</ul>
      </section>
      <section style="margin-bottom:24px;">
        <h2 style="margin:0 0 12px;font-size:18px;color:#0f172a;">Compliance</h2>
        <ul style="margin:0;color:#475569;line-height:1.6;">${complianceItems}</ul>
      </section>
      <section style="margin-bottom:24px;">
        <h2 style="margin:0 0 12px;font-size:18px;color:#0f172a;">Version history</h2>
        <table style="border-collapse:collapse;width:100%;">
          <thead>
            <tr style="background:#f1f5f9;">
              <th style="text-align:left;padding:6px;border:1px solid #e2e8f0;">Timestamp</th>
              <th style="text-align:left;padding:6px;border:1px solid #e2e8f0;">Summary</th>
              <th style="text-align:left;padding:6px;border:1px solid #e2e8f0;">Status</th>
              <th style="text-align:left;padding:6px;border:1px solid #e2e8f0;">Notes</th>
            </tr>
          </thead>
          <tbody>${versions}</tbody>
        </table>
      </section>
      <section>
        <h2 style="margin:0 0 12px;font-size:18px;color:#0f172a;">Approvals</h2>
        <table style="border-collapse:collapse;width:100%;">
          <thead>
            <tr style="background:#f1f5f9;">
              <th style="text-align:left;padding:6px;border:1px solid #e2e8f0;">Approver</th>
              <th style="text-align:left;padding:6px;border:1px solid #e2e8f0;">Status</th>
              <th style="text-align:left;padding:6px;border:1px solid #e2e8f0;">Timestamp</th>
              <th style="text-align:left;padding:6px;border:1px solid #e2e8f0;">Comment</th>
            </tr>
          </thead>
          <tbody>${approvals}</tbody>
        </table>
      </section>
    </article>
  </body>
</html>`;
};

export const buildCampaignAssetsCsv = (campaign: CampaignBrief) => {
  const header = [
    "channel",
    "focus",
    "rationale",
    "eligibility",
    "budget",
    "daily_cap",
    "conversion_rate",
    "forecast_conversions",
  ];
  const eligibility = formatEligibilitySummary(campaign);
  const rows = campaign.channelMix.map((mix) => [
    mix.channel,
    mix.focus,
    mix.rationale,
    eligibility,
    currency.format(campaign.budget),
    campaign.dailyCap.toString(),
    pct.format(campaign.forecast.conversionRate),
    campaign.forecast.conversions.toString(),
  ]);
  return [header.join(","), ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))].join("\n");
};
