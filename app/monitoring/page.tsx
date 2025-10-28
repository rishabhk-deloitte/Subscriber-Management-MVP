"use client";

import { useMemo } from "react";

import { BrandKPI } from "@/components/ui/Brand";
import { TrendWithBand } from "@/components/monitoring/TrendWithBand";
import { Breakdowns } from "@/components/monitoring/Breakdowns";
import { LiftChart } from "@/components/monitoring/LiftChart";
import { MonitoringClient } from "@/components/monitoring/MonitoringClient";
import { AuditTrail } from "@/components/monitoring/AuditTrail";
import { CopyLink } from "@/components/shared/CopyLink";
import { useQueryState } from "@/lib/url-state";
import {
  monitoringBreakdowns,
  monitoringKpis,
  monitoringLift,
  monitoringSeries,
} from "@/lib/sample-data";
import { useIsClient } from "@/lib/use-is-client";

const timeframeOptions = [
  { value: "7d", label: "Last 7 days" },
  { value: "all", label: "Last 10 samples" },
];

const segmentOptions = [
  { value: "all", label: "All segments" },
  { value: "seg-001", label: "Fiber upgrades" },
  { value: "seg-002", label: "Bundle activators" },
  { value: "seg-003", label: "Retention" },
  { value: "seg-004", label: "FWA pilots" },
];

export default function MonitoringPage() {
  const isClient = useIsClient();
  const [query, setQuery] = useQueryState<{ tf?: string; seg?: string }>({ tf: "7d", seg: "all" });

  const timeframe = timeframeOptions.some((option) => option.value === query.tf) ? (query.tf as string) : "7d";
  const segment = segmentOptions.some((option) => option.value === query.seg) ? (query.seg as string) : "all";

  const primarySeries = monitoringSeries[0];
  const points = useMemo(() => {
    if (timeframe === "7d") {
      return primarySeries.points.slice(-7);
    }
    return primarySeries.points;
  }, [primarySeries.points, timeframe]);

  const kpiTiles = useMemo(
    () =>
      monitoringKpis.map((kpi) => ({
        label: kpi.label,
        value: kpi.unit === "currency" ? `$${kpi.actual.toLocaleString()}` : kpi.actual.toLocaleString(),
        delta: kpi.actual - kpi.previous,
        unit: kpi.unit,
      })),
    [],
  );

  const filteredBreakdowns = useMemo(() => {
    if (segment === "all") return monitoringBreakdowns;
    return monitoringBreakdowns.map((breakdown) =>
      breakdown.type === "segment"
        ? {
            ...breakdown,
            slices: breakdown.slices.filter((slice) => slice.key === segment),
          }
        : breakdown,
    );
  }, [segment]);

  const anomalies = useMemo(() => {
    if (points.length === 0) return [];
    const actuals = points.map((point) => point.actual);
    const mean = actuals.reduce((acc, value) => acc + value, 0) / actuals.length;
    const variance =
      actuals.reduce((acc, value) => acc + Math.pow(value - mean, 2), 0) / Math.max(actuals.length - 1, 1);
    const stdDev = Math.sqrt(variance);
    const flagged = points
      .map((point) => ({
        date: point.date,
        delta: Math.abs(point.actual - point.plan),
        actual: point.actual,
        plan: point.plan,
        isAnomaly: Math.abs(point.actual - point.plan) > stdDev * 2,
      }))
      .filter((entry) => entry.isAnomaly)
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 3);
    return flagged;
  }, [points]);

  if (!isClient) {
    return <div className="p-6 text-sm text-gray-500">Loading…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <CopyLink />
      </div>

      <section className="card space-y-4 p-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Monitoring overview</h1>
            <p className="text-sm text-slate-500">Campaign health and Liberty Loop performance with confidence intervals.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <label className="flex items-center gap-2">
              Timeframe
              <select
                value={timeframe}
                onChange={(event) => setQuery({ tf: event.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-300"
              >
                {timeframeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2">
              Segment
              <select
                value={segment}
                onChange={(event) => setQuery({ seg: event.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-300"
              >
                {segmentOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </header>
        <div className="grid gap-4 md:grid-cols-4">
          {kpiTiles.map((tile) => (
            <BrandKPI
              key={tile.label}
              label={tile.label}
              value={tile.value}
              delta={tile.delta}
              deltaLabel={tile.unit === "percent" ? "pp" : " vs prev"}
            />
          ))}
        </div>
        <TrendWithBand data={points} />
        {anomalies.length > 0 && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            <p className="font-semibold">Anomaly flags</p>
            <ul className="mt-2 space-y-1">
              {anomalies.map((anomaly) => (
                <li key={anomaly.date} className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-rose-600" />
                  <span>
                    {anomaly.date}: actual {anomaly.actual.toLocaleString()} vs plan {anomaly.plan.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <Breakdowns breakdowns={filteredBreakdowns} />
      <LiftChart lift={monitoringLift} />

      <MonitoringClient />
      <AuditTrail />
    </div>
  );
}
