"use client";

import { ChangeEvent } from "react";
import { RadarFilters } from "@/lib/types";
import { macroZones, segmentDefinitions } from "@/lib/sample-data";

const productOptions: RadarFilters["products"] = ["Fiber", "Mobile", "FWA", "Bundle"];
const planTypeOptions: RadarFilters["planTypes"] = ["prepaid", "postpaid", "bundle"];

interface FiltersPanelProps {
  filters: RadarFilters;
  onChange: (filters: RadarFilters) => void;
  onReset: () => void;
  onSaveSeed: () => void;
}

const toggleValue = <T,>(values: T[], value: T): T[] =>
  values.includes(value) ? values.filter((item) => item !== value) : [...values, value];

export const FiltersPanel = ({ filters, onChange, onReset, onSaveSeed }: FiltersPanelProps) => {
  const handleMultiToggle = <T,>(key: keyof RadarFilters, value: T) => {
    const current = filters[key] as unknown[];
    onChange({ ...filters, [key]: toggleValue(current, value) });
  };

  const handleDateChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    onChange({ ...filters, dateRange: { ...filters.dateRange, [name]: value || undefined } });
  };

  return (
    <aside className="space-y-5" aria-label="Opportunity filters">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Filters</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onReset}
            className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-brand hover:text-brand"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onSaveSeed}
            className="rounded-md bg-brand px-3 py-1 text-xs font-semibold text-white hover:bg-brand-muted"
          >
            Save as seed
          </button>
        </div>
      </div>
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Geography</h3>
        <div className="grid gap-2 text-sm">
          {macroZones.map((zone) => (
            <label key={zone} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.zones.includes(zone)}
                onChange={() => handleMultiToggle("zones", zone)}
              />
              <span>{zone}</span>
            </label>
          ))}
        </div>
      </section>
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Product</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {productOptions.map((product) => (
            <label key={product} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.products.includes(product)}
                onChange={() => handleMultiToggle("products", product)}
              />
              <span>{product}</span>
            </label>
          ))}
        </div>
      </section>
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Plan type</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {planTypeOptions.map((plan) => (
            <label key={plan} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.planTypes.includes(plan)}
                onChange={() => handleMultiToggle("planTypes", plan)}
              />
              <span className="capitalize">{plan}</span>
            </label>
          ))}
        </div>
      </section>
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Segments</h3>
        <div className="space-y-2 text-sm">
          {segmentDefinitions.map((segment) => (
            <label key={segment.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.segments.includes(segment.id)}
                onChange={() => handleMultiToggle("segments", segment.id)}
              />
              <span>{segment.name}</span>
            </label>
          ))}
        </div>
      </section>
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Date range</h3>
        <div className="grid gap-2 text-sm">
          <label className="flex flex-col">
            <span className="text-xs text-slate-500">From</span>
            <input
              type="date"
              name="from"
              value={filters.dateRange.from ?? ""}
              onChange={handleDateChange}
              className="rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col">
            <span className="text-xs text-slate-500">To</span>
            <input
              type="date"
              name="to"
              value={filters.dateRange.to ?? ""}
              onChange={handleDateChange}
              className="rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
        </div>
      </section>
    </aside>
  );
};
