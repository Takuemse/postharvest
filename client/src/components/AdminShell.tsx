import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const nav = ({ isActive }: { isActive: boolean }) =>
  `underline underline-offset-4 ${isActive ? "font-semibold" : ""}`;

export function AdminShell({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  return (
    <div className="min-h-dvh">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
          <Link to="/app" className="font-display text-xl tracking-tight">
            PostHarvest <span className="font-sans text-sm text-ink/60">Admin</span>
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <NavLink to="/app" end className={nav}>Overview</NavLink>
            <NavLink to="/admin/users" className={nav}>Users</NavLink>
            <button onClick={signOut} className="underline underline-offset-4">Sign out</button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-8 md:py-12">{children}</main>
    </div>
  );
}