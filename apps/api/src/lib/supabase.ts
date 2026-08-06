import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from './config.js';

let admin: SupabaseClient | null = null;

/** Service-role client — server only. Used to verify JWTs and upsert profiles. */
export function getSupabaseAdmin(): SupabaseClient {
  if (admin) return admin;
  if (!config.supabaseUrl || !config.supabaseServiceKey) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_KEY are required for authentication',
    );
  }
  admin = createClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return admin;
}
