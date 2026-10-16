import { useEffect, useState } from "react";
import { AdminShell } from "../components/AdminShell";
import { api, describeError } from "../lib/api";
import { kg } from "../lib/format";
import type { AdminOverview as Overview, OrderStatus } from "../lib/types";

const STATUS_LABEL: Record<OrderStatus, string> = {
  REQUESTED: "Waiting for a reply",
  CONFIRMED: "Confirmed",
  READY: "Ready",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

function Stat({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="border-t border-line pt-3">
      <dt className="text-sm text-ink/65">{label}</dt>
      <dd className="mt-1 font-mono text-3xl">{value}</dd>
      {note && <p className="mt-1 text-xs text-ink/55">{note}</p>}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl">{title}</h2>
      <dl className="mt-4 grid gap-x-8 gap-y-5 sm:grid-cols-3">{children}</dl>
    </section>
  );
}

export default function AdminOverview() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    api<Overview>("/api/admin/overview").then(setData).catch((e) => setError(describeError(e)));
  }, [tick]);

  return (
    <AdminShell>
      <h1 className="font-display text-4xl leading-[1.05] font-medium md:text-5xl">The platform, right now.</h1>
      <button onClick={() => setTick((t) => t + 1)} className="mt-3 text-sm underline underline-offset-4">Refresh</button>

      {error && <p role="alert" className="mt-6 text-ripe">{error}</p>}
      {!data && !error && <div aria-busy="true" className="mt-8 h-40 animate-pulse rounded-xl bg-line/40" />}

      {data && (
        <>
          <Group title="People">
            <Stat label="Farmers" value={data.people.farmers} />
            <Stat label="Buyers" value={data.people.buyers} />
            <Stat label="Suspended accounts" value={data.people.suspended} />
          </Group>

          <Group title="Supply and demand">
            <Stat label="Harvests with stock" value={data.supply.harvestsWithStock} />
            <Stat label="Produce available" value={kg(data.supply.availableKg)} note="Not reserved or sold" />
            <Stat label="Open requests" value={data.demand.openRequests} />
            <Stat label="Produce still wanted" value={kg(data.demand.neededKg)} note="Open requests that are not overdue" />
          </Group>

          <section className="mt-10">
            <h2 className="font-display text-2xl">Orders</h2>
            <table className="mt-4 w-full max-w-xl text-left text-sm">
              <thead>
                <tr className="border-b border-line text-ink/65">
                  <th className="py-2 font-medium">Status</th>
                  <th className="py-2 font-medium">Orders</th>
                  <th className="py-2 font-medium">Produce</th>
                </tr>
              </thead>
              <tbody>
                {data.orders.map((o) => (
                  <tr key={o.status} className="border-b border-line/60">
                    <td className="py-2.5">{STATUS_LABEL[o.status]}</td>
                    <td className="py-2.5 font-mono">{o.orders}</td>
                    <td className="py-2.5 font-mono">{kg(o.kg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </AdminShell>
  );
}