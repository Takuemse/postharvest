import { Link, useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { UrgencyBadge } from "../components/UrgencyBadge";
import { useHarvests } from "../hooks/useHarvests";
import { daysLeftText, harvestedText, kg, STORAGE_LABEL } from "../lib/format";
import type { Harvest, Urgency } from "../lib/types";

const BAR: Record<Urgency, string> = {
  URGENT: "border-ripe",
  ATTENTION: "border-ripe/45",
  SAFE: "border-field/35",
};

const isLive = (h: Harvest) => h.stockState !== "SOLD_OUT";

// Every filter is backed by real harvest data; filters with no matches are not shown.
const FILTERS: { key: string; label: string; test: (h: Harvest) => boolean }[] = [
  { key: "all", label: "All", test: () => true },
  { key: "urgent", label: "Sell now", test: (h) => isLive(h) && h.urgency === "URGENT" },
  { key: "soon", label: "Sell soon", test: (h) => isLive(h) && h.urgency === "ATTENTION" },
  { key: "fresh", label: "Fresh", test: (h) => isLive(h) && h.urgency === "SAFE" },
  { key: "reserved", label: "Reserved", test: (h) => h.stockState === "PARTLY_RESERVED" || h.stockState === "FULLY_RESERVED" },
  { key: "sold", label: "Sold out", test: (h) => h.stockState === "SOLD_OUT" },
];

export default function FarmerDashboard() {
  const { harvests, error, reload } = useHarvests();
  const [params, setParams] = useSearchParams();

  const all = harvests ?? [];
  const live = all.filter(isLive);
  const totalKg = live.reduce((s, h) => s + h.availableKg, 0);
  const riskyKg = live
    .filter((h) => h.urgency === "URGENT" || h.urgency === "ATTENTION")
    .reduce((s, h) => s + h.availableKg, 0);

  const headline =
    live.length === 0 ? "Nothing recorded yet." : riskyKg > 0 ? `${kg(riskyKg)} needs selling soon.` : "Everything is fresh.";

  const available = FILTERS.map((f) => ({ ...f, count: all.filter(f.test).length })).filter(
    (f) => f.key === "all" || f.count > 0,
  );
  const active = available.find((f) => f.key === params.get("filter")) ?? available[0];
  const shown = all.filter(active.test);

  return (
    <AppShell>
      <Link
        to="/harvests/new"
        className="fixed right-5 bottom-5 z-10 inline-flex h-12 items-center gap-2 rounded-full bg-field px-5 font-medium text-paper shadow-lg transition hover:bg-[#18301f] active:translate-y-px md:static md:mb-8 md:inline-flex md:shadow-none"
      >
        <Plus size={18} aria-hidden="true" /> Record a harvest
      </Link>

      {harvests && (
        <div className="mb-8">
          <h1 className="font-display text-4xl leading-[1.05] font-medium md:text-6xl">{headline}</h1>
          {live.length > 0 && (
            <p className="mt-3 text-lg text-ink/70">
              {kg(totalKg)} available across {live.length} {live.length === 1 ? "harvest" : "harvests"}.
            </p>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="text-ripe">
          {error} <button onClick={reload} className="underline underline-offset-4">Try again</button>
        </p>
      )}

      {!harvests && !error && (
        <div aria-busy="true" className="space-y-3">
          <div className="h-14 w-3/4 animate-pulse rounded-xl bg-line/60" />
          <div className="h-20 animate-pulse rounded-xl bg-line/40" />
          <div className="h-20 animate-pulse rounded-xl bg-line/40" />
        </div>
      )}

      {harvests && all.length === 0 && (
        <p className="max-w-md text-lg text-ink/70">
          Record what you picked today and we will tell you what to sell first.
        </p>
      )}

      {available.length > 2 && (
        <div role="group" aria-label="Filter harvests" className="mb-4 flex flex-wrap gap-2">
          {available.map((f) => (
            <button
              key={f.key}
              aria-pressed={active.key === f.key}
              onClick={() => setParams(f.key === "all" ? {} : { filter: f.key })}
              className={`h-10 rounded-full border px-4 text-sm font-medium transition active:translate-y-px ${
                active.key === f.key ? "border-ink bg-ink text-paper" : "border-line hover:border-ink/50"
              }`}
            >
              {f.label} <span className="opacity-70">{f.count}</span>
            </button>
          ))}
        </div>
      )}

      {shown.length > 0 && (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white/50">
          {shown.map((h) => (
            <li key={h.id}>
              <Link
                to={`/harvests/${h.id}`}
                className={`grid gap-3 border-l-4 px-5 py-4 transition hover:bg-white/70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ripe md:grid-cols-[1.6fr_1fr_auto] md:items-center ${
                  BAR[h.urgency ?? "SAFE"]
                } ${h.urgency === "URGENT" && isLive(h) ? "bg-ripe/5" : ""}`}
              >
                <div>
                  <p className="font-display text-xl">{h.crop.name}</p>
                  <p className="text-sm text-ink/65">
                    {STORAGE_LABEL[h.storage]} · harvested {harvestedText(h.ageDays)}
                  </p>
                </div>
                <p className="font-mono text-lg">
                  {kg(h.availableKg)}
                  <span className="block text-xs text-ink/55">of {kg(h.quantityKg)} harvested</span>
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  {!isLive(h) ? (
                    <span className="text-sm font-medium">Sold out</span>
                  ) : (
                    <>
                      {h.urgency && <UrgencyBadge urgency={h.urgency} />}
                      <span className="text-sm text-ink/70">{daysLeftText(h.daysRemaining)}</span>
                    </>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="h-24 md:hidden" />
    </AppShell>
  );
}