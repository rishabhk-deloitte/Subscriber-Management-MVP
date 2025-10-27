"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { getCopy } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { logAudit } from "@/lib/audit";
import { format } from "date-fns";
import { LocaleToggle } from "@/components/shared/LocaleToggle";
import { getInitials } from "@/components/shared/getInitials";
import { useMemo } from "react";
import { AuditDrawer } from "@/components/shared/AuditDrawer";

const navItems = [
  { href: "/start", labelKey: "start" },
  { href: "/radar", labelKey: "radar" },
  { href: "/segments", labelKey: "segments" },
  { href: "/campaigns", labelKey: "campaigns" },
  { href: "/execution", labelKey: "execution" },
  { href: "/monitoring", labelKey: "monitoring" }
];

export const AppShell = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const locale = useStore((state) => state.locale);
  const freshness = useStore((state) => state.freshness);
  const copy = getCopy(locale);
  const [auditOpen, setAuditOpen] = useState(false);

  useEffect(() => {
    logAudit({
      type: "route",
      timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
      route: pathname,
      payload: { pathname }
    });
  }, [pathname]);

  const avatarLabel = useMemo(() => getInitials("Liberty Team"), []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4" aria-label="Application header">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand font-semibold">CS</div>
          <div>
            <p className="text-sm uppercase tracking-wider text-slate-500">{copy.appName}</p>
          </div>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="text-slate-500">
            <span className="font-medium text-slate-700">{copy.freshness}:</span> {freshness}
          </div>
          <button
            type="button"
            onClick={() => {
              setAuditOpen(true);
              logAudit({
                type: "audit.toggle",
                timestamp: new Date().toISOString(),
                route: pathname,
                payload: { open: true },
              });
            }}
            className="text-brand underline"
          >
            {copy.auditLog}
          </button>
          <LocaleToggle />
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600" aria-label="User avatar placeholder">
            {avatarLabel}
          </div>
        </div>
      </header>
      <div className="flex" role="presentation">
        <nav className="hidden w-60 shrink-0 border-r border-slate-200 bg-white lg:block" aria-label="Primary">
          <ul className="space-y-1 px-4 py-6">
            {navItems.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition ${
                      active ? "bg-brand/10 text-brand" : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {copy[item.labelKey as keyof typeof copy]}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <main className="flex-1 px-4 py-6 lg:px-10" role="main">
          {children}
        </main>
      </div>
      <AuditDrawer
        open={auditOpen}
        onClose={() => {
          setAuditOpen(false);
          logAudit({
            type: "audit.toggle",
            timestamp: new Date().toISOString(),
            route: pathname,
            payload: { open: false },
          });
        }}
      />
    </div>
  );
};
