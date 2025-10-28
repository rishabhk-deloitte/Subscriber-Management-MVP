import { opportunityRankings } from "@/lib/sample-data";
import { OpportunityCard } from "@/components/radar/OpportunityCard";

const MIN_AUDIENCE = 1800;

export default function RadarPage() {
  const ranked = [...opportunityRankings].sort(
    (a, b) => b.value * b.confidence - a.value * a.confidence,
  );

  return (
    <main className="space-y-8 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">Opportunity Radar</h1>
        <p className="text-sm text-slate-600">
          Ranked opportunities blending audience size, modeled value, and confidence.
        </p>
      </header>
      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {ranked.map((opportunity, index) => (
          <OpportunityCard
            key={opportunity.id}
            variant="ranked"
            rank={index + 1}
            minAudience={MIN_AUDIENCE}
            opportunity={opportunity}
          />
        ))}
      </section>
    </main>
  );
}
