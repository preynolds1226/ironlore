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

  const revenueCatIosApiKey =
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? (base.extra as Record<string, unknown> | undefined)?.revenueCatIosApiKey;
  const revenueCatAndroidApiKey =
    process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ??
    (base.extra as Record<string, unknown> | undefined)?.revenueCatAndroidApiKey;

  const plugins = [
    ...(base.plugins ?? []),
    [
      'expo-build-properties',
      {
        ios: {
          // Build RN from source so patch-package RCTTurboModule.mm fix is compiled into the binary.
          // (newArchEnabled: false breaks EAS pod install on this project; launch shell + lazy bundle
          // address the TestFlight black screen in JS instead.)
          buildReactNativeFromSource: true,
        },
      },
    ],
    [
      'apple-health',
      {
        healthSharePermission:
          'IronLore reads steps, activity energy, walking distance, and flights climbed from Apple Health to show daily progress.',
        healthUpdatePermission:
          'IronLore may write workout data to Apple Health when you choose to sync completed sessions.',
        backgroundDelivery: false,
      },
    ],
  ] as ExpoConfig['plugins'];

  const baseIos = (base.ios ?? {}) as NonNullable<ExpoConfig['ios']>;
  const baseInfoPlist = (baseIos.infoPlist ?? {}) as Record<string, unknown>;

  return {
    ...base,
    plugins,
    ios: {
      ...baseIos,
      infoPlist: {
        ...baseInfoPlist,
        NSUserNotificationsUsageDescription:
          (baseInfoPlist.NSUserNotificationsUsageDescription as string | undefined) ??
          'IronLore can send optional reminders for coaching and daily progress when you allow notifications.',
      },
    },
    extra: {
      ...(base.extra ?? {}),
      supabaseUrl,
      supabaseAnonKey,
      supabaseFunctionsUrl,
      revenueCatIosApiKey,
      revenueCatAndroidApiKey,
    },
  };
};

