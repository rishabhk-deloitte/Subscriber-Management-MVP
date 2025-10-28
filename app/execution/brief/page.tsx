"use client";

import { useEffect, useMemo } from "react";
import { format } from "date-fns";

import { loadCampaigns } from "@/lib/persistence";
import { executionPipeline, executionTasks } from "@/lib/sample-data";

const brandAccent = "#86BC25";

export default function ExecutionBriefPage() {
  const campaigns = loadCampaigns();
  const campaign = campaigns[0];

  const pipeline = useMemo(
    () => executionPipeline.filter((stage) => stage.campaignId === campaign?.id),
    [campaign?.id],
  );
  const tasks = useMemo(
    () => executionTasks.filter((task) => task.campaignId === campaign?.id).slice(0, 6),
    [campaign?.id],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => window.print(), 600);
    return () => window.clearTimeout(timer);
  }, []);

  if (!campaign) {
    return (
      <main className="min-h-screen bg-white p-8 text-slate-900">
        <h1 className="text-xl font-semibold">Execution brief</h1>
        <p className="mt-2 text-sm text-slate-600">No campaign data available.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white p-10 text-slate-900">
      <header className="border-b border-slate-200 pb-6">
        <p className="text-xs uppercase tracking-wide text-slate-500">Liberty Puerto Rico · Execution brief</p>
        <h1 className="mt-2 text-2xl font-semibold">{campaign.name}</h1>
        <p className="mt-1 text-sm text-slate-600">Generated {format(new Date(), "PPP p")}</p>
      </header>

      <section className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold" style={{ color: brandAccent }}>
            Campaign summary
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>
              <span className="font-semibold">Objective:</span> {campaign.objective.toUpperCase()}
            </li>
            <li>
              <span className="font-semibold">Primary KPI:</span> {campaign.primaryKpi}
            </li>
            <li>
              <span className="font-semibold">Owner:</span> {campaign.owner}
            </li>
            <li>
              <span className="font-semibold">Timeframe:</span> {campaign.timeframe}
            </li>
          </ul>
          <p className="mt-4 text-sm text-slate-600">{campaign.valueProp}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold" style={{ color: brandAccent }}>
            Forecast
          </h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-600">
            <div>
              <dt className="font-semibold">Reach</dt>
              <dd>{campaign.forecast.reach.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="font-semibold">Conversions</dt>
              <dd>{campaign.forecast.conversions.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="font-semibold">CAC</dt>
              <dd>${campaign.forecast.cac.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="font-semibold">ROI</dt>
              <dd>{campaign.forecast.roi.toFixed(1)}x</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold" style={{ color: brandAccent }}>
          Pipeline
        </h2>
        <table className="mt-3 w-full border-collapse text-sm text-slate-600">
          <thead>
            <tr className="bg-slate-100 text-left">
              <th className="border border-slate-200 px-3 py-2">Stage</th>
              <th className="border border-slate-200 px-3 py-2">Owner</th>
              <th className="border border-slate-200 px-3 py-2">Progress</th>
              <th className="border border-slate-200 px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {pipeline.map((stage) => (
              <tr key={stage.id}>
                <td className="border border-slate-200 px-3 py-2">{stage.name}</td>
                <td className="border border-slate-200 px-3 py-2">{stage.owner}</td>
                <td className="border border-slate-200 px-3 py-2">{stage.progress}%</td>
                <td className="border border-slate-200 px-3 py-2">{stage.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold" style={{ color: brandAccent }}>
          Priority tasks
        </h2>
        <table className="mt-3 w-full border-collapse text-sm text-slate-600">
          <thead>
            <tr className="bg-slate-100 text-left">
              <th className="border border-slate-200 px-3 py-2">Task</th>
              <th className="border border-slate-200 px-3 py-2">Owner</th>
              <th className="border border-slate-200 px-3 py-2">Due</th>
              <th className="border border-slate-200 px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id}>
                <td className="border border-slate-200 px-3 py-2">{task.id}</td>
                <td className="border border-slate-200 px-3 py-2">{task.owner}</td>
                <td className="border border-slate-200 px-3 py-2">{format(new Date(task.dueDate), "PPP")}</td>
                <td className="border border-slate-200 px-3 py-2">{task.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
