"use client";

import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { encodeObjectiveToSearch } from "@/lib/urlState";
import { logAudit } from "@/lib/audit";
import { format } from "date-fns";

const objectives = [
  { id: "acquire", title: "Acquire" },
  { id: "grow", title: "Grow" },
  { id: "retain", title: "Retain" }
] as const;

export const ObjectiveEntry = () => {
  const router = useRouter();
  const setObjective = useStore((state) => state.setObjective);
  const handleSelect = (objective: "acquire" | "grow" | "retain") => {
    setObjective(objective);
    logAudit({
      type: "objective-selected",
      timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
      route: "/start",
      payload: { objective }
    });
    router.push(`/radar?${encodeObjectiveToSearch(objective)}`);
  };

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {objectives.map((obj) => (
        <button
          key={obj.id}
          type="button"
          onClick={() => handleSelect(obj.id)}
          className="card px-4 py-8 text-center text-lg font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
        >
          {obj.title}
        </button>
      ))}
    </div>
  );
};
