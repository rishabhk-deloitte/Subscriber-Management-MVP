"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ClarifyingPrompt, ContextComposerInput } from "@/lib/types";

interface ClarifyModalProps {
  prompt: ClarifyingPrompt;
  open: boolean;
  context: ContextComposerInput;
  onClose: () => void;
  onConfirm: (updates: Partial<Pick<ContextComposerInput, "planType" | "language" | "bundleEligible">>) => void;
}

export const ClarifyModal = ({ prompt, open, context, onClose, onConfirm }: ClarifyModalProps) => {
  const [mounted, setMounted] = useState(false);
  const [language, setLanguage] = useState(context.language);
  const [planType, setPlanType] = useState(context.planType);
  const [bundleEligible, setBundleEligible] = useState(Boolean(context.bundleEligible));

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setLanguage(context.language);
      setPlanType(context.planType);
      setBundleEligible(Boolean(context.bundleEligible));
    }
  }, [open, context]);

  if (!open || !mounted) return null;

  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-800">{prompt.label}</h2>
        <form
          className="mt-4 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onConfirm({ language, planType, bundleEligible });
            onClose();
          }}
        >
          {prompt.fields.map((field) => {
            if (field.key === "language") {
              return (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-slate-700">{field.label}</label>
                  <select
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                    value={language}
                    onChange={(event) => setLanguage(event.target.value as ContextComposerInput["language"])}
                  >
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              );
            }
            if (field.key === "planType") {
              return (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-slate-700">{field.label}</label>
                  <select
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                    value={planType}
                    onChange={(event) => setPlanType(event.target.value as ContextComposerInput["planType"])}
                  >
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              );
            }
            return (
              <label key={field.key} className="flex items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={bundleEligible}
                  onChange={(event) => setBundleEligible(event.target.checked)}
                />
                <span>{field.label}</span>
              </label>
            );
          })}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:border-slate-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-muted"
            >
              Apply and re-rank
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};
