"use client";

import { ExecutionBoard } from "@/components/execution/ExecutionBoard";
import { CopyLink } from "@/components/shared/CopyLink";

export default function ExecutionPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <CopyLink />
      </div>
      <ExecutionBoard />
    </div>
  );
}
