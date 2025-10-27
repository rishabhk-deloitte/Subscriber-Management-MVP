"use client";

import { segments } from "@/lib/sample-data";
import { useStore } from "@/lib/store";

export const SegmentList = () => {
  const selectedSegmentId = useStore((state) => state.selectedSegmentId);
  const setSelectedSegment = useStore((state) => state.setSelectedSegment);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {segments.map((segment) => {
        const selected = selectedSegmentId === segment.id;
        return (
          <button
            key={segment.id}
            onClick={() => setSelectedSegment(selected ? undefined : segment.id)}
            className={`text-left rounded-xl border px-4 py-4 shadow-sm transition ${
              selected ? "border-brand bg-brand/10" : "border-slate-200 bg-white hover:border-brand"
            }`}
            type="button"
          >
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>{segment.size.toLocaleString()} customers</span>
              <span>{segment.language === "es" ? "ES" : "EN"}</span>
            </div>
            <h3 className="mt-2 text-lg font-semibold text-slate-800">{segment.name}</h3>
            <p className="mt-2 text-sm text-slate-600">{segment.description}</p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
              <div>
                <dt>Tenure</dt>
                <dd>{segment.tenureMonths} months</dd>
              </div>
              <div>
                <dt>ARPU</dt>
                <dd className="uppercase">{segment.arpuBand}</dd>
              </div>
              <div>
                <dt>Device OS</dt>
                <dd>{segment.deviceOS}</dd>
              </div>
              <div>
                <dt>Fiber pass</dt>
                <dd>{segment.hasFiberPass ? "Yes" : "No"}</dd>
              </div>
            </dl>
          </button>
        );
      })}
    </div>
  );
};
