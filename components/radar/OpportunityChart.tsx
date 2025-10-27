"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { opportunities } from "@/lib/sample-data";
import { useSearchParams } from "next/navigation";
import { decodeContextFromSearch } from "@/lib/urlState";
import { runContextStub } from "@/lib/llm-stub";

const ResponsiveContainer = dynamic(() => import("recharts").then((mod) => mod.ResponsiveContainer), { ssr: false });
const BarChart = dynamic(() => import("recharts").then((mod) => mod.BarChart), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((mod) => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((mod) => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((mod) => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((mod) => mod.Tooltip), { ssr: false });
const Bar = dynamic(() => import("recharts").then((mod) => mod.Bar), { ssr: false });

export const OpportunityChart = () => {
  const searchParams = useSearchParams();
  const context = useMemo(() => decodeContextFromSearch(searchParams), [searchParams]);

  const data = useMemo(() => {
    if (!context) {
      return opportunities.slice(0, 6).map((opp) => ({ name: opp.zone, value: opp.value }));
    }
    const stub = runContextStub(context);
    return stub.rankedOpportunityIds
      .map((id) => opportunities.find((opp) => opp.id === id))
      .filter(Boolean)
      .map((opp) => ({ name: opp!.zone, value: opp!.value }));
  }, [context]);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#cbd5f5" />
          <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 12 }} />
          <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
          <Tooltip cursor={{ fill: "rgba(26,108,74,0.1)" }} />
          <Bar dataKey="value" fill="#1a6c4a" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
