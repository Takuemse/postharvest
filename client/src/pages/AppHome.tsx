import { useEffect, useState } from "react";
import { api } from "../lib/api.ts";

import { useAuth } from "../context/AuthContext";

export default function AppHome() {
  const { signOut } = useAuth();
  const [me, setMe] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api("/api/auth/me").then(setMe).catch((e: Error) => setError(e.message));
   
  }, []);

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="font-display text-3xl">Signed in</h1>
      <pre className="mt-6 overflow-x-auto rounded-xl border border-line bg-white/60 p-4 text-sm">
        {error ?? JSON.stringify(me, null, 2)}
      </pre>
      <button onClick={signOut} className="mt-6 text-sm underline underline-offset-4">Sign out</button>
    </main>
  );
}