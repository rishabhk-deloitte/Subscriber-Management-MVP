"use client";

import { type ComponentType } from "react";
import dynamic from "next/dynamic";
import type { LineProps, TooltipProps } from "recharts";
import { kpiBundles } from "@/lib/sample-data";

const ResponsiveContainer = dynamic(() => import("recharts").then((mod) => mod.ResponsiveContainer), { ssr: false });
const LineChart = dynamic(() => import("recharts").then((mod) => mod.LineChart), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((mod) => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((mod) => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((mod) => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic<TooltipProps<number, string>>(
  () =>
    import("recharts").then(
      (mod) => mod.Tooltip as ComponentType<TooltipProps<number, string>>
    ),
  { ssr: false }
);
const Line = dynamic<LineProps>(
  () => import("recharts").then((mod) => mod.Line as ComponentType<LineProps>),
  { ssr: false }
);

export const KPIChart = () => {
  const series = kpiBundles[0].series;
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series}>
          <CartesianGrid strokeDasharray="3 3" stroke="#cbd5f5" />
          <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 12 }} />
          <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
          <Tooltip cursor={{ stroke: "#1a6c4a" }} />
          <Line type="monotone" dataKey="value" stroke="#1a6c4a" strokeWidth={3} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
