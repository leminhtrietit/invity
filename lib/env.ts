import { z } from "zod";
import { assertEnvironmentIsolation } from "@/lib/environment-isolation";

const publicEnvSchema = z.object({
  APP_ENV: z.enum(["local", "staging", "production"]).default("local"),
  NEXT_PUBLIC_SITE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  PRODUCTION_SUPABASE_PROJECT_REF: z.string().min(1).optional(),
  VERCEL_ENV: z.enum(["development", "preview", "production"]).optional(),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

let cachedEnv: PublicEnv | undefined;

export function getPublicEnv(): PublicEnv {
  cachedEnv ??= publicEnvSchema.parse({
    APP_ENV: process.env.APP_ENV,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    PRODUCTION_SUPABASE_PROJECT_REF: process.env.PRODUCTION_SUPABASE_PROJECT_REF,
    VERCEL_ENV: process.env.VERCEL_ENV,
  });

  assertEnvironmentIsolation({
    vercelEnvironment: cachedEnv.VERCEL_ENV,
    supabaseUrl: cachedEnv.NEXT_PUBLIC_SUPABASE_URL,
    productionProjectRef: cachedEnv.PRODUCTION_SUPABASE_PROJECT_REF,
  });
  return cachedEnv;
}
