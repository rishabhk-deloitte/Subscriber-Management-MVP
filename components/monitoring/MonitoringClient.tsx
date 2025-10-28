"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import type { BarProps, LegendProps, LineProps, TooltipProps } from "recharts";
import {
  defaultMonitoringViews,
  monitoringAlerts,
  monitoringBreakdowns,
  monitoringFunnel,
  monitoringKpis,
  monitoringSeries,
} from "@/lib/sample-data";
import { MonitoringAlert, MonitoringSavedView } from "@/lib/types";
import { loadMonitoringViews, saveMonitoringViews } from "@/lib/persistence";
import { logAudit } from "@/lib/audit";

const ResponsiveContainer = dynamic(() => import("recharts").then((mod) => mod.ResponsiveContainer), { ssr: false });
const LineChart = dynamic(() => import("recharts").then((mod) => mod.LineChart), { ssr: false });
const Line = dynamic<LineProps>(
  () => import("recharts").then((mod) => mod.Line as ComponentType<LineProps>),
  { ssr: false }
);
const CartesianGrid = dynamic(() => import("recharts").then((mod) => mod.CartesianGrid), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((mod) => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((mod) => mod.YAxis), { ssr: false });
const Tooltip = dynamic<TooltipProps<number, string>>(
  () =>
    import("recharts").then(
      (mod) => mod.Tooltip as ComponentType<TooltipProps<number, string>>
    ),
  { ssr: false }
);
const Legend = dynamic<LegendProps>(
  () => import("recharts").then((mod) => mod.Legend as ComponentType<LegendProps>),
  { ssr: false }
);
const BarChart = dynamic(() => import("recharts").then((mod) => mod.BarChart), { ssr: false });
const Bar = dynamic<BarProps>(
  () => import("recharts").then((mod) => mod.Bar as ComponentType<BarProps>),
  { ssr: false }
);

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const percent = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 });

