"use client";

import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { macroZones } from "@/lib/sample-data";
import { useStore } from "@/lib/store";
import { getCopy } from "@/lib/i18n";
import { encodeContextToSearch } from "@/lib/urlState";
import { runContextStub } from "@/lib/llm-stub";
import { logAudit } from "@/lib/audit";
import { format } from "date-fns";

const formSchema = z.object({
  objective: z.enum(["acquire", "grow", "retain"]),
  market: z.string().min(2),
  geography: z.array(z.string()).min(1),
  product: z.enum(["Fiber", "Mobile", "FWA", "Bundle"]),
  planType: z.enum(["prepaid", "postpaid", "bundle"]),
  language: z.enum(["en", "es"]),
  signals: z.array(z.string()).default([]),
  bundleEligible: z.boolean().default(false),
  notes: z.string().optional()
});

const signalOptions = [
  "promo change",
  "churn spike",
  "network event",
  "storm recovery",
  "affordability program lapse",
  "bundle interest",
  "device aging"
];

type FormValues = z.infer<typeof formSchema>;

export const ContextComposerForm = () => {
  const router = useRouter();
  const locale = useStore((state) => state.locale);
  const setLastContext = useStore((state) => state.setLastContext);
  const setObjective = useStore((state) => state.setObjective);
  const setRadarSeed = useStore((state) => state.setRadarSeed);
  const copy = getCopy(locale);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      objective: "acquire",
      market: "Liberty Puerto Rico",
      geography: [macroZones[0]],
      product: "Fiber",
      planType: "postpaid",
      language: "en",
      signals: [],
      bundleEligible: false
    }
  });

  const handleSubmit = form.handleSubmit((values) => {
    const context = values;
    const stub = runContextStub(context);
    setLastContext(context);
    setObjective(values.objective);
    setRadarSeed(stub.rankedOpportunityIds[0]);
    logAudit({
      type: "context-interpreted",
      timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
      route: "/start",
      payload: { context, stub }
    });
    router.push(`/radar?${encodeContextToSearch(context)}`);
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-4" aria-label="Context composer form">
      <div>
        <label className="block text-sm font-medium text-slate-700">{copy.objective}</label>
        <select
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
          {...form.register("objective")}
        >
          <option value="acquire">Acquire</option>
          <option value="grow">Grow</option>
          <option value="retain">Retain</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">{copy.market}</label>
        <input
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          {...form.register("market")}
          placeholder="Liberty Puerto Rico"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">{copy.geography}</label>
        <select
          multiple
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          {...form.register("geography")}
        >
          {macroZones.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-500">Hold Ctrl/⌘ to select multiple zones.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">{copy.product}</label>
          <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" {...form.register("product")}>
            <option value="Fiber">Fiber</option>
            <option value="Mobile">Mobile</option>
            <option value="FWA">FWA</option>
            <option value="Bundle">Bundle</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">{copy.planType}</label>
          <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" {...form.register("planType")}>
            <option value="prepaid">Prepaid</option>
            <option value="postpaid">Postpaid</option>
            <option value="bundle">Bundle</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">{copy.language}</label>
        <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" {...form.register("language")}>
          <option value="en">English</option>
          <option value="es">Español</option>
        </select>
      </div>
      <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm">
        <input type="checkbox" {...form.register("bundleEligible")} />
        <span>Bundle-ready audience (Liberty Loop)</span>
      </label>
      <div>
        <label className="block text-sm font-medium text-slate-700">{copy.signals}</label>
        <div className="grid gap-2 sm:grid-cols-2">
          {signalOptions.map((signal) => (
            <label key={signal} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm">
              <input type="checkbox" value={signal} {...form.register("signals")} />
              <span className="capitalize">{signal}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">
          {copy.notes} <span className="text-xs text-slate-400">({copy.optional})</span>
        </label>
        <textarea className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" rows={3} {...form.register("notes")} />
      </div>
      <button
        type="submit"
        className="w-full rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-muted"
      >
        {copy.interpret}
      </button>
    </form>
  );
};
