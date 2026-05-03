import Constants from 'expo-constants';

type RuntimeConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseFunctionsUrl: string;
};

/** Treat blank env as unset so EAS `EXPO_PUBLIC_*=""` does not override embedded `app.json` extra. */
function optionalEnv(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const t = value.trim();
  return t.length > 0 ? t : undefined;
}

function readExtra(): Partial<RuntimeConfig> {
  const fromExpoConfig = Constants.expoConfig?.extra;
  if (fromExpoConfig && typeof fromExpoConfig === 'object') {
    return fromExpoConfig as Partial<RuntimeConfig>;
  }

  // Same manifest as `expoConfig` for updates-shaped manifests; `expoClient` is the app config (has `.extra`).
  const fromManifest2 = Constants.manifest2?.extra?.expoClient?.extra;
  if (fromManifest2 && typeof fromManifest2 === 'object') {
    return fromManifest2 as Partial<RuntimeConfig>;
  }

  const fromLegacyManifest = Constants.manifest?.extra;
  if (fromLegacyManifest && typeof fromLegacyManifest === 'object') {
    return fromLegacyManifest as Partial<RuntimeConfig>;
  }

  return {};
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
  const supabaseUrl = optionalEnv(process.env.EXPO_PUBLIC_SUPABASE_URL) ?? extra.supabaseUrl;
  const supabaseAnonKey = optionalEnv(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) ?? extra.supabaseAnonKey;
  const supabaseFunctionsUrl =
    optionalEnv(process.env.EXPO_PUBLIC_SUPABASE_FUNCTIONS_URL) ??
    extra.supabaseFunctionsUrl ??
    (typeof supabaseUrl === 'string' ? `${supabaseUrl.replace(/\/+$/, '')}/functions/v1` : undefined);

  return {
    supabaseUrl: requiredString(supabaseUrl, 'supabaseUrl'),
    supabaseAnonKey: requiredString(supabaseAnonKey, 'supabaseAnonKey'),
    supabaseFunctionsUrl: requiredString(supabaseFunctionsUrl, 'supabaseFunctionsUrl'),
  };
}

