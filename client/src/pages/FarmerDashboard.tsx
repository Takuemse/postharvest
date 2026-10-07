import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { UrgencyBadge } from "../components/UrgencyBadge";
import { useHarvests } from "../hooks/useHarvests";
import { daysLeftText, harvestedText, kg, STORAGE_LABEL } from "../lib/format";
import type { Urgency } from "../lib/types";

const BAR: Record<Urgency, string> = {
  URGENT: "border-ripe",
  ATTENTION: "border-ripe/45",
  SAFE: "border-field/35",
};

export default function FarmerDashboard() {
  const { harvests, error, reload } = useHarvests();

  const live = (harvests ?? []).filter((h) => h.stockState !== "SOLD_OUT");
  const totalKg = live.reduce((s, h) => s + h.availableKg, 0);
  const risky = live.filter((h) => h.urgency === "URGENT" || h.urgency === "ATTENTION");
  const riskyKg = risky.reduce((s, h) => s + h.availableKg, 0);

  const headline =
    live.length === 0 ? "Nothing recorded yet." : riskyKg > 0 ? `${kg(riskyKg)} needs selling soon.` : "Everything is fresh.";

  return (
    <AppShell>
      <Link
        to="/harvests/new"
        className="fixed right-5 bottom-5 z-10 inline-flex h-12 items-center gap-2 rounded-full bg-field px-5 font-medium text-paper shadow-lg transition hover:bg-[#18301f] active:translate-y-px md:static md:mb-8 md:inline-flex md:shadow-none"
      >
        <Plus size={18} aria-hidden="true" /> Record a harvest
      </Link>

      {harvests && (
        <div className="mb-10">
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
          {error}{" "}
          <button onClick={reload} className="underline underline-offset-4">Try again</button>
        </p>
      )}

      {!harvests && !error && (
        <div aria-busy="true" className="space-y-3">
          <div className="h-14 w-3/4 animate-pulse rounded-xl bg-line/60" />
          <div className="h-20 animate-pulse rounded-xl bg-line/40" />
          <div className="h-20 animate-pulse rounded-xl bg-line/40" />
        </div>
      )}

      {harvests && live.length === 0 && (
        <p className="max-w-md text-lg text-ink/70">
          Record what you picked today and we will tell you what to sell first.
        </p>
      )}

      {live.length > 0 && (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white/50 pb-0">
          {live.map((h) => (
            <li
              key={h.id}
              className={`grid gap-3 border-l-4 px-5 py-4 md:grid-cols-[1.6fr_1fr_auto] md:items-center ${
                BAR[h.urgency ?? "SAFE"]
              } ${h.urgency === "URGENT" ? "bg-ripe/5" : ""}`}
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
                {h.urgency && <UrgencyBadge urgency={h.urgency} />}
                <span className="text-sm text-ink/70">{daysLeftText(h.daysRemaining, h.pastShelfLife)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="h-24 md:hidden" />
    </AppShell>
  );
}