import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { OrderBadge } from "../components/OrderBadge";
import { useOrder } from "../hooks/useOrders";
import { api, describeError } from "../lib/api";
import { kg } from "../lib/format";
import { field } from "../lib/styles";
import type { Order, OrderAction, OrderStatus } from "../lib/types";

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: "REQUESTED", label: "Requested" },
  { status: "CONFIRMED", label: "Confirmed" },
  { status: "READY", label: "Ready" },
  { status: "COMPLETED", label: "Completed" },
];

function nextText(o: Order): string {
  const who = o.counterpart.name;
  switch (o.status) {
    case "REQUESTED":
      return o.iStarted
        ? `Waiting for ${who} to confirm. Nothing is reserved yet.`
        : `${who} wants ${kg(o.totalKg)}. Confirm to reserve it.`;
    case "CONFIRMED":
      return o.mySide === "FARMER"
        ? "Confirmed and reserved. Mark it ready when it can be collected or delivered."
        : "Confirmed and reserved. The farmer will mark it ready.";
    case "READY":
      return o.mySide === "BUYER"
        ? "Ready. Mark it received once you have it."
        : "Ready. Waiting for the buyer to mark it received.";
    case "COMPLETED":
      return "Completed.";
    case "CANCELLED":
      return o.cancelReason ? `Cancelled. ${o.cancelReason}` : "Cancelled.";
  }
}

const btn = "h-12 rounded-[10px] px-6 font-medium transition active:translate-y-px disabled:opacity-50";

export default function OrderDetail() {
  const { id } = useParams();
  const { order: o, setOrder, error } = useOrder(id);
  const [pending, setPending] = useState<"decline" | "cancel" | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function act(action: OrderAction, body: object = {}) {
    setBusy(true);
    setActionError(null);
    try {
      setOrder(await api<Order>(`/api/orders/${id}/${action}`, { method: "POST", body: JSON.stringify(body) }));
      setPending(null);
      setReason("");
    } catch (e) {
      setActionError(describeError(e));
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <AppShell>
        <Link to="/orders" className="text-sm underline underline-offset-4">← Orders</Link>
        <p role="alert" className="mt-6 text-ripe">{error}</p>
      </AppShell>
    );
  }
  if (!o) return <AppShell><div aria-busy="true" className="h-40 animate-pulse rounded-xl bg-line/40" /></AppShell>;

  const stepIndex = STEPS.findIndex((s) => s.status === o.status);
  const can = (a: OrderAction) => o.actions.includes(a);
  const price = o.items[0]?.pricePerKg;

  return (
    <AppShell>
      <Link to="/orders" className="text-sm underline underline-offset-4">← Orders</Link>
      <h1 className="mt-4 font-display text-4xl leading-[1.05] font-medium md:text-6xl">
        {o.items.map((i) => i.crop).join(", ")}
      </h1>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <OrderBadge status={o.status} />
        <span className="font-mono text-lg">{kg(o.totalKg)}</span>
      </div>
      <p className="mt-4 max-w-xl text-lg text-ink/80">{nextText(o)}</p>

      {o.status !== "CANCELLED" && (
        <ol aria-label="Order progress" className="mt-6 flex max-w-xl flex-wrap gap-x-5 gap-y-1 text-sm">
          {STEPS.map((s, i) => (
            <li key={s.status} aria-current={i === stepIndex ? "step" : undefined}
              className={i <= stepIndex ? "font-medium text-ink" : "text-ink/45"}>
              {i < stepIndex ? "✓ " : ""}{s.label}
            </li>
          ))}
        </ol>
      )}

      <dl className="mt-8 grid max-w-xl gap-x-8 gap-y-4 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-ink/60">{o.mySide === "FARMER" ? "Buyer" : "Farm"}</dt>
          <dd>{o.counterpart.name}, {o.counterpart.town}</dd>
        </div>
        <div>
          <dt className="text-sm text-ink/60">Price per kg</dt>
          <dd>{price !== null && price !== undefined ? `${price} ${o.items[0].currency}` : "To be agreed"}</dd>
        </div>
        {o.value && (
          <div>
            <dt className="text-sm text-ink/60">Estimated value</dt>
            <dd>{o.value.amount.toFixed(2)} {o.value.currency}</dd>
          </div>
        )}
        {o.deliverTo && (
          <div>
            <dt className="text-sm text-ink/60">Deliver or collect in</dt>
            <dd>{o.deliverTo}</dd>
          </div>
        )}
      </dl>

      <section className="mt-8 max-w-xl rounded-xl border border-line bg-white/50 p-5">
        <h2 className="font-display text-xl">Contact</h2>
        {o.counterpart.contact ? (
          <p className="mt-2">
            {o.counterpart.contact.name}
            {" · "}
            {o.counterpart.contact.phone ? (
              <a href={`tel:${o.counterpart.contact.phone}`} className="underline underline-offset-4">
                {o.counterpart.contact.phone}
              </a>
            ) : (
              "No phone number on file"
            )}
          </p>
        ) : (
          <p className="mt-2 text-ink/70">Contact details appear once the order is confirmed.</p>
        )}
      </section>

      <div className="mt-8 flex max-w-xl flex-wrap items-center gap-4">
        {can("confirm") && (
          <button className={`${btn} bg-field text-paper hover:bg-[#18301f]`} disabled={busy} onClick={() => act("confirm")}>
            Confirm and reserve
          </button>
        )}
        {can("ready") && (
          <button className={`${btn} bg-field text-paper hover:bg-[#18301f]`} disabled={busy} onClick={() => act("ready")}>
            Mark ready
          </button>
        )}
        {can("complete") && (
          <button className={`${btn} bg-field text-paper hover:bg-[#18301f]`} disabled={busy} onClick={() => act("complete")}>
            Mark received
          </button>
        )}
        {can("decline") && !pending && (
          <button onClick={() => setPending("decline")} className="text-sm underline underline-offset-4">Decline</button>
        )}
        {can("cancel") && !pending && (
          <button onClick={() => setPending("cancel")} className="text-sm underline underline-offset-4">
            {o.status === "REQUESTED" ? "Withdraw this request" : "Cancel this order"}
          </button>
        )}
      </div>

      {pending && (
        <div role="alertdialog" aria-label="Confirm" className="mt-4 max-w-xl space-y-3">
          <p className="text-sm">
            {pending === "decline" ? "Decline this request?" : "Cancel this order?"}
            {o.status !== "REQUESTED" && " Reserved stock will be released."}
          </p>
          <label htmlFor="reason" className="block text-sm font-medium">Reason (optional)</label>
          <input id="reason" className={field} maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="flex items-center gap-4">
            <button disabled={busy} onClick={() => act(pending, { reason: reason.trim() || undefined })}
              className={`${btn} h-11 bg-ripe text-white`}>
              {busy ? "Working…" : "Yes"}
            </button>
            <button onClick={() => setPending(null)} className="text-sm underline underline-offset-4">Keep it</button>
          </div>
        </div>
      )}

      <p role="alert" aria-live="polite" className="mt-3 min-h-6 text-sm font-medium text-ripe">{actionError}</p>
    </AppShell>
  );
}