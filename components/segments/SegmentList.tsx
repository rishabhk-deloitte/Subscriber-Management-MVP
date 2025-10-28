"use client";

import { segmentDefinitions } from "@/lib/sample-data";
import { useStore } from "@/lib/store";
import type {
  SegmentAttributeKey,
  SegmentDefinition,
  SegmentRuleCondition,
  SegmentRuleNode,
  SegmentRuleValue,
} from "@/lib/types";

const attributeLabels: Record<SegmentAttributeKey, string> = {
  tenureMonths: "Tenure",
  arpuBand: "ARPU band",
  deviceOS: "Device OS",
  hasFiberPass: "Fiber pass",
  prepaid: "Prepaid",
  planType: "Plan type",
  bundleEligible: "Bundle eligible",
  language: "Language",
  consentSMS: "SMS consent",
  consentWhatsApp: "WhatsApp consent",
  zone: "Zone",
};

const attributeOrder: SegmentAttributeKey[] = [
  "tenureMonths",
  "arpuBand",
  "deviceOS",
  "planType",
  "prepaid",
  "bundleEligible",
  "hasFiberPass",
  "language",
  "zone",
  "consentSMS",
  "consentWhatsApp",
];

const isCondition = (node: SegmentRuleNode): node is SegmentRuleCondition => "attribute" in node;

const flattenConditions = (node: SegmentRuleNode): SegmentRuleCondition[] => {
  if (isCondition(node)) return [node];
  return node.children.flatMap(flattenConditions);
};

const formatConditionValue = (value: SegmentRuleValue): string => {
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  return String(value);
};

const getSegmentDetails = (segment: SegmentDefinition) => {
  const conditions = flattenConditions(segment.rules);
  return attributeOrder
    .map((attribute) => {
      const condition = conditions.find((item) => item.attribute === attribute);
      if (!condition) return null;
      return {
        label: attributeLabels[attribute],
        value: formatConditionValue(condition.value),
      };
    })
    .filter(Boolean)
    .slice(0, 4) as Array<{ label: string; value: string }>;
};

export const SegmentList = () => {
  const selectedSegmentId = useStore((state) => state.selectedSegmentId);
  const setSelectedSegment = useStore((state) => state.setSelectedSegment);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {segmentDefinitions.map((segment) => {
        const selected = selectedSegmentId === segment.id;
        const details = getSegmentDetails(segment);
        return (
          <button
            key={segment.id}
            onClick={() => setSelectedSegment(selected ? undefined : segment.id)}
            className={`card text-left px-4 py-4 transition focus:outline-none focus:ring-2 focus:ring-brand-500/40 ${
              selected ? "border-brand-500 bg-brand-50" : "hover:border-brand-200"
            }`}
            type="button"
          >
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>{segment.size.toLocaleString()} customers</span>
              <span>{segment.language.toUpperCase()}</span>
            </div>
            <h3 className="mt-2 text-lg font-semibold text-slate-800">{segment.name}</h3>
            <p className="mt-2 text-sm text-slate-600">{segment.description}</p>
            {details.length > 0 && (
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
                {details.map((detail) => (
                  <div key={`${segment.id}-${detail.label}`}>
                    <dt>{detail.label}</dt>
                    <dd className="capitalize">{detail.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </button>
        );
      })}
    </div>
  );
};
