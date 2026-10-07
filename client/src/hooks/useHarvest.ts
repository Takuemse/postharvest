import { useEffect, useState } from "react";
import { api, describeError } from "../lib/api";
import type { Harvest } from "../lib/types";

export function useHarvest(id: string | undefined) {
  const [harvest, setHarvest] = useState<Harvest | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api<Harvest>(`/api/harvests/${id}`).then(setHarvest).catch((e) => setError(describeError(e)));
  }, [id]);

  return { harvest, error };
}