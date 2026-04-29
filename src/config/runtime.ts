import Constants from 'expo-constants';

type RuntimeConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseFunctionsUrl: string;
};

function readExtra(): Partial<RuntimeConfig> {
  const expoConfig = Constants.expoConfig ?? Constants.manifest2?.extra?.expoClient?.extra;
  return (expoConfig?.extra ?? {}) as Partial<RuntimeConfig>;
}

function requiredString(value: unknown, name: keyof RuntimeConfig): string {
  if (typeof value === 'string' && value.trim()) return value;
  const hint =
    name === 'supabaseAnonKey'
      ? 'Set EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env and restart with `npx expo start -c`.'
      : 'Check app.config.ts/app.json extra and restart with `npx expo start -c`.';
  throw new Error(`Missing runtime config: ${String(name)}. ${hint}`);
}

export function getRuntimeConfig(): RuntimeConfig {
  const extra = readExtra();

  // Prefer app.json `extra`, but allow CI/dev overrides via env.
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? extra.supabaseUrl;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? extra.supabaseAnonKey;
  const supabaseFunctionsUrl =
    process.env.EXPO_PUBLIC_SUPABASE_FUNCTIONS_URL ??
    extra.supabaseFunctionsUrl ??
    (typeof supabaseUrl === 'string' ? `${supabaseUrl.replace(/\/+$/, '')}/functions/v1` : undefined);

  return {
    supabaseUrl: requiredString(supabaseUrl, 'supabaseUrl'),
    supabaseAnonKey: requiredString(supabaseAnonKey, 'supabaseAnonKey'),
    supabaseFunctionsUrl: requiredString(supabaseFunctionsUrl, 'supabaseFunctionsUrl'),
  };
}

