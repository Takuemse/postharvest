import { supabase } from "./supabase";

const API = import.meta.env.VITE_API_URL;

export class ApiError extends Error {
  constructor(message: string, public status: number, public issues?: Record<string, string[]>) {
    super(message);
  }
}

export function describeError(e: unknown): string {
  if (e instanceof ApiError && e.issues) {
    const lines = Object.values(e.issues).flat();
    if (lines.length) return lines.join(" ");
  }
  return e instanceof Error ? e.message : "Something went wrong. Please try again.";
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(body?.message ?? "Something went wrong. Please try again.", res.status, body?.issues);
  }
  return body.data as T;
}