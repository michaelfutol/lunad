'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Public browser configuration only. The publishable key is intentionally safe
// to expose in a client app; authorization still comes from Auth + RLS + RPC checks.
const LUNAD_PUBLIC_SUPABASE_URL = 'https://evokxyxvheigmfazrptw.supabase.co';
const LUNAD_PUBLIC_SUPABASE_KEY = 'sb_publishable_6zb1jA8cwXD81g76CwBF7Q_LUIqf4Zo';

let browserClient: SupabaseClient | null = null;

function publicConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || LUNAD_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || LUNAD_PUBLIC_SUPABASE_KEY,
  };
}

export function hasSupabaseConfig(): boolean {
  const { url, key } = publicConfig();
  return Boolean(url && key);
}

export function getSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) return browserClient;

  const { url, key } = publicConfig();
  if (!url || !key) throw new Error('SUPABASE_NOT_CONFIGURED');

  browserClient = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: { eventsPerSecond: 10 },
    },
  });

  return browserClient;
}
