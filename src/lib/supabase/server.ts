import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}

export function isSupabaseAdminConfigured(): boolean {
  return Boolean(url && serviceRoleKey);
}

let anonClient: SupabaseClient | null | undefined;
let adminClient: SupabaseClient | null | undefined;

/** Public-data client (catalog reads only — RLS allows SELECT, nothing else). */
export function getSupabaseAnon(): SupabaseClient | null {
  if (anonClient !== undefined) return anonClient;
  anonClient = isSupabaseConfigured()
    ? createClient(url!, anonKey!, { auth: { persistSession: false } })
    : null;
  return anonClient;
}

/** Service-role client — bypasses RLS. Server-only: orders + admin writes. */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (adminClient !== undefined) return adminClient;
  adminClient = isSupabaseAdminConfigured()
    ? createClient(url!, serviceRoleKey!, { auth: { persistSession: false } })
    : null;
  return adminClient;
}
