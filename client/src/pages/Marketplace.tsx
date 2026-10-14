import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { useLocations } from "../hooks/useLocations";
import { api, describeError } from "../lib/api";
import { daysFromNowInHarare, formatDay, kg, STORAGE_LABEL, todayInHarare } from "../lib/format";
import { field, labelCls, primary } from "../lib/styles";
import type { Crop, SupplyPage } from "../lib/types";

type Filters = {
  cropId: string;
  province: string;
  locationId: string;
  minKg: string;
  availableBy: string;
  maxPrice: string;
  currency: string;
};

const EMPTY: Filters = { cropId: "", province: "", locationId: "", minKg: "", availableBy: "", maxPrice: "", currency: "USD" };

const prettyProvince = (p: string) =>
  p.toLowerCase().split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

function queryString(f: Filters, page: number) {
  const p = new URLSearchParams();
  if (f.cropId) p.set("cropId", f.cropId);
  if (f.locationId) p.set("locationId", f.locationId);
  else if (f.province) p.set("province", f.province);
  if (f.minKg) p.set("minKg", f.minKg);
  if (f.availableBy) p.set("availableBy", f.availableBy);
  if (f.maxPrice) {
    p.set("maxPrice", f.maxPrice);
    p.set("currency", f.currency);
  }
  p.set("page", String(page));
  return p.toString();
}

const secondary =
  "h-11 rounded-[10px] border border-line px-4 text-sm font-medium transition hover:bg-white/70 " +
  "active:translate-y-px disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ripe";

