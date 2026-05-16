import React, { useEffect, useState } from 'react';

import { PremiumContext, premiumStubValue, PremiumProvider } from '@/src/purchases/PremiumContext';

/**
 * Renders children immediately with stub premium state, then mounts RevenueCat after the
 * first frame so native Purchases.configure does not block the launch shell from painting.
 */
export function LazyPremiumProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const frame = requestAnimationFrame(() => {
      timer = setTimeout(() => setReady(true), 100);
    });
    return () => {
      cancelAnimationFrame(frame);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!ready) {
    return <PremiumContext.Provider value={premiumStubValue}>{children}</PremiumContext.Provider>;
  }

  return <PremiumProvider>{children}</PremiumProvider>;
}
