import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { StorageField } from "../components/StorageField";
import { useHarvest } from "../hooks/useHarvest";
import { api, describeError } from "../lib/api";
import { daysAgoInHarare, kg, todayInHarare } from "../lib/format";
import { field, labelCls, primary } from "../lib/styles";
import type { Crop, Harvest, Storage } from "../lib/types";

export default function EditHarvest() {
  const { id } = useParams();
  const { harvest, error: loadError } = useHarvest(id);

  return (
    <AppShell>
      <Link to={`/harvests/${id}`} className="text-sm underline underline-offset-4">← Back</Link>
      {loadError && <p role="alert" className="mt-6 text-ripe">{loadError}</p>}
      {!harvest && !loadError && <div aria-busy="true" className="mt-6 h-40 animate-pulse rounded-xl bg-line/40" />}
      {harvest && <EditForm harvest={harvest} />}
    </AppShell>
  );
}

function EditForm({ harvest: h }: { harvest: Harvest }) {
  const navigate = useNavigate();
  const [crops, setCrops] = useState<Crop[]>([]);
  const [quantity, setQuantity] = useState(String(h.quantityKg));
  const [date, setDate] = useState(h.harvestDate);
  const [storage, setStorage] = useState<Storage>(h.storage);
  const [price, setPrice] = useState(h.askingPricePerKg !== null ? String(h.askingPricePerKg) : "");
  const [currency, setCurrency] = useState<string>(h.currency);
  const [notes, setNotes] = useState(h.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Crop[]>("/api/reference/crops").then(setCrops).catch(() => undefined);
  }, []);

  const promised = h.reservedKg + h.soldKg;
  const shelfDays = crops.find((c) => c.id === h.crop.id)?.shelfLives.find((s) => s.storage === storage)?.days;
  const minDate = shelfDays ? daysAgoInHarare(shelfDays + 30) : undefined;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(`/api/harvests/${h.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          quantityKg: Number(quantity),
          harvestDate: date,
          storage,
          currency,
          askingPricePerKg: price === "" ? null : Number(price),
          notes: notes.trim() === "" ? null : notes.trim(),
        }),
      });
      navigate(`/harvests/${h.id}`);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="mt-4 mb-2 font-display text-4xl leading-[1.05] font-medium md:text-5xl">Edit {h.crop.name}</h1>
      <p className="mb-8 text-ink/70">To change the crop, withdraw this harvest and record a new one.</p>

      <form onSubmit={submit} className="max-w-md space-y-6">
        <div>
          <label className={labelCls} htmlFor="qty">How much? (kg)</label>
          <input id="qty" type="number" inputMode="decimal" step="0.01" min={Math.max(0.01, promised)}
            className={`${field} font-mono text-xl`} value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
          {promised > 0 && (
            <p className="mt-2 text-sm text-ink/70">{kg(promised)} is already promised to buyers, so this cannot go lower.</p>
          )}
        </div>

        <div>
          <label className={labelCls} htmlFor="date">Harvest date</label>
          <input id="date" type="date" min={minDate} max={todayInHarare()} className={field}
            value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>

        <StorageField
          value={storage}
          onChange={setStorage}
          hint={shelfDays ? (
            <p className="mt-3 text-sm text-ink/70">
              {h.crop.name} keeps about <strong>{shelfDays} days</strong> in this storage.
            </p>
          ) : null}
        />

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

        <button className={primary} disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
        <p role="alert" aria-live="polite" className="min-h-6 text-sm font-medium text-ripe">{error}</p>
      </form>
    </>
  );
}