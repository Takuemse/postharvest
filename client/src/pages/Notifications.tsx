import { Link } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { useNotifications } from "../context/NotificationsContext";
import { formatWhen } from "../lib/format";

export default function Notifications() {
  const { items, unread, markRead, markAllRead } = useNotifications();

  return (
    <AppShell>
      <h1 className="font-display text-4xl leading-[1.05] font-medium md:text-6xl">Alerts</h1>
      {unread > 0 && (
        <button onClick={() => void markAllRead()} className="mt-4 text-sm underline underline-offset-4">
          Mark all as read
        </button>
      )}

      {items.length === 0 ? (
        <p className="mt-6 max-w-md text-lg text-ink/70">Nothing yet. Order updates will appear here as they happen.</p>
      ) : (
        <ul className="mt-8 divide-y divide-line overflow-hidden rounded-xl border border-line bg-white/50">
          {items.map((n) => (
            <li key={n.id}>
              <Link
                to={n.orderId ? `/orders/${n.orderId}` : "/app"}
                onClick={() => void markRead(n.id)}
                className={`block border-l-4 px-5 py-4 transition hover:bg-white/70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ripe ${
                  n.readAt ? "border-line" : "border-field bg-field/5"
                }`}
              >
                <p className={n.readAt ? "" : "font-medium"}>
                  {!n.readAt && <span className="mr-2 text-xs font-medium text-field">New</span>}
                  {n.title}
                </p>
                {n.body && <p className="mt-1 text-sm text-ink/70">{n.body}</p>}
                <p className="mt-1 text-xs text-ink/55">{formatWhen(n.createdAt)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}