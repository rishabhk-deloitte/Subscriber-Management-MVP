"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CampaignBrief,
  CampaignStatus,
  Objective,
  Product,
} from "@/lib/types";
import { logAudit } from "@/lib/audit";
import { loadCampaigns, saveCampaigns } from "@/lib/persistence";
import { opportunities, segmentDefinitions } from "@/lib/sample-data";

const archetypes = [
  "RetentionCredit",
  "BundleDiscount",
  "DeviceUpgrade",
  "DataBonus",
  "OutageMakegood",
  "LibertyLoop",
] as const;

type OfferArchetype = (typeof archetypes)[number];

const valuePropTemplates: Record<string, { label: string; copy: string }> = {
  loop: {
    label: "Liberty Loop bundle uplift",
    copy: "Bundle streaming credits with converged home + mobile services and concierge onboarding.",
  },
  outage: {
    label: "Storm recovery makegood",
    copy: "Automatic bill credits, proactive outage updates, and community-first restoration messaging.",
  },
  smb: {
    label: "SMB Liberty Loop",
    copy: "Converged connectivity, managed Wi-Fi, and priority support for growing Puerto Rico SMBs.",
  },
  device: {
    label: "Device upgrade refresh",
    copy: "Upgrade aging devices with zero-down financing and bilingual set-up coaching for Liberty subscribers.",
  },
};

const conversionMeta: Record<OfferArchetype, { rate: number; uplift: number }> = {
  RetentionCredit: { rate: 0.14, uplift: 38 },
  BundleDiscount: { rate: 0.2, uplift: 62 },
  DeviceUpgrade: { rate: 0.16, uplift: 58 },
  DataBonus: { rate: 0.15, uplift: 44 },
  OutageMakegood: { rate: 0.12, uplift: 32 },
  LibertyLoop: { rate: 0.18, uplift: 68 },
};

const channelCatalog: Record<
  string,
  { channel: string; focus: string; rationale: string; supports: Objective[]; products: Product[] }
> = {
  Retail: {
    channel: "Retail",
    focus: "San Juan Metro experience pod",
    rationale: "High-intent foot traffic ready for demos and Spanish-first staff.",
    supports: ["acquire", "grow", "retain"],
    products: ["Fiber", "Bundle", "Mobile", "FWA"],
  },
  "Call Center": {
    channel: "Call Center",
    focus: "Dedicated Liberty concierge",
    rationale: "Handles provisioning, billing migrations, and retention saves.",
    supports: ["retain", "grow"],
    products: ["Fiber", "Bundle", "Mobile"],
  },
  SMS: {
    channel: "SMS",
    focus: "Bilingual alerts + promo reminders",
    rationale: "High open rate for prepaid and at-risk subscribers.",
    supports: ["acquire", "retain"],
    products: ["Mobile", "Bundle", "FWA"],
  },
  WhatsApp: {
    channel: "WhatsApp",
    focus: "Two-way concierge automations",
    rationale: "Most trusted channel for Spanish-first households post-storm.",
    supports: ["retain", "grow"],
    products: ["Bundle", "Mobile", "Fiber"],
  },
  Email: {
    channel: "Email",
    focus: "Dynamic offer personalization",
    rationale: "Scales bilingual nurture journeys and ROI calculators.",
    supports: ["acquire", "grow"],
    products: ["Fiber", "Bundle", "Mobile", "FWA"],
  },
};

const formSchema = z.object({
  name: z.string().min(3),
  objective: z.enum(["acquire", "grow", "retain"]),
  status: z.enum(["Draft", "In Review", "Approved"]),
  primaryKpi: z.string().min(3),
  timeframe: z.string().min(3),
  offerArchetype: z.enum(archetypes),
  valuePropTemplate: z.string(),
  valueProp: z.string().min(10),
  linkedSegmentId: z.string().min(3),
  linkedOpportunityId: z.string().optional(),
  budget: z.number().min(1000),
  dailyCap: z.number().min(100),
  prepaidRule: z.enum(["any", "prepaid-only", "prepaid-excluded"]),
  bundleRequired: z.enum(["any", "required", "excluded"]),
  consentSMS: z.boolean(),
  consentWhatsApp: z.boolean(),
  language: z.enum(["en", "es"]),
  assumptions: z.string().min(5),
  compliance: z.string().min(5),
  changeSummary: z.string().min(5),
});

type FormValues = z.infer<typeof formSchema>;

