"use client";

import { useMemo } from "react";

import { BrandSparkline, BrandBadge } from "@/components/ui/Brand";
import { ScenarioInput } from "@/lib/types";

type ScenarioStripProps = {
  audience: number;
  scenario: ScenarioInput;
};

const MONTHS = 6;

export function ScenarioStrip({ audience, scenario }: ScenarioStripProps) {
  const { chartData, paybackMonths, baseConversions, bestConversions, worstConversions } = useMemo(() => {
    const baseConversions = Math.round(audience * scenario.baseConv);
    const bestConversions = Math.round(baseConversions * (1 + scenario.upliftPctBest));
    const worstConversions = Math.round(baseConversions * (1 + scenario.upliftPctWorst));
    const upliftRevenue = Math.max((bestConversions - baseConversions) * scenario.arpu, 0);
    const paybackMonths = upliftRevenue > 0 ? Math.max(1, Math.round((scenario.cost / (upliftRevenue / MONTHS)) * 10) / 10) : undefined;
    const chartData = [
      { key: "Worst", value: worstConversions },
      { key: "Base", value: baseConversions },
      { key: "Best", value: bestConversions },
    ];
    return { chartData, paybackMonths, baseConversions, bestConversions, worstConversions };
  }, [audience, scenario]);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between text-xs text-slate-600">
        <span>Scenario outlook</span>
        <BrandBadge status="on-track" />
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div className="w-1/2">
          <BrandSparkline data={chartData} />
        </div>
        <div className="flex flex-1 flex-col text-xs text-slate-600">
          <span>Base {baseConversions.toLocaleString()} conversions</span>
          <span>Best {bestConversions.toLocaleString()} conversions</span>
          <span>Worst {worstConversions.toLocaleString()} conversions</span>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
        <span>Payback</span>
        <span className="rounded-full border border-brand-200 bg-brand-50 px-2 py-1 font-semibold text-brand-700">
          {paybackMonths ? `${paybackMonths.toFixed(1)} mo` : "—"}
        </span>
      </div>
    </div>
  );
}
