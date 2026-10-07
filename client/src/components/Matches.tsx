import { useEffect, useState, type ReactNode } from "react";
import { Check, Circle, CircleDot } from "lucide-react";
import { api, describeError } from "../lib/api";
import { formatDay, kg, STORAGE_LABEL } from "../lib/format";
import type { BuyerMatch, FarmerMatch, Fit } from "../lib/types";

const FIT = {
  STRONG: { label: "Strong fit", cls: "bg-field text-paper", Icon: Check },
  GOOD: { label: "Good fit", cls: "border border-field text-field", Icon: CircleDot },
  POSSIBLE: { label: "Possible fit", cls: "border border-line text-ink/70", Icon: Circle },
} as const;

function FitBadge({ fit }: { fit: Fit }) {
  const { label, cls, Icon } = FIT[fit];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${cls}`}>
      <Icon size={15} aria-hidden="true" />
      {label}
    </span>
  );
}

function useList<T>(path: string) {
  const [items, setItems] = useState<T[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<T[]>(path).then(setItems).catch((e) => setError(describeError(e)));
  }, [path]);
  return { items, error };
}

function Section({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <section className="mt-12 max-w-xl">
      <h2 className="font-display text-2xl">{title}</h2>
      <p className="mt-1 text-sm text-ink/65">{intro}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Reasons({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 space-y-1 text-sm text-ink/75">
      {items.map((r) => <li key={r}>· {r}</li>)}
    </ul>
  );
}

const card = "rounded-xl border border-line bg-white/50 p-4";

export function HarvestMatches({ harvestId }: { harvestId: string }) {
  const { items, error } = useList<FarmerMatch>(`/api/matches/harvests/${harvestId}`);
  return (
    <Section title="Buyers who want this" intro="Open requests that could take this harvest, best fit first.">
      {error && <p role="alert" className="text-ripe">{error}</p>}
      {!items && !error && <div aria-busy="true" className="h-24 animate-pulse rounded-xl bg-line/40" />}
      {items && items.length === 0 && (
        <p className="text-ink/70">No open requests fit this harvest right now. New requests appear here as buyers post them.</p>
      )}
      {items && items.length > 0 && (
        <ul className="space-y-3">
          {items.map((m) => (
            <li key={m.demandId} className={card}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-display text-xl">{m.buyer.name}</p>
                  <p className="text-sm text-ink/65">Deliver to {m.buyer.town}</p>
                </div>
                <FitBadge fit={m.fit} />
              </div>
              <p className="mt-3 font-mono text-lg">
                {kg(m.matchedKg)} <span className="font-sans text-sm text-ink/60">by {formatDay(m.neededBy)}</span>
              </p>
              <Reasons items={m.reasons} />
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

export function DemandMatches({ demandId }: { demandId: string }) {
  const { items, error } = useList<BuyerMatch>(`/api/matches/demands/${demandId}`);
  return (
    <Section title="Farmers who can supply this" intro="Harvests that could reach you in time and still be fresh, best fit first.">
      {error && <p role="alert" className="text-ripe">{error}</p>}
      {!items && !error && <div aria-busy="true" className="h-24 animate-pulse rounded-xl bg-line/40" />}
      {items && items.length === 0 && (
        <p className="text-ink/70">No harvests fit this request right now. New harvests appear here as farmers record them.</p>
      )}
      {items && items.length > 0 && (
        <ul className="space-y-3">
          {items.map((m) => (
            <li key={m.harvestId} className={card}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-display text-xl">{m.farm.name}</p>
                  <p className="text-sm text-ink/65">{m.farm.town}</p>
                </div>
                <FitBadge fit={m.fit} />
              </div>
              <p className="mt-3 font-mono text-lg">
                {kg(m.matchedKg)} <span className="font-sans text-sm text-ink/60">of {kg(m.availableKg)} available</span>
              </p>
              <p className="mt-1 text-sm text-ink/65">
                Harvested {formatDay(m.harvestDate)} · {STORAGE_LABEL[m.storage]} ·{" "}
                {m.asking ? `${m.asking.pricePerKg} ${m.asking.currency} per kg` : "Price not set"}
              </p>
              <Reasons items={m.reasons} />
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}