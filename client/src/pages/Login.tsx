import { useState, type FormEvent } from "react";
import {Link,  Navigate, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase.ts";
import { useAuth } from "../context/AuthContext";


type Mode = "farmer" | "buyer";

const field =
  "h-12 w-full rounded-[10px] border border-line bg-white/70 px-4 text-base outline-none " +
  "focus:border-field focus:ring-2 focus:ring-field/25";
const primary =
  "h-12 w-full rounded-[10px] bg-field font-medium text-paper transition " +
  "hover:bg-[#18301f] active:translate-y-px disabled:opacity-50 focus-visible:outline-2 " +
  "focus-visible:outline-offset-2 focus-visible:outline-ripe";

export default function Login() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("farmer");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [local, setLocal] = useState("");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!loading && session) return <Navigate to="/app" replace />;

  const phone = "+263" + local.replace(/\D/g, "").replace(/^0+/, "");

  async function run(fn: () => Promise<{ error: { message: string } | null }>, onOk: () => void) {
    setBusy(true);
    setError(null);
    const { error } = await fn();
    setBusy(false);
    if (error) setError(error.message);
    else onOk();
  }

  const sendCode = (e: FormEvent) => {
    e.preventDefault();
    run(() => supabase.auth.signInWithOtp({ phone }), () => setStep("code"));
  };
  const verifyCode = (e: FormEvent) => {
    e.preventDefault();
    run(() => supabase.auth.verifyOtp({ phone, token: code, type: "sms" }), () => navigate("/app"));
  };
  const buyerSignIn = (e: FormEvent) => {
    e.preventDefault();
    run(() => supabase.auth.signInWithPassword({ email, password }), () => navigate("/app"));
  };

  return (
    <main className="grid min-h-dvh md:grid-cols-[1.1fr_1fr]">
      <section className="flex flex-col justify-between bg-field px-7 py-8 text-paper md:px-12 md:py-12">
        <span className="font-display text-xl tracking-tight">PostHarvest</span>
        <div className="my-14 max-w-md md:my-0">
          <h1 className="font-display text-4xl leading-[1.05] font-medium md:text-6xl">
            Sell it before it softens.
          </h1>
          <p className="mt-5 text-lg text-paper/75">
            Record what you harvested. See what needs selling first. Find the buyer already asking for it.
          </p>
        </div>
        <p className="font-mono text-sm text-paper/55">800 kg tomatoes → 500 kg matched → 300 kg left</p>
      </section>

      <section className="flex items-center px-7 py-10 md:px-14">
        <div className="mx-auto w-full max-w-sm">
          <div role="tablist" aria-label="Account type" className="mb-8 grid grid-cols-2 rounded-xl border border-line p-1">
            {(["farmer", "buyer"] as const).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => { setMode(m); setError(null); setStep("phone"); }}
                className={`h-11 rounded-[9px] text-sm font-medium transition active:translate-y-px ${
                  mode === m ? "bg-ink text-paper" : "text-ink/65 hover:text-ink"
                }`}
              >
                {m === "farmer" ? "I grow" : "I buy"}
              </button>
            ))}
          </div>

          {mode === "farmer" && step === "phone" && (
            <form onSubmit={sendCode} className="space-y-4">
              <label className="block text-sm font-medium" htmlFor="phone">Mobile number</label>
              <div className="flex gap-2">
                <span className="flex h-12 items-center rounded-[10px] border border-line px-3 text-base">+263</span>
                <input id="phone" className={field} inputMode="tel" autoComplete="tel-national"
                  placeholder="77 123 4567" value={local} onChange={(e) => setLocal(e.target.value)} required />
              </div>
              <button className={primary} disabled={busy}>{busy ? "Sending…" : "Send me a code"}</button>
            </form>
          )}

          {mode === "farmer" && step === "code" && (
            <form onSubmit={verifyCode} className="space-y-4">
              <label className="block text-sm font-medium" htmlFor="code">6-digit code sent to {phone}</label>
              <input id="code" className={`${field} text-center font-mono text-2xl tracking-[0.4em]`}
                inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                value={code} onChange={(e) => setCode(e.target.value)} required />
              <button className={primary} disabled={busy || code.length < 6}>{busy ? "Checking…" : "Sign in"}</button>
              <button type="button" className="w-full text-sm underline underline-offset-4"
                onClick={() => { setStep("phone"); setCode(""); setError(null); }}>
                Wrong number? Go back
              </button>
            </form>
          )}

          {mode === "buyer" && (
            <form onSubmit={buyerSignIn} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium" htmlFor="email">Work email</label>
                <input id="email" type="email" className={field} autoComplete="email"
                  value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium" htmlFor="password">Password</label>
                <input id="password" type="password" className={field} autoComplete="current-password"
                  value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <button className={primary} disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
              <p className="text-center text-sm">
                New buyer? 
              <Link to="/register/buyer" className="underline underline-offset-4">Create an account</Link>
              </p>
            </form>
          )}

          <p role="alert" aria-live="polite" className="mt-4 min-h-6 text-sm font-medium text-ripe">{error}</p>
        </div>
      </section>
    </main>
  );
}