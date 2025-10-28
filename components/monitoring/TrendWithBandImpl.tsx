"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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

const TrendWithBandImpl = ({ data }: TrendWithBandProps) => {
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

export default TrendWithBandImpl;
