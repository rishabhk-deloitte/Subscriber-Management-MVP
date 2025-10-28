import { format } from "date-fns";
import { opportunities, segmentDefinitions } from "./sample-data";
import {
  ContextComposerInput,
  ContextInterpretation,
  Opportunity,
  RadarFilters,
  SegmentDefinition,
  SegmentRuleCondition,
  SegmentRuleGroup,
  SegmentRuleNode,
} from "./types";

const flattenAttributes = (node: SegmentRuleNode, acc: Set<string>) => {
  if ((node as SegmentRuleCondition).attribute) {
    acc.add((node as SegmentRuleCondition).attribute);
    return;
  }
  (node as SegmentRuleGroup).children.forEach((child) => flattenAttributes(child, acc));
};

const segmentAttributeIndex = new Map<string, Set<string>>(
  segmentDefinitions.map((segment) => {
    const acc = new Set<string>();
    flattenAttributes(segment.rules, acc);
    return [segment.id, acc];
  }),
);

const matchesSegments = (opp: Opportunity, segmentIds: string[]) => {
  if (segmentIds.length === 0) return true;
  const target = new Set<string>();
  segmentIds.forEach((id) => {
    const attrs = segmentAttributeIndex.get(id);
    if (attrs) {
      attrs.forEach((attr) => target.add(attr));
    }
  });
  if (target.size === 0) return true;
  return opp.recommendedAttributes.some((attr) => target.has(attr));
};

const withinDateRange = (opp: Opportunity, filters: RadarFilters) => {
  const refreshed = new Date(opp.lineage[0]?.refreshed ?? opp.lineage[1]?.refreshed ?? Date.now());
  if (filters.dateRange.from && refreshed < new Date(filters.dateRange.from)) {
    return false;
  }
  if (filters.dateRange.to && refreshed > new Date(filters.dateRange.to)) {
    return false;
  }
  return true;
};

export const filterOpportunities = (filters: RadarFilters): Opportunity[] => {
  return opportunities.filter((opp) => {
    if (filters.zones.length > 0 && !filters.zones.includes(opp.zone)) return false;
    if (filters.products.length > 0 && !filters.products.includes(opp.product)) return false;
    if (filters.planTypes.length > 0 && opp.planType && !filters.planTypes.includes(opp.planType)) return false;
    if (!withinDateRange(opp, filters)) return false;
    if (!matchesSegments(opp, filters.segments)) return false;
    return true;
  });
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

const pill = (label: string) =>
  `<span style="border:1px solid #86BC25;color:#86BC25;padding:2px 8px;border-radius:999px;margin-right:6px;font-size:12px;display:inline-block;">${label}</span>`;

export const buildOpportunitySnapshot = (
  opp: Opportunity,
  context?: ContextComposerInput,
  interpretation?: ContextInterpretation,
) => {
  const header = context
    ? `<h2 style="margin:0;font-family:Inter,sans-serif;color:#0f172a;">${opp.title}</h2><p style="color:#475569;margin-top:4px;">Objective: ${context.objective.toUpperCase()} · ${context.product} (${context.planType})</p>`
    : `<h2 style="margin:0;font-family:Inter,sans-serif;color:#0f172a;">${opp.title}</h2>`;
  const drivers = interpretation
    ? `<div style="margin-top:16px;">${interpretation.inferredDrivers.map((driver) => pill(driver)).join(" ")}</div>`
    : "";
  const reach = Object.entries(opp.reachability)
    .filter(([key]) => key !== "eligiblePct")
    .map(([channel, enabled]) =>
      pill(`${channel}${enabled ? "" : " (n/a)"}`),
    )
    .join(" ");
  const assumptions = opp.assumptions.map((item) => `<li>${item}</li>`).join("");
  const lineageRows = opp.lineage
    .map((item) => `<tr><td style="padding:4px 8px;border:1px solid #e2e8f0;">${item.source}</td><td style="padding:4px 8px;border:1px solid #e2e8f0;">${format(new Date(item.refreshed), "PPP p")}</td></tr>`)
    .join("");

  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>${opp.title} · Converge Subscriber</title>
    </head>
    <body style="font-family:Inter,system-ui,-apple-system,sans-serif;background:#f8fafc;padding:24px;color:#0f172a;">
      <article style="background:white;border-radius:16px;padding:24px;border:1px solid #e2e8f0;max-width:720px;margin:0 auto;">
        ${header}
        <p style="color:#475569;margin-top:12px;">${opp.summary}</p>
        <p style="margin-top:12px;color:#0f172a;font-weight:600;">Estimated value ${formatCurrency(opp.estimatedValue)} · Confidence ${(opp.confidence * 100).toFixed(0)}%</p>
        <p style="margin:16px 0 4px;font-weight:600;color:#0f172a;">Reachability</p>
        <div>${reach}</div>
        ${drivers}
        <section style="margin-top:20px;">
          <h3 style="margin:0 0 8px;font-size:16px;color:#0f172a;">Assumptions</h3>
          <ul style="color:#475569;line-height:1.6;">${assumptions}</ul>
        </section>
        <section style="margin-top:20px;">
          <h3 style="margin:0 0 8px;font-size:16px;color:#0f172a;">Benchmarks</h3>
          <ul style="color:#475569;line-height:1.6;">
            ${opp.benchmarks.map((bench) => `<li>${bench.competitor} – ${bench.offer} (${formatCurrency(bench.price)})</li>`).join("")}
          </ul>
        </section>
        <section style="margin-top:20px;">
          <h3 style="margin:0 0 8px;font-size:16px;color:#0f172a;">Lineage</h3>
          <table style="border-collapse:collapse;width:100%;color:#475569;">
            <thead>
              <tr>
                <th style="text-align:left;padding:6px 8px;border:1px solid #e2e8f0;background:#f1f5f9;">Source</th>
                <th style="text-align:left;padding:6px 8px;border:1px solid #e2e8f0;background:#f1f5f9;">Refreshed</th>
              </tr>
            </thead>
            <tbody>${lineageRows}</tbody>
          </table>
        </section>
      </article>
    </body>
  </html>`;
};

export const snapshotBlob = (
  opp: Opportunity,
  context?: ContextComposerInput,
  interpretation?: ContextInterpretation,
) => {
  const html = buildOpportunitySnapshot(opp, context, interpretation);
  return new Blob([html], { type: "text/html" });
};

export const formattedTrend = (trend: Opportunity["trend"]) => {
  const symbol = trend.direction === "up" ? "▲" : trend.direction === "down" ? "▼" : "▬";
  return `${symbol} ${Math.abs(trend.change).toFixed(1)}% ${trend.period}`;
};

export const defaultFilters: RadarFilters = {
  zones: [],
  products: [],
  planTypes: [],
  segments: [],
  dateRange: {},
};

export const findOpportunity = (id: string) => opportunities.find((opp) => opp.id === id);

export const relatedSegments = (opportunity: Opportunity): SegmentDefinition[] => {
  return segmentDefinitions.filter((segment) => {
    const attrs = new Set<string>();
    flattenAttributes(segment.rules, attrs);
    return Array.from(attrs).some((attr) => opportunity.recommendedAttributes.includes(attr as any));
  });
};

export const formatEligibility = (opp: Opportunity) =>
  `${opp.reachability.eligiblePct}% eligible`;
