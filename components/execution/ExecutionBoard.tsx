"use client";

import { useEffect, useMemo, useState } from "react";
import { differenceInHours, format } from "date-fns";
import { executionPipeline, executionRisks, executionTasks } from "@/lib/sample-data";
import { CampaignBrief, ReadinessCheck } from "@/lib/types";
import { loadCampaigns } from "@/lib/persistence";
import { segmentDefinitions } from "@/lib/sample-data";
import { logAudit } from "@/lib/audit";

const readinessGuardrails = {
  email: 2000,
  paidSocial: 5000,
  display: 10000,
};

const statusAccent: Record<string, string> = {
  "on-track": "bg-brand-50 text-brand-700",
  "at-risk": "bg-amber-100 text-amber-700",
  delayed: "bg-rose-100 text-rose-700",
};

const taskStatusAccent: Record<string, string> = {
  "Not started": "bg-slate-100 text-slate-600",
  "In progress": "bg-amber-100 text-amber-700",
  Blocked: "bg-rose-100 text-rose-700",
  Done: "bg-brand-50 text-brand-700",
};

const computeReadiness = (campaign: CampaignBrief): ReadinessCheck[] => {
  const segment = segmentDefinitions.find((item) => item.id === campaign.linkedSegmentId);
  if (!segment) {
    return [
      {
        id: "segment-missing",
        label: "Segment available",
        passed: false,
        detail: "Segment reference not found; refresh Segment Studio seed.",
      },
    ];
  }

  const checks: ReadinessCheck[] = [];
  const emailReady = segment.metrics.reach.email >= readinessGuardrails.email;
  const paidSocialReady = segment.metrics.reach.paidSocial >= readinessGuardrails.paidSocial;
  const displayReady = segment.metrics.reach.display >= readinessGuardrails.display;
  checks.push({
    id: "email-guardrail",
    label: "Email audience ≥ 2,000",
    passed: emailReady,
    detail: `${segment.metrics.reach.email.toLocaleString()} opted-in emails`,
  });
  checks.push({
    id: "paid-social-guardrail",
    label: "Paid social audience ≥ 5,000",
    passed: paidSocialReady,
    detail: `${segment.metrics.reach.paidSocial.toLocaleString()} eligible for paid social`,
  });
  checks.push({
    id: "display-guardrail",
    label: "Display audience ≥ 10,000",
    passed: displayReady,
    detail: `${segment.metrics.reach.display.toLocaleString()} display impressions available`,
  });
  checks.push({
    id: "restricted-attributes",
    label: "Restricted attributes acknowledged",
    passed: segment.restrictedAttributes.length === 0 ? true : campaign.changeNotes.length > 0,
    detail:
      segment.restrictedAttributes.length === 0
        ? "No restricted attributes in this segment"
        : `Review required for ${segment.restrictedAttributes.join(", ")}`,
  });
  const consentsOk = (!campaign.eligibility.consentSMS || segment.metrics.reach.sms > readinessGuardrails.email) &&
    (!campaign.eligibility.consentWhatsApp || segment.metrics.reach.whatsapp > readinessGuardrails.email);
  checks.push({
    id: "consent-ready",
    label: "Consent prerequisites satisfied",
    passed: consentsOk,
    detail: `SMS reach ${segment.metrics.reach.sms.toLocaleString()} · WhatsApp ${segment.metrics.reach.whatsapp.toLocaleString()}`,
  });
  const bundleRequired = ["LibertyLoop", "BundleDiscount"].includes(campaign.offerArchetype);
  checks.push({
    id: "bundle-provisioning",
    label: "Provisioning flag ready for bundles",
    passed: !bundleRequired || campaign.eligibility.bundleEligible !== false,
    detail: bundleRequired ? "Bundle offer flagged for provisioning" : "Bundle provisioning not required",
  });
  const spanishReady =
    campaign.eligibility.language === "es"
      ? /español|spanish|bilingual|es-first/i.test(campaign.valueProp)
      : true;
  checks.push({
    id: "spanish-copy",
    label: "Spanish copy readiness",
    passed: spanishReady,
    detail: campaign.eligibility.language === "es" ? "Spanish copy referenced in value prop" : "English campaign",
  });
  return checks;
};

