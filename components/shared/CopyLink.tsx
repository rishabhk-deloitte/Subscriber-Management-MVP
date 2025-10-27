"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { getCopy } from "@/lib/i18n";

export const CopyLink = () => {
  const locale = useStore((state) => state.locale);
  const copy = getCopy(locale);
  const [status, setStatus] = useState<"idle" | "copied">("idle");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setStatus("copied");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (error) {
      console.warn("Copy failed", error);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-md border border-slate-300 px-3 py-1 text-sm text-slate-600 hover:border-brand hover:text-brand"
    >
      {status === "copied" ? copy.copied : copy.copyLink}
    </button>
  );
};
