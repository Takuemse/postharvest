import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthShell } from "../components/AuthShell";
import { LocationSelect } from "../components/LocationSelect";
import { useLocations } from "../hooks/useLocations";
import { api, describeError } from "../lib/api";
import { supabase } from "../lib/supabase";
import { field, labelCls, primary } from "../lib/styles";

const TYPES = [
  ["RESTAURANT", "Restaurant or caterer"],
  ["RETAILER", "Shop or grocer"],
  ["WHOLESALER", "Wholesaler"],
  ["MARKET_VENDOR", "Market vendor"],
  ["PROCESSOR", "Food processor"],
  ["OTHER", "Other"],
] as const;

export default function BuyerRegister() {
  const navigate = useNavigate();
  const { locations, error: locError } = useLocations();
  const [f, setF] = useState({
    fullName: "", email: "", password: "", phone: "",
    businessName: "", type: "RESTAURANT", locationId: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/register-buyer", {
        method: "POST",
        body: JSON.stringify({
          email: f.email,
          password: f.password,
          fullName: f.fullName,
          phone: f.phone || undefined,
          business: { name: f.businessName, type: f.type, locationId: Number(f.locationId) },
        }),
      });
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: f.email,
        password: f.password,
      });
      if (signInError) throw signInError;
      navigate("/app");
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Tell us what you need."
      blurb="Post your demand once. Farmers with matching produce come to you."
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className={labelCls} htmlFor="fullName">Your name</label>
          <input id="fullName" className={field} autoComplete="name" value={f.fullName}
            onChange={(e) => set("fullName")(e.target.value)} required />
        </div>
        <div>
          <label className={labelCls} htmlFor="email">Work email</label>
          <input id="email" type="email" className={field} autoComplete="email" value={f.email}
            onChange={(e) => set("email")(e.target.value)} required />
        </div>
        <div>
          <label className={labelCls} htmlFor="password">Password (8+ characters)</label>
          <input id="password" type="password" className={field} autoComplete="new-password" minLength={8}
            value={f.password} onChange={(e) => set("password")(e.target.value)} required />
        </div>
        <div>
          <label className={labelCls} htmlFor="phone">Phone (optional)</label>
          <input id="phone" className={field} inputMode="tel" autoComplete="tel" placeholder="+263 77 123 4567"
            value={f.phone} onChange={(e) => set("phone")(e.target.value)} />
        </div>
        <div>
          <label className={labelCls} htmlFor="businessName">Business name</label>
          <input id="businessName" className={field} value={f.businessName}
            onChange={(e) => set("businessName")(e.target.value)} required />
        </div>
        <div>
          <label className={labelCls} htmlFor="type">What kind of business?</label>
          <select id="type" className={field} value={f.type} onChange={(e) => set("type")(e.target.value)}>
            {TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="location">Where are you based?</label>
          <LocationSelect id="location" value={f.locationId} onChange={set("locationId")} locations={locations} />
        </div>
        <button className={primary} disabled={busy}>{busy ? "Creating account…" : "Create buyer account"}</button>
        <p role="alert" aria-live="polite" className="min-h-6 text-sm font-medium text-ripe">{error ?? locError}</p>
        <p className="text-center text-sm">
          Already have an account? <Link to="/login" className="underline underline-offset-4">Sign in</Link>
        </p>
      </form>
    </AuthShell>
  );
}