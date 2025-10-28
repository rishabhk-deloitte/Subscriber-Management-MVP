"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { BarProps, XAxisProps, YAxisProps, TooltipProps, CartesianGridProps } from "recharts";

import { MonitoringBreakdown } from "@/lib/types";

const ResponsiveContainer = dynamic(
  () => import("recharts").then((mod) => mod.ResponsiveContainer as unknown as ComponentType<any>),
  { ssr: false },
);
const BarChart = dynamic(
  () => import("recharts").then((mod) => mod.BarChart as unknown as ComponentType<any>),
  { ssr: false },
);
const Bar = dynamic(
  () => import("recharts").then((mod) => mod.Bar as unknown as ComponentType<BarProps>),
  { ssr: false },
);
const CartesianGrid = dynamic(
  () => import("recharts").then((mod) => mod.CartesianGrid as unknown as ComponentType<CartesianGridProps>),
  { ssr: false },
);
const XAxis = dynamic(
  () => import("recharts").then((mod) => mod.XAxis as unknown as ComponentType<XAxisProps>),
  { ssr: false },
);
const YAxis = dynamic(
  () => import("recharts").then((mod) => mod.YAxis as unknown as ComponentType<YAxisProps>),
  { ssr: false },
);
const Tooltip = dynamic(
  () => import("recharts").then((mod) => mod.Tooltip as unknown as ComponentType<TooltipProps<number, string>>),
  { ssr: false },
);

type BreakdownsProps = {
  breakdowns: MonitoringBreakdown[];
};

const exportCsv = (breakdown: MonitoringBreakdown) => {
  const rows = breakdown.slices.map((slice) => `${slice.key},${slice.actual},${slice.plan ?? ""}`);
  const csv = `category,actual,plan\n${rows.join("\n")}`;
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${breakdown.id}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const Breakdowns = ({ breakdowns }: BreakdownsProps) => {
  const [activeId, setActiveId] = useState(breakdowns[0]?.id);

  const activeBreakdown = useMemo(
    () => breakdowns.find((item) => item.id === activeId) ?? breakdowns[0],
    [breakdowns, activeId],
  );

  if (!activeBreakdown) return null;

  return (
    <section className="card space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {breakdowns.map((breakdown) => (
            <button
              key={breakdown.id}
              type="button"
              onClick={() => setActiveId(breakdown.id)}
              className={`rounded-full px-3 py-1 text-sm font-semibold ${
                activeId === breakdown.id
                  ? "bg-brand-50 text-brand-700"
                  : "border border-slate-200 bg-white text-slate-600"
              }`}
            >
              {breakdown.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => exportCsv(activeBreakdown)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-600"
        >
          Export CSV
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activeBreakdown.slices} margin={{ top: 16, right: 16, left: 0, bottom: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="key" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0" }} />
              <Bar dataKey="actual" fill="#86BC25" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="pb-2">Category</th>
                <th className="pb-2">Actual</th>
                {activeBreakdown.slices.some((slice) => slice.plan !== undefined) && <th className="pb-2">Plan</th>}
              </tr>
            </thead>
            <tbody>
              {activeBreakdown.slices.map((slice) => (
                <tr key={slice.key} className="border-t border-slate-200">
                  <td className="py-2 font-medium text-slate-700">{slice.key}</td>
                  <td className="py-2">{slice.actual.toLocaleString()}</td>
                  {activeBreakdown.slices.some((s) => s.plan !== undefined) && (
                    <td className="py-2">{slice.plan?.toLocaleString() ?? "—"}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
