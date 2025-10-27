"use client";

import { MonitoringClient } from "@/components/monitoring/MonitoringClient";
import { AuditTrail } from "@/components/monitoring/AuditTrail";
import { CopyLink } from "@/components/shared/CopyLink";

export default function MonitoringPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <CopyLink />
      </div>
      <MonitoringClient />
      <AuditTrail />
    </div>
  );
}
