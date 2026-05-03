import Constants from 'expo-constants';

/**
 * Merged `expo.extra` from all manifest shapes so RevenueCat keys resolve when
 * `Constants.expoConfig` is missing or incomplete (e.g. some embedded/update manifests).
 */
function readMergedExtra(): Record<string, unknown> {
  const fromLegacy = (Constants.manifest?.extra ?? {}) as Record<string, unknown>;
  const fromManifest2 = (Constants.manifest2?.extra?.expoClient?.extra ?? {}) as Record<string, unknown>;
  const fromExpoConfig = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
  return { ...fromLegacy, ...fromManifest2, ...fromExpoConfig };
}

function pickString(...candidates: unknown[]): string {
  for (const c of candidates) {
    if (typeof c === 'string') {
      const t = c.trim();
      if (t.length > 0) return t;
    }
  }
  return '';
}

/** Public RevenueCat iOS SDK key (EAS `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` and/or `extra.revenueCatIosApiKey`). */
export function getRevenueCatIosApiKey(): string {
  return pickString(
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
    readMergedExtra().revenueCatIosApiKey,
  );
}

/** Public RevenueCat Android SDK key. */
export function getRevenueCatAndroidApiKey(): string {
  return pickString(
    process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
    readMergedExtra().revenueCatAndroidApiKey,
  );
}
