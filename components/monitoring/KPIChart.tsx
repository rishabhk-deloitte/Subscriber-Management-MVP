"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { LineProps, TooltipProps } from "recharts";
import { kpiBundles } from "@/lib/sample-data";

const ResponsiveContainer = dynamic(
  () => import("recharts").then((mod) => mod.ResponsiveContainer as unknown as ComponentType<any>),
  { ssr: false },
);
const LineChart = dynamic(
  () => import("recharts").then((mod) => mod.LineChart as unknown as ComponentType<any>),
  { ssr: false },
);
const XAxis = dynamic(
  () => import("recharts").then((mod) => mod.XAxis as unknown as ComponentType<any>),
  { ssr: false },
);
const YAxis = dynamic(
  () => import("recharts").then((mod) => mod.YAxis as unknown as ComponentType<any>),
  { ssr: false },
);
const CartesianGrid = dynamic(
  () => import("recharts").then((mod) => mod.CartesianGrid as unknown as ComponentType<any>),
  { ssr: false },
);
const Tooltip = dynamic(
  () => import("recharts").then((mod) => mod.Tooltip as unknown as ComponentType<TooltipProps<number, string>>),
  { ssr: false },
);
const Line = dynamic(
  () => import("recharts").then((mod) => mod.Line as unknown as ComponentType<LineProps>),
  { ssr: false },
);

export const KPIChart = () => {
  const series = kpiBundles[0].series;
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 12 }} />
          <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
          <Tooltip cursor={{ stroke: "#86BC25" }} />
          <Line type="monotone" dataKey="value" stroke="#86BC25" strokeWidth={3} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
