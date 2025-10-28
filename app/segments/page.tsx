"use client";

import { useEffect, useMemo, useState } from "react";

import { BrandKPI, BrandSparkline } from "@/components/ui/Brand";
import { SegmentsIndexClient } from "@/components/segments/SegmentsIndexClient";
import { RuleBuilder, BuilderGroup } from "@/components/segments/RuleBuilder";
import { Preflight } from "@/components/segments/Preflight";
import { ProfileDrawer } from "@/components/segments/ProfileDrawer";
import { useQueryState } from "@/lib/urlState";
import { segmentPopulation, segmentSampleProfiles } from "@/lib/sample-data";

const initialGroup: BuilderGroup = {
  id: "root",
  logic: "AND",
  nodes: [
    { id: "rule-tenure", field: "tenureMonths", op: "gte", value: 6 },
    { id: "rule-plan", field: "planType", op: "eq", value: "postpaid" },
  ],
};

type PopulationRecord = (typeof segmentPopulation)[number];

type AggregatedSparkline = { key: string; value: number }[];

const evaluateRule = (record: PopulationRecord, rule: BuilderGroup["nodes"][number]): boolean => {
  if ((rule as BuilderGroup).nodes) {
    return evaluateGroup(record, rule as BuilderGroup);
  }
  const typedRule = rule as { field: string; op: string; value: string | number | boolean };
  switch (typedRule.field) {
    case "tenureMonths": {
      const numericValue = Number(typedRule.value);
      return typedRule.op === "gte"
        ? record.tenureMonths >= numericValue
        : record.tenureMonths <= numericValue;
    }
    case "arpuBand":
      return record.arpuBand === typedRule.value;
    case "planType":
      return record.planType === typedRule.value;
    case "bundleEligible":
      return record.bundleEligible === Boolean(typedRule.value);
    default:
      return true;
  }
};

const evaluateGroup = (record: PopulationRecord, group: BuilderGroup): boolean => {
  const results = group.nodes.map((node) => evaluateRule(record, node));
  return group.logic === "AND" ? results.every(Boolean) : results.some(Boolean);
};

const averageSparkline = (records: PopulationRecord[]): AggregatedSparkline => {
  if (records.length === 0) {
    return Array.from({ length: 6 }, (_, idx) => ({ key: `p${idx}`, value: 0 }));
  }
  const totals = records[0].sparkline.map(() => 0);
  records.forEach((record) => {
    record.sparkline.forEach((value, index) => {
      totals[index] += value;
    });
  });
  return totals.map((total, index) => ({ key: `p${index}`, value: Number((total / records.length).toFixed(2)) }));
};

const computeReach = (records: PopulationRecord[]) => {
  if (records.length === 0) {
    return { sms: 0, email: 0, ads: 0 };
  }
  const sms = records.filter((record) => record.channelConsent.sms).length;
  const email = records.filter((record) => record.channelConsent.email).length;
  const ads = records.filter((record) => record.channelConsent.ads).length;
  return {
    sms: (sms / records.length) * 100,
    email: (email / records.length) * 100,
    ads: (ads / records.length) * 100,
  };
};

export default function SegmentsPage() {
  const [storedGroup, setStoredGroup] = useState<BuilderGroup>(initialGroup);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [queryGroup, setQueryGroup] = useQueryState<BuilderGroup>("builder", {
    parse: (value) => (value ? JSON.parse(decodeURIComponent(value)) : undefined),
    serialize: (value) => encodeURIComponent(JSON.stringify(value)),
  });

  useEffect(() => {
    if (queryGroup) {
      setStoredGroup(queryGroup);
    }
  }, [queryGroup]);

  useEffect(() => {
    setQueryGroup(storedGroup);
  }, [storedGroup, setQueryGroup]);

  const matchingPopulation = useMemo(
    () => segmentPopulation.filter((record) => evaluateGroup(record, storedGroup)),
    [storedGroup],
  );

  const sparkline = useMemo(() => averageSparkline(matchingPopulation), [matchingPopulation]);

  const reach = useMemo(() => computeReach(matchingPopulation), [matchingPopulation]);

  const restrictedAttributes = useMemo(() => {
    const set = new Set<string>();
    matchingPopulation.forEach((record) => {
      record.restrictedAttributes?.forEach((attr) => set.add(attr));
    });
    return Array.from(set);
  }, [matchingPopulation]);

  const wowDelta = useMemo(() => {
    if (sparkline.length < 2) return 0;
    const last = sparkline[sparkline.length - 1]?.value ?? 0;
    const prev = sparkline[sparkline.length - 2]?.value ?? 0;
    if (prev === 0) return 0;
    return ((last - prev) / prev) * 100;
  }, [sparkline]);

  const previewProfiles = useMemo(() => segmentSampleProfiles.slice(0, 10), []);

  return (
    <main className="space-y-10">
      <section className="space-y-3">
        <header>
          <h1 className="text-2xl font-semibold text-slate-900">Segment Studio</h1>
          <p className="text-sm text-slate-500">
            Compose AND/OR rules, measure live audience size, and validate reach before activation.
          </p>
        </header>
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-4">
            <RuleBuilder group={storedGroup} onChange={setStoredGroup} />
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <BrandKPI
                label="Live size"
                value={`${matchingPopulation.length.toLocaleString()} members`}
                delta={wowDelta}
                deltaLabel="% WoW"
              />
              <div className="mt-3">
                <BrandSparkline data={sparkline} />
              </div>
            </div>
            <Preflight
              restrictedAttributes={restrictedAttributes}
              reach={reach}
              onPreview={() => setDrawerOpen(true)}
              onSave={() => alert("Segment saved to workspace")}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Saved segments</h2>
        <SegmentsIndexClient />
      </section>

      <ProfileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} profiles={previewProfiles} />
    </main>
  );
}
