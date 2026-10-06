import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().default(4000),
  CLIENT_ORIGIN: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SECRET_KEY: z.string().min(20),
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
DB_SSL_CA: z.string().optional(), // Supabase CA certificate text, required in production
});

export const env = schema.parse(process.env);