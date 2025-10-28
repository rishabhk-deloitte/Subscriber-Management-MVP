"use client";

import { ExecutionBoard } from "@/components/execution/ExecutionBoard";
import { CopyLink } from "@/components/shared/CopyLink";
import { useIsClient } from "@/lib/use-is-client";

export default function ExecutionPage() {
  const isClient = useIsClient();

  if (!isClient) {
    return <div className="p-6 text-sm text-gray-500">Loading…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <CopyLink />
      </div>
      <ExecutionBoard />
    </div>
  );
}
