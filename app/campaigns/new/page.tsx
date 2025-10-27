"use client";

import Link from "next/link";
import { CampaignForm } from "@/components/campaigns/CampaignForm";

export default function NewCampaignPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 border-b border-slate-200 pb-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">Offer Designer</p>
        <h1 className="text-2xl font-semibold text-slate-900">Create offer brief</h1>
        <p className="text-sm text-slate-600">
          Stitch Liberty Loop-ready offers with deterministic guardrails and audit logging.
        </p>
        <Link href="/campaigns" className="text-sm text-brand underline">
          Back to offer list
        </Link>
      </header>
      <CampaignForm mode="create" />
    </div>
  );
}
