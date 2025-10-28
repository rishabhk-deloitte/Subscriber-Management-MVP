"use client";

import { ReactNode } from "react";
import { Line, LineChart, ResponsiveContainer } from "recharts";

type BrandKPIProps = {
  label: string;
  value: ReactNode;
  delta?: number;
  deltaLabel?: string;
};

export function BrandKPI({ label, value, delta, deltaLabel }: BrandKPIProps) {
  const showDelta = typeof delta === "number" && !Number.isNaN(delta);
  const isPositive = (delta ?? 0) >= 0;
  return (
    <div className="tile">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <span className="text-2xl font-semibold text-slate-900">{value}</span>
      {showDelta && (
        <span className={`text-sm font-medium ${isPositive ? "text-brand-600" : "text-rose-600"}`}>
          {isPositive ? "▲" : "▼"} {Math.abs(delta!).toLocaleString(undefined, { maximumFractionDigits: 1 })}
          {deltaLabel ? ` ${deltaLabel}` : ""}
        </span>
      )}
    </div>
  );
}

type BrandBadgeStatus = "on-track" | "at-risk" | "blocked";

type BrandBadgeProps = {
  status: BrandBadgeStatus;
};

const BADGE_COPY: Record<BrandBadgeStatus, string> = {
  "on-track": "On track",
  "at-risk": "At risk",
  blocked: "Blocked"
};

const BADGE_STYLES: Record<BrandBadgeStatus, string> = {
  "on-track": "border-brand-200 bg-brand-50 text-brand-700",
  "at-risk": "border-amber-200 bg-amber-50 text-amber-700",
  blocked: "border-rose-200 bg-rose-50 text-rose-700"
};

export function BrandBadge({ status }: BrandBadgeProps) {
  return <span className={`badge ${BADGE_STYLES[status]}`}>{BADGE_COPY[status]}</span>;
}

type BrandSparklinePoint = {
  key: string | number;
  value: number;
};

type BrandSparklineProps = {
  data: BrandSparklinePoint[];
  stroke?: string;
};

export function BrandSparkline({ data, stroke = "var(--brand-500)" }: BrandSparklineProps) {
  return (
    <div className="h-9 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, bottom: 4, left: 0, right: 0 }}>
          <Line type="monotone" dataKey="value" stroke={stroke} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
