"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { getCopy } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { logAudit } from "@/lib/audit";
import { format } from "date-fns";
import { LocaleToggle } from "@/components/shared/LocaleToggle";
import { getInitials } from "@/components/shared/getInitials";
import { AuditDrawer } from "@/components/shared/AuditDrawer";
import { applySeed, ensureSeed, resetSeed } from "@/lib/seed";

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useStore((state) => state.locale);
  const freshness = useStore((state) => state.freshness);
  const copy = getCopy(locale);
  const [auditOpen, setAuditOpen] = useState(false);
  const bookmarks = useStore((state) => state.bookmarks);
  const hydrateBookmarks = useStore((state) => state.hydrateBookmarks);
  const addBookmark = useStore((state) => state.addBookmark);
  const removeBookmark = useStore((state) => state.removeBookmark);

  useEffect(() => {
    logAudit({
      type: "route",
      timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
      route: pathname,
      payload: { pathname }
    });
  }, [pathname]);

  useEffect(() => {
    ensureSeed();
    hydrateBookmarks();
  }, [hydrateBookmarks]);

  const avatarLabel = useMemo(() => getInitials("Liberty Team"), []);

  const handleBookmark = () => {
    const label = window.prompt("Bookmark label", `Bookmark ${bookmarks.length + 1}`);
    if (!label) return;
    const params = searchParams.toString();
    addBookmark({
      id: `bookmark-${Date.now()}`,
      label,
      route: pathname,
      params: params ? Object.fromEntries(searchParams.entries()) : {},
      createdAt: new Date().toISOString(),
    });
  };

  const handleReset = () => {
    if (!window.confirm("Reset demo data? This will restore the initial seed.")) return;
    resetSeed();
    applySeed();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4" aria-label="Application header">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-700 font-semibold">CS</div>
          <div>
            <p className="text-sm uppercase tracking-wider text-slate-500">{copy.appName}</p>
          </div>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="text-slate-500">
            <span className="font-medium text-slate-700">{copy.freshness}:</span> {freshness}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBookmark}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-600"
            >
              Bookmark
            </button>
            {bookmarks.length > 0 && (
              <div className="flex items-center gap-2">
                <select
                  onChange={(event) => {
                    const bookmark = bookmarks.find((item) => item.id === event.target.value);
                    if (!bookmark) return;
                    const query = new URLSearchParams(bookmark.params).toString();
                    router.push(`${bookmark.route}${query ? `?${query}` : ""}`);
                  }}
                  defaultValue=""
                  className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                >
                  <option value="" disabled>
                    Bookmarks
                  </option>
                  {bookmarks.map((bookmark) => (
                    <option key={bookmark.id} value={bookmark.id}>
                      {bookmark.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const id = window.prompt("Remove bookmark by label?", bookmarks[0]?.label ?? "");
                    if (!id) return;
                    const match = bookmarks.find((bookmark) => bookmark.label === id || bookmark.id === id);
                    if (match) removeBookmark(match.id);
                  }}
                  className="rounded-full border border-slate-300 px-2 py-1 text-xs text-slate-500 hover:border-rose-300 hover:text-rose-600"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-600"
          >
            Reset demo
          </button>
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
            className="text-brand-600 underline"
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
                      active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
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
