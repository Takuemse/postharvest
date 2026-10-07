import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { DemandBadge } from "../components/DemandBadge";
import { useDemands } from "../hooks/useDemands";
import { kg, neededByText } from "../lib/format";
import type { Demand } from "../lib/types";

const isActive = (d: Demand) => d.state === "OPEN" || d.state === "PARTLY_FULFILLED" || d.state === "OVERDUE";

export default function BuyerDashboard() {
  const { demands, error, reload } = useDemands();
  const all = demands ?? [];
  const active = all.filter(isActive);
  const remainingKg = active.reduce((s, d) => s + d.remainingKg, 0);

const headline =
  active.length > 0 ? `You are looking for ${kg(remainingKg)}.` : all.length > 0 ? "No open requests." : "Nothing requested yet.";

  return (
    <AppShell>
      <Link
        to="/demands/new"
        className="fixed right-5 bottom-5 z-10 inline-flex h-12 items-center gap-2 rounded-full bg-field px-5 font-medium text-paper shadow-lg transition hover:bg-[#18301f] active:translate-y-px md:static md:mb-8 md:inline-flex md:shadow-none"
      >
        <Plus size={18} aria-hidden="true" /> Request produce
      </Link>

      {demands && (
        <div className="mb-8">
          <h1 className="font-display text-4xl leading-[1.05] font-medium md:text-6xl">{headline}</h1>
          {active.length > 0 && (
            <p className="mt-3 text-lg text-ink/70">
              Across {active.length} {active.length === 1 ? "request" : "requests"}.
            </p>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="text-ripe">
          {error} <button onClick={reload} className="underline underline-offset-4">Try again</button>
        </p>
      )}

      {!demands && !error && (
        <div aria-busy="true" className="space-y-3">
          <div className="h-14 w-3/4 animate-pulse rounded-xl bg-line/60" />
          <div className="h-20 animate-pulse rounded-xl bg-line/40" />
        </div>
      )}

      {demands && all.length === 0 && (
        <p className="max-w-md text-lg text-ink/70">Say what you need, how much, and by when.</p>
      )}

      {all.length > 0 && (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white/50">
          {all.map((d) => {
            const pct = Math.min(100, (d.fulfilledKg / d.quantityKg) * 100);
            return (
              <li key={d.id}>
                <Link
                  to={`/demands/${d.id}`}
                  className={`grid gap-3 border-l-4 px-5 py-4 transition hover:bg-white/70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ripe md:grid-cols-[1.4fr_1fr_auto] md:items-center ${
                    d.state === "OVERDUE" ? "border-ripe bg-ripe/5" : isActive(d) ? "border-field/35" : "border-line"
                  }`}
                >
                  <div>
                    <p className="font-display text-xl">{d.crop.name}</p>
                    <p className="text-sm text-ink/65">Deliver to {d.location.name}</p>
                  </div>
                  <div>
                    <p className="font-mono text-lg">
                      {kg(d.remainingKg)}
                      <span className="block text-xs text-ink/55">of {kg(d.quantityKg)} requested</span>
                    </p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
                      <div className="h-full bg-field" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <DemandBadge state={d.state} />
                    {isActive(d) && <span className="text-sm text-ink/70">{neededByText(d.daysUntilNeeded)}</span>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <div className="h-24 md:hidden" />
    </AppShell>
  );
}