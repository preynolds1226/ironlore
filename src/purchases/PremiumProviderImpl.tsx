import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform } from 'react-native';
import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PurchasesPackage,
  type CustomerInfoUpdateListener,
} from 'react-native-purchases';

import { getRevenueCatAndroidApiKey, getRevenueCatIosApiKey } from '@/src/config/readExpoExtra';
import { supabase } from '@/src/data/supabaseClient';
import {
  REVENUECAT_ENTITLEMENT_PRO,
  REVENUECAT_MONTHLY_STORE_PRODUCT_ID_IOS,
} from '@/src/purchases/constants';
import { isRevenueCatNativeAvailable } from '@/src/purchases/isRevenueCatNativeAvailable';
import { PremiumContext, type PremiumContextValue } from '@/src/purchases/premiumContextBase';

function readPremium(info: CustomerInfo | null | undefined): boolean {
  return !!info?.entitlements?.active?.[REVENUECAT_ENTITLEMENT_PRO];
}

function pickDefaultPackage(packages: PurchasesPackage[]): PurchasesPackage | undefined {
  if (packages.length === 0) return undefined;
  const monthly = packages.find((p) => p.packageType === Purchases.PACKAGE_TYPE.MONTHLY);
  if (monthly) return monthly;
  if (Platform.OS === 'ios') {
    const byStoreId = packages.find(
      (p) =>
        p.product.identifier === REVENUECAT_MONTHLY_STORE_PRODUCT_ID_IOS &&
        p.packageType !== Purchases.PACKAGE_TYPE.ANNUAL,
    );
    if (byStoreId) return byStoreId;
  }
  const nonAnnual = packages.filter((p) => p.packageType !== Purchases.PACKAGE_TYPE.ANNUAL);
  return nonAnnual.length === 1 ? nonAnnual[0] : undefined;
}

function isUserCancelledPurchase(e: unknown): boolean {
  const err = e as { userCancelled?: boolean; code?: string | number };
  if (err.userCancelled) return true;
  return err.code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR;
}

/** Loaded via dynamic import after launch shell paints — keeps Purchases off the root layout import graph. */
export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const [isPremium, setIsPremium] = useState(true);
  const [loading, setLoading] = useState(true);
  const [purchasesConfigured, setPurchasesConfigured] = useState(false);
  const [monthlyPriceString, setMonthlyPriceString] = useState<string | null>(null);

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
        const info = await Promise.race([
          Purchases.getCustomerInfo(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('RevenueCat getCustomerInfo timeout')), 8000),
          ),
        ]);
        if (cancelled) return;
        Purchases.addCustomerInfoUpdateListener(onCustomerInfo);
        listenerAdded = true;
        setPurchasesConfigured(true);
        setIsPremium(readPremium(info));
        try {
          const offerings = await Purchases.getOfferings();
          const pkgs = offerings.current?.availablePackages ?? [];
          const pkg = pickDefaultPackage(pkgs);
          if (!cancelled && pkg) {
            setMonthlyPriceString(pkg.product.priceString);
          }
        } catch {
          // price stays null
        }
      } catch (e) {
        if (__DEV__) {
          console.warn('[IronLore] RevenueCat configure failed:', e);
        }
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
      if (pkgs.length === 0) {
        Alert.alert(
          'No subscription packages',
          offerings.current
            ? 'The current RevenueCat offering has no packages. Open RevenueCat → Offerings → your current offering → add a package for product a1 (monthly).'
            : 'No “current” offering in RevenueCat. Create an offering, set it as Current, then add packages linked to App Store products a1 / a2.',
        );
        return false;
      }
      const pkg = pickDefaultPackage(pkgs);
      if (!pkg) {
        Alert.alert(
          'No monthly subscription',
          'Include product a1 on the current RevenueCat offering (as the monthly subscription). If a1 is already there, confirm App Store Connect subscription duration is 1 month so RevenueCat can tag it as monthly.',
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
      monthlyPriceString,
      refresh,
      purchaseDefault,
      restore,
    }),
    [isPremium, loading, purchasesConfigured, monthlyPriceString, refresh, purchaseDefault, restore],
  );

  return <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>;
}
