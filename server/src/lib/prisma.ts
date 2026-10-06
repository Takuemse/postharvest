import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";
import { env } from "../config/env";

// Prisma-only and driver-overriding URL options are removed; TLS is set explicitly.
const url = new URL(env.DATABASE_URL);
url.searchParams.delete("pgbouncer");
url.searchParams.delete("sslmode");

const ssl =
  env.NODE_ENV === "production"
    ? env.DB_SSL_CA
      ? { ca: env.DB_SSL_CA } // verify against Supabase's CA
      : true
    : { rejectUnauthorized: false }; // local development only

export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url.toString(), ssl }),
});