import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { UrgencyBadge } from "../components/UrgencyBadge";
import { useHarvest } from "../hooks/useHarvest";
import { api, describeError } from "../lib/api";
import { daysLeftText, harvestedText, kg, STORAGE_LABEL } from "../lib/format";
import { HarvestMatches } from "../components/Matches"

export default function HarvestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { harvest: h, error } = useHarvest(id);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function withdraw() {
    setBusy(true);
    setActionError(null);
    try {
      await api(`/api/harvests/${id}/withdraw`, { method: "POST" });
      navigate("/app");
    } catch (e) {
      setActionError(describeError(e));
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <AppShell>
        <Link to="/app" className="text-sm underline underline-offset-4">← Back</Link>
        <p role="alert" className="mt-6 text-ripe">{error}</p>
      </AppShell>
    );
  }
  if (!h) {
    return (
      <AppShell>
        <div aria-busy="true" className="h-40 animate-pulse rounded-xl bg-line/40" />
      </AppShell>
    );
  }

  const promised = h.reservedKg + h.soldKg;
  const shelfDays = h.shelfLifeDays;
  const progress = shelfDays && h.ageDays !== null ? Math.min(1, h.ageDays / shelfDays) : 0;
  const barColor = h.urgency === "URGENT" ? "bg-ripe" : h.urgency === "ATTENTION" ? "bg-ripe/55" : "bg-field";

  const facts: [string, string][] = [
    ["Harvested", `${kg(h.quantityKg)} on ${h.harvestDate}`],
    ["Available now", kg(h.availableKg)],
    ["Reserved for buyers", kg(h.reservedKg)],
    ["Sold", kg(h.soldKg)],
    ["Storage", STORAGE_LABEL[h.storage]],
    ["Farm", `${h.farm.name}, ${h.farm.location.name}`],
    ["Asking price", h.askingPricePerKg !== null ? `${h.askingPricePerKg} ${h.currency} per kg` : "Not set"],
  ];

  return (
    <AppShell>
      <Link to="/app" className="text-sm underline underline-offset-4">← Back</Link>
      <h1 className="mt-4 font-display text-4xl leading-[1.05] font-medium md:text-6xl">{h.crop.name}</h1>
      <p className="mt-2 text-lg text-ink/70">{kg(h.availableKg)} available</p>

      {h.urgency && shelfDays && (
        <section className="mt-8 max-w-xl rounded-xl border border-line bg-white/50 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <UrgencyBadge urgency={h.urgency} />
            <span className="font-medium">{daysLeftText(h.daysRemaining)}</span>
          </div>
          <p className="mt-3 text-ink/80">
            {h.crop.name} keeps about {shelfDays} days in {STORAGE_LABEL[h.storage].toLowerCase()}. Picked{" "}
            {harvestedText(h.ageDays)}.
          </p>
          <div
            role="progressbar"
            aria-label="Share of estimated shelf life used"
            aria-valuemin={0}
            aria-valuemax={shelfDays}
            aria-valuenow={Math.min(h.ageDays ?? 0, shelfDays)}
            className="mt-4 h-2 overflow-hidden rounded-full bg-line"
          >
            <div className={`h-full ${barColor}`} style={{ width: `${progress * 100}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-xs text-ink/60">
            <span>Picked</span>
            <span>Estimated end of shelf life</span>
          </div>
          <p className="mt-3 text-xs text-ink/60">
            This is an estimate to help you plan, not a food-safety guarantee.
          </p>
        </section>
      )}

      <dl className="mt-8 grid max-w-xl gap-x-8 gap-y-4 sm:grid-cols-2">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt className="text-sm text-ink/60">{label}</dt>
            <dd className="text-base">{value}</dd>
          </div>
        ))}
        {h.notes && (
          <div className="sm:col-span-2">
            <dt className="text-sm text-ink/60">Notes</dt>
            <dd className="text-base">{h.notes}</dd>
          </div>
        )}
       
      </dl>
      {h.stockState !== "SOLD_OUT" && <HarvestMatches harvestId={h.id} />}
      <div className="mt-10 flex max-w-xl flex-wrap items-center gap-4">
        <Link
          to={`/harvests/${h.id}/edit`}
          className="inline-flex h-12 items-center rounded-[10px] bg-field px-6 font-medium text-paper transition hover:bg-[#18301f] active:translate-y-px"
        >
          Edit
        </Link>

        {promised > 0 ? (
          <p className="text-sm text-ink/70">
            {kg(promised)} {promised === 1 ? "is" : "are"} promised to buyers, so this harvest cannot be withdrawn.
          </p>
        ) : confirming ? (
          <div role="alertdialog" aria-label="Confirm withdraw" className="flex flex-wrap items-center gap-3">
            <span className="text-sm">Withdraw this harvest? Buyers will no longer see it.</span>
            <button onClick={withdraw} disabled={busy}
              className="h-11 rounded-[10px] bg-ripe px-4 font-medium text-white active:translate-y-px disabled:opacity-50">
              {busy ? "Withdrawing…" : "Yes, withdraw"}
            </button>
            <button onClick={() => setConfirming(false)} className="text-sm underline underline-offset-4">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setConfirming(true)} className="text-sm underline underline-offset-4">
            Withdraw this harvest
          </button>
        )}
      </div>
      <p role="alert" aria-live="polite" className="mt-3 min-h-6 text-sm font-medium text-ripe">{actionError}</p>
    </AppShell>
  );
}