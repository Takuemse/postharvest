import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { api, describeError } from "../lib/api";
import {daysAgoInHarare, STORAGE_LABEL, todayInHarare } from "../lib/format";
import { field, labelCls, primary } from "../lib/styles";
import type { Crop, Storage } from "../lib/types";

const STORAGES: Storage[] = ["AMBIENT", "COOL", "REFRIGERATED"];

export default function AddHarvest() {
  const navigate = useNavigate();
  const [crops, setCrops] = useState<Crop[]>([]);
  const [cropId, setCropId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState(todayInHarare());
  const [storage, setStorage] = useState<Storage>("AMBIENT");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Crop[]>("/api/reference/crops").then(setCrops).catch((e) => setError(describeError(e)));
  }, []);

  const crop = crops.find((c) => String(c.id) === cropId);
  const shelfDays = crop?.shelfLives.find((s) => s.storage === storage)?.days;
  const minDate = shelfDays ? daysAgoInHarare(shelfDays + 30) : undefined;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/harvests", {
        method: "POST",
        body: JSON.stringify({
          cropId: Number(cropId),
          quantityKg: Number(quantity),
          harvestDate: date,
          storage,
          currency,
          ...(price ? { askingPricePerKg: Number(price) } : {}),
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
      <h1 className="mt-4 mb-8 font-display text-4xl leading-[1.05] font-medium md:text-5xl">What did you pick?</h1>

      <form onSubmit={submit} className="max-w-md space-y-6">
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
          <label className={labelCls} htmlFor="date">Harvest date</label>
          <input id="date" type="date" min={minDate} max={todayInHarare()} className={field}
              value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>

        <fieldset>
          <legend className={labelCls}>How is it stored?</legend>
          <div className="grid gap-2">
            {STORAGES.map((s) => (
              <label key={s} className="block cursor-pointer">
                <input type="radio" name="storage" className="peer sr-only" checked={storage === s} onChange={() => setStorage(s)} />
                <span className="block rounded-[10px] border border-line bg-white/60 px-4 py-3 peer-checked:border-field peer-checked:bg-field/5 peer-checked:font-medium peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ripe">
                  {STORAGE_LABEL[s]}
                </span>
              </label>
            ))}
          </div>
          {crop && shelfDays && (
            <p className="mt-3 text-sm text-ink/70">
              {crop.name} keeps about <strong>{shelfDays} days</strong> in this storage. This is an estimate to help you
              plan, not a food-safety guarantee.
            </p>
          )}
        </fieldset>

        <div>
          <label className={labelCls} htmlFor="price">Asking price per kg (optional)</label>
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

        <button className={primary} disabled={busy}>{busy ? "Saving…" : "Save harvest"}</button>
        <p role="alert" aria-live="polite" className="min-h-6 text-sm font-medium text-ripe">{error}</p>
      </form>
    </AppShell>
  );
}