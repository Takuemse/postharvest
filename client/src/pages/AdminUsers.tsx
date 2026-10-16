import { useEffect, useState, type FormEvent } from "react";
import { Check, Pause } from "lucide-react";
import { AdminShell } from "../components/AdminShell";
import { api, describeError } from "../lib/api";
import { field, labelCls, primary } from "../lib/styles";
import type { AdminUser, AdminUsersPage } from "../lib/types";

type Filters = { q: string; role: string; status: string };
const EMPTY: Filters = { q: "", role: "", status: "" };
const ROLE: Record<AdminUser["role"], string> = { FARMER: "Farmer", BUYER: "Buyer", ADMIN: "Admin" };

const date = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

function queryString(f: Filters, page: number) {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set("q", f.q.trim());
  if (f.role) p.set("role", f.role);
  if (f.status) p.set("status", f.status);
  p.set("page", String(page));
  return p.toString();
}

const secondary =
  "h-11 rounded-[10px] border border-line px-4 text-sm font-medium transition hover:bg-white/70 " +
  "active:translate-y-px disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ripe";

export default function AdminUsers() {
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);
  const [data, setData] = useState<AdminUsersPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [acting, setActing] = useState<{ user: AdminUser; mode: "suspend" | "reactivate" } | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let stale = false;
    setLoading(true);
    setError(null);
    api<AdminUsersPage>(`/api/admin/users?${queryString(applied, page)}`)
      .then((d) => { if (!stale) setData(d); })
      .catch((e) => { if (!stale) setError(describeError(e)); })
      .finally(() => { if (!stale) setLoading(false); });
    return () => { stale = true; };
  }, [applied, page, tick]);

  function search(e: FormEvent) {
    e.preventDefault();
    setPage(1);
    setApplied(draft);
  }

  function clear() {
    setDraft(EMPTY);
    setPage(1);
    setApplied(EMPTY);
  }

  function open(user: AdminUser, mode: "suspend" | "reactivate") {
    setActing({ user, mode });
    setReason("");
    setActionError(null);
    setNotice(null);
  }

  async function confirm(e: FormEvent) {
    e.preventDefault();
    if (!acting) return;
    setBusy(true);
    setActionError(null);
    try {
      const r = await api<{ signInSynced: boolean }>(`/api/admin/users/${acting.user.id}/${acting.mode}`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      const name = acting.user.fullName;
      const base = acting.mode === "suspend" ? `${name} is suspended.` : `${name} is active again.`;
      setNotice(
        r.signInSynced
          ? base
          : `${base} The sign-in block at Supabase could not be updated. Check the server log.`,
      );
      setActing(null);
      setReason("");
      setTick((t) => t + 1);
    } catch (err) {
      setActionError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  const changed = JSON.stringify(draft) !== JSON.stringify(applied);
  const from = data && data.total > 0 ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = data ? Math.min(data.total, data.page * data.pageSize) : 0;

  return (
    <AdminShell>
      <h1 className="font-display text-4xl leading-[1.05] font-medium md:text-5xl">Everyone on the platform.</h1>

      <form onSubmit={search} className="mt-8 grid max-w-3xl gap-5 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <label className={labelCls} htmlFor="u-q">Name, phone or email</label>
          <input id="u-q" className={field} value={draft.q} onChange={(e) => setDraft({ ...draft, q: e.target.value })} />
        </div>
        <div>
          <label className={labelCls} htmlFor="u-role">Role</label>
          <select id="u-role" className={field} value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })}>
            <option value="">Everyone</option>
            <option value="FARMER">Farmers</option>
            <option value="BUYER">Buyers</option>
            <option value="ADMIN">Admins</option>
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="u-status">Status</label>
          <select id="u-status" className={field} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
        <div className="flex gap-3 md:col-span-3">
          <button className={`${primary} md:w-48`} disabled={loading}>Search</button>
          <button type="button" onClick={clear} className={secondary}>Clear</button>
        </div>
         {changed && (
          <p role="status" className="text-sm text-ink/70 md:col-span-3">
            Filters changed. Press “Search” to update the list.
          </p>
        )}
      </form>

      {notice && <p role="status" className="mt-6 font-medium text-field">{notice}</p>}

      <section className="mt-8" aria-busy={loading}>
        {error && <p role="alert" className="text-ripe">{error}</p>}
        {!data && !error && <div className="h-24 animate-pulse rounded-xl bg-line/40" />}

        {data && (
          <>
            <p className="mb-3 text-sm text-ink/65">
              {data.total === 0 ? "No one matches." : `Showing ${from}–${to} of ${data.total}.`}
            </p>

            {data.items.length > 0 && (
              <ul className={`divide-y divide-line overflow-hidden rounded-xl border border-line bg-white/50 ${loading ? "opacity-60" : ""}`}>
                {data.items.map((u) => (
                  <li key={u.id} className="px-5 py-4">
                    <div className="grid gap-3 md:grid-cols-[1.3fr_1.3fr_1fr_auto] md:items-center">
                      <div>
                        <p className="font-display text-xl">{u.fullName}</p>
                        <p className="text-sm text-ink/65">
                          {ROLE[u.role]}{u.place ? ` · ${u.place.name}, ${u.place.town}` : ""}
                        </p>
                      </div>
                      <div className="text-sm break-all">
                        <p>{u.phone ?? "No phone"}</p>
                        <p className="text-ink/65">{u.email ?? "No email"}</p>
                      </div>
                      <div className="text-sm">
                        <p className="inline-flex items-center gap-1.5 font-medium">
                          {u.isActive ? <Check size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}
                          {u.isActive ? "Active" : "Suspended"}
                        </p>
                        <p className="text-ink/60">Joined {date(u.createdAt)}</p>
                      </div>
                      <div>
                        {u.role !== "ADMIN" && (
                          <button
                            onClick={() => open(u, u.isActive ? "suspend" : "reactivate")}
                            className={secondary}
                          >
                            {u.isActive ? "Suspend" : "Reactivate"}
                          </button>
                        )}
                      </div>
                    </div>

                    {!u.isActive && u.suspension && (
                      <p className="mt-2 text-sm text-ink/70">
                        Suspended {date(u.suspension.at)}: {u.suspension.reason}
                      </p>
                    )}

                    {acting?.user.id === u.id && (
                      <form onSubmit={confirm} className="mt-4 max-w-md border-t border-line pt-4">
                        <label className={labelCls} htmlFor="u-reason">
                          Why are you {acting.mode === "suspend" ? "suspending" : "reactivating"} this account?
                          <span className="font-normal text-ink/60"> The admin team can read this.</span>
                        </label>
                        <textarea id="u-reason" rows={2} maxLength={500} required minLength={3}
                          className={`${field} h-auto py-3`} value={reason} onChange={(e) => setReason(e.target.value)} />
                        <div className="mt-3 flex gap-3">
                          <button className={`${primary} md:w-56`} disabled={busy}>
                            {busy ? "Saving…" : acting.mode === "suspend" ? "Confirm suspension" : "Confirm reactivation"}
                          </button>
                          <button type="button" className={secondary} onClick={() => setActing(null)}>Cancel</button>
                        </div>
                        <p role="alert" aria-live="polite" className="mt-2 min-h-5 text-sm font-medium text-ripe">{actionError}</p>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {data.total > data.pageSize && (
              <div className="mt-5 flex gap-3">
                <button className={secondary} disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>Previous</button>
                <button className={secondary} disabled={!data.hasMore || loading} onClick={() => setPage((p) => p + 1)}>Next</button>
              </div>
            )}
          </>
        )}
      </section>
    </AdminShell>
  );
}