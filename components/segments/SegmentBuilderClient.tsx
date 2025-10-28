"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { useStore } from "@/lib/store";
import { logAudit } from "@/lib/audit";
import { macroZones } from "@/lib/sample-data";
import {
  ChannelReach,
  GuardrailWarning,
  SegmentMetrics,
  SegmentRuleCondition,
  SegmentRuleGroup,
  SegmentRuleNode,
  SegmentSampleProfile,
} from "@/lib/types";
import { evaluateMetrics, ensureGroup, flattenRuleDescriptions, sampleProfilesForRules, summariseChange } from "@/lib/segment-utils";
import { decodeRulesParam, decodeSeedId, decodeSeedOpportunity, encodeRulesParam } from "@/lib/urlState";
import { RadarFilters } from "@/lib/types";
import { findOpportunity } from "@/lib/radar";
import { impliedSegmentsFromDrivers } from "@/lib/llm-stub";

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

const attributeCatalog = [
  {
    key: "tenureMonths" as const,
    label: "Tenure",
    type: "multi" as const,
    options: ["0-3", "4-12", "13-24", "24+"],
  },
  {
    key: "arpuBand" as const,
    label: "ARPU band",
    type: "multi" as const,
    options: ["<$35", "$35-$55", "$55-$75", ">$75"],
  },
  {
    key: "deviceOS" as const,
    label: "Device OS",
    type: "single" as const,
    options: ["Android", "iOS"],
  },
  {
    key: "hasFiberPass" as const,
    label: "Fiber pass",
    type: "boolean" as const,
    options: ["true", "false"],
  },
  {
    key: "prepaid" as const,
    label: "Prepaid",
    type: "boolean" as const,
    options: ["true", "false"],
  },
  {
    key: "planType" as const,
    label: "Plan type",
    type: "single" as const,
    options: ["prepaid", "postpaid", "bundle"],
  },
  {
    key: "bundleEligible" as const,
    label: "Bundle eligible",
    type: "boolean" as const,
    options: ["true", "false"],
  },
  {
    key: "language" as const,
    label: "Language",
    type: "single" as const,
    options: ["es", "en"],
  },
  {
    key: "consentSMS" as const,
    label: "SMS consent",
    type: "boolean" as const,
    options: ["true", "false"],
  },
  {
    key: "consentWhatsApp" as const,
    label: "WhatsApp consent",
    type: "boolean" as const,
    options: ["true", "false"],
  },
  {
    key: "zone" as const,
    label: "PR zone",
    type: "multi" as const,
    options: macroZones,
  },
];

type AttributeKey = (typeof attributeCatalog)[number]["key"];

type AttributeConfig = (typeof attributeCatalog)[number];

const findAttribute = (key: AttributeKey): AttributeConfig =>
  attributeCatalog.find((item) => item.key === key) ?? attributeCatalog[0];

const createCondition = (key: AttributeKey): SegmentRuleCondition => {
  const config = findAttribute(key);
  if (config.type === "boolean") {
    return {
      id: `cond-${key}-${Date.now()}`,
      attribute: key,
      comparator: "equals",
      value: true,
    };
  }
  if (config.type === "multi") {
    return {
      id: `cond-${key}-${Date.now()}`,
      attribute: key,
      comparator: "in",
      value: [config.options[0]],
    };
  }
  return {
    id: `cond-${key}-${Date.now()}`,
    attribute: key,
    comparator: "equals",
    value: config.options[0],
  };
};

const buildRulesFromOpportunity = (opportunityId: string): SegmentRuleGroup | undefined => {
  const opportunity = findOpportunity(opportunityId);
  if (!opportunity) return undefined;
  const children: SegmentRuleNode[] = [];
  children.push({ id: `zone-${Date.now()}`, attribute: "zone", comparator: "in", value: [opportunity.zone] });
  if (opportunity.planType) {
    children.push({ id: `plan-${Date.now()}`, attribute: "planType", comparator: "equals", value: opportunity.planType });
  }
  if (opportunity.language) {
    children.push({ id: `lang-${Date.now()}`, attribute: "language", comparator: "equals", value: opportunity.language });
  }
  if (opportunity.product === "Bundle" || opportunity.recommendedAttributes.includes("bundleEligible")) {
    children.push({ id: `bundle-${Date.now()}`, attribute: "bundleEligible", comparator: "equals", value: true });
  }
  if (opportunity.reachability.whatsapp) {
    children.push({ id: `wa-${Date.now()}`, attribute: "consentWhatsApp", comparator: "equals", value: true });
  }
  return {
    id: "root",
    combinator: "AND",
    children,
  };
};

