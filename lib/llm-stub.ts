import {
  ClarifyingPrompt,
  ContextComposerInput,
  ContextInterpretation,
  Opportunity,
  OpportunityDriver,
  PlanType,
  SegmentRuleCondition,
  SegmentRuleGroup,
} from "./types";
import { opportunities } from "./sample-data";

const DEFAULT_STRUCTURED_SIGNALS = [
  "affordability program lapse",
  "promo change",
];

const driverMapping: Record<OpportunityDriver, (context: ContextComposerInput) => boolean> = {
  "price sensitivity": (context) =>
    context.signals.includes("affordability program lapse") || context.planType === "prepaid",
  "outage impact": (context) =>
    context.signals.includes("storm recovery") || context.signals.includes("network event"),
  "bundle eligibility": (context) =>
    context.product === "Bundle" || Boolean(context.bundleEligible) || context.signals.includes("bundle interest"),
  "device aging": (context) => context.signals.includes("device aging"),
  "affordability lapse": (context) =>
    context.signals.includes("affordability program lapse") || context.signals.includes("churn spike"),
};

const baseClarifyingPrompts: ClarifyingPrompt[] = [
  {
    id: "plan-type",
    label: "Should we focus on prepaid or postpaid cohorts?",
    fields: [
      {
        key: "planType",
        label: "Preferred plan construct",
        type: "select",
        options: [
          { label: "Prepaid", value: "prepaid" },
          { label: "Postpaid", value: "postpaid" },
          { label: "Converged bundle", value: "bundle" },
        ],
      },
    ],
  },
  {
    id: "bundle-eligibility",
    label: "Are Liberty Loop bundles in scope for this push?",
    fields: [
      {
        key: "bundleEligible",
        label: "Bundle eligible",
        type: "toggle",
      },
    ],
  },
  {
    id: "language",
    label: "What language should we lead with?",
    fields: [
      {
        key: "language",
        label: "Engagement language",
        type: "select",
        options: [
          { label: "English", value: "en" },
          { label: "Spanish", value: "es" },
        ],
      },
    ],
  },
];

const inferDrivers = (context: ContextComposerInput): OpportunityDriver[] => {
  const drivers = new Set<OpportunityDriver>();
  (Object.keys(driverMapping) as OpportunityDriver[]).forEach((driver) => {
    if (driverMapping[driver](context)) {
      drivers.add(driver);
    }
  });
  if (drivers.size === 0) {
    drivers.add("price sensitivity");
  }
  return Array.from(drivers);
};

const inferAssumptions = (context: ContextComposerInput): string[] => {
  const assumptions = [
    `Liberty Puerto Rico prioritises ${context.objective} motions in ${context.language === "es" ? "Spanish" : "English"}.`,
  ];
  if (context.product === "Fiber") {
    assumptions.push("Last-mile stability is a differentiator for the cohort.");
  }
  if (context.product === "Bundle" || context.bundleEligible) {
    assumptions.push("Liberty Loop bundling incentives can anchor the narrative.");
  }
  if (context.signals.includes("storm recovery")) {
    assumptions.push("Field readiness and proactive credits are expected post-storm.");
  }
  if (context.planType === "prepaid") {
    assumptions.push("Shorter tenure cohorts respond to streak-based loyalty mechanics.");
  }
  return assumptions;
};

const structuredSignals = (context: ContextComposerInput): string[] => {
  if (context.signals.length > 0) return context.signals;
  if (context.objective === "retain") return ["churn spike", "network event"];
  if (context.objective === "acquire") return ["promo change", "bundle interest"];
  return DEFAULT_STRUCTURED_SIGNALS;
};

const bundleBoost = (context: ContextComposerInput, opp: Opportunity) => {
  if (context.product === "Bundle" && opp.product === "Bundle") return 18;
  if (context.bundleEligible && opp.recommendedAttributes.includes("bundleEligible")) return 12;
  return 0;
};

const planAlignmentBoost = (plan: PlanType | undefined, context: ContextComposerInput) => {
  if (!plan) return 0;
  if (plan === context.planType) return 10;
  if (context.planType === "bundle" && plan === "postpaid") return 6;
  return 0;
};

const zoneBoost = (contextZones: string[], zone: string) =>
  contextZones.includes(zone) ? 14 : 0;

const languageBoost = (context: ContextComposerInput, opp: Opportunity) =>
  opp.language && opp.language === context.language ? 8 : 0;

