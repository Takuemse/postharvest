import "dotenv/config";
import { Pool } from "pg";

const name = process.argv[2] ?? "DATABASE_URL";
const raw = process.env[name];
if (!raw) throw new Error(`${name} is missing from .env`);

const url = new URL(raw);
url.searchParams.delete("pgbouncer");

const pool = new Pool({
  connectionString: url.toString(),
  ssl: { rejectUnauthorized: false },
});

pool
  .query("select now() as server_time")
  .then((r) => console.log(name, "OK:", r.rows[0]))
  .catch((e) => console.error(name, "FAILED:", e.message))
  .finally(() => pool.end());