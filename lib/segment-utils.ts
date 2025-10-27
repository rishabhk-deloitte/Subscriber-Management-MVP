import { formatISO } from "date-fns";
import { macroZones, segmentSampleProfiles } from "./sample-data";
import {
  ChannelReach,
  GuardrailWarning,
  ImpactEstimate,
  SegmentMetrics,
  SegmentRuleCondition,
  SegmentRuleGroup,
  SegmentRuleNode,
  SegmentSampleProfile,
} from "./types";

const BASE_POPULATION = 120000;

const rangeWeights: Record<string, Record<string, number>> = {
  tenureMonths: {
    "0-3": 0.18,
    "4-12": 0.32,
    "13-24": 0.28,
    "24+": 0.22,
  },
  arpuBand: {
    "<$35": 0.34,
    "$35-$55": 0.28,
    "$55-$75": 0.2,
    ">$75": 0.18,
  },
  planType: {
    prepaid: 0.46,
    postpaid: 0.42,
    bundle: 0.18,
  },
  deviceOS: {
    Android: 0.52,
    iOS: 0.36,
    Mixed: 0.12,
  },
  language: {
    es: 0.62,
    en: 0.38,
  },
  zone: macroZones.reduce<Record<string, number>>((acc, zone, idx) => {
    acc[zone] = 0.18 - idx * 0.012;
    return acc;
  }, {}),
};

const booleanWeights: Record<string, Record<"true" | "false", number>> = {
  hasFiberPass: { true: 0.44, false: 0.56 },
  prepaid: { true: 0.48, false: 0.52 },
  bundleEligible: { true: 0.36, false: 0.64 },
  consentSMS: { true: 0.71, false: 0.29 },
  consentWhatsApp: { true: 0.58, false: 0.42 },
};

const evaluateCondition = (condition: SegmentRuleCondition): number => {
  if (condition.attribute === "zone") {
    const values = Array.isArray(condition.value) ? (condition.value as string[]) : [String(condition.value)];
    return values.reduce((acc, zone) => acc + (rangeWeights.zone?.[zone] ?? 0.12), 0);
  }
  if (condition.comparator === "in") {
    const values = Array.isArray(condition.value) ? (condition.value as string[]) : [String(condition.value)];
    const weights = rangeWeights[condition.attribute as string];
    if (!weights) return values.length * 0.1;
    return values.reduce((acc, val) => acc + (weights?.[val] ?? 0.12), 0);
  }
  if (typeof condition.value === "boolean") {
    const weights = booleanWeights[condition.attribute as string];
    if (!weights) return condition.value ? 0.52 : 0.48;
    const key = condition.value ? "true" : "false";
    return weights[key] ?? (condition.value ? 0.52 : 0.48);
  }
  const weights = rangeWeights[condition.attribute as string];
  return weights?.[String(condition.value)] ?? 0.24;
};

const evaluateNode = (node: SegmentRuleNode): number => {
  if ((node as SegmentRuleCondition).attribute) {
    return evaluateCondition(node as SegmentRuleCondition);
  }
  const group = node as SegmentRuleGroup;
  const values = group.children.map((child) => evaluateNode(child));
  if (values.length === 0) return 1;
  if (group.combinator === "AND") {
    return values.reduce((acc, value) => acc * Math.max(0.08, Math.min(value, 0.9)), 1);
  }
  const total = values.reduce((acc, value) => acc + value, 0);
  return Math.min(1, total / values.length);
};

const baseChannelRatios = {
  email: 0.76,
  sms: 0.72,
  whatsapp: 0.52,
  retail: 0.35,
  callCenter: 0.48,
  paidSocial: 0.84,
  display: 0.92,
};

