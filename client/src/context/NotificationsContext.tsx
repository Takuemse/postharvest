import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import { supabase } from "../lib/supabase";
import type { AppNotification } from "../lib/types";
import { useAuth } from "./AuthContext";

type Ctx = {
  items: AppNotification[];
  unread: number;
  version: number; // bumps whenever something new arrives, so pages can refetch themselves
  toast: AppNotification | null;
  dismissToast: () => void;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
};

const NotificationsContext = createContext<Ctx | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [version, setVersion] = useState(0);
  const [toast, setToast] = useState<AppNotification | null>(null);
  const seen = useRef(new Set<string>());
  const loaded = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const data = await api<{ items: AppNotification[]; unread: number }>("/api/notifications");
      const fresh = data.items.filter((n) => !seen.current.has(n.id));
      data.items.forEach((n) => seen.current.add(n.id));
      setItems(data.items);
      setUnread(data.unread);
      if (loaded.current && fresh.length > 0) {
        setToast(fresh[0]);
        setVersion((v) => v + 1);
      }
      loaded.current = true;
    } catch {
      /* offline or a hiccup: keep what we have; the next refresh catches up */
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      setItems([]);
      setUnread(0);
      return;
    }
    seen.current = new Set();
    loaded.current = false;
    void refresh();

    // Realtime is only a nudge: any new row means "refetch from the API".
    const channel = supabase
      .channel("my-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => void refresh())
      .subscribe();
    const timer = setInterval(() => void refresh(), 45_000); // fallback for patchy connections
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);

    return () => {
      void supabase.removeChannel(channel);
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [userId, refresh]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 8000);
    return () => clearTimeout(t);
  }, [toast]);

  const markRead = useCallback(async (id: string) => {
    setItems((list) => list.map((n) => (n.id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n)));
    setUnread((u) => Math.max(0, u - 1));
    try {
      await api(`/api/notifications/${id}/read`, { method: "POST" });
    } catch {
      void refresh();
    }
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    setItems((list) => list.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })));
    setUnread(0);
    try {
      await api("/api/notifications/read-all", { method: "POST" });
    } catch {
      void refresh();
    }
  }, [refresh]);

  return (
    <NotificationsContext.Provider
      value={{ items, unread, version, toast, dismissToast: () => setToast(null), markRead, markAllRead }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationsProvider");
  return ctx;
}

// Pages add this to their data-loading effect so they refetch when something new arrives.
export function useLiveVersion() {
  return useContext(NotificationsContext)?.version ?? 0;
}