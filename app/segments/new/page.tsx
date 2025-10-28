import { Suspense } from "react";
import { SegmentBuilderClient } from "@/components/segments/SegmentBuilderClient";

export default function SegmentBuilderPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading segment builder...</div>}>
      <SegmentBuilderClient />
    </Suspense>
  );
}
