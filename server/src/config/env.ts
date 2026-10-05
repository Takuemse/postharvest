import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().default(4000),
  CLIENT_ORIGIN: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SECRET_KEY: z.string().min(20),
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),
});

export const env = schema.parse(process.env);