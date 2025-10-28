"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { TooltipProps, LegendProps, XAxisProps, YAxisProps, CartesianGridProps } from "recharts";

const ResponsiveContainer = dynamic(
  () => import("recharts").then((mod) => mod.ResponsiveContainer as unknown as ComponentType<any>),
  { ssr: false },
);
const AreaChart = dynamic(
  () => import("recharts").then((mod) => mod.AreaChart as unknown as ComponentType<any>),
  { ssr: false },
);
const Area = dynamic(
  () => import("recharts").then((mod) => mod.Area as unknown as ComponentType<any>),
  { ssr: false },
);
const Line = dynamic(
  () => import("recharts").then((mod) => mod.Line as unknown as ComponentType<any>),
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
const Legend = dynamic(
  () => import("recharts").then((mod) => mod.Legend as unknown as ComponentType<LegendProps>),
  { ssr: false },
);

type TrendPoint = {
  date: string;
  actual: number;
  plan: number;
  planLow?: number;
  planHigh?: number;
};

type TrendWithBandProps = {
  data: TrendPoint[];
};

export const TrendWithBand = ({ data }: TrendWithBandProps) => {
  const processed = data.map((point) => {
    const base = point.planLow ?? point.plan;
    const band = (point.planHigh ?? point.plan) - base;
    return {
      ...point,
      band,
      base,
    };
  });

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={processed} margin={{ top: 16, left: 0, right: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" stroke="#94a3b8" />
          <YAxis stroke="#94a3b8" />
          <Tooltip
            contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0" }}
            labelStyle={{ color: "#0f172a", fontWeight: 600 }}
          />
          <Legend verticalAlign="top" height={36} />
          <Area type="monotone" dataKey="base" stackId="band" stroke="none" fill="transparent" />
          <Area
            type="monotone"
            dataKey="band"
            stackId="band"
            stroke="none"
            fill="#D3E9A5"
            fillOpacity={0.6}
            name="Plan band"
          />
          <Line type="monotone" dataKey="plan" stroke="#86BC25" strokeWidth={2} dot={false} name="Plan" />
          <Line type="monotone" dataKey="actual" stroke="#1f2937" strokeWidth={2} dot={false} name="Actual" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
