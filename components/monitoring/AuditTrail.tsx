"use client";

import { useEffect, useState } from "react";
import { readAudit, clearAudit } from "@/lib/audit";
import { AuditEntry } from "@/lib/types";

export const AuditTrail = () => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);

  useEffect(() => {
    setEntries(readAudit());
  }, []);

  const handleClear = () => {
    clearAudit();
    setEntries([]);
  };

  return (
    <section id="audit" className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Audit log</h2>
        <button
          type="button"
          onClick={handleClear}
          className="rounded-md border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:border-brand hover:text-brand"
        >
          Clear
        </button>
      </div>
      {entries.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No audit entries yet.</p>
      ) : (
        <ul className="mt-4 space-y-3 text-sm text-slate-600">
          {entries.map((entry, idx) => (
            <li key={`${entry.timestamp}-${idx}`} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
                <span>{entry.type}</span>
                <span>{entry.timestamp}</span>
              </div>
              <div className="mt-1 text-xs text-slate-500">Route: {entry.route}</div>
              <pre className="mt-2 max-h-40 overflow-auto rounded bg-white px-2 py-2 text-xs text-slate-700">
                {JSON.stringify(entry.payload, null, 2)}
              </pre>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