const buildRulesFromFilters = (filters: RadarFilters): SegmentRuleGroup => {
  const children: SegmentRuleNode[] = [];
  if (filters.zones.length > 0) {
    children.push({ id: `seed-zone-${Date.now()}`, attribute: "zone", comparator: "in", value: filters.zones });
  }
  if (filters.planTypes.length > 0) {
    children.push({ id: `seed-plan-${Date.now()}`, attribute: "planType", comparator: "in", value: filters.planTypes });
  }
  if (filters.products.includes("Bundle")) {
    children.push({ id: `seed-bundle-${Date.now()}`, attribute: "bundleEligible", comparator: "equals", value: true });
  }
  if (filters.products.includes("Fiber")) {
    children.push({ id: `seed-fiber-${Date.now()}`, attribute: "hasFiberPass", comparator: "equals", value: true });
  }
  if (filters.products.includes("Mobile")) {
    children.push({ id: `seed-mobile-${Date.now()}`, attribute: "prepaid", comparator: "equals", value: filters.planTypes.includes("prepaid") });
  }
  return ensureGroup({ id: "root", combinator: "AND", children });
};

interface RuleConditionEditorProps {
  condition: SegmentRuleCondition;
  onChange: (next: SegmentRuleCondition) => void;
  onRemove: () => void;
}

