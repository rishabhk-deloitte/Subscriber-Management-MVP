"use client";

import { useEffect, useMemo, useState } from "react";
import { readAudit, clearAudit } from "@/lib/audit";
import { AuditEntry } from "@/lib/types";
import { format } from "date-fns";

interface Props {
  open: boolean;
  onClose: () => void;
}

const formatTimestamp = (timestamp: string) => format(new Date(timestamp), "MMM d, HH:mm:ss");

export const AuditDrawer = ({ open, onClose }: Props) => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (!open) return;
    setEntries(readAudit());
  }, [open]);

  const filtered = useMemo(() => {
    if (filter === "all") return entries;
    return entries.filter((entry) => entry.type.startsWith(filter));
  }, [entries, filter]);

  const handleClear = () => {
    clearAudit();
    setEntries([]);
  };

  return (
    <div
      className={`fixed inset-y-0 right-0 z-40 w-full max-w-md transform bg-white shadow-xl transition-transform duration-200 ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
      aria-hidden={!open}
    >
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Audit log</h2>
            <p className="text-xs text-slate-500">Local events captured across Converge Subscriber.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-brand"
          >
            Close
          </button>
        </header>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 text-sm">
          <label className="flex items-center gap-2">
            <span className="text-slate-600">Filter</span>
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            >
              <option value="all">All</option>
              <option value="campaign">Offer Designer</option>
              <option value="execution">Execution</option>
              <option value="monitoring">Monitoring</option>
              <option value="route">Navigation</option>
            </select>
          </label>
          <button
            type="button"
            onClick={handleClear}
            className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-brand"
          >
            Clear
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {filtered.length === 0 ? (
            <p className="text-sm text-slate-500">No audit events captured yet.</p>
          ) : (
            <ul className="space-y-3">
              {filtered.map((entry, index) => (
                <li key={`${entry.timestamp}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
                    <span>{entry.type}</span>
                    <span>{formatTimestamp(entry.timestamp)}</span>
                  </div>
                  <p className="mt-2 text-slate-700">Route: {entry.route}</p>
                  {entry.payload && (
                    <pre className="mt-2 overflow-x-auto rounded-md bg-white p-3 text-xs text-slate-600">
                      {JSON.stringify(entry.payload, null, 2)}
                    </pre>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
