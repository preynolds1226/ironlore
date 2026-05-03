import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert, Platform } from 'react-native';
import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PurchasesPackage,
  type CustomerInfoUpdateListener,
} from 'react-native-purchases';

import { getRevenueCatAndroidApiKey, getRevenueCatIosApiKey } from '@/src/config/readExpoExtra';
import { supabase } from '@/src/data/supabaseClient';
import { REVENUECAT_ENTITLEMENT_PRO } from '@/src/purchases/constants';
import { isRevenueCatNativeAvailable } from '@/src/purchases/isRevenueCatNativeAvailable';

type PremiumContextValue = {
  /** True when user has active `pro` entitlement, or monetization is not configured / failed to init (all features on). */
  isPremium: boolean;
  loading: boolean;
  /** True only after RevenueCat SDK configured successfully with an API key. */
  purchasesConfigured: boolean;
  refresh: () => Promise<void>;
  /** Purchase preferred monthly package, else first package in current offering. Returns true if now premium. */
  purchaseDefault: () => Promise<boolean>;
  restore: () => Promise<boolean>;
};

const PremiumContext = createContext<PremiumContextValue | null>(null);

function readPremium(info: CustomerInfo | null | undefined): boolean {
  return !!info?.entitlements?.active?.[REVENUECAT_ENTITLEMENT_PRO];
}

function pickDefaultPackage(packages: PurchasesPackage[]): PurchasesPackage | undefined {
  if (packages.length === 0) return undefined;
  const monthly = packages.find((p) => p.packageType === Purchases.PACKAGE_TYPE.MONTHLY);
  if (monthly) return monthly;
  const annual = packages.find((p) => p.packageType === Purchases.PACKAGE_TYPE.ANNUAL);
  if (annual) return annual;
  return packages[0];
}

function isUserCancelledPurchase(e: unknown): boolean {
  const err = e as { userCancelled?: boolean; code?: string | number };
  if (err.userCancelled) return true;
  return err.code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR;
}

export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const [isPremium, setIsPremium] = useState(true);
  const [loading, setLoading] = useState(true);
  const [purchasesConfigured, setPurchasesConfigured] = useState(false);

  const apiKey = useMemo(() => {
    if (Platform.OS === 'ios') return getRevenueCatIosApiKey();
    if (Platform.OS === 'android') return getRevenueCatAndroidApiKey();
    return '';
  }, []);

  const refresh = useCallback(async () => {
    if (!purchasesConfigured || Platform.OS === 'web') return;
    try {
      const info = await Purchases.getCustomerInfo();
      setIsPremium(readPremium(info));
    } catch {
      // keep prior
    }
  }, [purchasesConfigured]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setPurchasesConfigured(false);
      setIsPremium(true);
      setLoading(false);
      return;
    }

    if (!apiKey) {
      setPurchasesConfigured(false);
      setIsPremium(true);
      setLoading(false);
      return;
    }

    if (!isRevenueCatNativeAvailable()) {
      if (__DEV__) {
        console.warn(
          '[IronLore] RevenueCat: native module missing (Expo Go?). Run: npx expo run:ios — subscriptions need a development build.',
        );
      }
      setPurchasesConfigured(false);
      setIsPremium(true);
      setLoading(false);
      return;
    }

    let cancelled = false;
    let listenerAdded = false;
    const onCustomerInfo: CustomerInfoUpdateListener = (info) => {
      setIsPremium(readPremium(info));
    };

    (async () => {
      try {
        Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);
        Purchases.configure({ apiKey });
        const info = await Purchases.getCustomerInfo();
        if (cancelled) return;
        Purchases.addCustomerInfoUpdateListener(onCustomerInfo);
        listenerAdded = true;
        setPurchasesConfigured(true);
        setIsPremium(readPremium(info));
      } catch {
        if (!cancelled) {
          setPurchasesConfigured(false);
          setIsPremium(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (listenerAdded) {
        Purchases.removeCustomerInfoUpdateListener(onCustomerInfo);
      }
    };
  }, [apiKey]);

  // Tie RevenueCat app user ID to Supabase user so entitlements follow the account (and restore works across devices).
  useEffect(() => {
    if (!purchasesConfigured || Platform.OS === 'web') return;

    let cancelled = false;

    async function syncPurchasesIdentity(userId: string | null) {
      try {
        if (userId) {
          const { customerInfo } = await Purchases.logIn(userId);
          if (!cancelled) setIsPremium(readPremium(customerInfo));
        } else {
          const customerInfo = await Purchases.logOut();
          if (!cancelled) setIsPremium(readPremium(customerInfo));
        }
      } catch {
        if (!cancelled) await refresh();
      }
    }

    void supabase.auth.getSession().then(({ data: { session } }) => {
      void syncPurchasesIdentity(session?.user?.id ?? null);
    });

    const {
      data: { subscription: authSub },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncPurchasesIdentity(session?.user?.id ?? null);
    });

    return () => {
      cancelled = true;
      authSub.unsubscribe();
    };
  }, [purchasesConfigured, refresh]);

  const purchaseDefault = useCallback(async (): Promise<boolean> => {
    if (!purchasesConfigured) return false;
    try {
      const offerings = await Purchases.getOfferings();
      const pkgs = offerings.current?.availablePackages ?? [];
      const pkg = pickDefaultPackage(pkgs);
      if (!pkg) {
        Alert.alert(
          'No subscription product',
          'In RevenueCat, set a current offering with packages, and match products in App Store Connect.',
        );
        return false;
      }
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const now = readPremium(customerInfo);
      setIsPremium(now);
      return now;
    } catch (e: unknown) {
      if (isUserCancelledPurchase(e)) return false;
      const msg = e instanceof Error ? e.message : 'Try again later.';
      Alert.alert('Purchase failed', msg);
      return false;
    }
  }, [purchasesConfigured]);

  const restore = useCallback(async (): Promise<boolean> => {
    if (!purchasesConfigured) return false;
    try {
      const info = await Purchases.restorePurchases();
      const now = readPremium(info);
      setIsPremium(now);
      if (!now) {
        Alert.alert('No purchases found', 'If you subscribed on another device, use the same Apple ID and try Restore again.');
      }
      return now;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Restore failed';
      Alert.alert('Restore failed', msg);
      return false;
    }
  }, [purchasesConfigured]);

  const value = useMemo<PremiumContextValue>(
    () => ({
      isPremium,
      loading,
      purchasesConfigured,
      refresh,
      purchaseDefault,
      restore,
    }),
    [isPremium, loading, purchasesConfigured, refresh, purchaseDefault, restore],
  );

  return <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>;
}

export function usePremium(): PremiumContextValue {
  const ctx = useContext(PremiumContext);
  if (!ctx) {
    throw new Error('usePremium must be used within PremiumProvider');
  }
  return ctx;
}
