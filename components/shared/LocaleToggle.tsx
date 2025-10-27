"use client";

import { useStore } from "@/lib/store";
import { getCopy } from "@/lib/i18n";
import { logAudit } from "@/lib/audit";
import { format } from "date-fns";

export const LocaleToggle = () => {
  const locale = useStore((state) => state.locale);
  const setLocale = useStore((state) => state.setLocale);
  const copy = getCopy(locale);

  const handleToggle = () => {
    const next = locale === "en" ? "es" : "en";
    setLocale(next);
    logAudit({
      type: "locale",
      timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
      route: window.location.pathname,
      payload: { locale: next }
    });
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-brand hover:text-brand"
      aria-label="Toggle language"
    >
      {copy.localeToggle}
    </button>
  );
};
