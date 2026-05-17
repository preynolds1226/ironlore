import React, { useEffect, useState } from 'react';

import { PremiumContext, premiumStubValue } from '@/src/purchases/premiumContextBase';

type ProviderComponent = React.ComponentType<{ children: React.ReactNode }>;

/**
 * Stub premium context on first paint; load RevenueCat only after the launch shell is visible.
 * Importing react-native-purchases from app/_layout.tsx correlated with stuck splash / SIGABRT on iOS 26.
 */
export function LazyPremiumProvider({ children }: { children: React.ReactNode }) {
  const [PremiumProvider, setPremiumProvider] = useState<ProviderComponent | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      void import('@/src/purchases/PremiumProviderImpl')
        .then((mod) => {
          if (!cancelled) setPremiumProvider(() => mod.PremiumProvider);
        })
        .catch((e) => {
          console.error('[IronLore] PremiumProviderImpl import failed:', e);
        });
    }, 5000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  if (!PremiumProvider) {
    return <PremiumContext.Provider value={premiumStubValue}>{children}</PremiumContext.Provider>;
  }

  return <PremiumProvider>{children}</PremiumProvider>;
}
