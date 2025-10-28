import { Suspense } from "react";
import { RadarClient } from "@/components/radar/RadarClient";

export default function RadarPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading radar...</div>}>
      <RadarClient />
    </Suspense>
  );
}