const signalBoost = (context: ContextComposerInput, opp: Opportunity) => {
  let score = 0;
  if (context.signals.includes("storm recovery") && opp.signals.includes("storm recovery")) score += 16;
  if (context.signals.includes("network event") && opp.signals.includes("network event")) score += 9;
  if (context.signals.includes("affordability program lapse") && opp.drivers.includes("price sensitivity")) score += 7;
  return score;
};

const libertyLoopBoost = (opp: Opportunity, context: ContextComposerInput) => {
  if (opp.product !== "Bundle") return 0;
  if (context.product === "Bundle" || context.bundleEligible) return 15;
  return 5;
};

const opportunityScore = (context: ContextComposerInput, opp: Opportunity) => {
  let score = opp.confidence * 100;
  score += bundleBoost(context, opp);
  score += planAlignmentBoost(opp.planType, context);
  score += zoneBoost(context.geography, opp.zone);
  score += languageBoost(context, opp);
  score += signalBoost(context, opp);
  score += libertyLoopBoost(opp, context);
  if (context.product === opp.product) score += 9;
  if (opp.reachability.eligiblePct > 60) score += 5;
  return score;
};

const rankOpportunities = (context: ContextComposerInput): string[] =>
  opportunities
    .slice()
    .sort((a, b) => opportunityScore(context, b) - opportunityScore(context, a))
    .map((opp) => opp.id);

export const runContextStub = (context: ContextComposerInput): ContextInterpretation => {
  return {
    structuredSignals: structuredSignals(context),
    inferredDrivers: inferDrivers(context),
    assumptions: inferAssumptions(context),
    clarifyingPrompts: baseClarifyingPrompts,
    rankedOpportunityIds: rankOpportunities(context),
  };
};

export const adjustContext = (
  context: ContextComposerInput,
  updates: Partial<Pick<ContextComposerInput, "planType" | "language" | "bundleEligible">>,
): ContextComposerInput => ({
  ...context,
  ...updates,
  bundleEligible: updates.bundleEligible ?? context.bundleEligible ?? false,
});

export const explainContext = (context: ContextComposerInput) => ({
  description: `Objective: ${context.objective.toUpperCase()} · ${context.market} · ${context.product} (${context.planType})`,
  geography: context.geography.join(", "),
  language: context.language,
});

export const deriveFilterSeedName = (context: ContextComposerInput) => {
  const base = `${context.objective === "retain" ? "Stabilise" : context.objective === "acquire" ? "Capture" : "Expand"}`;
  const zone = context.geography[0] ?? "PR";
  const product = context.product === "Bundle" ? "Loop" : context.product;
  return `${base} ${product} – ${zone}`;
};

export const defaultFiltersFromContext = (context: ContextComposerInput) => ({
  zones: context.geography,
  products: [context.product],
  planTypes: [context.planType],
  segments: [],
  dateRange: {},
});

export const impliedSegmentsFromDrivers = (drivers: OpportunityDriver[]): SegmentRuleGroup => {
  const children: SegmentRuleGroup["children"] = drivers.map((driver, idx) => {
    switch (driver) {
      case "price sensitivity":
        return {
          id: `driver-${idx}-price`,
          attribute: "arpuBand",
          comparator: "in",
          value: ["<$35", "$35-$55"],
        } as SegmentRuleCondition;
      case "outage impact":
        return {
          id: `driver-${idx}-zone`,
          attribute: "zone",
          comparator: "in",
          value: ["Ponce", "Mayagüez", "Arecibo"],
        } as SegmentRuleCondition;
      case "bundle eligibility":
        return {
          id: `driver-${idx}-bundle`,
          attribute: "bundleEligible",
          comparator: "equals",
          value: true,
        } as SegmentRuleCondition;
      case "device aging":
        return {
          id: `driver-${idx}-device`,
          attribute: "deviceOS",
          comparator: "equals",
          value: "Android",
        } as SegmentRuleCondition;
      case "affordability lapse":
        return {
          id: `driver-${idx}-prepaid`,
          attribute: "prepaid",
          comparator: "equals",
          value: true,
        } as SegmentRuleCondition;
      default:
        return {
          id: `driver-${idx}-fallback`,
          attribute: "language",
          comparator: "equals",
          value: "es",
        } as SegmentRuleCondition;
    }
  });

  return {
    id: "driver-seed",
    combinator: "AND",
    children,
  };
};
