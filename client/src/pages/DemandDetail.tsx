import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { DemandBadge } from "../components/DemandBadge";
import { useDemand } from "../hooks/useDemands";
import { api, describeError } from "../lib/api";
import { kg, neededByText } from "../lib/format";
import { DemandMatches } from "../components/Matches";

export default function DemandDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { demand: d, error } = useDemand(id);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function close() {
    setBusy(true);
    setActionError(null);
    try {
      await api(`/api/demands/${id}/close`, { method: "POST" });
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
  if (!d) return <AppShell><div aria-busy="true" className="h-40 animate-pulse rounded-xl bg-line/40" /></AppShell>;

  const open = d.state === "OPEN" || d.state === "PARTLY_FULFILLED" || d.state === "OVERDUE";
  const pct = Math.min(100, (d.fulfilledKg / d.quantityKg) * 100);
  const verb = d.fulfilledKg > 0 ? "Close this request" : "Cancel this request";

  const facts: [string, string][] = [
    ["Requested", kg(d.quantityKg)],
    ["Filled so far", kg(d.fulfilledKg)],
    ["Still needed", kg(d.remainingKg)],
    ["Needed by", d.neededBy],
    ["Deliver or collect in", `${d.location.name}`],
    ["Highest price", d.maxPricePerKg !== null ? `${d.maxPricePerKg} ${d.currency} per kg` : "Not set"],
  ];

  return (
    <AppShell>
      <Link to="/app" className="text-sm underline underline-offset-4">← Back</Link>
      <h1 className="mt-4 font-display text-4xl leading-[1.05] font-medium md:text-6xl">{d.crop.name}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <DemandBadge state={d.state} />
        {open && <span className="text-ink/70">{neededByText(d.daysUntilNeeded)}</span>}
      </div>

      <div className="mt-6 max-w-xl">
        <div role="progressbar" aria-label="Share of the request filled" aria-valuemin={0} aria-valuemax={d.quantityKg}
          aria-valuenow={d.fulfilledKg} className="h-2 overflow-hidden rounded-full bg-line">
          <div className="h-full bg-field" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <dl className="mt-8 grid max-w-xl gap-x-8 gap-y-4 sm:grid-cols-2">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt className="text-sm text-ink/60">{label}</dt>
            <dd className="text-base">{value}</dd>
          </div>
        ))}
        {d.notes && (
          <div className="sm:col-span-2">
            <dt className="text-sm text-ink/60">Notes</dt>
            <dd className="text-base">{d.notes}</dd>
          </div>
        )}
       
      </dl>
       {open && <DemandMatches demandId={d.id} />}P89

      {open && (
        <div className="mt-10 max-w-xl">
          {confirming ? (
            <div role="alertdialog" aria-label="Confirm" className="flex flex-wrap items-center gap-3">
              <span className="text-sm">
                {d.fulfilledKg > 0
                  ? "Close this request? Produce already allocated stays with you."
                  : "Cancel this request? Farmers will no longer see it."}
              </span>
              <button onClick={close} disabled={busy}
                className="h-11 rounded-[10px] bg-ripe px-4 font-medium text-white active:translate-y-px disabled:opacity-50">
                {busy ? "Working…" : "Yes"}
              </button>
              <button onClick={() => setConfirming(false)} className="text-sm underline underline-offset-4">Keep it</button>
            </div>
          ) : (
            <button onClick={() => setConfirming(true)} className="text-sm underline underline-offset-4">{verb}</button>
          )}
        </div>
      )}
      <p role="alert" aria-live="polite" className="mt-3 min-h-6 text-sm font-medium text-ripe">{actionError}</p>
    </AppShell>
  );
}