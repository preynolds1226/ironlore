import { NativeModules, Platform } from 'react-native';

/** False in Expo Go / web — RevenueCat requires a dev or production native build. */
export function isRevenueCatNativeAvailable(): boolean {
  if (Platform.OS === 'web') return false;
  return !!(NativeModules as { RNPurchases?: unknown }).RNPurchases;
}
