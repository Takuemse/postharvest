import { useCallback, useEffect, useState } from "react";
import { api, describeError } from "../lib/api";
import type { Demand } from "../lib/types";

export function useDemands() {
  const [demands, setDemands] = useState<Demand[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api<Demand[]>("/api/demands").then(setDemands).catch((e) => setError(describeError(e)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { demands, error, reload: load };
}

export function useDemand(id: string | undefined) {
  const [demand, setDemand] = useState<Demand | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api<Demand>(`/api/demands/${id}`).then(setDemand).catch((e) => setError(describeError(e)));
  }, [id]);

  return { demand, error };
}