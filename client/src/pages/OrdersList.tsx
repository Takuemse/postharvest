import { Link } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { OrderBadge } from "../components/OrderBadge";
import { needsMe, useOrders } from "../hooks/useOrders";
import { formatDay, kg } from "../lib/format";

export default function OrdersList() {
  const { orders, error, reload } = useOrders();

  return (
    <AppShell>
      <h1 className="font-display text-4xl leading-[1.05] font-medium md:text-6xl">Orders</h1>

      {error && (
        <p role="alert" className="mt-6 text-ripe">
          {error} <button onClick={reload} className="underline underline-offset-4">Try again</button>
        </p>
      )}
      {!orders && !error && <div aria-busy="true" className="mt-8 h-24 animate-pulse rounded-xl bg-line/40" />}
      {orders && orders.length === 0 && (
        <p className="mt-6 max-w-md text-lg text-ink/70">No orders yet. Start one from a match on a harvest or a request.</p>
      )}

      {orders && orders.length > 0 && (
        <ul className="mt-8 divide-y divide-line overflow-hidden rounded-xl border border-line bg-white/50">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                to={`/orders/${o.id}`}
                className={`grid gap-3 border-l-4 px-5 py-4 transition hover:bg-white/70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ripe md:grid-cols-[1.4fr_1fr_auto] md:items-center ${
                  needsMe(o) ? "border-ripe bg-ripe/5" : "border-line"
                }`}
              >
                <div>
                  <p className="font-display text-xl">{o.items.map((i) => i.crop).join(", ")}</p>
                  <p className="text-sm text-ink/65">
                   {o.mySide === "FARMER" ? "To" : "From"} {o.counterpart.name}, {o.mySide === "FARMER" ? (o.deliverTo ?? o.counterpart.town) : o.counterpart.town}
                  </p>
                </div>
                <p className="font-mono text-lg">
                  {kg(o.totalKg)}
                  <span className="block font-sans text-xs text-ink/55">started {formatDay(o.createdAt.slice(0, 10))}</span>
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <OrderBadge status={o.status} />
                  {needsMe(o) && <span className="text-sm font-medium">Needs your reply</span>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}