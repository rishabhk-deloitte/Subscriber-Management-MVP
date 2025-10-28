"use client";

import { BrandBadge } from "@/components/ui/Brand";

type PreflightProps = {
  restrictedAttributes: string[];
  reach: {
    sms: number;
    email: number;
    ads: number;
  };
  onPreview: () => void;
  onSave: () => void;
};

export function Preflight({ restrictedAttributes, reach, onPreview, onSave }: PreflightProps) {
  const blocked = restrictedAttributes.length > 0;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Eligibility & reach checks</h2>
          <p className="text-sm text-slate-500">Ensure the segment passes channel and policy guardrails.</p>
        </div>
        {blocked ? <BrandBadge status="blocked" /> : <BrandBadge status="on-track" />}
      </header>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <h3 className="text-sm font-semibold text-slate-700">Reach readiness</h3>
          <dl className="mt-2 space-y-1 text-sm text-slate-600">
            <div className="flex items-center justify-between">
              <dt>SMS</dt>
              <dd>{reach.sms.toFixed(1)}%</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>Email</dt>
              <dd>{reach.email.toFixed(1)}%</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>Ads</dt>
              <dd>{reach.ads.toFixed(1)}%</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <h3 className="text-sm font-semibold text-slate-700">Eligibility</h3>
          {blocked ? (
            <div className="mt-2 space-y-1 text-sm text-rose-600">
              <p>Restricted attributes detected:</p>
              <ul className="list-disc pl-5">
                {restrictedAttributes.map((attr) => (
                  <li key={attr}>{attr}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-600">Ready for activation. No restricted attributes present.</p>
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={onPreview}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 hover:border-brand-400 hover:text-brand-600"
        >
          Preview sample profiles
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={blocked}
          className={`rounded-lg px-3 py-2 text-sm font-semibold text-white transition ${
            blocked
              ? "cursor-not-allowed bg-slate-300"
              : "bg-brand-500 hover:bg-brand-600"
          }`}
        >
          Save segment
        </button>
      </div>
    </section>
  );
}
