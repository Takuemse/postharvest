import { useCallback, useEffect, useState } from "react";
import { api, describeError } from "../lib/api";
import type { Harvest } from "../lib/types";

export function useHarvests() {
  const [harvests, setHarvests] = useState<Harvest[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api<Harvest[]>("/api/harvests").then(setHarvests).catch((e) => setError(describeError(e)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { harvests, error, reload: load };
}