type Props = {
  campaign?: CampaignBrief;
  mode: "create" | "edit";
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const computeRecommendedChannels = (segmentId: string, archetype: OfferArchetype): string[] => {
  const segment = segmentDefinitions.find((item) => item.id === segmentId);
  if (!segment) return ["Email", "WhatsApp", "Call Center"];
  const channels = new Set<string>();
  if (segment.language === "es") channels.add("WhatsApp");
  if (segment.metrics.reach.retail > 0) channels.add("Retail");
  if (segment.metrics.reach.callCenter > 0) channels.add("Call Center");
  if (segment.metrics.reach.sms > 0) channels.add("SMS");
  channels.add("Email");
  if (archetype === "BundleDiscount" || archetype === "LibertyLoop") {
    channels.add("Retail");
    channels.add("WhatsApp");
  }
  if (archetype === "OutageMakegood") {
    channels.add("SMS");
    channels.add("Call Center");
  }
  return Array.from(channels);
};

const resolveEligibility = (values: FormValues) => ({
  prepaid: values.prepaidRule === "any" ? undefined : values.prepaidRule === "prepaid-only",
  consentSMS: values.consentSMS,
  consentWhatsApp: values.consentWhatsApp,
  bundleEligible: values.bundleRequired === "any" ? undefined : values.bundleRequired === "required",
  language: values.language,
});

const toLines = (value: string) => value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

export const CampaignForm = ({ campaign, mode }: Props) => {
  const router = useRouter();
  const defaultTemplateKey = campaign?.valuePropTemplate
    ? Object.entries(valuePropTemplates).find(([, item]) => item.label === campaign.valuePropTemplate)?.[0] ?? "loop"
    : "loop";

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: campaign?.name ?? "",
      objective: campaign?.objective ?? "acquire",
      status: campaign?.status ?? "Draft",
      primaryKpi: campaign?.primaryKpi ?? "ARPU ↑",
      timeframe: campaign?.timeframe ?? "May 2024",
      offerArchetype: campaign?.offerArchetype ?? "LibertyLoop",
      valuePropTemplate: campaign?.valuePropTemplate ?? valuePropTemplates[defaultTemplateKey].label,
      valueProp: campaign?.valueProp ?? valuePropTemplates[defaultTemplateKey].copy,
      linkedSegmentId: campaign?.linkedSegmentId ?? segmentDefinitions[0].id,
      linkedOpportunityId: campaign?.linkedOpportunityId ?? "",
      budget: campaign?.budget ?? 45000,
      dailyCap: campaign?.dailyCap ?? 1200,
      prepaidRule: campaign?.eligibility.prepaid === undefined
        ? "any"
        : campaign.eligibility.prepaid
        ? "prepaid-only"
        : "prepaid-excluded",
      bundleRequired: campaign?.eligibility.bundleEligible === undefined
        ? "any"
        : campaign.eligibility.bundleEligible
        ? "required"
        : "excluded",
      consentSMS: campaign?.eligibility.consentSMS ?? true,
      consentWhatsApp: campaign?.eligibility.consentWhatsApp ?? true,
      language: campaign?.eligibility.language ?? "es",
      assumptions: campaign ? campaign.assumptions.join("\n") : "",
      compliance: campaign ? campaign.compliance.join("\n") : "",
      changeSummary: "",
    },
  });

  const [selectedChannels, setSelectedChannels] = useState<string[]>(
    campaign
      ? campaign.channelMix.map((item) => item.channel)
      : computeRecommendedChannels(form.getValues("linkedSegmentId"), form.getValues("offerArchetype")),
  );

  const watchedSegment = form.watch("linkedSegmentId");
  const watchedArchetype = form.watch("offerArchetype");
  const watchedBudget = form.watch("budget");
  const watchedTemplate = form.watch("valuePropTemplate");

  const valuePropState = form.getFieldState("valueProp");

  useEffect(() => {
    const templateEntry = Object.entries(valuePropTemplates).find(([, item]) => item.label === watchedTemplate);
    if (!templateEntry) return;
    if (mode === "create" || !valuePropState.isDirty) {
      form.setValue("valueProp", templateEntry[1].copy);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedTemplate, mode, valuePropState.isDirty]);

  useEffect(() => {
    if (mode === "create") {
      setSelectedChannels(computeRecommendedChannels(watchedSegment, watchedArchetype));
    }
  }, [mode, watchedSegment, watchedArchetype]);

  const segment = useMemo(() => segmentDefinitions.find((item) => item.id === watchedSegment), [watchedSegment]);
  const forecast = useMemo(() => {
    const meta = conversionMeta[watchedArchetype];
    const reach = segment ? Math.round(segment.metrics.size * 0.85) : 0;
    const conversions = Math.max(1, Math.round(reach * meta.rate));
    const spend = watchedBudget;
    const revenuePerConversion = segment
      ? Math.round(segment.metrics.impact.revenue / Math.max(segment.metrics.impact.conversions, 1))
      : meta.uplift;
    const revenue = conversions * revenuePerConversion;
    const cac = Math.round(spend / conversions);
    const roi = spend > 0 ? Number((revenue / spend).toFixed(2)) : 0;
    return {
      reach,
      conversionRate: meta.rate,
      conversions,
      cac,
      roi,
      revenue,
      spend,
    };
  }, [segment, watchedArchetype, watchedBudget]);

  const complianceWarnings: string[] = [];
  if (selectedChannels.includes("SMS") && !form.watch("consentSMS")) {
    complianceWarnings.push("SMS selected without consent — update eligibility for TCPA compliance.");
  }
  if (selectedChannels.includes("WhatsApp") && !form.watch("consentWhatsApp")) {
    complianceWarnings.push("WhatsApp selected without opt-in — update consent flags.");
  }

  const handleChannelToggle = (channelKey: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channelKey) ? prev.filter((item) => item !== channelKey) : [...prev, channelKey],
    );
  };

  const onSubmit = (values: FormValues) => {
    const eligibility = resolveEligibility(values);
    const campaigns = loadCampaigns();
    const now = new Date();
    const id = campaign?.id ?? `camp-${Date.now()}`;
    const channelMix = selectedChannels.map((key) => {
      const entry = channelCatalog[key];
      return {
        channel: entry?.channel ?? key,
        focus: entry?.focus ?? "TBD",
        rationale: entry?.rationale ?? "Localized Liberty activation.",
      };
    });
    const nextBrief: CampaignBrief = {
      id,
      name: values.name,
      objective: values.objective,
      status: values.status,
      offerArchetype: values.offerArchetype,
      primaryKpi: values.primaryKpi,
      timeframe: values.timeframe,
      linkedSegmentId: values.linkedSegmentId,
      linkedOpportunityId: values.linkedOpportunityId || undefined,
      roiEstimate: forecast.roi,
      owner: campaign?.owner ?? "Liberty Team",
      createdAt: campaign?.createdAt ?? now.toISOString(),
      updatedAt: now.toISOString(),
      valuePropTemplate:
        Object.entries(valuePropTemplates).find(([, item]) => item.label === values.valuePropTemplate)?.[1].label ??
        values.valuePropTemplate,
      valueProp: values.valueProp,
      budget: values.budget,
      dailyCap: values.dailyCap,
      eligibility,
      channelMix,
      assumptions: toLines(values.assumptions),
      compliance: toLines(values.compliance),
      forecast: {
        reach: forecast.reach,
        conversionRate: forecast.conversionRate,
        conversions: forecast.conversions,
        cac: forecast.cac,
        roi: forecast.roi,
        revenue: forecast.revenue,
        spend: forecast.spend,
      },
      versionHistory: [
        ...(campaign?.versionHistory ?? []),
        {
          id: `${id}-v${(campaign?.versionHistory.length ?? 0) + 1}`,
          summary: values.changeSummary,
          timestamp: now.toISOString(),
          author: "Liberty Team",
          status: values.status,
          notes: values.changeSummary,
        },
      ],
      approvals: campaign?.approvals ?? [
        {
          id: `${id}-ap1`,
          approver: "PMO – Pending assignment",
          status: "Pending",
          timestamp: now.toISOString(),
        },
      ],
      changeNotes: [values.changeSummary, ...(campaign?.changeNotes ?? [])].slice(0, 8),
    };

    const existingIndex = campaigns.findIndex((item) => item.id === id);
    if (existingIndex >= 0) {
      campaigns[existingIndex] = nextBrief;
    } else {
      campaigns.unshift(nextBrief);
    }
    saveCampaigns(campaigns);
    logAudit({
      type: mode === "create" ? "campaign.create" : "campaign.update",
      timestamp: now.toISOString(),
      route: mode === "create" ? "/campaigns/new" : `/campaigns/${id}`,
      payload: {
        id,
        name: values.name,
        status: values.status,
      },
    });
    router.push(`/campaigns`);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-6 sm:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-semibold text-slate-700">Offer name</span>
            <input
              type="text"
              {...form.register("name")}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-semibold text-slate-700">Status</span>
            <select
              {...form.register("status")}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            >
              {(["Draft", "In Review", "Approved"] as CampaignStatus[]).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-semibold text-slate-700">Objective</span>
            <select
              {...form.register("objective")}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            >
              {(["acquire", "grow", "retain"] as Objective[]).map((objective) => (
                <option key={objective} value={objective}>
                  {objective}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-semibold text-slate-700">Primary KPI</span>
            <input
              type="text"
              {...form.register("primaryKpi")}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-semibold text-slate-700">Timeframe</span>
            <input
              type="text"
              {...form.register("timeframe")}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-semibold text-slate-700">Offer archetype</span>
            <select
              {...form.register("offerArchetype")}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            >
              {archetypes.map((archetype) => (
                <option key={archetype} value={archetype}>
                  {archetype}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-semibold text-slate-700">Value prop template</span>
            <select
              {...form.register("valuePropTemplate")}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            >
              {Object.entries(valuePropTemplates).map(([key, template]) => (
                <option key={key} value={template.label}>
                  {template.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="mt-6 block space-y-2 text-sm">
          <span className="font-semibold text-slate-700">Value proposition</span>
          <textarea
            rows={3}
            {...form.register("valueProp")}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </label>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Audience linkage</h2>
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-semibold text-slate-700">Segment</span>
            <select
              {...form.register("linkedSegmentId")}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            >
              {segmentDefinitions.map((segment) => (
                <option key={segment.id} value={segment.id}>
                  {segment.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-semibold text-slate-700">Opportunity (optional)</span>
            <select
              {...form.register("linkedOpportunityId")}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            >
              <option value="">No linked opportunity</option>
              {opportunities.map((opp) => (
                <option key={opp.id} value={opp.id}>
                  {opp.title}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-semibold text-slate-700">Budget</span>
            <input
              type="number"
              {...form.register("budget", { valueAsNumber: true })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-semibold text-slate-700">Daily cap</span>
            <input
              type="number"
              {...form.register("dailyCap", { valueAsNumber: true })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Eligibility & compliance</h2>
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-semibold text-slate-700">Plan rule</span>
            <select
              {...form.register("prepaidRule")}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            >
              <option value="any">Allow prepaid & postpaid</option>
              <option value="prepaid-only">Prepaid only</option>
              <option value="prepaid-excluded">Exclude prepaid</option>
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-semibold text-slate-700">Bundle eligibility</span>
            <select
              {...form.register("bundleRequired")}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            >
              <option value="any">Either</option>
              <option value="required">Require bundle eligible</option>
              <option value="excluded">Bundle not required</option>
            </select>
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" {...form.register("consentSMS")} className="h-4 w-4 rounded border-slate-300 text-brand" />
            <span className="font-semibold text-slate-700">Require SMS opt-in</span>
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              {...form.register("consentWhatsApp")}
              className="h-4 w-4 rounded border-slate-300 text-brand"
            />
            <span className="font-semibold text-slate-700">Require WhatsApp opt-in</span>
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-semibold text-slate-700">Primary language</span>
            <select
              {...form.register("language")}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            >
              <option value="es">Spanish</option>
              <option value="en">English</option>
            </select>
          </label>
        </div>
        {complianceWarnings.length > 0 && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            <p className="font-semibold">Compliance alerts</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {complianceWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Channel mix</h2>
        <p className="mt-1 text-sm text-slate-500">
          Toggle recommended channels tuned for the selected segment and offer archetype.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {Object.values(channelCatalog).map((entry) => (
            <button
              key={entry.channel}
              type="button"
              onClick={() => handleChannelToggle(entry.channel)}
              className={`rounded-lg border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-brand/40 focus:ring-offset-2 ${
                selectedChannels.includes(entry.channel)
                  ? "border-brand bg-brand/10"
                  : "border-slate-200 bg-white hover:border-brand/60"
              }`}
            >
              <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                <span>{entry.channel}</span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{entry.focus}</p>
              <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">{entry.rationale}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Assumptions & compliance notes</h2>
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-semibold text-slate-700">Assumptions (one per line)</span>
            <textarea
              rows={4}
              {...form.register("assumptions")}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-semibold text-slate-700">Compliance checkpoints (one per line)</span>
            <textarea
              rows={4}
              {...form.register("compliance")}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Forecast</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p className="text-xs uppercase tracking-wide text-slate-500">Reach</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{forecast.reach.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p className="text-xs uppercase tracking-wide text-slate-500">Conversions</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{forecast.conversions.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p className="text-xs uppercase tracking-wide text-slate-500">ROI</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{forecast.roi.toFixed(2)}x</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p className="text-xs uppercase tracking-wide text-slate-500">CAC</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{currency.format(forecast.cac)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p className="text-xs uppercase tracking-wide text-slate-500">Revenue</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{currency.format(forecast.revenue)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p className="text-xs uppercase tracking-wide text-slate-500">Spend</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{currency.format(forecast.spend)}</p>
          </div>
        </div>
        {segment && (
          <p className="mt-4 text-xs text-slate-500">
            Based on {segment.name} with size {segment.metrics.size.toLocaleString()} and archetype constant {conversionMeta[watchedArchetype].rate * 100}% conversion uplift.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Versioning</h2>
        <label className="mt-4 block space-y-2 text-sm">
          <span className="font-semibold text-slate-700">Change summary</span>
          <input
            type="text"
            {...form.register("changeSummary")}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            placeholder="e.g., Added WhatsApp concierge journey"
          />
        </label>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push("/campaigns")}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:border-brand"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand/90"
        >
          {mode === "create" ? "Create brief" : "Save changes"}
        </button>
      </div>
    </form>
  );
};