export const MonitoringClient = () => {
  const [views, setViews] = useState<MonitoringSavedView[]>([]);
  const [selectedViewId, setSelectedViewId] = useState<string | undefined>(defaultMonitoringViews[0]?.id);
  const [filters, setFilters] = useState(defaultMonitoringViews[0]?.filters ?? {
    channels: [],
    segments: [],
    offers: [],
    alertThreshold: 18,
  });
  const [selectedMetricId, setSelectedMetricId] = useState(monitoringSeries[0].id);
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<Set<string>>(new Set());
  const [showLineage, setShowLineage] = useState(false);

  useEffect(() => {
    setViews(loadMonitoringViews());
  }, []);

  const metricSeries = useMemo(
    () => monitoringSeries.find((series) => series.id === selectedMetricId) ?? monitoringSeries[0],
    [selectedMetricId],
  );

  const activeAlerts = useMemo(() => {
    return monitoringAlerts.filter((alert) => !acknowledgedAlerts.has(alert.id) && alert.threshold <= filters.alertThreshold);
  }, [acknowledgedAlerts, filters.alertThreshold]);

  const anomalies = useMemo(() => {
    return metricSeries.points.filter((point) => {
      const delta = point.actual - point.plan;
      return Math.abs(delta) / Math.max(point.plan, 1) > 0.12;
    });
  }, [metricSeries]);

  const pacing = useMemo(() => {
    const latest = metricSeries.points[metricSeries.points.length - 1];
    const budgetCap = 95000;
    const spend = 62000;
    const audienceCap = 52000;
    const audienceDelivered = monitoringFunnel[0]?.count ?? 0;
    return {
      budget: { cap: budgetCap, spend },
      audience: { cap: audienceCap, used: latest.actual },
      impressions: { cap: audienceCap * 4, used: monitoringFunnel[0]?.count ?? 0 },
    };
  }, [metricSeries]);

  const handleApplyView = (view: MonitoringSavedView) => {
    setSelectedViewId(view.id);
    setFilters(view.filters);
    logAudit({
      type: "monitoring.view.apply",
      timestamp: new Date().toISOString(),
      route: "/monitoring",
      payload: { id: view.id, name: view.name },
    });
  };

  const handleSaveView = () => {
    const name = window.prompt("Name this view", `Saved view ${views.length + 1}`);
    if (!name) return;
    const now = new Date().toISOString();
    const newView: MonitoringSavedView = {
      id: `view-${Date.now()}`,
      name,
      createdAt: now,
      updatedAt: now,
      filters,
    };
    const nextViews = [newView, ...views];
    setViews(nextViews);
    saveMonitoringViews(nextViews);
    setSelectedViewId(newView.id);
    logAudit({
      type: "monitoring.view.save",
      timestamp: now,
      route: "/monitoring",
      payload: { id: newView.id, name },
    });
  };

  const handleAcknowledgeAlert = (alert: MonitoringAlert) => {
    setAcknowledgedAlerts((prev) => new Set(prev).add(alert.id));
    logAudit({
      type: "monitoring.alert.ack",
      timestamp: new Date().toISOString(),
      route: "/monitoring",
      payload: { id: alert.id, message: alert.message },
    });
  };

  return (
    <div className="space-y-6">
      <header className="card flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Monitoring</p>
          <h1 className="text-2xl font-semibold text-slate-900">Performance dashboard</h1>
          <p className="text-sm text-slate-600">Track activations, churn, and Liberty Loop pacing with deterministic telemetry.</p>
        </div>
        <div className="flex flex-col items-start gap-3 md:items-end">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-semibold text-slate-700">Saved view</span>
            <select
              value={selectedViewId}
              onChange={(event) => {
                const view = views.find((item) => item.id === event.target.value) ??
                  defaultMonitoringViews.find((item) => item.id === event.target.value);
                if (view) handleApplyView(view);
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            >
              {[...defaultMonitoringViews, ...views].map((view) => (
                <option key={view.id} value={view.id}>
                  {view.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleSaveView}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-brand-300 hover:text-brand-700"
            >
              Save current filters
            </button>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
          <span>Channels: {filters.channels.length > 0 ? filters.channels.join(", ") : "All"}</span>
          <span>Segments: {filters.segments.length > 0 ? filters.segments.join(", ") : "All"}</span>
          <span>Offers: {filters.offers.length > 0 ? filters.offers.join(", ") : "All"}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Alert threshold</span>
          <input
            type="range"
            min={10}
            max={60}
            step={2}
            value={filters.alertThreshold}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, alertThreshold: Number(event.target.value) }))
            }
            className="h-1 w-32 cursor-pointer"
          />
          <span>{filters.alertThreshold}%</span>
        </div>
      </div>
      </header>

      <section className="grid gap-4 md:grid-cols-5">
        {monitoringKpis.map((kpi) => (
          <div key={kpi.id} className="card p-4">
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
              <span>{kpi.label}</span>
              <span
                className={`chip px-2 py-1 text-[10px] ${
                  kpi.confidence === "High"
                    ? "border-brand-200 bg-brand-50 text-brand-700"
                    : kpi.confidence === "Medium"
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-rose-200 bg-rose-50 text-rose-700"
                }`}
              >
                {kpi.confidence}
              </span>
            </div>
            <p className="mt-3 text-xl font-semibold text-slate-900">
              {kpi.unit === "currency"
                ? currency.format(kpi.actual)
                : kpi.unit === "percent"
                ? `${kpi.actual.toFixed(1)}%`
                : kpi.actual.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Plan {kpi.unit === "currency" ? currency.format(kpi.plan) : kpi.unit === "percent" ? `${kpi.plan.toFixed(1)}%` : kpi.plan.toLocaleString()} · Prev {kpi.unit === "currency" ? currency.format(kpi.previous) : kpi.unit === "percent" ? `${kpi.previous.toFixed(1)}%` : kpi.previous.toLocaleString()}
            </p>
            <p className={`mt-2 text-xs font-semibold ${kpi.trend >= 0 ? "text-brand-600" : "text-rose-600"}`}>
              {kpi.trend >= 0 ? "▲" : "▼"} {Math.abs(kpi.trend).toFixed(1)}%
            </p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Trend</h2>
            <select
              value={selectedMetricId}
              onChange={(event) => setSelectedMetricId(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            >
              {monitoringSeries.map((series) => (
                <option key={series.id} value={series.id}>
                  {series.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metricSeries.points}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5f5" />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 12 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="actual" stroke="var(--brand-500)" strokeWidth={3} dot={false} name="Actual" />
                <Line type="monotone" dataKey="plan" stroke="var(--brand-300)" strokeWidth={2} strokeDasharray="6 4" dot={false} name="Plan" />
                <Line type="monotone" dataKey="previous" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 4" dot={false} name="Prior" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {anomalies.length > 0 && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              <p className="font-semibold">Anomaly alerts</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {anomalies.map((point) => (
                  <li key={point.date}>
                    {point.date}: {percent.format((point.actual - point.plan) / Math.max(point.plan, 1))} vs plan
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              setShowLineage((prev) => !prev);
              logAudit({
                type: "monitoring.lineage.toggle",
                timestamp: new Date().toISOString(),
                route: "/monitoring",
                payload: { metric: metricSeries.metric, open: !showLineage },
              });
            }}
            className="mt-4 text-sm font-medium text-brand-600 underline"
          >
            {showLineage ? "Hide" : "Show"} lineage
          </button>
          {showLineage && (
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-700">Synthetic sources</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Subscriber telemetry mart · refreshed {metricSeries.points[metricSeries.points.length - 1].date}</li>
                <li>Consent lakehouse · refreshed hourly</li>
                <li>Channel pacing warehouse · refreshed every 30 min</li>
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-900">Breakdowns</h2>
            <div className="mt-4 space-y-4">
              {monitoringBreakdowns.map((breakdown) => (
                <div key={breakdown.id}>
                  <p className="text-sm font-semibold text-slate-700">{breakdown.label}</p>
                  <div className="mt-3 h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={breakdown.slices}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#cbd5f5" />
                        <XAxis dataKey="key" stroke="#64748b" tick={{ fontSize: 12 }} />
                        <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="actual" fill="var(--brand-500)" name="Actual" />
                        {breakdown.slices.some((slice) => slice.plan !== undefined) && (
                          <Bar dataKey="plan" fill="var(--brand-300)" name="Plan" />
                        )}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-900">Pacing vs caps</h2>
            <div className="mt-4 space-y-4 text-sm text-slate-600">
              <div>
                <p className="font-semibold text-slate-700">Budget</p>
                <div className="mt-2 h-2 rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.min(100, Math.round((pacing.budget.spend / pacing.budget.cap) * 100))}%` }} />
                </div>
                <p className="mt-1 text-xs text-slate-500">{currency.format(pacing.budget.spend)} of {currency.format(pacing.budget.cap)}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-700">Audience</p>
                <div className="mt-2 h-2 rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.min(100, Math.round((pacing.audience.used / pacing.audience.cap) * 100))}%` }} />
                </div>
                <p className="mt-1 text-xs text-slate-500">{pacing.audience.used.toLocaleString()} of {pacing.audience.cap.toLocaleString()}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-700">Impressions</p>
                <div className="mt-2 h-2 rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.min(100, Math.round((pacing.impressions.used / pacing.impressions.cap) * 100))}%` }} />
                </div>
                <p className="mt-1 text-xs text-slate-500">{pacing.impressions.used.toLocaleString()} of {pacing.impressions.cap.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900">Funnel drop-off</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          {monitoringFunnel.map((step, index) => {
            const previous = index === 0 ? step.count : monitoringFunnel[index - 1].count;
            const drop = previous > 0 ? 1 - step.count / previous : 0;
            return (
              <div key={step.label} className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <p className="text-xs uppercase tracking-wide text-slate-500">{step.label}</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{step.count.toLocaleString()}</p>
                {index > 0 && <p className="mt-1 text-xs text-slate-500">Drop {percent.format(drop)}</p>}
              </div>
            );
          })}
        </div>
      </section>

      <section className="card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Alerts</h2>
          <p className="text-xs uppercase tracking-wide text-slate-500">Threshold {filters.alertThreshold}%</p>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {activeAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`rounded-lg border p-4 text-sm ${
                alert.severity === "critical"
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : alert.severity === "warning"
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-slate-200 bg-slate-50 text-slate-600"
              }`}
            >
              <p className="font-semibold">{alert.message}</p>
              <p className="mt-2 text-xs text-slate-500">Metric: {alert.metric} · Actual {alert.actual} vs threshold {alert.threshold}</p>
              <button
                type="button"
                onClick={() => handleAcknowledgeAlert(alert)}
                className="mt-3 rounded-md border border-brand-500 px-3 py-2 text-xs font-semibold text-brand-600 hover:bg-brand-50"
              >
                Acknowledge
              </button>
            </div>
          ))}
          {activeAlerts.length === 0 && <p className="text-sm text-slate-500">All alerts acknowledged.</p>}
        </div>
      </section>
    </div>
  );
};
