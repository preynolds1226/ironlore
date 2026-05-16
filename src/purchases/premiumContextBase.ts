import { createContext, useContext } from 'react';

export type PremiumContextValue = {
  isPremium: boolean;
  loading: boolean;
  purchasesConfigured: boolean;
  monthlyPriceString: string | null;
  refresh: () => Promise<void>;
  purchaseDefault: () => Promise<boolean>;
  restore: () => Promise<boolean>;
};

export const PremiumContext = createContext<PremiumContextValue | null>(null);

/** Safe defaults before RevenueCat native module loads (LazyPremiumProvider). */
export const premiumStubValue: PremiumContextValue = {
  isPremium: true,
  loading: false,
  purchasesConfigured: false,
  monthlyPriceString: null,
  refresh: async () => {},
  purchaseDefault: async () => false,
  restore: async () => false,
};

export function usePremium(): PremiumContextValue {
  const ctx = useContext(PremiumContext);
  if (!ctx) {
    throw new Error('usePremium must be used within PremiumProvider');
  }
  return ctx;
}
