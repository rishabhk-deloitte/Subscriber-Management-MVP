"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { BarProps, XAxisProps, YAxisProps, TooltipProps, CartesianGridProps } from "recharts";

import { MonitoringLift } from "@/lib/types";

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

type LiftChartProps = {
  lift: MonitoringLift;
};

export const LiftChart = ({ lift }: LiftChartProps) => {
  const data = [
    { group: "Treatment", value: lift.treatment },
    { group: "Holdout", value: lift.holdout },
  ];
  const delta = ((lift.treatment - lift.holdout) / Math.max(lift.holdout, 1)) * 100;
  const positive = delta >= 0;

  return (
    <section className="card space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Holdout lift</h2>
          <p className="text-sm text-slate-500">{lift.label}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-semibold ${
            positive ? "bg-brand-50 text-brand-700" : "bg-rose-50 text-rose-700"
          }`}
        >
          {positive ? "+" : ""}
          {delta.toFixed(1)}%
        </span>
      </div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 16, bottom: 16, left: 0, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="group" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0" }} />
            <Bar dataKey="value" fill="#86BC25" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};