const RuleConditionEditor = ({ condition, onChange, onRemove }: RuleConditionEditorProps) => {
  const config = findAttribute(condition.attribute as AttributeKey);
  const handleAttributeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const attribute = event.target.value as AttributeKey;
    const base = createCondition(attribute);
    onChange({ ...base, id: condition.id });
  };

  const handleMultiChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const values = Array.from(event.target.selectedOptions).map((option) => option.value);
    onChange({ ...condition, comparator: "in", value: values });
  };

  const handleBooleanChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...condition, comparator: "equals", value: event.target.checked });
  };

  const handleSingleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...condition, comparator: "equals", value: event.target.value });
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={condition.attribute}
          onChange={handleAttributeChange}
          className="rounded-md border border-slate-300 px-2 py-1 text-sm"
        >
          {attributeCatalog.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
        {config.type === "multi" && Array.isArray(condition.value) && (
          <select
            multiple
            value={condition.value as string[]}
            onChange={handleMultiChange}
            className="min-w-[180px] rounded-md border border-slate-300 px-2 py-1 text-sm"
          >
            {config.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        )}
        {config.type === "boolean" && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={Boolean(condition.value)} onChange={handleBooleanChange} />
            <span>Enabled</span>
          </label>
        )}
        {config.type === "single" && (
          <select
            value={String(condition.value)}
            onChange={handleSingleChange}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm"
          >
            {config.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          onClick={onRemove}
          className="ml-auto rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:border-red-400 hover:text-red-600"
        >
          Remove
        </button>
      </div>
    </div>
  );
};

interface RuleGroupEditorProps {
  group: SegmentRuleGroup;
  isRoot?: boolean;
  onChange: (next: SegmentRuleGroup) => void;
  onRemove: () => void;
}

const RuleGroupEditor = ({ group, isRoot, onChange, onRemove }: RuleGroupEditorProps) => {
  const [nextAttribute, setNextAttribute] = useState<AttributeKey>("tenureMonths");

  const updateChild = (index: number, child: SegmentRuleNode) => {
    const nextChildren = group.children.slice();
    nextChildren[index] = child;
    onChange({ ...group, children: nextChildren });
  };

  const removeChild = (index: number) => {
    const nextChildren = group.children.filter((_, idx) => idx !== index);
    onChange({ ...group, children: nextChildren });
  };

  const addCondition = () => {
    const condition = createCondition(nextAttribute);
    onChange({ ...group, children: [...group.children, condition] });
  };

  const addGroup = () => {
    const child: SegmentRuleGroup = {
      id: `group-${Date.now()}`,
      combinator: "AND",
      children: [],
    };
    onChange({ ...group, children: [...group.children, child] });
  };

  const toggleCombinator = () => {
    onChange({ ...group, combinator: group.combinator === "AND" ? "OR" : "AND" });
  };

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-slate-700">
          {isRoot ? "Root group" : `Group (${group.combinator})`}
        </span>
        <button
          type="button"
          onClick={toggleCombinator}
          className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 hover:border-brand hover:text-brand"
        >
          Toggle AND/OR
        </button>
        {!isRoot && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-500 hover:border-red-400 hover:text-red-600"
          >
            Remove group
          </button>
        )}
      </div>
      <div className="space-y-3">
        {group.children.map((child, index) => {
          if ((child as SegmentRuleCondition).attribute) {
            return (
              <RuleConditionEditor
                key={(child as SegmentRuleCondition).id}
                condition={child as SegmentRuleCondition}
                onChange={(next) => updateChild(index, next)}
                onRemove={() => removeChild(index)}
              />
            );
          }
          return (
            <RuleGroupEditor
              key={(child as SegmentRuleGroup).id}
              group={child as SegmentRuleGroup}
              onChange={(next) => updateChild(index, next)}
              onRemove={() => removeChild(index)}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={nextAttribute}
          onChange={(event) => setNextAttribute(event.target.value as AttributeKey)}
          className="rounded-md border border-slate-300 px-2 py-1 text-xs"
        >
          {attributeCatalog.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={addCondition}
          className="rounded-md bg-brand px-3 py-1 text-xs font-semibold text-white hover:bg-brand-muted"
        >
          Add rule
        </button>
        <button
          type="button"
          onClick={addGroup}
          className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-brand hover:text-brand"
        >
          Add nested group
        </button>
      </div>
    </div>
  );
};

const guardrailColor = (warning: GuardrailWarning) =>
  warning.severity === "critical" ? "text-red-600" : "text-amber-600";

const ReachList = ({ reach }: { reach: ChannelReach }) => (
  <dl className="grid grid-cols-2 gap-3 text-sm text-slate-600">
    {Object.entries(reach).map(([channel, value]) => (
      <div key={channel}>
        <dt className="text-xs uppercase tracking-wide text-slate-500">{channel}</dt>
        <dd className="font-semibold text-slate-700">{value.toLocaleString()}</dd>
      </div>
    ))}
  </dl>
);

interface ShortcutModalProps {
  open: boolean;
  onClose: () => void;
}

const ShortcutModal = ({ open, onClose }: ShortcutModalProps) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-800">Keyboard shortcuts</h2>
        <ul className="mt-4 space-y-2 text-sm text-slate-600">
          <li><strong>⌘/Ctrl + S</strong> Save version</li>
          <li><strong>⌘/Ctrl + Z</strong> Undo change</li>
          <li><strong>?</strong> Toggle this panel</li>
        </ul>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-muted"
        >
          Close
        </button>
      </div>
    </div>
  );
};

const mapRules = (rules: SegmentRuleGroup) => ensureGroup(rules);

export const SegmentBuilderClient = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hydrateSeeds = useStore((state) => state.hydrateSeeds);
  const seeds = useStore((state) => state.seeds);

  const seedOpportunityId = decodeSeedOpportunity(searchParams);
  const seedId = decodeSeedId(searchParams);
  const rulesFromParam = decodeRulesParam(searchParams);

  const [rules, setRules] = useState<SegmentRuleGroup>(() => ensureGroup(rulesFromParam ?? { id: "root", combinator: "AND", children: [] }));
  const [history, setHistory] = useState<SegmentRuleGroup[]>([]);
  const [versions, setVersions] = useState<{ rules: SegmentRuleGroup; summary: string; timestamp: string }[]>([]);
  const [lastSaved, setLastSaved] = useState<SegmentRuleGroup | undefined>(undefined);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [recommended, setRecommended] = useState<string[]>([]);

  useEffect(() => {
    hydrateSeeds();
  }, [hydrateSeeds]);

  useEffect(() => {
    if (rulesFromParam) {
      setRules(mapRules(rulesFromParam));
      setRecommended([]);
      return;
    }
    if (seedOpportunityId) {
      const built = buildRulesFromOpportunity(seedOpportunityId);
      if (built) {
        setRules(mapRules(built));
        const opportunity = findOpportunity(seedOpportunityId);
        if (opportunity) {
          setRecommended(opportunity.recommendedAttributes);
        }
        return;
      }
    }
    setRecommended([]);
    if (seedId) {
      const seed = seeds.find((entry) => entry.id === seedId);
      if (seed) {
        setRules(buildRulesFromFilters(seed.filters));
        return;
      }
    }
  }, [rulesFromParam, seedOpportunityId, seedId, seeds]);

  const metrics = useMemo<SegmentMetrics>(() => evaluateMetrics(rules), [rules]);
  const profiles = useMemo<SegmentSampleProfile[]>(() => sampleProfilesForRules(rules), [rules]);

  const updateRules = useCallback(
    (updater: (prev: SegmentRuleGroup) => SegmentRuleGroup) => {
      setRules((prev) => {
        const next = mapRules(updater(prev));
        setHistory((stack) => [prev, ...stack].slice(0, 20));
        return next;
      });
    },
    [],
  );

  const handleChange = (next: SegmentRuleGroup) => {
    updateRules(() => next);
  };

  const handleUndo = () => {
    setHistory((stack) => {
      if (stack.length === 0) return stack;
      const [latest, ...rest] = stack;
      setRules(latest);
      return rest;
    });
  };

  const handleSaveVersion = () => {
    const timestamp = format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx");
    const summary = summariseChange(lastSaved, rules);
    const snapshot = ensureGroup(JSON.parse(JSON.stringify(rules)) as SegmentRuleGroup);
    setVersions((prev) => [{ rules: snapshot, summary, timestamp }, ...prev]);
    setLastSaved(snapshot);
    logAudit({
      type: "segment-save-version",
      timestamp,
      route: "/segments/new",
      payload: { summary, metrics },
    });
  };

  const handleRollback = (index: number) => {
    const snapshot = versions[index]?.rules;
    if (!snapshot) return;
    const clone = ensureGroup(JSON.parse(JSON.stringify(snapshot)) as SegmentRuleGroup);
    setRules(clone);
    logAudit({
      type: "segment-rollback",
      timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
      route: "/segments/new",
      payload: { versionIndex: index },
    });
  };

  const handleExportCsv = () => {
    const rows = ["id,zone,language,planType"];
    for (let idx = 0; idx < 25; idx += 1) {
      rows.push(`SEG${Date.now()}${idx},${macroZones[idx % macroZones.length]},es,postpaid`);
    }
    download(new Blob([rows.join("\n")], { type: "text/csv" }), `segment-export-${Date.now()}.csv`);
    logAudit({
      type: "segment-export-csv",
      timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
      route: "/segments/new",
      payload: { rows: rows.length },
    });
  };

  const handleExportBrief = () => {
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8" /><title>Segment Activation Brief</title></head><body style="font-family:Inter,system-ui,sans-serif;background:#f8fafc;padding:24px;color:#0f172a;"><h1 style="margin-bottom:16px;">Segment Activation Brief</h1><p>Size ${metrics.size.toLocaleString()} · Trend ${metrics.trend.toFixed(1)} · Freshness ${metrics.freshness}</p><section><h2>Rules</h2><ul>${flattenRuleDescriptions(rules)
      .map((item) => `<li>${item}</li>`)
      .join("")}</ul></section><section><h2>Reachability</h2><ul>${Object.entries(metrics.reach)
      .map(([channel, value]) => `<li>${channel}: ${value.toLocaleString()}</li>`)
      .join("")}</ul></section></body></html>`;
    download(new Blob([html], { type: "text/html" }), `segment-brief-${Date.now()}.html`);
    logAudit({
      type: "segment-export-brief",
      timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
      route: "/segments/new",
      payload: {},
    });
  };

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        handleSaveVersion();
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        handleUndo();
      } else if (event.key === "?") {
        event.preventDefault();
        setShowShortcuts((prev) => !prev);
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [handleSaveVersion]);

  const handleCopyLink = () => {
    const params = new URLSearchParams();
    params.set("rules", encodeRulesParam(rules).split("=")[1]);
    const url = `${window.location.origin}${pathname}?${params.toString()}`;
    navigator.clipboard.writeText(url);
  };

  const applySeed = (seedFilters: RadarFilters) => {
    updateRules(() => buildRulesFromFilters(seedFilters));
    logAudit({
      type: "segment-apply-seed",
      timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
      route: "/segments/new",
      payload: seedFilters,
    });
  };

  const contextOpportunity = seedOpportunityId ? findOpportunity(seedOpportunityId) : undefined;
  const driverGroup = contextOpportunity ? impliedSegmentsFromDrivers(contextOpportunity.drivers) : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Segment Studio</h1>
          <p className="text-sm text-slate-500">Compose Liberty Puerto Rico-ready cohorts with guardrails.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleUndo}
            className="rounded-md border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-600 hover:border-brand hover:text-brand"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={handleSaveVersion}
            className="rounded-md bg-brand px-3 py-1 text-sm font-semibold text-white hover:bg-brand-muted"
          >
            Save version
          </button>
          <button
            type="button"
            onClick={handleCopyLink}
            className="rounded-md border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-600 hover:border-brand hover:text-brand"
          >
            Copy link
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="rounded-md border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-600 hover:border-brand hover:text-brand"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={handleExportBrief}
            className="rounded-md border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-600 hover:border-brand hover:text-brand"
          >
            Activation brief
          </button>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <RuleGroupEditor group={rules} isRoot onChange={handleChange} onRemove={() => undefined} />
          {driverGroup && (
            <div className="card p-4 text-sm text-slate-600">
              <h2 className="text-sm font-semibold text-slate-700">Recommended attributes from radar</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {flattenRuleDescriptions(driverGroup).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {recommended.length > 0 && (
            <div className="card p-4 text-sm text-slate-600">
              <h2 className="text-sm font-semibold text-slate-700">Opportunity-aligned attributes</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {recommended.map((attr) => (
                  <span key={attr} className="chip border-brand-200 bg-brand-50 text-brand-700">
                    {attr}
                  </span>
                ))}
              </div>
            </div>
          )}
          {seeds.length > 0 && (
            <div className="card p-4 text-sm text-slate-600">
              <h2 className="text-sm font-semibold text-slate-700">Saved seeds</h2>
              <ul className="mt-2 space-y-2">
                {seeds.map((seed) => (
                  <li key={seed.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-700">{seed.name}</p>
                      <p className="text-xs text-slate-400">{seed.createdAt}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => applySeed(seed.filters)}
                      className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-brand hover:text-brand"
                    >
                      Apply
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <aside className="space-y-4">
          <section className="card p-4">
            <h2 className="text-sm font-semibold text-slate-700">Segment snapshot</h2>
            <p className="mt-2 text-sm text-slate-600">Size {metrics.size.toLocaleString()} · Trend {metrics.trend.toFixed(1)}</p>
            <p className="text-xs uppercase tracking-wide text-slate-400">Freshness {metrics.freshness}</p>
            {metrics.warnings.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm">
                {metrics.warnings.map((warning) => (
                  <li key={warning.id} className={guardrailColor(warning)}>
                    {warning.message}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="card p-4">
            <h2 className="text-sm font-semibold text-slate-700">Reachability & eligibility</h2>
            <ReachList reach={metrics.reach} />
          </section>
          <section className="card p-4">
            <h2 className="text-sm font-semibold text-slate-700">Estimated impact</h2>
            <dl className="mt-2 grid grid-cols-2 gap-3 text-sm text-slate-600">
              <div>
                <dt>Propensity</dt>
                <dd>{(metrics.impact.propensity * 100).toFixed(1)}%</dd>
              </div>
              <div>
                <dt>Conversions</dt>
                <dd>{metrics.impact.conversions.toLocaleString()}</dd>
              </div>
              <div>
                <dt>Revenue</dt>
                <dd>${metrics.impact.revenue.toLocaleString()}</dd>
              </div>
              <div>
                <dt>Cost</dt>
                <dd>${metrics.impact.cost.toLocaleString()}</dd>
              </div>
              <div>
                <dt>Margin</dt>
                <dd>${metrics.impact.margin.toLocaleString()}</dd>
              </div>
              <div>
                <dt>Payback</dt>
                <dd>{metrics.impact.paybackDays} days</dd>
              </div>
            </dl>
          </section>
          <section className="card p-4">
            <h2 className="text-sm font-semibold text-slate-700">Sample profiles</h2>
            <ul className="mt-3 space-y-3 text-sm text-slate-600">
              {profiles.map((profile) => (
                <li key={profile.id} className="rounded-lg border border-slate-200 p-3">
                  <p className="font-semibold text-slate-700">{profile.name}</p>
                  <p className="text-xs text-slate-400">{profile.notes}</p>
                </li>
              ))}
              {profiles.length === 0 && <li className="text-xs text-slate-400">Rules too narrow for profile preview.</li>}
            </ul>
          </section>
          <section className="card p-4">
            <h2 className="text-sm font-semibold text-slate-700">Data lineage</h2>
            <ul className="mt-3 space-y-1 text-xs text-slate-500">
              <li>Consent lakehouse · refreshed {metrics.freshness}</li>
              <li>Subscriber telemetry mart · refreshed {metrics.freshness}</li>
              <li>Channel eligibility vault · refreshed {metrics.freshness}</li>
            </ul>
          </section>
          {versions.length > 0 && (
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-700">Versions</h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                {versions.map((version, index) => (
                  <li key={`${index}`} className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-700">Version {index + 1}</p>
                      <p className="text-xs text-slate-400">{version.summary} · {version.timestamp}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRollback(index)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:border-brand hover:text-brand"
                    >
                      Rollback
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
      <ShortcutModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  );
};
