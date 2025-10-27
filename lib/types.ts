export type Objective = "acquire" | "grow" | "retain";

export type Product = "Fiber" | "Mobile" | "FWA" | "Bundle";

export type PlanType = "prepaid" | "postpaid" | "bundle";

export type SubscriberType = "consumer" | "small-business";

export type BenchmarkCompetitor = "Claro PR" | "T-Mobile PR" | "AeroNet" | "Liberty PR";

export type OpportunityDriver =
  | "price sensitivity"
  | "outage impact"
  | "bundle eligibility"
  | "device aging"
  | "affordability lapse";

export type OpportunityTrendDirection = "up" | "down" | "flat";

export interface OpportunityTrend {
  direction: OpportunityTrendDirection;
  change: number;
  period: "WoW" | "MoM";
}

export interface OpportunityMicroGeo {
  zone: string;
  intensity: number;
}

export interface OpportunityLineage {
  source: string;
  refreshed: string;
}

export interface OpportunityBenchmark {
  competitor: BenchmarkCompetitor;
  offer: string;
  price: number;
}

export interface Opportunity {
  id: string;
  title: string;
  objective: Objective;
  product: Product;
  zone: string;
  subscriberCount: number;
  estimatedValue: number;
  confidence: number;
  planType?: PlanType;
  subscriberType?: SubscriberType;
  language?: "en" | "es";
  outageProne?: boolean;
  affordabilityRisk?: boolean;
  whyNow: string;
  trend: OpportunityTrend;
  reachability: {
    email: boolean;
    sms: boolean;
    whatsapp: boolean;
    retail: boolean;
    callCenter: boolean;
    eligiblePct: number;
  };
  previewAudience: number;
  signals: string[];
  summary: string;
  drivers: OpportunityDriver[];
  assumptions: string[];
  microGeo: OpportunityMicroGeo[];
  benchmarks: OpportunityBenchmark[];
  lineage: OpportunityLineage[];
  recommendedAttributes: SegmentAttributeKey[];
}

export interface Rule {
  id: string;
  description: string;
  weight: number;
}

export interface RuleGroup {
  id: string;
  title: string;
  rules: Rule[];
}

export type SegmentAttributeKey =
  | "tenureMonths"
  | "arpuBand"
  | "deviceOS"
  | "hasFiberPass"
  | "prepaid"
  | "planType"
  | "bundleEligible"
  | "language"
  | "consentSMS"
  | "consentWhatsApp"
  | "zone";

export type SegmentRuleOperator = "AND" | "OR";

export type SegmentRuleComparator = "equals" | "in";

export type SegmentRuleValue = string | boolean | number | string[];

export interface SegmentRuleCondition {
  id: string;
  attribute: SegmentAttributeKey;
  comparator: SegmentRuleComparator;
  value: SegmentRuleValue;
}

export interface SegmentRuleGroup {
  id: string;
  combinator: SegmentRuleOperator;
  children: SegmentRuleNode[];
}

export type SegmentRuleNode = SegmentRuleCondition | SegmentRuleGroup;

export interface GuardrailWarning {
  id: string;
  channel: "Email" | "Paid Social" | "Display";
  threshold: number;
  actual: number;
  severity: "warning" | "critical";
  message: string;
}

export interface ChannelReach {
  email: number;
  sms: number;
  whatsapp: number;
  retail: number;
  callCenter: number;
  paidSocial: number;
  display: number;
}

export interface ImpactEstimate {
  propensity: number;
  conversions: number;
  revenue: number;
  paybackDays: number;
  cost: number;
  margin: number;
}

export interface SegmentMetrics {
  size: number;
  trend: number;
  freshness: string;
  reach: ChannelReach;
  warnings: GuardrailWarning[];
  impact: ImpactEstimate;
}

export interface SegmentVersion {
  id: string;
  summary: string;
  timestamp: string;
  rules: SegmentRuleGroup;
  metrics: SegmentMetrics;
}

export interface SegmentDefinition {
  id: string;
  name: string;
  description: string;
  size: number;
  trend: number;
  freshness: string;
  lastEdited: string;
  language: "en" | "es";
  rules: SegmentRuleGroup;
  restrictedAttributes: SegmentAttributeKey[];
  metrics: SegmentMetrics;
  versions: SegmentVersion[];
  archived?: boolean;
}

export interface SegmentSampleProfile {
  id: string;
  name: string;
  attributes: Record<SegmentAttributeKey, string | number | boolean>;
  notes: string;
}

export type CampaignStatus = "Draft" | "In Review" | "Approved";

export type ApprovalStatus = "Pending" | "Approved" | "Rejected";

export interface CampaignEligibilityConstraints {
  prepaid?: boolean;
  consentSMS?: boolean;
  consentWhatsApp?: boolean;
  bundleEligible?: boolean;
  language?: "en" | "es";
}

export interface CampaignChannelRecommendation {
  channel: string;
  focus: string;
  rationale: string;
}

export interface CampaignForecast {
  reach: number;
  conversionRate: number;
  conversions: number;
  cac: number;
  roi: number;
  revenue: number;
  spend: number;
}

export interface CampaignVersionEntry {
  id: string;
  summary: string;
  timestamp: string;
  author: string;
  status: CampaignStatus;
  notes: string;
}

export interface CampaignApproval {
  id: string;
  approver: string;
  status: ApprovalStatus;
  timestamp: string;
  comment?: string;
}

