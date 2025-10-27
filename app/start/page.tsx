"use client";

import { ContextComposerForm } from "@/components/forms/ContextComposerForm";
import { ObjectiveEntry } from "@/components/forms/ObjectiveEntry";
import { useStore } from "@/lib/store";
import { getCopy } from "@/lib/i18n";

export default function StartPage() {
  const locale = useStore((state) => state.locale);
  const copy = getCopy(locale);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <header className="mb-4">
            <h1 className="text-xl font-semibold text-slate-800">{copy.startWithContext}</h1>
            <p className="text-sm text-slate-500">{copy.contextComposer}</p>
          </header>
          <ContextComposerForm />
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <header className="mb-4">
            <h2 className="text-xl font-semibold text-slate-800">{copy.startWithObjective}</h2>
            <p className="text-sm text-slate-500">Choose the motion you want to explore.</p>
          </header>
          <ObjectiveEntry />
        </section>
      </div>
    </div>
  );
}