const adjustRatio = (ratios: typeof baseChannelRatios, condition: SegmentRuleCondition) => {
  switch (condition.attribute) {
    case "language":
      if (condition.value === "es") {
        ratios.whatsapp += 0.18;
        ratios.sms += 0.04;
      } else {
        ratios.email += 0.06;
      }
      break;
    case "planType":
      if (condition.value === "prepaid") {
        ratios.sms += 0.08;
        ratios.whatsapp += 0.06;
      } else if (condition.value === "bundle") {
        ratios.retail += 0.1;
        ratios.email += 0.05;
      }
      break;
    case "bundleEligible":
      if (condition.value === true) {
        ratios.retail += 0.08;
        ratios.paidSocial += 0.05;
      }
      break;
    case "consentWhatsApp":
      if (condition.value === true) {
        ratios.whatsapp = Math.max(ratios.whatsapp, 0.86);
      }
      break;
    case "consentSMS":
      if (condition.value === true) {
        ratios.sms = Math.max(ratios.sms, 0.88);
      }
      break;
    case "zone":
      if (Array.isArray(condition.value)) {
        if ((condition.value as string[]).includes("Mayagüez")) {
          ratios.callCenter += 0.05;
        }
        if ((condition.value as string[]).includes("San Juan Metro")) {
          ratios.email += 0.04;
        }
      }
      break;
    default:
      break;
  }
};

const collectConditions = (node: SegmentRuleNode, acc: SegmentRuleCondition[]) => {
  if ((node as SegmentRuleCondition).attribute) {
    acc.push(node as SegmentRuleCondition);
    return;
  }
  (node as SegmentRuleGroup).children.forEach((child) => collectConditions(child, acc));
};

const computeReach = (size: number, rules: SegmentRuleGroup): ChannelReach => {
  const ratios = { ...baseChannelRatios };
  const conditions: SegmentRuleCondition[] = [];
  collectConditions(rules, conditions);
  conditions.forEach((condition) => adjustRatio(ratios, condition));
  return {
    email: Math.round(size * Math.min(0.95, ratios.email)),
    sms: Math.round(size * Math.min(0.95, ratios.sms)),
    whatsapp: Math.round(size * Math.min(0.95, ratios.whatsapp)),
    retail: Math.round(size * Math.min(0.7, ratios.retail)),
    callCenter: Math.round(size * Math.min(0.9, ratios.callCenter)),
    paidSocial: Math.round(size * Math.min(0.98, ratios.paidSocial)),
    display: Math.round(size * Math.min(1.05, ratios.display)),
  };
};

const guardrails = [
  { channel: "Email", key: "email" as const, threshold: 2000 },
  { channel: "Paid Social", key: "paidSocial" as const, threshold: 5000 },
  { channel: "Display", key: "display" as const, threshold: 10000 },
];

const computeWarnings = (reach: ChannelReach): GuardrailWarning[] => {
  return guardrails
    .map((rule) => {
      const actual = reach[rule.key];
      if (actual >= rule.threshold) return undefined;
      return {
        id: `${rule.key}-guardrail`,
        channel: rule.channel,
        threshold: rule.threshold,
        actual,
        severity: actual > rule.threshold * 0.5 ? "warning" : "critical",
        message: `${rule.channel} reach ${actual.toLocaleString()} is below PR guardrail of ${rule.threshold.toLocaleString()}.`,
      } satisfies GuardrailWarning;
    })
    .filter(Boolean) as GuardrailWarning[];
};

const computeImpact = (size: number, rules: SegmentRuleGroup): ImpactEstimate => {
  const conditions: SegmentRuleCondition[] = [];
  collectConditions(rules, conditions);
  let propensity = 0.17;
  if (conditions.some((condition) => condition.attribute === "bundleEligible" && condition.value === true)) {
    propensity += 0.04;
  }
  if (conditions.some((condition) => condition.attribute === "prepaid" && condition.value === true)) {
    propensity += 0.03;
  }
  if (conditions.some((condition) => condition.attribute === "consentWhatsApp" && condition.value === true)) {
    propensity += 0.02;
  }
  const conversions = Math.round(size * propensity);
  const revenue = Math.round(conversions * 58);
  const cost = Math.round(size * 11);
  const margin = revenue - cost;
  const paybackDays = Math.max(21, Math.round(45 - propensity * 100));
  return { propensity, conversions, revenue, paybackDays, cost, margin };
};