export default function Marketplace() {
  const { locations } = useLocations();
  const [crops, setCrops] = useState<Crop[]>([]);
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<SupplyPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const provinces = [...new Set(locations.map((l) => l.province))];
  const towns = locations.filter((l) => l.province === draft.province);

  useEffect(() => {
    api<Crop[]>("/api/reference/crops").then(setCrops).catch(() => undefined);
  }, []);

  useEffect(() => {
    let stale = false;
    setLoading(true);
    setError(null);
    api<SupplyPage>(`/api/marketplace?${queryString(applied, page)}`)
      .then((d) => { if (!stale) setData(d); })
      .catch((e) => { if (!stale) setError(describeError(e)); })
      .finally(() => { if (!stale) setLoading(false); });
    return () => { stale = true; };
  }, [applied, page]);

  function search(e: FormEvent) {
    e.preventDefault();
    setPage(1);
    setApplied(draft);
  }

  function clear() {
    setDraft(EMPTY);
    setPage(1);
    setApplied(EMPTY);
  }

  const from = data && data.total > 0 ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = data ? Math.min(data.total, data.page * data.pageSize) : 0;
  const changed = JSON.stringify(draft) !== JSON.stringify(applied);

  return (
    <AppShell>
      <Link to="/app" className="text-sm underline underline-offset-4">← Back</Link>
      <h1 className="mt-4 font-display text-4xl leading-[1.05] font-medium md:text-5xl">What is available now.</h1>
      <p className="mt-3 max-w-xl text-ink/70">
        Produce farmers have recorded. Found what you need? Post a request and the matching takes it from there.
      </p>

      <form onSubmit={search} className="mt-8 grid max-w-2xl gap-5 md:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="m-crop">Crop</label>
          <select id="m-crop" className={field} value={draft.cropId} onChange={(e) => setDraft({ ...draft, cropId: e.target.value })}>
            <option value="">Any crop</option>
            {crops.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className={labelCls} htmlFor="m-min">At least (kg)</label>
          <input id="m-min" type="number" inputMode="decimal" min="0.01" step="0.01" className={`${field} font-mono`}
            value={draft.minKg} onChange={(e) => setDraft({ ...draft, minKg: e.target.value })} />
        </div>

        <div>
        <label className={labelCls} htmlFor="m-prov">Farm province</label>
          <select id="m-prov" className={field} value={draft.province}
            onChange={(e) => setDraft({ ...draft, province: e.target.value, locationId: "" })}>
            <option value="">Anywhere</option>
            {provinces.map((p) => <option key={p} value={p}>{prettyProvince(p)}</option>)}
          </select>
        </div>

        <div>
        <label className={labelCls} htmlFor="m-town">Farm town</label>
          <select id="m-town" className={field} value={draft.locationId} disabled={!draft.province}
            onChange={(e) => setDraft({ ...draft, locationId: e.target.value })}>
            <option value="">{draft.province ? "Whole province" : "Choose a province first"}</option>
            {towns.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <div>
          <label className={labelCls} htmlFor="m-by">Available by</label>
          <input id="m-by" type="date" min={todayInHarare()} max={daysFromNowInHarare(90)} className={field}
            value={draft.availableBy} onChange={(e) => setDraft({ ...draft, availableBy: e.target.value })} />
        </div>

        <div>
          <label className={labelCls} htmlFor="m-price">Highest price per kg</label>
          <div className="flex gap-2">
            <select aria-label="Currency" className={`${field} w-24`} value={draft.currency}
              onChange={(e) => setDraft({ ...draft, currency: e.target.value })}>
              <option value="USD">USD</option>
              <option value="ZWG">ZWG</option>
            </select>
            <input id="m-price" type="number" inputMode="decimal" min="0" step="0.01" className={field}
              value={draft.maxPrice} onChange={(e) => setDraft({ ...draft, maxPrice: e.target.value })} />
          </div>
        </div>

        <div className="flex gap-3 md:col-span-2">
          <button className={`${primary} md:w-48`} disabled={loading}>Show produce</button>
          <button type="button" onClick={clear} className={secondary}>Clear</button>
        </div>
                {changed && (
          <p role="status" className="text-sm text-ink/70 md:col-span-2">
            Filters changed. Press “Show produce” to update the list.
          </p>
        )}
      </form>

      <section className="mt-10" aria-busy={loading}>
        {error && (
          <p role="alert" className="text-ripe">
            {error}{" "}
            <button onClick={() => setApplied({ ...applied })} className="underline underline-offset-4">Try again</button>
          </p>
        )}

        {!data && !error && (
          <div className="space-y-3">
            <div className="h-20 animate-pulse rounded-xl bg-line/50" />
            <div className="h-20 animate-pulse rounded-xl bg-line/40" />
          </div>
        )}

        {data && (
          <>
            <p className="mb-3 text-sm text-ink/65">
              {data.total === 0 ? "Nothing matches." : `Showing ${from}–${to} of ${data.total}.`}
            </p>

            {data.total === 0 && (
              <p className="max-w-md text-lg text-ink/70">
                No produce matches these filters right now. Try fewer filters, or post a request and farmers will be told when one fits.
              </p>
            )}

            {data.items.length > 0 && (
              <ul className={`divide-y divide-line overflow-hidden rounded-xl border border-line bg-white/50 ${loading ? "opacity-60" : ""}`}>
                {data.items.map((s) => (
                  <li key={s.harvestId} className="grid gap-3 px-5 py-4 md:grid-cols-[1.3fr_1fr_auto] md:items-center">
                    <div>
                      <p className="font-display text-xl">{s.crop.name}</p>
                      <p className="text-sm text-ink/65">{s.farm.name}, {s.farm.town}</p>
                    </div>
                    <div>
                      <p className="font-mono text-lg">{kg(s.availableKg)}</p>
                      <p className="text-sm text-ink/65">
                        Harvested {formatDay(s.harvestDate)} · {STORAGE_LABEL[s.storage]} ·{" "}
                        {s.asking ? `${s.asking.pricePerKg} ${s.asking.currency} per kg` : "Price to be agreed"}
                      </p>
                    </div>
                    <Link
                      to={`/demands/new?cropId=${s.crop.id}&quantityKg=${s.availableKg}`}
                      className="inline-flex h-11 items-center justify-center rounded-[10px] border border-field px-4 text-sm font-medium text-field transition hover:bg-field hover:text-paper active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ripe"
                    >
                      Post a request for this
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {data.total > data.pageSize && (
              <div className="mt-5 flex gap-3">
                <button className={secondary} disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>Previous</button>
                <button className={secondary} disabled={!data.hasMore || loading} onClick={() => setPage((p) => p + 1)}>Next</button>
              </div>
            )}
          </>
        )}
      </section>
    </AppShell>
  );
}