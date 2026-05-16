import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import { getRuntimeConfig } from '@/src/config/runtime';

// Never throw at module load time — a synchronous throw here kills the entire JS
// module graph before React can mount, resulting in a permanent black screen with
// no ErrorBoundary to catch it. Placeholders allow the app to render; auth API
// calls will fail gracefully and show the login screen instead of a black screen.
let supabaseUrl = 'https://placeholder.supabase.co';
let supabaseAnonKey = 'placeholder-anon-key';
try {
  const cfg = getRuntimeConfig();
  supabaseUrl = cfg.supabaseUrl;
  supabaseAnonKey = cfg.supabaseAnonKey;
} catch (e) {
  console.error('[IronLore] supabaseClient: getRuntimeConfig failed at module load:', e);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

