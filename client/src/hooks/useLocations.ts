import { useEffect, useState } from "react";
import { api } from "../lib/api";

export type Location = { id: number; province: string; name: string };

export function useLocations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Location[]>("/api/reference/locations").then(setLocations).catch((e: Error) => setError(e.message));
  }, []);

  return { locations, error };
}