import 'dotenv/config';
import type { ExpoConfig } from 'expo/config';

import appJson from './app.json';

export default (): ExpoConfig => {
  const base = appJson.expo as ExpoConfig;

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? base.extra?.supabaseUrl;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? base.extra?.supabaseAnonKey;
  const supabaseFunctionsUrl =
    process.env.EXPO_PUBLIC_SUPABASE_FUNCTIONS_URL ??
    base.extra?.supabaseFunctionsUrl ??
    (typeof supabaseUrl === 'string' ? `${supabaseUrl.replace(/\/+$/, '')}/functions/v1` : undefined);

  return {
    ...base,
    extra: {
      ...(base.extra ?? {}),
      supabaseUrl,
      supabaseAnonKey,
      supabaseFunctionsUrl,
    },
  };
};

