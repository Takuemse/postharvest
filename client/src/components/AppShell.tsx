import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function AppShell({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  return (
    <div className="min-h-dvh">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-5">
          <Link to="/app" className="font-display text-xl tracking-tight">PostHarvest</Link>
          <button onClick={signOut} className="text-sm underline underline-offset-4">Sign out</button>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-5 py-8 md:py-12">{children}</main>
    </div>
  );
}