export const evaluateMetrics = (rules: SegmentRuleGroup): SegmentMetrics => {
  const coverage = Math.min(1, Math.max(0.02, evaluateNode(rules)));
  const size = Math.max(1500, Math.round(BASE_POPULATION * coverage * 0.22));
  const reach = computeReach(size, rules);
  const warnings = computeWarnings(reach);
  const impact = computeImpact(size, rules);
  const trend = Number((coverage * 12 - warnings.length * 1.4).toFixed(1));
  const freshness = formatISO(new Date());
  return { size, trend, freshness, reach, warnings, impact };
};

const ruleMatchesProfile = (node: SegmentRuleNode, profile: SegmentSampleProfile): boolean => {
  if ((node as SegmentRuleCondition).attribute) {
    const condition = node as SegmentRuleCondition;
    const value = profile.attributes[condition.attribute];
    if (condition.comparator === "in") {
      const values = Array.isArray(condition.value) ? (condition.value as string[]) : [String(condition.value)];
      return values.includes(String(value));
    }
    return String(value) === String(condition.value);
  }
  const group = node as SegmentRuleGroup;
  if (group.combinator === "AND") {
    return group.children.every((child) => ruleMatchesProfile(child, profile));
  }
  return group.children.some((child) => ruleMatchesProfile(child, profile));
};

export const sampleProfilesForRules = (rules: SegmentRuleGroup): SegmentSampleProfile[] => {
  return segmentSampleProfiles.filter((profile) => ruleMatchesProfile(rules, profile)).slice(0, 3);
};

export const flattenRuleDescriptions = (node: SegmentRuleNode, depth = 0): string[] => {
  if ((node as SegmentRuleCondition).attribute) {
    const condition = node as SegmentRuleCondition;
    const value = Array.isArray(condition.value) ? (condition.value as string[]).join(", ") : String(condition.value);
    return [`${"·".repeat(depth + 1)} ${condition.attribute} ${condition.comparator === "in" ? "in" : "="} ${value}`];
  }
  const group = node as SegmentRuleGroup;
  return group.children.flatMap((child) => flattenRuleDescriptions(child, depth + 1));
};

export const summariseChange = (previous: SegmentRuleGroup | undefined, next: SegmentRuleGroup): string => {
  if (!previous) return "Initial configuration";
  const prevConditions: SegmentRuleCondition[] = [];
  const nextConditions: SegmentRuleCondition[] = [];
  collectConditions(previous, prevConditions);
  collectConditions(next, nextConditions);
  const added = nextConditions.filter(
    (condition) =>
      !prevConditions.some(
        (prev) =>
          prev.attribute === condition.attribute &&
          JSON.stringify(prev.value) === JSON.stringify(condition.value) &&
          prev.comparator === condition.comparator,
      ),
  );
  const removed = prevConditions.filter(
    (condition) =>
      !nextConditions.some(
        (nextCondition) =>
          nextCondition.attribute === condition.attribute &&
          JSON.stringify(nextCondition.value) === JSON.stringify(condition.value) &&
          nextCondition.comparator === condition.comparator,
      ),
  );
  if (added.length === 0 && removed.length === 0) return "No material changes";
  const parts: string[] = [];
  if (added.length > 0) {
    parts.push(`Added ${added.length} rule${added.length > 1 ? "s" : ""}`);
  }
  if (removed.length > 0) {
    parts.push(`Removed ${removed.length} rule${removed.length > 1 ? "s" : ""}`);
  }
  return parts.join(" · ");
};

export const ensureGroup = (node?: SegmentRuleNode): SegmentRuleGroup => {
  if (!node) {
    return {
      id: "root",
      combinator: "AND",
      children: [],
    };
  }
  if ((node as SegmentRuleCondition).attribute) {
    return {
      id: "root",
      combinator: "AND",
      children: [node],
    };
  }
  return node as SegmentRuleGroup;
};
