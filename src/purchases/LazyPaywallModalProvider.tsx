import React, { useEffect, useState } from 'react';

type ProviderComponent = React.ComponentType<{ children: React.ReactNode }>;

/** Defers PaywallModal + modal UI until after first paint (same rationale as LazyPremiumProvider). */
export function LazyPaywallModalProvider({ children }: { children: React.ReactNode }) {
  const [PaywallModalProvider, setPaywallModalProvider] = useState<ProviderComponent | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      void import('@/src/purchases/PaywallModalContext')
        .then((mod) => {
          if (!cancelled) setPaywallModalProvider(() => mod.PaywallModalProvider);
        })
        .catch((e) => {
          console.error('[IronLore] PaywallModalProvider import failed:', e);
        });
    }, 5500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  if (!PaywallModalProvider) {
    return <>{children}</>;
  }

  return <PaywallModalProvider>{children}</PaywallModalProvider>;
}
