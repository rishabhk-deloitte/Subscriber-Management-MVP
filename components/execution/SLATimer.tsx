"use client";

import { useEffect, useMemo, useState } from "react";

const formatCountdown = (target: Date) => {
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) {
    return { label: "Expired", atRisk: true };
  }
  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  const formatted = `${days}d ${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  const atRisk = totalMinutes <= 24 * 60;
  return { label: formatted, atRisk };
};

type SLATimerProps = {
  dueDate: string;
};

export const SLATimer = ({ dueDate }: SLATimerProps) => {
  const [tick, setTick] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setTick(new Date()), 60000);
    return () => window.clearInterval(interval);
  }, []);

  const countdown = useMemo(() => formatCountdown(new Date(dueDate)), [dueDate, tick]);

  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-semibold ${
        countdown.atRisk ? "border border-amber-300 bg-amber-50 text-amber-700" : "border border-slate-200 bg-slate-100 text-slate-600"
      }`}
    >
      {countdown.label}
    </span>
  );
};