export interface CampaignBrief {
  id: string;
  name: string;
  objective: Objective;
  status: CampaignStatus;
  offerArchetype:
    | "RetentionCredit"
    | "BundleDiscount"
    | "DeviceUpgrade"
    | "DataBonus"
    | "OutageMakegood"
    | "LibertyLoop";
  primaryKpi: string;
  timeframe: string;
  linkedSegmentId: string;
  linkedOpportunityId?: string;
  roiEstimate: number;
  owner: string;
  createdAt: string;
  updatedAt: string;
  valuePropTemplate: string;
  valueProp: string;
  budget: number;
  dailyCap: number;
  eligibility: CampaignEligibilityConstraints;
  channelMix: CampaignChannelRecommendation[];
  assumptions: string[];
  compliance: string[];
  forecast: CampaignForecast;
  versionHistory: CampaignVersionEntry[];
  approvals: CampaignApproval[];
  changeNotes: string[];
}

export type TaskStatus = "Not started" | "In progress" | "Blocked" | "Done";

export interface ExecutionTask {
  id: string;
  campaignId: string;
  workstream: string;
  owner: string;
  status: TaskStatus;
  dueDate: string;
  slaHours: number;
  tags: string[];
  attachments: string[];
  dependencies: string[];
  relatedOpportunityId?: string;
  updatedAt: string;
  notes: string;
}

export interface ExecutionPipelineStage {
  id: string;
  campaignId: string;
  name: string;
  position: number;
  progress: number;
  owner: string;
  status: "on-track" | "at-risk" | "delayed";
  updatedAt: string;
  notes: string;
}

export interface ExecutionApprovalSummary {
  campaignId: string;
  approvals: CampaignApproval[];
}

export interface ExecutionRisk {
  id: string;
  severity: "Low" | "Medium" | "High";
  owner: string;
  description: string;
  mitigation: string;
  status: "Open" | "Mitigated";
  tags: string[];
}

export interface ReadinessCheck {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface KPIDataPoint {
  date: string;
  value: number;
}

export interface KPIBundle {
  id: string;
  name: string;
  metric: string;
  series: KPIDataPoint[];
}

export interface MonitoringKPI {
  id: string;
  label: string;
  actual: number;
  plan: number;
  previous: number;
  unit: "count" | "currency" | "percent";
  trend: number;
  confidence: "Low" | "Medium" | "High";
}

export interface MonitoringSeriesPoint {
  date: string;
  actual: number;
  plan: number;
  previous?: number;
}

export interface MonitoringSeries {
  id: string;
  name: string;
  metric: string;
  points: MonitoringSeriesPoint[];
}

export interface MonitoringBreakdownSlice {
  key: string;
  actual: number;
  plan?: number;
}

export interface MonitoringBreakdown {
  id: string;
  label: string;
  type: "channel" | "segment" | "offer";
  slices: MonitoringBreakdownSlice[];
}

export interface MonitoringFunnelStep {
  label: string;
  count: number;
  previous?: number;
}

export interface MonitoringAlert {
  id: string;
  message: string;
  severity: "info" | "warning" | "critical";
  createdAt: string;
  metric: string;
  threshold: number;
  actual: number;
  acknowledged?: boolean;
}

export interface MonitoringSavedView {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  filters: {
    channels: string[];
    segments: string[];
    offers: string[];
    dateRange?: {
      from?: string;
      to?: string;
    };
    alertThreshold: number;
  };
}

export interface ContextComposerInput {
  objective: Objective;
  market: string;
  geography: string[];
  product: Product;
  planType: PlanType;
  language: "en" | "es";
  signals: string[];
  notes?: string;
  bundleEligible?: boolean;
}

export interface ClarifyingFieldOption {
  label: string;
  value: string;
}

export interface ClarifyingField {
  key: "planType" | "language" | "bundleEligible";
  label: string;
  type: "select" | "toggle";
  options?: ClarifyingFieldOption[];
}

export interface ClarifyingPrompt {
  id: string;
  label: string;
  fields: ClarifyingField[];
}

export interface ContextInterpretation {
  structuredSignals: string[];
  inferredDrivers: OpportunityDriver[];
  assumptions: string[];
  clarifyingPrompts: ClarifyingPrompt[];
  rankedOpportunityIds: string[];
}

export interface AuditEntry<T = unknown> {
  type: string;
  timestamp: string;
  route: string;
  payload: T;
}

export interface RadarFilters {
  zones: string[];
  products: Product[];
  planTypes: PlanType[];
  segments: string[];
  dateRange: {
    from?: string;
    to?: string;
  };
}

export interface RadarSeed {
  id: string;
  name: string;
  createdAt: string;
  filters: RadarFilters;
  opportunityId?: string;
}

export interface StoreState {
  locale: "en" | "es";
  setLocale: (locale: "en" | "es") => void;
  freshness: string;
  objective?: Objective;
  setObjective: (objective?: Objective) => void;
  lastContext?: ContextComposerInput;
  setLastContext: (ctx?: ContextComposerInput) => void;
  radarSeed?: string;
  setRadarSeed: (seed?: string) => void;
  selectedSegmentId?: string;
  setSelectedSegment: (id?: string) => void;
  selectedCampaignId?: string;
  setSelectedCampaign: (id?: string) => void;
  seeds: RadarSeed[];
  hydrateSeeds: () => void;
  addSeed: (seed: RadarSeed) => void;
  removeSeed: (id: string) => void;
}
