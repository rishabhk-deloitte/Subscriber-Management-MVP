"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CampaignForm } from "@/components/campaigns/CampaignForm";
import { CampaignBrief } from "@/lib/types";
import { loadCampaigns } from "@/lib/persistence";

export default function EditCampaignPage() {
  const params = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<CampaignBrief | null>(null);

  useEffect(() => {
    const campaigns = loadCampaigns();
    const found = campaigns.find((item) => item.id === params?.id);
    setCampaign(found ?? null);
  }, [params]);

  if (!campaign) {
    return (
      <div className="space-y-4">
        <header className="border-b border-slate-200 pb-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Offer Designer</p>
          <h1 className="text-2xl font-semibold text-slate-900">Offer brief not found</h1>
          <Link href="/campaigns" className="text-sm text-brand underline">
            Back to offer list
          </Link>
        </header>
        <div className="h-32 animate-pulse rounded-xl border border-dashed border-slate-200 bg-slate-50" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 border-b border-slate-200 pb-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">Offer Designer</p>
        <h1 className="text-2xl font-semibold text-slate-900">Edit offer brief</h1>
        <p className="text-sm text-slate-600">Update Liberty Loop offers with versioning and compliance guardrails.</p>
        <Link href="/campaigns" className="text-sm text-brand underline">
          Back to offer list
        </Link>
      </header>
      <CampaignForm campaign={campaign} mode="edit" />
    </div>
  );
}
