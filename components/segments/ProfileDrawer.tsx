"use client";

import { SegmentSampleProfile } from "@/lib/types";

type ProfileDrawerProps = {
  open: boolean;
  onClose: () => void;
  profiles: SegmentSampleProfile[];
};

export function ProfileDrawer({ open, onClose, profiles }: ProfileDrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-end bg-slate-900/30">
      <div className="h-full w-full max-w-md overflow-y-auto rounded-l-3xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Sample profiles</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-500 hover:border-brand-300 hover:text-brand-600"
          >
            Close
          </button>
        </div>
        <p className="mt-1 text-sm text-slate-500">Representative members matching the current rules.</p>
        <div className="mt-4 space-y-4">
          {profiles.map((profile) => (
            <article key={profile.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-800">{profile.name}</h3>
              <ul className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                {Object.entries(profile.attributes).map(([key, value]) => (
                  <li key={key}>
                    <span className="font-semibold text-slate-700">{key}</span>: {String(value)}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-slate-500">{profile.notes}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
