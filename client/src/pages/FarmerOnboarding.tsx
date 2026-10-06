import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthShell } from "../components/AuthShell";
import { LocationSelect } from "../components/LocationSelect";
import { useAuth } from "../context/AuthContext";
import { useLocations } from "../hooks/useLocations";
import { api, describeError } from "../lib/api";
import { supabase } from "../lib/supabase";
import { field, labelCls, primary } from "../lib/styles";

export default function FarmerOnboarding() {
  const { session, role, loading } = useAuth();
  const navigate = useNavigate();
  const { locations, error: locError } = useLocations();
  const [fullName, setFullName] = useState("");
  const [farmName, setFarmName] = useState("");
  const [locationId, setLocationId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!loading && !session) return <Navigate to="/login" replace />;
  if (!loading && role) return <Navigate to="/app" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/complete-farmer", {
        method: "POST",
        body: JSON.stringify({ fullName, farm: { name: farmName, locationId: Number(locationId) } }),
      });
      await supabase.auth.refreshSession(); // pick up the new FARMER role
      navigate("/app");
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Tell us where you grow."
      blurb="Your farm's location decides which buyers see your produce first."
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className={labelCls} htmlFor="fullName">Your name</label>
          <input id="fullName" className={field} autoComplete="name" value={fullName}
            onChange={(e) => setFullName(e.target.value)} required />
        </div>
        <div>
          <label className={labelCls} htmlFor="farmName">Farm name</label>
          <input id="farmName" className={field} value={farmName}
            onChange={(e) => setFarmName(e.target.value)} required />
        </div>
        <div>
          <label className={labelCls} htmlFor="location">Where is the farm?</label>
          <LocationSelect id="location" value={locationId} onChange={setLocationId} locations={locations} />
        </div>
        <button className={primary} disabled={busy}>{busy ? "Saving…" : "Start recording harvests"}</button>
        <p role="alert" aria-live="polite" className="min-h-6 text-sm font-medium text-ripe">{error ?? locError}</p>
      </form>
    </AuthShell>
  );
}