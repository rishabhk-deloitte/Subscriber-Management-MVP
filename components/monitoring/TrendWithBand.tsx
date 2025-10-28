import dynamic from "next/dynamic";

export const TrendWithBand = dynamic(() => import("./TrendWithBandImpl"), {
  ssr: false,
  loading: () => <div className="card flex h-72 items-center justify-center text-sm text-slate-500">Loading chart…</div>,
});
