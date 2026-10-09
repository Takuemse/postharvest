import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationsContext";
import { needsMe, useOrders } from "../hooks/useOrders";

export function AppShell({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  const { orders } = useOrders();
  const { unread, toast, dismissToast, markRead } = useNotifications();
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
            <Link to="/notifications" className="underline underline-offset-4">
              Alerts{unread > 0 && <strong> · {unread} new</strong>}
            </Link>
            <button onClick={signOut} className="underline underline-offset-4">Sign out</button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-5 py-8 md:py-12">{children}</main>

      <div role="status" aria-live="polite">
        {toast && (
          <div className="fixed inset-x-5 bottom-24 z-20 rounded-xl border border-ink bg-paper p-4 md:inset-x-auto md:right-5 md:bottom-5 md:w-96">
            <p className="font-medium">{toast.title}</p>
            {toast.body && <p className="mt-1 text-sm text-ink/70">{toast.body}</p>}
            <div className="mt-3 flex gap-4 text-sm">
              {toast.orderId && (
                <Link to={`/orders/${toast.orderId}`} className="underline underline-offset-4"
                  onClick={() => { void markRead(toast.id); dismissToast(); }}>
                  View
                </Link>
              )}
              <button onClick={dismissToast} className="underline underline-offset-4">Dismiss</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}