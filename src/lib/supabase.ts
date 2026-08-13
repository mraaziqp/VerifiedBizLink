import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase clients, created on first use rather than at import time.
 *
 * `createClient('', '')` throws "supabaseUrl is required" immediately, so
 * building this module at import time made the whole production build depend
 * on runtime secrets: Next.js imports every route module while collecting
 * page data, and a single missing variable failed the build with an opaque
 * "Failed to collect page data" instead of a useful message. Building the
 * app and configuring it are separate concerns — a build should succeed on a
 * fresh clone or a CI runner with no secrets, and a genuinely missing
 * variable should announce itself clearly on the first request that needs it.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Add it to .env.local for local development, or to ` +
        `the environment variables of your deployment (Vercel / Amplify).`,
    );
  }
  return value;
}

let anonClient: SupabaseClient | null = null;

/** Browser-safe client, limited by row-level security. */
export function getSupabase(): SupabaseClient {
  if (!anonClient) {
    anonClient = createClient(
      required('NEXT_PUBLIC_SUPABASE_URL'),
      required('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    );
  }
  return anonClient;
}

let adminClient: SupabaseClient | null = null;

/**
 * Service-role client — bypasses row-level security entirely, so it must
 * only ever be used in server-side code (route handlers, never a component).
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!adminClient) {
    adminClient = createClient(
      required('NEXT_PUBLIC_SUPABASE_URL'),
      required('SUPABASE_SERVICE_ROLE_KEY'),
    );
  }
  return adminClient;
}

/**
 * Back-compatible default export. Existing callers do `supabase.from(...)`,
 * and this proxy keeps that working while deferring construction to the
 * first property access.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getSupabase();
    const value = Reflect.get(client as object, prop, receiver);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
