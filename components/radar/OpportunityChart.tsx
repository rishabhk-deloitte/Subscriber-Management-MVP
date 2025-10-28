"use client";

import dynamic from "next/dynamic";
import { useMemo, type ComponentType } from "react";
import type { BarProps, TooltipProps } from "recharts";
import { opportunities } from "@/lib/sample-data";
import { useSearchParams } from "next/navigation";
import { decodeContextFromSearch } from "@/lib/url-state";
import { runContextStub } from "@/lib/llm-stub";

const ResponsiveContainer = dynamic(
  () => import("recharts").then((mod) => mod.ResponsiveContainer as unknown as ComponentType<any>),
  { ssr: false },
);
const BarChart = dynamic(
  () => import("recharts").then((mod) => mod.BarChart as unknown as ComponentType<any>),
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
const Bar = dynamic(
  () => import("recharts").then((mod) => mod.Bar as unknown as ComponentType<BarProps>),
  { ssr: false },
);

export const OpportunityChart = () => {
  const searchParams = useSearchParams();
  const context = useMemo(() => decodeContextFromSearch(searchParams), [searchParams]);

  const data = useMemo(() => {
    if (!context) {
      return opportunities.slice(0, 6).map((opp) => ({ name: opp.zone, value: opp.estimatedValue }));
    }
    const stub = runContextStub(context);
    return stub.rankedOpportunityIds
      .map((id) => opportunities.find((opp) => opp.id === id))
      .filter(Boolean)
      .map((opp) => ({ name: opp!.zone, value: opp!.estimatedValue }));
  }, [context]);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 12 }} />
          <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
          <Tooltip cursor={{ fill: "rgba(134,188,37,0.1)" }} />
          <Bar dataKey="value" fill="#86BC25" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
