import { useCallback, useEffect, useState } from "react";
import { api, describeError } from "../lib/api";
import type { Order } from "../lib/types";

export const needsMe = (o: Order) => o.actions.some((a) => a === "confirm" || a === "ready" || a === "complete");

export function useOrders() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<Order[]>("/api/orders").then(setOrders).catch((e) => setError(describeError(e)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { orders, error, reload: load };
}

export function useOrder(id: string | undefined) {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api<Order>(`/api/orders/${id}`).then(setOrder).catch((e) => setError(describeError(e)));
  }, [id]);

  return { order, setOrder, error };
}