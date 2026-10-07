import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { LocationSelect } from "../components/LocationSelect";
import { useLocations } from "../hooks/useLocations";
import { api, describeError } from "../lib/api";
import { daysFromNowInHarare, todayInHarare } from "../lib/format";
import { field, labelCls, primary } from "../lib/styles";
import type { Business, Crop } from "../lib/types";

export default function AddDemand() {
  const navigate = useNavigate();
  const { locations } = useLocations();
  const [crops, setCrops] = useState<Crop[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [cropId, setCropId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [neededBy, setNeededBy] = useState(daysFromNowInHarare(3));
  const [locationId, setLocationId] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Crop[]>("/api/reference/crops").then(setCrops).catch((e) => setError(describeError(e)));
    api<Business[]>("/api/businesses")
      .then((list) => {
        setBusinesses(list);
        if (list[0]) setLocationId((cur) => cur || String(list[0].location.id)); // default to the business location
      })
      .catch(() => undefined);
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/demands", {
        method: "POST",
        body: JSON.stringify({
          cropId: Number(cropId),
          quantityKg: Number(quantity),
          neededBy,
          locationId: Number(locationId),
          currency,
          ...(price ? { maxPricePerKg: Number(price) } : {}),
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        }),
      });
      navigate("/app");
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <Link to="/app" className="text-sm underline underline-offset-4">← Back</Link>
      <h1 className="mt-4 mb-2 font-display text-4xl leading-[1.05] font-medium md:text-5xl">What do you need?</h1>
      {businesses.length > 1 && (
        <p className="mb-6 text-ink/70">This request will go to your first business: {businesses[0].name}.</p>
      )}

      <form onSubmit={submit} className="mt-8 max-w-md space-y-6">
        <div>
          <label className={labelCls} htmlFor="crop">Crop</label>
          <select id="crop" className={field} value={cropId} onChange={(e) => setCropId(e.target.value)} required>
            <option value="" disabled>Choose a crop</option>
            {crops.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className={labelCls} htmlFor="qty">How much? (kg)</label>
          <input id="qty" type="number" inputMode="decimal" min="0.01" step="0.01" className={`${field} font-mono text-xl`}
            value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
        </div>

        <div>
          <label className={labelCls} htmlFor="needed">Needed by</label>
          <input id="needed" type="date" min={todayInHarare()} max={daysFromNowInHarare(90)} className={field}
            value={neededBy} onChange={(e) => setNeededBy(e.target.value)} required />
        </div>

        <div>
          <label className={labelCls} htmlFor="location">Deliver or collect in</label>
          <LocationSelect id="location" value={locationId} onChange={setLocationId} locations={locations} />
        </div>

        <div>
          <label className={labelCls} htmlFor="price">Highest price per kg (optional)</label>
          <div className="flex gap-2">
            <select aria-label="Currency" className={`${field} w-24`} value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="USD">USD</option>
              <option value="ZWG">ZWG</option>
            </select>
            <input id="price" type="number" inputMode="decimal" min="0" step="0.01" className={field}
              value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
        </div>

        <div>
          <label className={labelCls} htmlFor="notes">Notes (optional)</label>
          <textarea id="notes" rows={2} maxLength={500} className={`${field} h-auto py-3`}
            value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <button className={primary} disabled={busy}>{busy ? "Saving…" : "Post request"}</button>
        <p role="alert" aria-live="polite" className="min-h-6 text-sm font-medium text-ripe">{error}</p>
      </form>
    </AppShell>
  );
}