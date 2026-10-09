import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { needsMe, useOrders } from "../hooks/useOrders";

export function AppShell({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  const { orders } = useOrders();
  const waiting = (orders ?? []).filter(needsMe).length;

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-5">
          <Link to="/app" className="font-display text-xl tracking-tight">PostHarvest</Link>
          <nav className="flex items-center gap-5 text-sm">
            <Link to="/orders" className="underline underline-offset-4">
              Orders{waiting > 0 && <strong> · {waiting} need you</strong>}
            </Link>
            <button onClick={signOut} className="underline underline-offset-4">Sign out</button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-5 py-8 md:py-12">{children}</main>
    </div>
  );
}