const pipelineByCampaign = executionPipeline.reduce<Record<string, typeof executionPipeline[number][]>>((acc, stage) => {
  if (!acc[stage.campaignId]) acc[stage.campaignId] = [];
  acc[stage.campaignId].push(stage);
  return acc;
}, {});

const download = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const ExecutionBoard = () => {
  const [campaigns, setCampaigns] = useState<CampaignBrief[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>();
  const [readiness, setReadiness] = useState<ReadinessCheck[]>([]);
  const [alerts, setAlerts] = useState<string[]>([]);

  useEffect(() => {
    const data = loadCampaigns();
    setCampaigns(data);
    if (data.length > 0) {
      setSelectedCampaignId(data[0].id);
      setReadiness(computeReadiness(data[0]));
    }
  }, []);

  const selectedCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === selectedCampaignId),
    [campaigns, selectedCampaignId],
  );

  const tasks = executionTasks.filter((task) =>
    selectedCampaignId ? task.campaignId === selectedCampaignId : true,
  );

  const approvals = useMemo(
    () =>
      campaigns.flatMap((campaign) =>
        campaign.approvals.map((approval) => ({
          campaign,
          approval,
        })),
      ),
    [campaigns],
  );

  const pendingAlerts = useMemo(() => {
    return tasks
      .filter((task) => task.status === "Blocked" || task.status === "In progress")
      .map((task) => `Notify ${task.owner} on ${task.workstream} – ${task.status}`);
  }, [tasks]);

  const handleCampaignChange = (id: string) => {
    setSelectedCampaignId(id);
    const campaign = campaigns.find((item) => item.id === id);
    if (campaign) {
      const checks = computeReadiness(campaign);
      setReadiness(checks);
      logAudit({
        type: "execution.campaign.select",
        timestamp: new Date().toISOString(),
        route: "/execution",
        payload: { id, name: campaign.name },
      });
    }
  };

  const handleRunReadiness = () => {
    if (!selectedCampaign) return;
    const checks = computeReadiness(selectedCampaign);
    setReadiness(checks);
    logAudit({
      type: "execution.readiness",
      timestamp: new Date().toISOString(),
      route: "/execution",
      payload: { id: selectedCampaign.id, passed: checks.every((check) => check.passed) },
    });
  };

  const handleSendAlert = (message: string) => {
    setAlerts((prev) => [message, ...prev]);
    logAudit({
      type: "execution.notification",
      timestamp: new Date().toISOString(),
      route: "/execution",
      payload: { message },
    });
  };

  const handleExportHtml = () => {
    if (!selectedCampaign) return;
    const stages = pipelineByCampaign[selectedCampaign.id] ?? [];
    const rows = stages
      .map(
        (stage) =>
          `<tr><td style="padding:6px;border:1px solid #e2e8f0;">${stage.name}</td><td style="padding:6px;border:1px solid #e2e8f0;">${stage.progress}%</td><td style="padding:6px;border:1px solid #e2e8f0;">${stage.status}</td><td style="padding:6px;border:1px solid #e2e8f0;">${stage.notes}</td></tr>`,
      )
      .join("");
    const readinessRows = readiness
      .map(
        (check) =>
          `<tr><td style="padding:6px;border:1px solid #e2e8f0;">${check.label}</td><td style="padding:6px;border:1px solid #e2e8f0;">${check.passed ? "Ready" : "Needs action"}</td><td style="padding:6px;border:1px solid #e2e8f0;">${check.detail}</td></tr>`,
      )
      .join("");
    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${selectedCampaign.name} · Execution status</title>
  </head>
  <body style="font-family:Inter,system-ui,-apple-system,sans-serif;background:#f8fafc;padding:24px;color:#0f172a;">
    <article style="background:white;border-radius:16px;padding:24px;border:1px solid #e2e8f0;max-width:840px;margin:0 auto;">
      <header style="margin-bottom:24px;">
        <p style="margin:0;color:#0f172a;font-weight:600;">Execution status report</p>
        <h1 style="margin:4px 0 0;font-size:26px;">${selectedCampaign.name}</h1>
        <p style="margin:8px 0 0;color:#475569;">Generated ${format(new Date(), "PPP p")}</p>
      </header>
      <section style="margin-bottom:24px;">
        <h2 style="margin:0 0 12px;font-size:18px;color:#0f172a;">Pipeline</h2>
        <table style="border-collapse:collapse;width:100%;">
          <thead>
            <tr style="background:#f1f5f9;">
              <th style="text-align:left;padding:6px;border:1px solid #e2e8f0;">Stage</th>
              <th style="text-align:left;padding:6px;border:1px solid #e2e8f0;">Progress</th>
              <th style="text-align:left;padding:6px;border:1px solid #e2e8f0;">Status</th>
              <th style="text-align:left;padding:6px;border:1px solid #e2e8f0;">Notes</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </section>
      <section>
        <h2 style="margin:0 0 12px;font-size:18px;color:#0f172a;">Readiness summary</h2>
        <table style="border-collapse:collapse;width:100%;">
          <thead>
            <tr style="background:#f1f5f9;">
              <th style="text-align:left;padding:6px;border:1px solid #e2e8f0;">Check</th>
              <th style="text-align:left;padding:6px;border:1px solid #e2e8f0;">Status</th>
              <th style="text-align:left;padding:6px;border:1px solid #e2e8f0;">Detail</th>
            </tr>
          </thead>
          <tbody>${readinessRows}</tbody>
        </table>
      </section>
    </article>
  </body>
</html>`;
    download(new Blob([html], { type: "text/html" }), `execution-status-${selectedCampaign.id}.html`);
    logAudit({
      type: "execution.export.html",
      timestamp: new Date().toISOString(),
      route: "/execution",
      payload: { id: selectedCampaign.id },
    });
  };

  const handleExportCsv = () => {
    const header = ["task", "workstream", "owner", "due_date", "status", "sla_hours", "tags", "dependencies"];
    const rows = tasks.map((task) => [
      task.id,
      task.workstream,
      task.owner,
      task.dueDate,
      task.status,
      task.slaHours.toString(),
      task.tags.join("|"),
      task.dependencies.join("|"),
    ]);
    const csv = [header.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");
    download(new Blob([csv], { type: "text/csv" }), `execution-actions-${selectedCampaignId ?? "all"}.csv`);
    logAudit({
      type: "execution.export.csv",
      timestamp: new Date().toISOString(),
      route: "/execution",
      payload: { campaignId: selectedCampaignId },
    });
  };

  if (campaigns.length === 0) {
    return (
      <div className="space-y-4">
        <header className="card p-6">
          <h1 className="text-2xl font-semibold text-slate-900">Execution Hub</h1>
          <p className="mt-2 text-sm text-slate-600">No offer briefs found. Create a brief to enable execution tracking.</p>
        </header>
        <div className="card border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
          Pipeline, tasks, and readiness will appear once an Offer Designer brief is created.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="card p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Role: Marketer</p>
            <h1 className="text-2xl font-semibold text-slate-900">Execution Hub</h1>
            <p className="text-sm text-slate-600">Coordinate pipeline, guardrails, and PMO workflows for Liberty offers.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleExportHtml}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-brand-300 hover:text-brand-700"
            >
              Export status (HTML)
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-brand-300 hover:text-brand-700"
            >
              Export action items (CSV)
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <span className="font-semibold text-slate-700">Campaign</span>
          <select
            value={selectedCampaignId ?? ""}
            onChange={(event) => handleCampaignChange(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          >
            <option value="" disabled>
              Select campaign
            </option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
          {selectedCampaign && (
            <span className="chip border-brand-200 bg-brand-50 text-brand-700">
              {selectedCampaign.status}
            </span>
          )}
        </div>
      </header>

      <section className="card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Pipeline overview</h2>
          <p className="text-xs uppercase tracking-wide text-slate-500">Planning → Launch</p>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {(pipelineByCampaign[selectedCampaignId ?? ""] ?? []).map((stage) => (
            <div key={stage.id} className="card p-4">
              <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                <span>{stage.name}</span>
                <span className={`rounded-full px-2 py-1 text-xs ${statusAccent[stage.status]}`}>{stage.status}</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-brand-500" style={{ width: `${stage.progress}%` }} />
              </div>
              <p className="mt-3 text-xs text-slate-500">Owner: {stage.owner}</p>
              <p className="mt-1 text-sm text-slate-600">{stage.notes}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Task board</h2>
          <p className="text-xs uppercase tracking-wide text-slate-500">SLA countdown</p>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-600">Task</th>
                <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-600">Workstream</th>
                <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-600">Owner</th>
                <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-600">Due</th>
                <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-600">SLA hrs</th>
                <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-600">Tags</th>
                <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tasks.map((task) => {
                const dueIn = differenceInHours(new Date(task.dueDate), new Date());
                return (
                  <tr key={task.id} className="hover:bg-brand/5">
                    <td className="px-4 py-3 font-medium text-slate-800">{task.id}</td>
                    <td className="px-4 py-3 text-slate-600">{task.workstream}</td>
                    <td className="px-4 py-3 text-slate-600">{task.owner}</td>
                    <td className="px-4 py-3 text-slate-600">{format(new Date(task.dueDate), "MMM d")}</td>
                    <td className="px-4 py-3 text-slate-600">{task.slaHours}h ({dueIn}h left)</td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="flex flex-wrap gap-2">
                        {task.tags.map((tag) => (
                          <span key={tag} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${taskStatusAccent[task.status]}`}>
                        {task.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Approvals</h2>
          <p className="text-xs uppercase tracking-wide text-slate-500">Workflow</p>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {approvals.map(({ campaign, approval }) => (
            <div key={approval.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                <span>{approval.approver}</span>
                <span
                  className={`rounded-full px-2 py-1 text-xs ${
                    approval.status === "Approved"
                      ? "bg-brand-50 text-brand-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {approval.status}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{campaign.name}</p>
              <p className="mt-1 text-xs text-slate-500">{format(new Date(approval.timestamp), "MMM d, HH:mm")}</p>
              {approval.comment && <p className="mt-2 text-sm text-slate-600">{approval.comment}</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900">Risks & blockers</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {executionRisks.map((risk) => (
            <div key={risk.id} className="card p-4">
              <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                <span>{risk.severity} risk</span>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500">{risk.status}</span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{risk.description}</p>
              <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">Owner: {risk.owner}</p>
              <p className="mt-2 text-sm text-slate-600">Mitigation: {risk.mitigation}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {risk.tags.map((tag) => (
                  <span key={tag} className="chip border-brand-200 bg-brand-50 text-brand-700">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Readiness checks</h2>
          <button
            type="button"
            onClick={handleRunReadiness}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-brand-300 hover:text-brand-700"
          >
            Run readiness check
          </button>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {readiness.map((check) => (
            <div
              key={check.id}
              className={`rounded-lg border p-4 text-sm ${check.passed ? "border-brand-200 bg-brand-50 text-brand-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}
            >
              <p className="font-semibold">{check.label}</p>
              <p className="mt-2 text-xs text-slate-600">{check.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">In-app notifications</h2>
          <p className="text-xs uppercase tracking-wide text-slate-500">Audit captured</p>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {pendingAlerts.map((message) => (
            <div key={message} className="card p-4">
              <p className="text-sm text-slate-700">{message}</p>
              <button
                type="button"
                onClick={() => handleSendAlert(message)}
                className="mt-3 rounded-md border border-brand-500 px-3 py-2 text-xs font-semibold text-brand-600 hover:bg-brand-50"
              >
                Send update
              </button>
            </div>
          ))}
        </div>
        {alerts.length > 0 && (
          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-700">Recently sent</p>
            <ul className="mt-2 space-y-2">
              {alerts.map((alert, index) => (
                <li key={`${alert}-${index}`}>{alert}</li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
};
