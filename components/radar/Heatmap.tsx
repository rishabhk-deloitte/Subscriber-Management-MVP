import dynamic from "next/dynamic";

export const Heatmap = dynamic(() => import("./HeatmapImpl"), {
  ssr: false,
  loading: () => <div className="card flex h-72 items-center justify-center text-sm text-slate-500">Loading map…</div>,
});
